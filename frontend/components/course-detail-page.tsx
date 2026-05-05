"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/frontend/components/app-navbar";
import { loadCourseFromBackend } from "@/frontend/lib/course-api";
import {
  getCourseBySlug,
  getFourYearPlanCourseIdsForMajor,
  majorCourseIds,
  prereqLine,
  type Course,
} from "@/shared/site-data";
import { useInactivityLogout, usePlannerSession, useProfileSession } from "@/frontend/lib/session";

function removeCourse(courseIds: string[], targetId: string) {
  return courseIds.filter((courseId) => courseId !== targetId);
}

function addCourse(courseIds: string[], targetId: string) {
  return courseIds.includes(targetId) ? courseIds : [...courseIds, targetId];
}

export function CourseDetailPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [profile] = useProfileSession();
  const [planner, setPlanner] = usePlannerSession();
  const [course, setCourse] = useState<Course | null>(() => getCourseBySlug(slug));
  const [loading, setLoading] = useState(!getCourseBySlug(slug));
  const isLoggedIn = Boolean(profile.firstName);

  useInactivityLogout(isLoggedIn);

  useEffect(() => {
    let active = true;

    const fetchCourse = async () => {
      if (course) {
        setLoading(false);
        return;
      }

      const { course: remoteCourse } = await loadCourseFromBackend(slug);
      if (!active) {
        return;
      }

      setCourse(remoteCourse);
      setLoading(false);
    };

    void fetchCourse();

    return () => {
      active = false;
    };
  }, [course, slug]);

  if (loading) {
    return (
      <div className="min-h-screen app-shell">
        <AppNavbar />
        <main className="page-wrap page-narrow">
          <section className="site-card detail-card anim-fade-in">
            <h1>Loading course...</h1>
            <p className="section-copy">Fetching course information from the catalog.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen app-shell">
        <AppNavbar />
        <main className="page-wrap page-narrow">
          <section className="site-card detail-card anim-fade-in">
            <h1>Course Not Found</h1>
            <p className="section-copy">
              This course was not found in the local catalog or the SQL `courses` table.
            </p>
            <Link href="/" className="site-button">
              Back to Search
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const alreadyAdded =
    planner.addedCourseIds.includes(course.id) ||
    planner.majorAddedCourseIds.includes(course.id) ||
    planner.semesterOneCourseIds.includes(course.id) ||
    planner.semesterTwoCourseIds.includes(course.id);
  const activeMajor = profile.primaryMajor || "Computer Science (B.S.)";
  const planCourseIds = getFourYearPlanCourseIdsForMajor(activeMajor);
  const activeMajorCourseIds = planCourseIds.length > 0 ? planCourseIds : majorCourseIds;
  const isMajorCourse = activeMajorCourseIds.includes(course.id);
  const wasRemovedMajorCourse = isMajorCourse && planner.removedCourseIds.includes(course.id);

  const handleAdd = () => {
    if (wasRemovedMajorCourse) {
      setPlanner({
        ...planner,
        addedCourseIds: removeCourse(planner.addedCourseIds, course.id),
        removedCourseIds: removeCourse(planner.removedCourseIds, course.id),
      });
      return;
    }

    if (alreadyAdded || isMajorCourse) {
      return;
    }

    setPlanner({
      ...planner,
      addedCourseIds: addCourse(planner.addedCourseIds, course.id),
    });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(isLoggedIn ? "/course_select" : "/");
  };

  return (
    <div className="min-h-screen app-shell">
      <AppNavbar />

      <main className="page-wrap page-narrow">
        <button type="button" className="back-link back-link-button" onClick={handleBack}>
          &larr; Back
        </button>

        <section className="site-card detail-card anim-fade-in">
          <h1>
            {course.code} - {course.title}
          </h1>
          <div className="badge">{course.credits} Credits</div>
          <p className="description">{course.desc}</p>

          <div className="detail-meta">
            <div>
              <span className="detail-label">Department</span>
              <span>{course.dept}</span>
            </div>
            <div>
              <span className="detail-label">Prerequisites</span>
              <span>{prereqLine(course.id)}</span>
            </div>
          </div>

          <button
            type="button"
            className="site-button"
            onClick={handleAdd}
            disabled={!wasRemovedMajorCourse && (alreadyAdded || isMajorCourse)}
          >
            {wasRemovedMajorCourse
              ? "Add to Major Courses"
              : (alreadyAdded || isMajorCourse ? "Already Selected" : "Add to Planner")}
          </button>
        </section>
      </main>
    </div>
  );
}
