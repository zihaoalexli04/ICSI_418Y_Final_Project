import { CourseDetailPage } from "@/frontend/components/course-detail-page";
import { allCourses } from "@/shared/site-data";

export function generateStaticParams() {
  return allCourses.map((course) => ({
    slug: course.id.toLowerCase(),
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CourseDetailPage slug={slug} />;
}
