"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/frontend/components/app-navbar";
import { addAdvisorStudent, fetchAdvisorStudents } from "@/frontend/lib/auth-client";
import { buildStudentCourseProgress } from "@/frontend/lib/course-progress";
import {
  findStudentByEmail,
  type AdvisorStudentRecord,
  mergeStudentProfileIntoDirectory,
  useInactivityLogout,
  useProfileSession,
  useStudentDirectorySession,
} from "@/frontend/lib/session";

export function AdvisorPage() {
  const router = useRouter();
  const [profile, , ready] = useProfileSession();
  const [studentDirectory, setStudentDirectory, directoryReady] = useStudentDirectorySession();
  const isLoggedIn = Boolean(profile.firstName);
  const [studentEmail, setStudentEmail] = useState("");
  const [matchMessage, setMatchMessage] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [assignedStudentEmails, setAssignedStudentEmails] = useState<string[]>([]);
  const [assignedStudentProfiles, setAssignedStudentProfiles] = useState<AdvisorStudentRecord[]>([]);
  const [isLoadingAssignedStudents, setIsLoadingAssignedStudents] = useState(false);

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
    if (!ready || !directoryReady || !isLoggedIn || profile.role !== "advisor") {
      return;
    }

    let active = true;
    setIsLoadingAssignedStudents(true);

    void fetchAdvisorStudents()
      .then((result) => {
        if (!active || result.error) {
          if (active && result.error) {
            setMatchMessage(result.error);
          }
          return;
        }

        let nextDirectory = studentDirectory;
        for (const studentProfile of result.profiles) {
          nextDirectory = mergeStudentProfileIntoDirectory(nextDirectory, studentProfile);
        }
        setStudentDirectory(nextDirectory);

        const emails = result.profiles.map((studentProfile) => studentProfile.email.trim().toLowerCase());
        setAssignedStudentEmails(emails);
        setAssignedStudentProfiles(
          result.profiles.map((studentProfile) => {
            const localStudent = findStudentByEmail(nextDirectory.students, studentProfile.email);
            return (
              localStudent ?? {
                id: studentProfile.email.trim().toLowerCase(),
                firstName: studentProfile.firstName,
                lastName: studentProfile.lastName,
                email: studentProfile.email.trim().toLowerCase(),
                major: studentProfile.primaryMajor || "Undeclared",
                academicYear: studentProfile.academicYear,
                status: studentProfile.selectionStatus || "participating",
                selectedCourseIds: [],
                majorAddedCourseIds: [],
                semesterOneCourseIds: [],
                semesterTwoCourseIds: [],
                advisorSuggestion: "",
              }
            );
          }),
        );
      })
      .finally(() => {
        if (active) {
          setIsLoadingAssignedStudents(false);
        }
      });

    return () => {
      active = false;
    };
  }, [directoryReady, isLoggedIn, profile.role, ready, setStudentDirectory]);

  const assignedStudents = useMemo(
    () =>
      assignedStudentProfiles
        .map((student) => findStudentByEmail(studentDirectory.students, student.email) ?? student)
        .filter((student): student is NonNullable<typeof student> => student !== null),
    [assignedStudentProfiles, studentDirectory.students],
  );

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAddingStudent(true);
    const result = await addAdvisorStudent(studentEmail);

    if (result.error) {
      setMatchMessage(result.error || "No student account matched that email yet.");
      setIsAddingStudent(false);
      return;
    }

    let nextDirectory = studentDirectory;
    for (const studentProfile of result.profiles) {
      nextDirectory = mergeStudentProfileIntoDirectory(nextDirectory, studentProfile);
    }
    setStudentDirectory(nextDirectory);

    const nextEmails = result.profiles.map((studentProfile) => studentProfile.email.trim().toLowerCase());
    const normalizedInputEmail = studentEmail.trim().toLowerCase();
    const alreadyAdded = assignedStudentEmails.includes(normalizedInputEmail);
    setAssignedStudentEmails(nextEmails);
    setAssignedStudentProfiles(
      result.profiles.map((studentProfile) => {
        const localStudent = findStudentByEmail(nextDirectory.students, studentProfile.email);
        return (
          localStudent ?? {
            id: studentProfile.email.trim().toLowerCase(),
            firstName: studentProfile.firstName,
            lastName: studentProfile.lastName,
            email: studentProfile.email.trim().toLowerCase(),
            major: studentProfile.primaryMajor || "Undeclared",
            academicYear: studentProfile.academicYear,
            status: studentProfile.selectionStatus || "participating",
            selectedCourseIds: [],
            majorAddedCourseIds: [],
            semesterOneCourseIds: [],
            semesterTwoCourseIds: [],
            advisorSuggestion: "",
          }
        );
      }),
    );
    setStudentEmail("");
    setMatchMessage(
      alreadyAdded
        ? "This student is already in your dashboard. Choose them below."
        : "Student added to Advisor Dashboard. Choose them below.",
    );
    setIsAddingStudent(false);
  };

  return (
    <div className="min-h-screen app-shell">
      <AppNavbar />

      <main className="page-wrap page-narrow">
        <section className="site-card profile-card anim-fade-in">
          <h1>Advisor Dashboard</h1>
          <p className="section-copy">
            Add students by email, then review their selected courses and leave advising feedback.
          </p>

          <form onSubmit={handleAddStudent} className="profile-form">
            <div className="form-group">
              <label className="site-label">Student Email</label>
              <input
                type="email"
                value={studentEmail}
                onChange={(event) => {
                  setStudentEmail(event.target.value);
                  setMatchMessage("");
                }}
                placeholder="student@albany.edu"
                required
                className="site-input"
              />
            </div>
            <button
              type="submit"
              className="site-button"
              disabled={!directoryReady || isAddingStudent}
            >
              {isAddingStudent ? "Adding..." : "Add Student"}
            </button>
            {matchMessage ? <p className="auth-feedback auth-feedback-success">{matchMessage}</p> : null}
          </form>

          <div className="advisor-student-list">
            {isLoadingAssignedStudents ? (
              <p className="section-copy">Loading saved students...</p>
            ) : null}
            {assignedStudents.length > 0 ? (
              assignedStudents.map((student) => {
                const progress = buildStudentCourseProgress(student);

                return (
                  <article key={student.id} className="advisor-student-row">
                    <div>
                      <h2>{student.firstName} {student.lastName}</h2>
                      <div className="advisor-student-meta">
                        <span><strong>Major:</strong> {student.major || "Undeclared"}</span>
                        <span><strong>Year:</strong> {student.academicYear || "Not provided"}</span>
                        <span><strong>Courses:</strong> {progress.selectedCourseIds.length}</span>
                        <span>
                          <strong>Major Courses:</strong>{" "}
                          {progress.selectedMajorCourseIds.length} / {progress.majorCourseCount}
                        </span>
                        <span>
                          <strong>Credits:</strong> {progress.totalCredits} / {progress.degreeTotalCredits}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/advisor/students/${student.id}?email=${encodeURIComponent(student.email)}`}
                      className="site-secondary-button"
                    >
                      View Plan
                    </Link>
                  </article>
                );
              })
            ) : (
              <p className="section-copy">
                No students added yet. Enter a student email above after that student has saved their profile.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
