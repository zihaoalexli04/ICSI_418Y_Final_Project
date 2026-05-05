import { NextResponse } from "next/server";
import { readSessionProfile, SESSION_COOKIE } from "@/backend/lib/auth";
import {
  addStudentEmailToAdvisorByUserId,
  getSessionUserId,
  listAdvisorStudentProfilesByUserId,
} from "@/backend/lib/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const currentProfile = await readSessionProfile();
  if (!currentProfile || currentProfile.role !== "advisor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await getSessionUserId(token);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profiles = await listAdvisorStudentProfilesByUserId(userId);
  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const currentProfile = await readSessionProfile();
  if (!currentProfile || currentProfile.role !== "advisor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await getSessionUserId(token);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    email?: string;
  };
  const email = body.email?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Student email is required." }, { status: 400 });
  }

  const result = await addStudentEmailToAdvisorByUserId(userId, email);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ profiles: result.profiles });
}
