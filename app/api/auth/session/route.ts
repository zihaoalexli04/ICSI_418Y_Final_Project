import { NextResponse } from "next/server";
import { readSessionProfile } from "@/backend/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const profile = await readSessionProfile();
  return NextResponse.json({ profile });
}
