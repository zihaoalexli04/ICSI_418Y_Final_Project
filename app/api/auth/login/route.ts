import { NextResponse } from "next/server";
import { attachSessionCookie } from "@/backend/lib/auth";
import { getProfileByUserId, loginUserWithPassword } from "@/backend/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const loginResult = await loginUserWithPassword(body.email, body.password);
  if (loginResult.error || !loginResult.userId) {
    return NextResponse.json(
      { error: loginResult.error || "Invalid email or password.", profile: null, requiresEmailConfirmation: false },
      { status: 401 },
    );
  }

  const profile = await getProfileByUserId(loginResult.userId);
  const response = NextResponse.json({
    error: null,
    profile,
    requiresEmailConfirmation: false,
  });

  await attachSessionCookie(response, loginResult.userId);
  return response;
}
