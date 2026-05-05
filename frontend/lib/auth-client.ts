import type { ProfileState } from "@/frontend/lib/session";

type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  primaryMajor: string;
};

type AuthSuccess = {
  error: null;
  profile: ProfileState | null;
  requiresEmailConfirmation: boolean;
};

type AuthFailure = {
  error: string;
  profile: null;
  requiresEmailConfirmation: false;
};

export type AuthResult = AuthSuccess | AuthFailure;

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function registerAccount(payload: RegisterPayload): Promise<AuthResult> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await readJson<AuthResult>(response);
  if (!response.ok) {
    return {
      error: data.error || "Unable to create account.",
      profile: null,
      requiresEmailConfirmation: false,
    };
  }

  return data;
}

export async function loginAccount(email: string, password: string): Promise<AuthResult> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await readJson<AuthResult>(response);
  if (!response.ok) {
    return {
      error: data.error || "Unable to sign in.",
      profile: null,
      requiresEmailConfirmation: false,
    };
  }

  return data;
}

export async function logoutAccount() {
  await fetch("/api/auth/logout", {
    method: "POST",
  });
}

export async function deleteAccount() {
  const response = await fetch("/api/profile", {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await readJson<{ error?: string }>(response);
    return {
      ok: false,
      error: data.error || "Unable to delete account.",
    };
  }

  return {
    ok: true,
    error: null,
  };
}

export async function fetchCurrentSessionProfile() {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await readJson<{ profile: ProfileState | null }>(response);
  return data.profile;
}

export async function saveProfile(profile: ProfileState) {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const data = await readJson<{ error?: string }>(response);
    return {
      profile: null,
      error: data.error || "Unable to save profile.",
    };
  }

  const data = await readJson<{ profile: ProfileState }>(response);
  return {
    profile: data.profile,
    error: null,
  };
}

export async function findStudentAccountByEmail(email: string) {
  const query = new URLSearchParams({
    email,
  });
  const response = await fetch(`/api/advisor/students/lookup?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const data = await readJson<{ error?: string }>(response);
    return {
      profile: null,
      error: data.error || "Unable to find that student account.",
    };
  }

  const data = await readJson<{ profile: ProfileState | null }>(response);
  return {
    profile: data.profile,
    error: null,
  };
}

export async function fetchAdvisorStudents() {
  const response = await fetch("/api/advisor/students", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const data = await readJson<{ error?: string }>(response);
    return {
      profiles: [] as ProfileState[],
      error: data.error || "Unable to load advisor students.",
    };
  }

  const data = await readJson<{ profiles: ProfileState[] }>(response);
  return {
    profiles: data.profiles ?? [],
    error: null,
  };
}

export async function addAdvisorStudent(email: string) {
  const response = await fetch("/api/advisor/students", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const data = await readJson<{ error?: string }>(response);
    return {
      profiles: [] as ProfileState[],
      error: data.error || "Unable to add student to advisor dashboard.",
    };
  }

  const data = await readJson<{ profiles: ProfileState[] }>(response);
  return {
    profiles: data.profiles ?? [],
    error: null,
  };
}
