"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/frontend/components/app-navbar";
import {
  creditsFor,
  csDegree,
  getFourYearPlanCourseCodeById,
  getFourYearPlanCourseIdsForMajor,
  getCourseById,
  majorCourseIds,
  toCourseSlug,
} from "@/shared/site-data";
import {
  collectSelectedCourseIds,
  findAdvisorStudentForProfile,
  useInactivityLogout,
  usePlannerSession,
  useProfileSession,
  syncStudentToDirectory,
  useStudentDirectorySession,
} from "@/frontend/lib/session";

function removeCourse(courseIds: string[], targetId: string) {
  return courseIds.filter((courseId) => courseId !== targetId);
}

function addCourse(courseIds: string[], targetId: string) {
  return courseIds.includes(targetId) ? courseIds : [...courseIds, targetId];
}

function parseCourseId(courseId: string) {
  const match = courseId.match(/^([A-Z]+)(\d+)/);
  return {
    prefix: match?.[1] ?? courseId,
    number: match ? Number(match[2]) : Number.MAX_SAFE_INTEGER,
  };
}

function sortCourseIds(courseIds: string[]) {
  return [...courseIds].sort((left, right) => {
    const leftCourse = parseCourseId(left);
    const rightCourse = parseCourseId(right);
    const prefixComparison = leftCourse.prefix.localeCompare(rightCourse.prefix);
    if (prefixComparison !== 0) {
      return prefixComparison;
    }

    if (leftCourse.number !== rightCourse.number) {
      return leftCourse.number - rightCourse.number;
    }

    return left.localeCompare(right);
  });
}

function groupCourseIds(courseIds: string[]) {
  return sortCourseIds(courseIds).reduce<Array<{ prefix: string; courseIds: string[] }>>(
    (groups, courseId) => {
      const { prefix } = parseCourseId(courseId);
      const currentGroup = groups.at(-1);
      if (currentGroup?.prefix === prefix) {
        currentGroup.courseIds.push(courseId);
        return groups;
      }

      groups.push({ prefix, courseIds: [courseId] });
      return groups;
    },
    [],
  );
}

