"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentSessionProfile, logoutAccount } from "@/frontend/lib/auth-client";

export type ProfileState = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  primaryMajor: string;
  secondaryMajor: string;
  academicYear: string;
  selectionStatus: string;
  resumeName: string;
};

export type PlannerState = {
  semesterOneCourseIds: string[];
  semesterTwoCourseIds: string[];
  addedCourseIds: string[];
  majorAddedCourseIds: string[];
  removedCourseIds: string[];
  genEdSelections: Record<string, string>;
};

export type AdvisorStudentRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  academicYear: string;
  status: string;
  selectedCourseIds: string[];
  majorAddedCourseIds: string[];
  semesterOneCourseIds: string[];
  semesterTwoCourseIds: string[];
  advisorSuggestion: string;
};

export type AdvisorState = {
  studentIds: string[];
};

export type StudentDirectoryState = {
  students: AdvisorStudentRecord[];
};

const PROFILE_KEY = "legacy-course-site-profile";
const PLANNER_KEY = "legacy-course-site-planner";
const ADVISOR_KEY = "legacy-course-site-advisor";
const STUDENT_DIRECTORY_KEY = "legacy-course-site-student-directory";
const LAST_ACTIVITY_KEY = "legacy-course-site-last-activity";
const INACTIVITY_TIMEOUT_MS = 1000 * 60 * 60 * 8;

export const defaultProfile: ProfileState = {
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  primaryMajor: "",
  secondaryMajor: "",
  academicYear: "",
  selectionStatus: "participating",
  resumeName: "",
};

export const defaultPlanner: PlannerState = {
  semesterOneCourseIds: [],
  semesterTwoCourseIds: [],
  addedCourseIds: [],
  majorAddedCourseIds: [],
  removedCourseIds: [],
  genEdSelections: {},
};

export const defaultAdvisorState: AdvisorState = {
  studentIds: [],
};

export const defaultStudentDirectoryState: StudentDirectoryState = {
  students: [],
};

