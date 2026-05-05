import { NextRequest, NextResponse } from "next/server";
import { searchCoursesFromDatabase } from "@/backend/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
    const courses = await searchCoursesFromDatabase(query, Number.isFinite(limit) ? limit : 100);
    return NextResponse.json({ courses, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search courses.";
    return NextResponse.json({ courses: [], error: message }, { status: 500 });
  }
}
