import { NextResponse } from "next/server";
import { listCoursesFromDatabase } from "@/backend/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ courses: await listCoursesFromDatabase(), error: null });
}
