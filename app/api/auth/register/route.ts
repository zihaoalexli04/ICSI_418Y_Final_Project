import { NextResponse } from "next/server";
import { attachSessionCookie } from "@/backend/lib/auth";
import { createUserRecord, getProfileByUserId } from "@/backend/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: string;
    primaryMajor?: string;
  };

  const role = body.role === "advisor" ? "advisor" : "student";

  if (!body.firstName || !body.lastName || !body.email || !body.password) {
    return NextResponse.json({ error: "Missing required registration fields." }, { status: 400 });
  }

  const result = await createUserRecord({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    password: body.password,
    role,
    primaryMajor: role === "advisor" ? "" : (body.primaryMajor || ""),
  });

  if (result.error || !result.userId) {
    return NextResponse.json({ error: result.error || "Unable to create account." }, { status: 400 });
  }

  if (result.requiresEmailConfirmation) {
    return NextResponse.json({
      error: null,
      profile: null,
      requiresEmailConfirmation: true,
    });
  }

  const profile = await getProfileByUserId(result.userId);
  const response = NextResponse.json({
    error: null,
    profile,
    requiresEmailConfirmation: result.requiresEmailConfirmation,
  });

  await attachSessionCookie(response, result.userId);
  return response;
}
