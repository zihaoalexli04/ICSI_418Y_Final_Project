import { NextResponse } from "next/server";
import { getCourseBySlugFromDatabase } from "@/backend/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const course = await getCourseBySlugFromDatabase(slug);

  if (!course) {
    return NextResponse.json({ course: null, error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json({ course, error: null });
}
