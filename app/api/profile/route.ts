import { NextResponse } from "next/server";
import { clearSessionCookie, readSessionProfile, SESSION_COOKIE } from "@/backend/lib/auth";
import { deleteUserAccountById, getSessionUserId, updateProfileByUserId } from "@/backend/lib/db";
import type { ProfileState } from "@/frontend/lib/session";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const profile = await readSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await getSessionUserId(token);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as ProfileState;
  const updated = await updateProfileByUserId(userId, body);
  if (!updated) {
    return NextResponse.json({ error: "Unable to update profile." }, { status: 400 });
  }

  return NextResponse.json({ profile: updated });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await getSessionUserId(token);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await deleteUserAccountById(userId);
  } catch {
    return NextResponse.json({ error: "Unable to delete account." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  await clearSessionCookie(response);
  return response;
}