function normalizeText(value: string) {
  return value.trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function storageScope(value: string) {
  return slugify(normalizeEmail(value) || "guest");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueCourseIds(courseIds: string[]) {
  return Array.from(new Set(courseIds.filter(Boolean)));
}

function normalizePlannerState(value: unknown): PlannerState {
  const record =
    value && typeof value === "object"
      ? (value as Partial<PlannerState> & { completedCourseIds?: string[] })
      : {};
  const semesterOneCourseIds = Array.isArray(record.semesterOneCourseIds)
    ? uniqueCourseIds(record.semesterOneCourseIds)
    : [];
  const semesterTwoCourseIds = Array.isArray(record.semesterTwoCourseIds)
    ? uniqueCourseIds(record.semesterTwoCourseIds)
    : [];
  const legacyCompletedCourseIds = Array.isArray(record.completedCourseIds)
    ? uniqueCourseIds(record.completedCourseIds)
    : [];

  return {
    semesterOneCourseIds:
      semesterOneCourseIds.length === 0 && semesterTwoCourseIds.length === 0
        ? legacyCompletedCourseIds
        : semesterOneCourseIds,
    semesterTwoCourseIds,
    addedCourseIds: Array.isArray(record.addedCourseIds) ? uniqueCourseIds(record.addedCourseIds) : [],
    majorAddedCourseIds: Array.isArray(record.majorAddedCourseIds) ? uniqueCourseIds(record.majorAddedCourseIds) : [],
    removedCourseIds: Array.isArray(record.removedCourseIds) ? uniqueCourseIds(record.removedCourseIds) : [],
    genEdSelections:
      record.genEdSelections && typeof record.genEdSelections === "object"
        ? Object.fromEntries(
            Object.entries(record.genEdSelections).filter(
              (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string",
            ),
          )
        : {},
  };
}

function normalizeAdvisorStudentRecord(value: unknown): AdvisorStudentRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<AdvisorStudentRecord>;
  const selectedCourseIds = Array.isArray(record.selectedCourseIds) ? uniqueCourseIds(record.selectedCourseIds) : [];
  const majorAddedCourseIds = Array.isArray(record.majorAddedCourseIds)
    ? uniqueCourseIds(record.majorAddedCourseIds)
    : [];
  const semesterOneCourseIds = Array.isArray(record.semesterOneCourseIds)
    ? uniqueCourseIds(record.semesterOneCourseIds)
    : [];
  const semesterTwoCourseIds = Array.isArray(record.semesterTwoCourseIds)
    ? uniqueCourseIds(record.semesterTwoCourseIds)
    : [];
  const migratedSemesterOneCourseIds =
    semesterOneCourseIds.length === 0 && semesterTwoCourseIds.length === 0 ? selectedCourseIds : semesterOneCourseIds;

  return {
    id: typeof record.id === "string" ? record.id : "",
    firstName: typeof record.firstName === "string" ? record.firstName : "",
    lastName: typeof record.lastName === "string" ? record.lastName : "",
    email: typeof record.email === "string" ? record.email : "",
    major: typeof record.major === "string" ? record.major : "Undeclared",
    academicYear: typeof record.academicYear === "string" ? record.academicYear : "",
    status: typeof record.status === "string" ? record.status : "participating",
    selectedCourseIds,
    majorAddedCourseIds,
    semesterOneCourseIds: migratedSemesterOneCourseIds,
    semesterTwoCourseIds,
    advisorSuggestion: typeof record.advisorSuggestion === "string" ? record.advisorSuggestion : "",
  };
}

function normalizeStudentDirectoryState(value: unknown): StudentDirectoryState {
  if (!value || typeof value !== "object") {
    return defaultStudentDirectoryState;
  }

  const students = Array.isArray((value as Partial<StudentDirectoryState>).students)
    ? (value as Partial<StudentDirectoryState>).students
        ?.map((student) => normalizeAdvisorStudentRecord(student))
        .filter((student): student is AdvisorStudentRecord => student !== null)
    : [];

  return { students: students ?? [] };
}

function toStudentId(profile: Pick<ProfileState, "firstName" | "lastName" | "email">) {
  const emailBase = normalizeEmail(profile.email).split("@")[0];
  const nameBase = `${normalizeText(profile.firstName)} ${normalizeText(profile.lastName)}`.trim();
  return slugify(emailBase || nameBase || "student");
}

function sameCourseIds(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((courseId, index) => courseId === right[index]);
}

export function collectSelectedCourseIds(planner: PlannerState) {
  return uniqueCourseIds([
    ...planner.semesterOneCourseIds,
    ...planner.semesterTwoCourseIds,
    ...Object.values(planner.genEdSelections),
  ]);
}

export function findAdvisorStudentForProfile(
  students: AdvisorStudentRecord[],
  profile: Pick<ProfileState, "firstName" | "lastName" | "email">,
) {
  const email = normalizeEmail(profile.email);
  if (email) {
    return students.find((student) => normalizeEmail(student.email) === email) ?? null;
  }

  const firstName = normalizeText(profile.firstName).toLowerCase();
  const lastName = normalizeText(profile.lastName).toLowerCase();
  return (
    students.find(
      (student) =>
        student.firstName.trim().toLowerCase() === firstName &&
        student.lastName.trim().toLowerCase() === lastName,
    ) ?? null
  );
}

export function findStudentByEmail(
  students: AdvisorStudentRecord[],
  email: string,
) {
  const normalizedEmail = normalizeEmail(email);
  return students.find((student) => normalizeEmail(student.email) === normalizedEmail) ?? null;
}

export function syncStudentToDirectory(
  current: StudentDirectoryState,
  profile: ProfileState,
  planner: PlannerState,
) {
  if (!profile.firstName || profile.role === "advisor") {
    return current;
  }

  const existingStudent = findAdvisorStudentForProfile(current.students, profile);
  const nextStudent: AdvisorStudentRecord = {
    id: existingStudent?.id ?? toStudentId(profile),
    firstName: normalizeText(profile.firstName),
    lastName: normalizeText(profile.lastName),
    email: normalizeEmail(profile.email),
    major: normalizeText(profile.primaryMajor) || "Undeclared",
    academicYear: normalizeText(profile.academicYear),
    status: normalizeText(profile.selectionStatus) || "participating",
    selectedCourseIds: collectSelectedCourseIds(planner),
    majorAddedCourseIds: planner.majorAddedCourseIds,
    semesterOneCourseIds: planner.semesterOneCourseIds,
    semesterTwoCourseIds: planner.semesterTwoCourseIds,
    advisorSuggestion: existingStudent?.advisorSuggestion ?? "",
  };

  if (
    existingStudent &&
    existingStudent.firstName === nextStudent.firstName &&
    existingStudent.lastName === nextStudent.lastName &&
    normalizeEmail(existingStudent.email) === nextStudent.email &&
    existingStudent.major === nextStudent.major &&
    existingStudent.academicYear === nextStudent.academicYear &&
    existingStudent.status === nextStudent.status &&
    sameCourseIds(existingStudent.majorAddedCourseIds ?? [], nextStudent.majorAddedCourseIds) &&
    sameCourseIds(existingStudent.semesterOneCourseIds, nextStudent.semesterOneCourseIds) &&
    sameCourseIds(existingStudent.semesterTwoCourseIds, nextStudent.semesterTwoCourseIds) &&
    sameCourseIds(existingStudent.selectedCourseIds, nextStudent.selectedCourseIds)
  ) {
    return current;
  }

  if (existingStudent) {
    return {
      students: current.students.map((student) =>
        student.id === existingStudent.id ? nextStudent : student,
      ),
    };
  }

  return {
    students: [nextStudent, ...current.students],
  };
}

export function mergeStudentProfileIntoDirectory(
  current: StudentDirectoryState,
  profile: Pick<
    ProfileState,
    "firstName" | "lastName" | "email" | "role" | "primaryMajor" | "academicYear" | "selectionStatus"
  >,
) {
  if (!profile.firstName || profile.role === "advisor") {
    return current;
  }

  const existingStudent = findAdvisorStudentForProfile(current.students, profile);
  const nextStudent: AdvisorStudentRecord = {
    id: existingStudent?.id ?? toStudentId(profile),
    firstName: normalizeText(profile.firstName),
    lastName: normalizeText(profile.lastName),
    email: normalizeEmail(profile.email),
    major: normalizeText(profile.primaryMajor) || existingStudent?.major || "Undeclared",
    academicYear: normalizeText(profile.academicYear) || existingStudent?.academicYear || "",
    status: normalizeText(profile.selectionStatus) || existingStudent?.status || "participating",
    selectedCourseIds: existingStudent?.selectedCourseIds ?? [],
    majorAddedCourseIds: existingStudent?.majorAddedCourseIds ?? [],
    semesterOneCourseIds: existingStudent?.semesterOneCourseIds ?? [],
    semesterTwoCourseIds: existingStudent?.semesterTwoCourseIds ?? [],
    advisorSuggestion: existingStudent?.advisorSuggestion ?? "",
  };

  if (
    existingStudent &&
    existingStudent.firstName === nextStudent.firstName &&
    existingStudent.lastName === nextStudent.lastName &&
    normalizeEmail(existingStudent.email) === nextStudent.email &&
    existingStudent.major === nextStudent.major &&
    existingStudent.academicYear === nextStudent.academicYear &&
    existingStudent.status === nextStudent.status
  ) {
    return current;
  }

  if (existingStudent) {
    return {
      students: current.students.map((student) =>
        student.id === existingStudent.id ? nextStudent : student,
      ),
    };
  }

  return {
    students: [nextStudent, ...current.students],
  };
}

export function addStudentIdToAdvisorState(current: AdvisorState, studentId: string) {
  if (current.studentIds.includes(studentId)) {
    return current;
  }

  return {
    studentIds: [...current.studentIds, studentId],
  };
}

function readStorageValue<T>(key: string, fallback: T, storageType: "session" | "local") {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storage = storageType === "local" ? window.localStorage : window.sessionStorage;
    const raw = storage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as T;

    if (
      typeof fallback === "object" &&
      fallback !== null &&
      !Array.isArray(fallback) &&
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return { ...fallback, ...parsed } as T;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function writeStorageValue<T>(key: string, value: T, storageType: "session" | "local") {
  if (typeof window === "undefined") {
    return;
  }

  const storage = storageType === "local" ? window.localStorage : window.sessionStorage;
  storage.setItem(key, JSON.stringify(value));
}

function readLastActivityAt() {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function markLastActivity() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

function useStorageValue<T>(key: string, fallback: T, storageType: "session" | "local") {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setValue(readStorageValue(key, fallback, storageType));
      setReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fallback, key, storageType]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    writeStorageValue(key, value, storageType);
  }, [key, ready, storageType, value]);

  return [value, setValue, ready] as const;
}

export function useProfileSession() {
  const [profile, setProfile] = useState<ProfileState>(defaultProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cached = readStorageValue(PROFILE_KEY, defaultProfile, "session");
      setProfile(cached);
      setReady(true);

      void fetchCurrentSessionProfile()
        .then((serverProfile) => {
          if (serverProfile) {
            setProfile(serverProfile);
          } else if (cached.firstName) {
            setProfile(defaultProfile);
          }
        })
        .catch(() => {
          return;
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    writeStorageValue(PROFILE_KEY, profile, "session");
  }, [profile, ready]);

  return [profile, setProfile, ready] as const;
}

export function usePlannerSession() {
  const [planner, setPlanner] = useState<PlannerState>(defaultPlanner);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cached = readStorageValue(PLANNER_KEY, defaultPlanner, "session");
      setPlanner(normalizePlannerState(cached));
      setReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    writeStorageValue(PLANNER_KEY, planner, "session");
  }, [planner, ready]);

  return [planner, setPlanner, ready] as const;
}

export function useAdvisorSession(scope: string) {
  return useStorageValue(`${ADVISOR_KEY}:${storageScope(scope)}`, defaultAdvisorState, "local");
}

export function useStudentDirectorySession() {
  const [studentDirectory, setStudentDirectory] = useState<StudentDirectoryState>(defaultStudentDirectoryState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cached = readStorageValue(STUDENT_DIRECTORY_KEY, defaultStudentDirectoryState, "local");
      setStudentDirectory(normalizeStudentDirectoryState(cached));
      setReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    writeStorageValue(STUDENT_DIRECTORY_KEY, studentDirectory, "local");
  }, [ready, studentDirectory]);

  return [studentDirectory, setStudentDirectory, ready] as const;
}

export function clearAllSessionData() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PROFILE_KEY);
  window.sessionStorage.removeItem(PLANNER_KEY);
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function useInactivityLogout(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timer = 0;
    let lastRecordedActivityAt = readLastActivityAt();
    const forceLogout = () => {
      void logoutAccount();
      clearAllSessionData();
      router.push("/login");
    };

    const resetTimer = () => {
      const now = Date.now();
      if (!lastRecordedActivityAt || now - lastRecordedActivityAt >= 15000) {
        markLastActivity();
        lastRecordedActivityAt = now;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        forceLogout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const lastActivityAt = lastRecordedActivityAt;
    if (lastActivityAt && Date.now() - lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
      forceLogout();
      return;
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) => {
      document.addEventListener(eventName, resetTimer);
    });
    resetTimer();

    return () => {
      window.clearTimeout(timer);
      events.forEach((eventName) => {
        document.removeEventListener(eventName, resetTimer);
      });
    };
  }, [enabled, router]);
}
