"use client";

import Link from "next/link";
import { AppNavbar } from "@/frontend/components/app-navbar";
import { genEdCategories, getCourseById } from "@/shared/site-data";
import { useInactivityLogout, usePlannerSession, useProfileSession } from "@/frontend/lib/session";

export function GenEdPage() {
  const [profile] = useProfileSession();
  const [planner, setPlanner] = usePlannerSession();
  const isLoggedIn = Boolean(profile.firstName);

  useInactivityLogout(isLoggedIn);

  return (
    <div className="min-h-screen app-shell">
      <AppNavbar />

      <main className="page-wrap page-narrow">
        <Link href="/course_select" className="back-link">
          &larr; Back to Planner
        </Link>

        <section className="site-card profile-card anim-fade-in">
          <h1>General Education Requirements</h1>
          <p className="section-copy">
            Select the courses you have completed or plan to take for each General Education
            category.
          </p>

          <div className="gened-list">
            {genEdCategories.map((category) => (
              <div key={category.code} className="gened-item">
                <label className="gened-label">
                  {category.code} - {category.label}
                </label>
                <select
                  value={planner.genEdSelections[category.code] ?? ""}
                  onChange={(event) =>
                    setPlanner((current) => ({
                      ...current,
                      genEdSelections: {
                        ...current.genEdSelections,
                        [category.code]: event.target.value,
                      },
                    }))
                  }
                  className="site-input"
                >
                  <option value="">-- Select a Course --</option>
                  {category.options.map((courseId) => {
                    const course = getCourseById(courseId);
                    const label = course ? `${course.code} ${course.title}` : courseId;
                    return (
                      <option key={courseId} value={courseId}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
