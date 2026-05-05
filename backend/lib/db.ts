import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import {
  allCourses,
  inferDepartmentFromCode,
  normalizeCourseId,
  searchCourses as localSearchCourses,
} from "@/shared/site-data";
import type { ProfileState } from "@/frontend/lib/session";

type ProfileRecord = Record<string, unknown>;
type CourseRecord = Record<string, unknown>;
type MetadataRecord = Record<string, unknown>;

type SessionPayload = {
  userId: string;
  expiresAt: string;
};

type AdvisorMetadata = {
  assigned_student_emails?: unknown;
};

function normalizeRole(value: string) {
  return value === "advisor" ? "advisor" : "student";
}

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = requireEnv(
  "SUPABASE_URL",
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const supabaseAnonKey = requireEnv(
  "SUPABASE_ANON_KEY",
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const supabaseServiceRoleKey = requireEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const sessionSigningSecret = process.env.SESSION_SIGNING_SECRET ?? supabaseServiceRoleKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let initialized = false;
let initializationPromise: Promise<void> | null = null;
let profileUserColumn: string | null = null;
const profileColumnCache = new Map<string, boolean>();

function normalizeErrorMessage(message: string) {
  return message.trim().toLowerCase();
}

function isMissingColumnError(error: PostgrestError | null) {
  if (!error) {
    return false;
  }

  const normalized = normalizeErrorMessage(error.message);
  return error.code === "42703" || normalized.includes("does not exist");
}

function throwIfError(context: string, error: PostgrestError | null) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function asRecord(value: unknown): MetadataRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as MetadataRecord;
}

function readEmailList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => normalizeEmail(item))
        .filter(Boolean),
    ),
  );
}

function readStringValue(record: Record<string, unknown> | null, key: string) {
  if (!record) {
    return "";
  }

  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readFirstString(record: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = readStringValue(record, key).trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function toNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parsePrereqs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => normalizeCourseId(item))
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => normalizeCourseId(item))
          .filter(Boolean);
      }
    } catch {
      return [];
    }
  }

  return trimmed
    .split(/[;,]/)
    .map((item) => item.trim())
    .map((item) => normalizeCourseId(item))
    .filter(Boolean);
}

async function verifyTableAccess(tableName: string) {
  const { error } = await supabaseAdmin.from(tableName).select("*").limit(1);
  if (error) {
    throw new Error(
      `Unable to access Supabase table "${tableName}". Confirm the table exists and service role key is valid. ${error.message}`,
    );
  }
}

