import type { Course } from "@/shared/site-data";

export async function loadCoursesFromBackend() {
  const response = await fetch("/api/courses", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    return {
      courses: [] as Course[],
      error: data.error || "Unable to load courses.",
    };
  }

  return (await response.json()) as { courses: Course[]; error: string | null };
}

export async function loadCourseFromBackend(slug: string) {
  const response = await fetch(`/api/courses/${slug}`, {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json()) as { course: Course | null; error: string | null };
  return data;
}

export async function searchCoursesFromBackend(query: string, limit = 100) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const response = await fetch(`/api/courses/search?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    return {
      courses: [] as Course[],
      error: data.error || "Unable to search courses.",
    };
  }

  return (await response.json()) as { courses: Course[]; error: string | null };
}
