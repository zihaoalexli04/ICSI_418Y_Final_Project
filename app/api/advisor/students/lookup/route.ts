import { NextResponse } from "next/server";
import { readSessionProfile } from "@/backend/lib/auth";
import { findStudentProfileByEmail } from "@/backend/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const currentProfile = await readSessionProfile();
  if (!currentProfile || currentProfile.role !== "advisor") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Student email is required." }, { status: 400 });
  }

  const profile = await findStudentProfileByEmail(email);
  if (!profile) {
    return NextResponse.json({ error: "No student account matched that email yet." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}
