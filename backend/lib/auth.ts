import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createSessionForUser, deleteSession, getSessionUser } from "@/backend/lib/db";

export const SESSION_COOKIE = "planner_session";

export async function readSessionProfile() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return await getSessionUser(token);
}

export async function attachSessionCookie(response: NextResponse, userId: string) {
  const session = await createSessionForUser(userId);

  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export async function clearSessionCookie(response: NextResponse) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await deleteSession(token);
  }

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
