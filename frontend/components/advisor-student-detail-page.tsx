"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppNavbar } from "@/frontend/components/app-navbar";
import { buildStudentCourseProgress, formatCourseDisplay } from "@/frontend/lib/course-progress";
import { findStudentAccountByEmail } from "@/frontend/lib/auth-client";
import {
  findStudentByEmail,
  mergeStudentProfileIntoDirectory,
  useInactivityLogout,
  useProfileSession,
  useStudentDirectorySession,
  type AdvisorStudentRecord,
} from "@/frontend/lib/session";
import { creditsFor } from "@/shared/site-data";

function CourseListSection({
  title,
  courseIds,
  emptyMessage,
}: {
  title: string;
  courseIds: string[];
  emptyMessage: string;
}) {
  return (
    <section className="advisor-detail-section">
      <h2>{title}</h2>
      {courseIds.length > 0 ? (
        <ul className="list">
          {courseIds.map((courseId) => (
            <li key={courseId} className="advisor-course-list-item">
              <span>{formatCourseDisplay(courseId)}</span>
              <span className="course-meta">{creditsFor(courseId)} credits</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="section-copy">{emptyMessage}</p>
      )}
    </section>
  );
}

function AdvisorSuggestionForm({
  studentId,
  initialSuggestion,
  setStudentDirectory,
}: {
  studentId: string;
  initialSuggestion: string;
  setStudentDirectory: ReturnType<typeof useStudentDirectorySession>[1];
}) {
  const [suggestion, setSuggestion] = useState(initialSuggestion);
  const [saveMessage, setSaveMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStudentDirectory((current) => ({
      students: current.students.map((entry) =>
        entry.id === studentId
          ? {
              ...entry,
              advisorSuggestion: suggestion.trim(),
            }
          : entry,
      ),
    }));
    setSaveMessage("Suggestion saved.");
  };

  return (
    <form onSubmit={handleSubmit} className="advisor-detail-section">
      <h2>Advisor Suggestion</h2>
      <textarea
        value={suggestion}
        onChange={(event) => setSuggestion(event.target.value)}
        placeholder="Add recommendation for this student's plan..."
        rows={6}
        className="site-input site-textarea"
      />
      {saveMessage ? <p className="auth-feedback auth-feedback-success">{saveMessage}</p> : null}
      <button type="submit" className="site-button">
        Save Suggestion
      </button>
    </form>
  );
}

export function AdvisorStudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profile, , ready] = useProfileSession();
  const [studentDirectory, setStudentDirectory] = useStudentDirectorySession();
  const isLoggedIn = Boolean(profile.firstName);
  const studentId = typeof params.studentId === "string" ? params.studentId : "";
  const studentEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [remoteStudent, setRemoteStudent] = useState<AdvisorStudentRecord | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const localStudentById = studentDirectory.students.find((entry) => entry.id === studentId) ?? null;
  const localStudentByEmail = studentEmail ? findStudentByEmail(studentDirectory.students, studentEmail) : null;
  const student = remoteStudent ?? localStudentById ?? localStudentByEmail;
  const progress = student ? buildStudentCourseProgress(student) : null;

  useInactivityLogout(isLoggedIn);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (profile.role !== "advisor") {
      router.replace("/course_select");
    }
  }, [isLoggedIn, profile.role, ready, router]);

  useEffect(() => {
    if (!ready || !isLoggedIn || profile.role !== "advisor") {
      return;
    }

    if (!studentEmail) {
      setRemoteStudent(null);
      setLookupError("Student email is missing.");
      return;
    }

    let active = true;
    setIsLoadingStudent(true);
    setLookupError("");

    void findStudentAccountByEmail(studentEmail)
      .then((result) => {
        if (!active) {
          return;
        }

        if (result.error || !result.profile) {
          setRemoteStudent(null);
          setLookupError(result.error || "No student account matched that email yet.");
          return;
        }

        const nextDirectory = mergeStudentProfileIntoDirectory(studentDirectory, result.profile);
        const syncedStudent = findStudentByEmail(nextDirectory.students, result.profile.email);
        setStudentDirectory(nextDirectory);

        if (syncedStudent) {
          setRemoteStudent(syncedStudent);
          return;
        }

        setRemoteStudent({
          id: studentId || result.profile.email.trim().toLowerCase(),
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
          email: result.profile.email.trim().toLowerCase(),
          major: result.profile.primaryMajor || "Undeclared",
          academicYear: result.profile.academicYear,
          status: result.profile.selectionStatus || "participating",
          selectedCourseIds: [],
          majorAddedCourseIds: [],
          semesterOneCourseIds: [],
          semesterTwoCourseIds: [],
          advisorSuggestion: "",
        });
      })
      .finally(() => {
        if (active) {
          setIsLoadingStudent(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isLoggedIn, profile.role, ready, setStudentDirectory, studentDirectory, studentEmail, studentId]);

  return (
    <div className="min-h-screen app-shell">
      <AppNavbar />

      <main className="page-wrap page-narrow">
        <section className="site-card profile-card anim-fade-in">
          <Link href="/advisor" className="back-link">
            &larr; Back to Advisor Dashboard
          </Link>

          {isLoadingStudent ? (
            <>
              <h1>Loading Student</h1>
              <p className="section-copy">Looking up the student account by email.</p>
            </>
          ) : student ? (
            <>
              <h1>{student.firstName} {student.lastName}</h1>
              <div className="advisor-detail-summary">
                <span><strong>Major:</strong> {student.major || "Undeclared"}</span>
                <span><strong>Year:</strong> {student.academicYear || "Not provided"}</span>
                <span><strong>Email:</strong> {student.email}</span>
              </div>

              <section className="advisor-detail-section">
                <h2>Course Learning Progress</h2>
                <div className="stat-grid">
                  <div className="stat">
                    <label>Selected Courses</label>
                    <div className="value">{progress?.selectedCourseIds.length ?? 0}</div>
                  </div>
                  <div className="stat">
                    <label>Major Course Completion</label>
                    <div className="value">
                      {progress?.selectedMajorCourseIds.length ?? 0} / {progress?.majorCourseCount ?? 0}
                    </div>
                    <div className="progress">
                      <span style={{ width: `${progress?.majorCompletionPercent ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="stat">
                    <label>Total Credits</label>
                    <div className="value">
                      {progress?.totalCredits ?? 0} / {progress?.degreeTotalCredits ?? 120}
                    </div>
                  </div>
                </div>
              </section>

              <CourseListSection
                title="Major Course"
                courseIds={progress?.selectedMajorCourseIds ?? []}
                emptyMessage="No major courses selected yet."
              />
              <CourseListSection
                title="Elective Course"
                courseIds={progress?.selectedElectiveCourseIds ?? []}
                emptyMessage="No elective courses selected yet."
              />
              <AdvisorSuggestionForm
                key={student.id}
                studentId={student.id}
                initialSuggestion={student.advisorSuggestion}
                setStudentDirectory={setStudentDirectory}
              />
            </>
          ) : (
            <>
              <h1>Student Not Found</h1>
              <p className="section-copy">
                {lookupError || "No student account matched the email provided on the advisor page."}
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