async function verifyAuthAccess() {
  const { error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (error) {
    throw new Error(`Unable to access Supabase Auth admin API: ${error.message}`);
  }
}

async function profileColumnExists(column: string) {
  if (profileColumnCache.has(column)) {
    return profileColumnCache.get(column) ?? false;
  }

  const { error } = await supabaseAdmin.from("profiles").select(column).limit(1);
  if (!error) {
    profileColumnCache.set(column, true);
    return true;
  }

  if (isMissingColumnError(error)) {
    profileColumnCache.set(column, false);
    return false;
  }

  throw new Error(`Unable to inspect profiles.${column}: ${error.message}`);
}

async function getProfileUserColumn() {
  if (profileUserColumn) {
    return profileUserColumn;
  }

  const candidates = ["id", "user_id", "userId"];
  for (const candidate of candidates) {
    if (await profileColumnExists(candidate)) {
      profileUserColumn = candidate;
      return profileUserColumn;
    }
  }

  throw new Error(
    `Could not find a supported profile user column. Expected one of: ${candidates.join(", ")}`,
  );
}

async function initializeDatabase() {
  await verifyAuthAccess();
  await verifyTableAccess("profiles");
  await getProfileUserColumn();
}

export async function ensureDatabase() {
  if (initialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = initializeDatabase()
      .then(() => {
        initialized = true;
      })
      .catch((error) => {
        initializationPromise = null;
        throw error;
      });
  }

  await initializationPromise;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", sessionSigningSecret).update(payload).digest("hex");
}

function toSessionToken(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signSessionPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function fromSessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== actualBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  try {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as SessionPayload;
    if (typeof parsed.userId !== "string" || typeof parsed.expiresAt !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function addProfileValue(payload: Record<string, unknown>, column: string, value: string) {
  if (await profileColumnExists(column)) {
    payload[column] = value;
  }
}

function buildProfileState(input: {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  primaryMajor: string;
  secondaryMajor: string;
  academicYear: string;
  selectionStatus: string;
  resumeName: string;
}) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: normalizeEmail(input.email),
    role: normalizeRole(input.role.trim()),
    primaryMajor: input.primaryMajor.trim(),
    secondaryMajor: input.secondaryMajor.trim(),
    academicYear: input.academicYear.trim(),
    selectionStatus: input.selectionStatus.trim() || "participating",
    resumeName: input.resumeName.trim(),
  } satisfies ProfileState;
}

async function upsertProfileRow(userId: string, profile: ProfileState) {
  const userColumn = await getProfileUserColumn();
  const payload: Record<string, unknown> = {
    [userColumn]: userId,
  };

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  await addProfileValue(payload, "username", profile.email);
  await addProfileValue(payload, "email", profile.email);
  await addProfileValue(payload, "full_name", fullName);
  await addProfileValue(payload, "fullName", fullName);
  await addProfileValue(payload, "first_name", profile.firstName);
  await addProfileValue(payload, "firstName", profile.firstName);
  await addProfileValue(payload, "last_name", profile.lastName);
  await addProfileValue(payload, "lastName", profile.lastName);
  await addProfileValue(payload, "role", profile.role);
  await addProfileValue(payload, "primary_major", profile.primaryMajor);
  await addProfileValue(payload, "primaryMajor", profile.primaryMajor);
  await addProfileValue(payload, "secondary_major", profile.secondaryMajor);
  await addProfileValue(payload, "secondaryMajor", profile.secondaryMajor);
  await addProfileValue(payload, "academic_year", profile.academicYear);
  await addProfileValue(payload, "academicYear", profile.academicYear);
  await addProfileValue(payload, "selection_status", profile.selectionStatus);
  await addProfileValue(payload, "selectionStatus", profile.selectionStatus);
  await addProfileValue(payload, "resume_name", profile.resumeName);
  await addProfileValue(payload, "resumeName", profile.resumeName);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("profiles")
    .select(userColumn)
    .eq(userColumn, userId)
    .maybeSingle();
  throwIfError("Unable to check existing profile row", existingError);

  const payloadWithoutId: Record<string, unknown> = { ...payload };
  delete payloadWithoutId[userColumn];

  if (existing) {
    if (Object.keys(payloadWithoutId).length === 0) {
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(payloadWithoutId)
      .eq(userColumn, userId);
    throwIfError("Unable to update profile row", updateError);
    return;
  }

  const { error: insertError } = await supabaseAdmin.from("profiles").insert(payload);
  throwIfError("Unable to insert profile row", insertError);
}

async function getAuthUserById(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) {
    const status = "status" in error ? (error as { status?: number }).status : undefined;
    if (status === 404) {
      return null;
    }
    throw new Error(`Unable to fetch auth user: ${error.message}`);
  }

  return data.user ?? null;
}

async function getAuthUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Unable to search auth users by email: ${error.message}`);
    }

    const users = data.users ?? [];
    const matchedUser =
      users.find((user) => normalizeEmail(user.email ?? "") === normalizedEmail) ?? null;
    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function readProfileRowByUserId(userId: string) {
  const userColumn = await getProfileUserColumn();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq(userColumn, userId)
    .maybeSingle();
  throwIfError("Unable to read profile row", error);
  return (data as ProfileRecord | null) ?? null;
}

export function toProfileState(input: {
  email: string;
  profileRow: ProfileRecord | null;
  metadata: MetadataRecord | null;
}): ProfileState {
  const fullNameFromProfile = readFirstString(input.profileRow, ["full_name", "fullName"]);
  const fullNameFromMetadata = readFirstString(input.metadata, ["full_name", "fullName", "name"]);
  const nameParts = splitFullName(fullNameFromProfile || fullNameFromMetadata);

  const firstName =
    readFirstString(input.profileRow, ["first_name", "firstName"]) ||
    readFirstString(input.metadata, ["first_name", "firstName", "given_name"]) ||
    nameParts.firstName;
  const lastName =
    readFirstString(input.profileRow, ["last_name", "lastName"]) ||
    readFirstString(input.metadata, ["last_name", "lastName", "family_name"]) ||
    nameParts.lastName;

  return {
    firstName,
    lastName,
    email: readFirstString(input.profileRow, ["email"]) || input.email,
    role:
      readFirstString(input.profileRow, ["role"]) ||
      readFirstString(input.metadata, ["role"]) ||
      "student",
    primaryMajor:
      readFirstString(input.profileRow, ["primary_major", "primaryMajor", "major"]) ||
      readFirstString(input.metadata, ["primary_major", "primaryMajor", "major"]),
    secondaryMajor:
      readFirstString(input.profileRow, ["secondary_major", "secondaryMajor"]) ||
      readFirstString(input.metadata, ["secondary_major", "secondaryMajor"]),
    academicYear:
      readFirstString(input.profileRow, ["academic_year", "academicYear"]) ||
      readFirstString(input.metadata, ["academic_year", "academicYear"]),
    selectionStatus:
      readFirstString(input.profileRow, ["selection_status", "selectionStatus"]) ||
      readFirstString(input.metadata, ["selection_status", "selectionStatus"]) ||
      "participating",
    resumeName:
      readFirstString(input.profileRow, ["resume_name", "resumeName"]) ||
      readFirstString(input.metadata, ["resume_name", "resumeName"]),
  };
}

function isDuplicateAuthError(message: string) {
  const normalized = normalizeErrorMessage(message);
  return normalized.includes("already registered") || normalized.includes("already exists");
}

export async function createUserRecord(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  primaryMajor: string;
}) {
  await ensureDatabase();

  const email = normalizeEmail(input.email);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      role: normalizeRole(input.role),
      primary_major: input.primaryMajor || "",
      secondary_major: "",
      academic_year: "",
      selection_status: "participating",
      resume_name: "",
    },
  });

  if (error) {
    if (isDuplicateAuthError(error.message)) {
      return {
        error: "This email is already registered.",
        userId: null,
        requiresEmailConfirmation: false,
      };
    }

    return {
      error: error.message || "Unable to create account.",
      userId: null,
      requiresEmailConfirmation: false,
    };
  }

  const user = data.user;
  if (!user) {
    return {
      error: "Unable to create account.",
      userId: null,
      requiresEmailConfirmation: false,
    };
  }

  const profile = buildProfileState({
    firstName: input.firstName,
    lastName: input.lastName,
    email,
    role: normalizeRole(input.role),
    primaryMajor: input.primaryMajor || "",
    secondaryMajor: "",
    academicYear: "",
    selectionStatus: "participating",
    resumeName: "",
  });

  try {
    await upsertProfileRow(user.id, profile);
  } catch (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    throw profileError;
  }

  return {
    error: null,
    userId: user.id,
    requiresEmailConfirmation: false,
  };
}

export async function loginUserWithPassword(email: string, password: string) {
  await ensureDatabase();
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) {
    const message = normalizeErrorMessage(error?.message ?? "");
    return {
      error: message.includes("email not confirmed")
        ? "Please confirm your email before signing in."
        : "Invalid email or password.",
      userId: null,
    };
  }

  const metadata = asRecord(data.user.user_metadata);
  const existingProfile = await readProfileRowByUserId(data.user.id);
  if (!existingProfile) {
    await upsertProfileRow(
      data.user.id,
      buildProfileState({
        firstName: readFirstString(metadata, ["first_name", "firstName"]),
        lastName: readFirstString(metadata, ["last_name", "lastName"]),
        email: normalizedEmail,
        role: readFirstString(metadata, ["role"]) || "student",
        primaryMajor: readFirstString(metadata, ["primary_major", "primaryMajor"]),
        secondaryMajor: readFirstString(metadata, ["secondary_major", "secondaryMajor"]),
        academicYear: readFirstString(metadata, ["academic_year", "academicYear"]),
        selectionStatus:
          readFirstString(metadata, ["selection_status", "selectionStatus"]) || "participating",
        resumeName: readFirstString(metadata, ["resume_name", "resumeName"]),
      }),
    );
  }

  return {
    error: null,
    userId: data.user.id,
  };
}

export async function getProfileByUserId(userId: string) {
  await ensureDatabase();
  const user = await getAuthUserById(userId);
  if (!user) {
    return null;
  }

  const email = normalizeEmail(user.email ?? "");
  const profileRow = await readProfileRowByUserId(userId);
  return toProfileState({
    email,
    profileRow,
    metadata: asRecord(user.user_metadata),
  });
}

export async function findStudentProfileByEmail(email: string) {
  await ensureDatabase();
  const user = await getAuthUserByEmail(email);
  if (!user) {
    return null;
  }

  const profileRow = await readProfileRowByUserId(user.id);
  const profile = toProfileState({
    email: normalizeEmail(user.email ?? email),
    profileRow,
    metadata: asRecord(user.user_metadata),
  });

  if (profile.role === "advisor") {
    return null;
  }

  return profile;
}

export async function updateProfileByUserId(userId: string, profile: ProfileState) {
  await ensureDatabase();
  const user = await getAuthUserById(userId);
  if (!user) {
    return null;
  }

  const currentProfile = await getProfileByUserId(userId);
  const lockedRole =
    currentProfile?.role ||
    readFirstString(asRecord(user.user_metadata), ["role"]) ||
    normalizeRole(profile.role);

  const nextProfile = buildProfileState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email || user.email || "",
    role: lockedRole,
    primaryMajor: profile.primaryMajor,
    secondaryMajor: profile.secondaryMajor,
    academicYear: profile.academicYear,
    selectionStatus: profile.selectionStatus,
    resumeName: profile.resumeName,
  });

  await upsertProfileRow(userId, nextProfile);

  const existingMetadata = asRecord(user.user_metadata) ?? {};

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingMetadata,
      first_name: nextProfile.firstName,
      last_name: nextProfile.lastName,
      role: nextProfile.role,
      primary_major: nextProfile.primaryMajor,
      secondary_major: nextProfile.secondaryMajor,
      academic_year: nextProfile.academicYear,
      selection_status: nextProfile.selectionStatus,
      resume_name: nextProfile.resumeName,
    },
  });
  if (error) {
    throw new Error(`Unable to sync profile metadata to auth user: ${error.message}`);
  }

  return getProfileByUserId(userId);
}

export async function getAdvisorStudentEmailsByUserId(userId: string) {
  await ensureDatabase();
  const user = await getAuthUserById(userId);
  if (!user) {
    return [];
  }

  const metadata = (asRecord(user.user_metadata) ?? {}) as AdvisorMetadata;
  return readEmailList(metadata.assigned_student_emails);
}

export async function listAdvisorStudentProfilesByUserId(userId: string) {
  const emails = await getAdvisorStudentEmailsByUserId(userId);
  const profiles = await Promise.all(emails.map((email) => findStudentProfileByEmail(email)));
  return profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null);
}

export async function addStudentEmailToAdvisorByUserId(userId: string, studentEmail: string) {
  await ensureDatabase();
  const advisorUser = await getAuthUserById(userId);
  if (!advisorUser) {
    return {
      error: "Advisor account not found.",
      profiles: [] as ProfileState[],
    };
  }

  const studentProfile = await findStudentProfileByEmail(studentEmail);
  if (!studentProfile) {
    return {
      error: "No student account matched that email yet.",
      profiles: [] as ProfileState[],
    };
  }

  const existingMetadata = (asRecord(advisorUser.user_metadata) ?? {}) as AdvisorMetadata & MetadataRecord;
  const assignedStudentEmails = readEmailList(existingMetadata.assigned_student_emails);
  const nextAssignedStudentEmails = Array.from(
    new Set([...assignedStudentEmails, normalizeEmail(studentProfile.email)]),
  );

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingMetadata,
      assigned_student_emails: nextAssignedStudentEmails,
    },
  });
  if (error) {
    throw new Error(`Unable to save advisor student assignments: ${error.message}`);
  }

  const profiles = await Promise.all(nextAssignedStudentEmails.map((email) => findStudentProfileByEmail(email)));
  return {
    error: null,
    profiles: profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null),
  };
}

export async function deleteUserAccountById(userId: string) {
  await ensureDatabase();
  const user = await getAuthUserById(userId);
  if (!user) {
    return false;
  }

  const userColumn = await getProfileUserColumn();
  const { error: profileDeleteError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq(userColumn, userId);
  throwIfError("Unable to delete profile row", profileDeleteError);

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    throw new Error(`Unable to delete auth user: ${authDeleteError.message}`);
  }

  return true;
}

export async function createSessionForUser(userId: string) {
  await ensureDatabase();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const token = toSessionToken({
    userId,
    expiresAt: expiresAt.toISOString(),
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getSessionUserId(token: string) {
  await ensureDatabase();
  const payload = fromSessionToken(token);
  if (!payload) {
    return null;
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const user = await getAuthUserById(payload.userId);
  if (!user) {
    return null;
  }

  return payload.userId;
}

export async function getSessionUser(token: string) {
  const userId = await getSessionUserId(token);
  if (!userId) {
    return null;
  }

  return getProfileByUserId(userId);
}

export async function deleteSession(token: string) {
  void token;
  await ensureDatabase();
}

function courseFromRow(row: CourseRecord) {
  const department = readFirstString(row, [
    "dept",
    "department",
    "subject",
    "subject_code",
    "subjectCode",
    "department_code",
    "departmentCode",
    "dept_code",
    "deptCode",
    "college",
  ]);
  const courseNumber = readFirstString(row, [
    "course_number",
    "courseNumber",
    "catalog_number",
    "catalogNumber",
    "number",
    "course_no",
    "courseNo",
  ]);
  const code =
    readFirstString(row, [
      "code",
      "full_code",
      "fullCode",
      "course_code",
      "courseCode",
      "course",
    ]) ||
    [department, courseNumber].filter(Boolean).join(" ");
  const derivedDept = department || (code ? inferDepartmentFromCode(code) : "");
  const idSource =
    readFirstString(row, ["id", "slug"]) ||
    [derivedDept, courseNumber].filter(Boolean).join(" ") ||
    code ||
    readFirstString(row, [
      "title",
      "name",
      "course_title",
      "courseTitle",
      "long_title",
      "longTitle",
      "course_name",
      "courseName",
    ]) ||
    "course";

  const prereqValue =
    row.prereqs_json ??
    row.prerequisites_json ??
    row.prerequisites ??
    row.prerequisite ??
    row.prereqs;
  return {
    id: normalizeCourseId(idSource),
    code,
    title:
      readFirstString(row, [
        "title",
        "name",
        "course_title",
        "courseTitle",
        "long_title",
        "longTitle",
        "course_name",
        "courseName",
      ]) || "Untitled Course",
    dept: derivedDept,
    credits: toNumberValue(row.credits) || 3,
    desc:
      readFirstString(row, [
        "description",
        "desc",
        "course_description",
        "courseDescription",
        "summary",
      ]) || "No description available for this course in the database.",
    prereqs: parsePrereqs(prereqValue),
  };
}

function fallbackCourses() {
  return allCourses.map((course) => ({
    ...course,
    id: normalizeCourseId(course.id),
  }));
}

export async function listCoursesFromDatabase() {
  const pageSize = 1000;
  let from = 0;
  const rows: CourseRecord[] = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabaseAdmin.from("courses").select("*").range(from, to);
    if (error) {
      return fallbackCourses();
    }

    const page = (data as CourseRecord[]) ?? [];
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows
    .map((row) => courseFromRow(row))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%,]/g, "");
}

function normalizeSearchTerm(query: string) {
  const rawTerm = query.trim();
  const upperTerm = rawTerm.toUpperCase();
  const normalizedTerm = upperTerm.replace(/\s+/g, " ").trim();
  const compactTerm = normalizeCourseId(normalizedTerm);
  return {
    rawTerm,
    normalizedTerm,
    compactTerm,
  };
}

function extractMissingCourseColumn(error: PostgrestError | null) {
  if (!error) {
    return null;
  }

  if (!isMissingColumnError(error)) {
    return null;
  }

  const match =
    error.message.match(/column\s+courses\.([a-zA-Z0-9_]+)/i) ??
    error.message.match(/column\s+\"?([a-zA-Z0-9_]+)\"?\s+does not exist/i);
  return match?.[1] ?? null;
}

function isLettersOnly(value: string) {
  return /^[A-Z]+$/.test(value);
}

function buildCourseSearchClauses(input: {
  rawTerm: string;
  normalizedTerm: string;
  compactTerm: string;
}) {
  const safeRaw = escapeIlikeTerm(input.rawTerm);
  const safeNormalized = escapeIlikeTerm(input.normalizedTerm);
  const safeCompact = escapeIlikeTerm(input.compactTerm);
  const clauses = [
    `department.ilike.%${safeNormalized}%`,
    `full_code.ilike.%${safeCompact}%`,
    `course_number.ilike.%${safeRaw}%`,
    `cross_listed_code.ilike.%${safeCompact}%`,
    `title.ilike.%${safeRaw}%`,
    `course_title.ilike.%${safeRaw}%`,
  ];

  if (isLettersOnly(input.compactTerm)) {
    clauses.push(`department.ilike.${escapeIlikeTerm(input.compactTerm)}%`);
    clauses.push(`full_code.ilike.${escapeIlikeTerm(input.compactTerm)}%`);
  }

  return [...new Set(clauses)];
}

async function searchCoursesWithColumnFallback(clauses: string[], limit: number) {
  let activeClauses = [...clauses];

  while (activeClauses.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("*")
      .or(activeClauses.join(","))
      .limit(limit);

    if (!error) {
      return { rows: (data as CourseRecord[]) ?? [], error: null };
    }

    const missingColumn = extractMissingCourseColumn(error);
    if (!missingColumn) {
      return { rows: null, error };
    }

    activeClauses = activeClauses.filter((clause) => !clause.startsWith(`${missingColumn}.`));
  }

  return { rows: [], error: null };
}

function scoreCourseSearchMatch(course: ReturnType<typeof courseFromRow>, normalizedTerm: string, compactTerm: string) {
  const codeCompact = normalizeCourseId(course.code);
  const deptUpper = course.dept.toUpperCase();
  const titleUpper = course.title.toUpperCase();
  const courseNumber = (course.code.match(/[0-9A-Z]+$/)?.[0] ?? "").toUpperCase();
  let score = 0;

  if (codeCompact === compactTerm) {
    score += 1000;
  }

  if (deptUpper === compactTerm) {
    score += 850;
  }

  if (codeCompact.startsWith(compactTerm)) {
    score += 700;
  }

  if (deptUpper.startsWith(compactTerm)) {
    score += 600;
  }

  if (courseNumber === compactTerm) {
    score += 520;
  }

  if (codeCompact.includes(compactTerm)) {
    score += 300;
  }

  if (deptUpper.includes(compactTerm)) {
    score += 260;
  }

  if (titleUpper.includes(normalizedTerm)) {
    score += 180;
  }

  return score;
}

export async function searchCoursesFromDatabase(query: string, limit = 100) {
  const normalized = normalizeSearchTerm(query);
  if (!normalized.rawTerm) {
    return [];
  }

  const normalizedLimit = Math.min(Math.max(limit, 1), 200);
  const clauses = buildCourseSearchClauses(normalized);
  const { rows, error } = await searchCoursesWithColumnFallback(clauses, normalizedLimit);

  if (error || rows === null) {
    const fallback = await listCoursesFromDatabase();
    return localSearchCourses(normalized.rawTerm, fallback).slice(0, normalizedLimit);
  }

  const mapped = rows
    .map((row) => courseFromRow(row))
    .filter((course) => Boolean(course.id && course.code && course.title))
    .sort((left, right) => {
      const scoreDelta =
        scoreCourseSearchMatch(right, normalized.normalizedTerm, normalized.compactTerm) -
        scoreCourseSearchMatch(left, normalized.normalizedTerm, normalized.compactTerm);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return left.code.localeCompare(right.code);
    });

  return mapped.slice(0, normalizedLimit);
}

export async function getCourseBySlugFromDatabase(slug: string) {
  const targetId = normalizeCourseId(slug);
  const courses = await listCoursesFromDatabase();
  return courses.find((course) => normalizeCourseId(course.id) === targetId) ?? null;
}