export function CourseSelectPage() {
  const router = useRouter();
  const [profile, , profileReady] = useProfileSession();
  const [planner, setPlanner, plannerReady] = usePlannerSession();
  const [studentDirectory, setStudentDirectory, directoryReady] = useStudentDirectorySession();
  const [courseDropActive, setCourseDropActive] = useState(false);
  const isLoggedIn = Boolean(profile.firstName);
  const isAdvisor = profile.role === "advisor";

  useInactivityLogout(isLoggedIn);

  useEffect(() => {
    if (!profileReady) {
      return;
    }

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (isAdvisor) {
      router.replace("/advisor");
    }
  }, [isAdvisor, isLoggedIn, profileReady, router]);

  useEffect(() => {
    if (!profileReady || !plannerReady || !directoryReady || !isLoggedIn || isAdvisor) {
      return;
    }

    setStudentDirectory((current) => syncStudentToDirectory(current, profile, planner));
  }, [directoryReady, isAdvisor, isLoggedIn, planner, plannerReady, profile, profileReady, setStudentDirectory]);

  const selectedCourseIds = new Set([...planner.semesterOneCourseIds, ...planner.semesterTwoCourseIds]);
  const activeMajor = profile.primaryMajor || "Computer Science (B.S.)";
  const planCourseIds = getFourYearPlanCourseIdsForMajor(activeMajor);
  const baseCourseIds = planCourseIds.length > 0 ? planCourseIds : majorCourseIds;
  const baseCourseIdSet = new Set(baseCourseIds);
  const majorAddedCourseIds = planner.majorAddedCourseIds.filter((courseId) => !baseCourseIdSet.has(courseId));
  const removedCourseIdSet = new Set(planner.removedCourseIds);
  const courseIds = [
    ...baseCourseIds.filter((courseId) => !removedCourseIdSet.has(courseId)),
    ...majorAddedCourseIds,
  ];
  const courseGroups = groupCourseIds(courseIds);
  const courseIdSet = new Set([...baseCourseIds, ...majorAddedCourseIds]);
  const electives = planner.addedCourseIds.filter((courseId) => !courseIdSet.has(courseId));
  const currentStudent = findAdvisorStudentForProfile(studentDirectory.students, profile);
  const advisorFeedback = currentStudent?.advisorSuggestion.trim() ?? "";
  const allSelectedCourseIds = collectSelectedCourseIds(planner);

  const totalCredits = allSelectedCourseIds.reduce(
    (sum, courseId) => sum + creditsFor(courseId),
    0,
  );

  const percentage = Math.min(
    100,
    Math.round((totalCredits / csDegree.totalCredits) * 100),
  );

  const earnedCreditYearLabel =
    totalCredits >= 90
      ? "Senior"
      : totalCredits >= 60
        ? "Junior"
        : totalCredits >= 30
          ? "Sophomore"
          : "Freshman";
  const yearLabel = profile.academicYear || earnedCreditYearLabel;

  const toggleCourse = (courseId: string, checked: boolean) => {
    setPlanner((current) => ({
      ...current,
      semesterOneCourseIds: checked
        ? addCourse(current.semesterOneCourseIds, courseId)
        : removeCourse(current.semesterOneCourseIds, courseId),
      semesterTwoCourseIds: removeCourse(current.semesterTwoCourseIds, courseId),
    }));
  };

  const removeElective = (courseId: string) => {
    setPlanner((current) => ({
      ...current,
      addedCourseIds: removeCourse(current.addedCourseIds, courseId),
      semesterOneCourseIds: removeCourse(current.semesterOneCourseIds, courseId),
      semesterTwoCourseIds: removeCourse(current.semesterTwoCourseIds, courseId),
    }));
  };

  const removePlanCourse = (courseId: string) => {
    setPlanner((current) => ({
      ...current,
      majorAddedCourseIds: removeCourse(current.majorAddedCourseIds, courseId),
      removedCourseIds: baseCourseIdSet.has(courseId)
        ? addCourse(current.removedCourseIds, courseId)
        : current.removedCourseIds,
      semesterOneCourseIds: removeCourse(current.semesterOneCourseIds, courseId),
      semesterTwoCourseIds: removeCourse(current.semesterTwoCourseIds, courseId),
    }));
  };

  const moveCourseToMajorCourses = (courseId: string) => {
    setPlanner((current) => ({
      ...current,
      addedCourseIds: removeCourse(current.addedCourseIds, courseId),
      majorAddedCourseIds: baseCourseIdSet.has(courseId)
        ? current.majorAddedCourseIds
        : addCourse(current.majorAddedCourseIds, courseId),
      removedCourseIds: removeCourse(current.removedCourseIds, courseId),
    }));
  };

  return (
    <div className="min-h-screen app-shell">
      <AppNavbar />

      <header className="page-wrap planner-header">
        <section className="site-card profile-summary">
          <div className="profile-summary-grid">
            <div>
              <h2 className="accent-heading">Student Profile</h2>
              <div className="info-grid">
                <strong>Name:</strong>
                <span>
                  {profile.firstName ? `${profile.firstName} ${profile.lastName}` : "Guest Student"}
                </span>
                <strong>Major:</strong>
                <span>{activeMajor}</span>
                <strong>Academic Year:</strong>
                <span>{yearLabel}</span>
              </div>
            </div>
            <div className="profile-summary-side">
              <div className="profile-progress">
                <h3>Your Progress</h3>
                <div className="stat-grid">
                  <div className="stat">
                    <label>Completion</label>
                    <div className="value">{percentage}%</div>
                    <div className="progress">
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  <div className="stat">
                    <label>Credits Earned</label>
                    <div className="value">
                      {totalCredits} / {csDegree.totalCredits}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </header>

      <main className="page-wrap planner-grid">
        <section
          className="site-card site-card-span anim-fade-in"
          style={{ animationDelay: "0.02s" }}
        >
          <div className="advisor-feedback-layout">
            <div>
              <h2>Advisor Feedback</h2>
              <p className="section-copy">Latest guidance from your advisor will appear here.</p>
            </div>
            <div className="advisor-feedback-box">
              {advisorFeedback || "No advisor feedback yet"}
            </div>
          </div>
        </section>

        <section
          className={
            courseDropActive
              ? "site-card site-card-span anim-fade-in course-drop-zone course-drop-zone-active"
              : "site-card site-card-span anim-fade-in course-drop-zone"
          }
          style={{ animationDelay: "0.05s" }}
          onDragOver={(event) => {
            event.preventDefault();
            setCourseDropActive(true);
          }}
          onDragLeave={(event) => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setCourseDropActive(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setCourseDropActive(false);
            const courseId = event.dataTransfer.getData("text/plain");
            if (courseId) {
              moveCourseToMajorCourses(courseId);
            }
          }}
        >
          <div className="section-row semester-row">
            <div>
              <h2>Courses</h2>
              <p className="section-copy">
                Showing {courseIds.length} courses from the four-year plan for {activeMajor}.
              </p>
            </div>
          </div>
          {courseGroups.length > 0 ? (
            <div className="course-group-list">
              {courseGroups.map((group) => (
                <div key={group.prefix} className="course-group">
                  <h3 className="course-group-heading">{group.prefix}</h3>
                  <div className="checkbox-grid">
                    {group.courseIds.map((courseId) => {
                      const course = getCourseById(courseId);
                      const planCode = getFourYearPlanCourseCodeById(courseId);
                      if (!course && !planCode) {
                        return null;
                      }

                      const displayCode = planCode ?? course?.code ?? courseId;

                      return (
                        <label key={courseId} className="course-check">
                          <input
                            type="checkbox"
                            checked={selectedCourseIds.has(courseId)}
                            onChange={(event) => toggleCourse(courseId, event.target.checked)}
                          />
                          <div className="flex-1">
                            <div className="course-title">
                              {course ? (
                                <Link href={`/course_detail/${toCourseSlug(course.id)}`} className="course-link">
                                  {displayCode} {course.title}
                                </Link>
                              ) : (
                                <span>{displayCode}</span>
                              )}{" "}
                              {course ? <span className="course-credit">({course.credits} credits)</span> : null}
                            </div>
                            <div className="course-meta">
                              {course
                                ? (course.prereqs.length > 0 ? `Prereq count: ${course.prereqs.length}` : "No prerequisites")
                                : "From four-year plan"}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="remove-button"
                            aria-label={`Remove ${displayCode}`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              removePlanCourse(courseId);
                            }}
                          >
                            ×
                          </button>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="course-meta elective-empty-state">No courses to display</div>
          )}
        </section>

        <section
          className="site-card site-card-span anim-fade-in"
          style={{ animationDelay: "0.08s" }}
        >
          <h2>Electives / Other Courses</h2>
          <p className="section-copy">
            Courses added from search that are not listed in your current major's four-year plan.
          </p>
          {electives.length > 0 ? (
            <div className="checkbox-grid">
              {electives.map((courseId) => {
                const course = getCourseById(courseId);
                return (
                  <label
                    key={courseId}
                    className="course-check draggable-course"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", courseId);
                    }}
                    onDragEnd={() => setCourseDropActive(false)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.has(courseId)}
                      onChange={(event) => toggleCourse(courseId, event.target.checked)}
                    />
                    <div className="flex-1">
                      <div className="course-title">
                        {course ? (
                          <Link href={`/course_detail/${toCourseSlug(course.id)}`} className="course-link">
                            {course.code} {course.title}
                          </Link>
                        ) : (
                          courseId
                        )}
                      </div>
                      <div className="course-meta">Elective</div>
                    </div>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeElective(courseId);
                      }}
                    >
                      ×
                    </button>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="course-meta elective-empty-state">No elective courses added yet</div>
          )}
        </section>

      </main>
    </div>
  );
}
