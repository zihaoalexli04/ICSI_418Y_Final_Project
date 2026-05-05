"use client";

import type { FormEvent } from "react";
import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/frontend/components/app-navbar";
import { deleteAccount, saveProfile } from "@/frontend/lib/auth-client";
import {
  clearAllSessionData,
  defaultProfile,
  syncStudentToDirectory,
  useInactivityLogout,
  usePlannerSession,
  useProfileSession,
  useStudentDirectorySession,
} from "@/frontend/lib/session";
import { availableMajors, normalizeMajorName } from "@/shared/site-data";

export function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile, ready] = useProfileSession();
  const [planner] = usePlannerSession();
  const [, setStudentDirectory] = useStudentDirectorySession();
  const isLoggedIn = Boolean(profile.firstName);
  const isAdvisor = profile.role === "advisor";
  const [majorQuery, setMajorQuery] = useState<string | null>(null);
  const [showMajorOptions, setShowMajorOptions] = useState(false);
  const [majorError, setMajorError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const majorInputValue = majorQuery ?? profile.primaryMajor;
  const deferredMajorQuery = useDeferredValue(majorInputValue);

  useInactivityLogout(isLoggedIn);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
  }, [isLoggedIn, ready, router]);

  useEffect(() => {
    if (isAdvisor) {
      return;
    }

    const normalizedMajor = normalizeMajorName(profile.primaryMajor);
    if (!normalizedMajor || normalizedMajor === profile.primaryMajor) {
      return;
    }

    setProfile({
      ...profile,
      primaryMajor: normalizedMajor,
      secondaryMajor: "",
    });
  }, [isAdvisor, profile, setProfile]);

  const filteredMajors = availableMajors
    .filter((major) =>
      major.toLowerCase().includes(deferredMajorQuery.trim().toLowerCase()),
    )
    .slice(0, 8);

  const selectMajor = (major: string) => {
    setMajorQuery(major);
    setShowMajorOptions(false);
    setMajorError("");
    setProfile({
      ...profile,
      primaryMajor: major,
      secondaryMajor: "",
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdvisor && !profile.primaryMajor) {
      setMajorError("Please choose a major from the list.");
      return;
    }

    const nextProfile = {
      ...profile,
      primaryMajor: isAdvisor ? "" : profile.primaryMajor,
      secondaryMajor: "",
      academicYear: isAdvisor ? "" : profile.academicYear,
      selectionStatus: "participating",
      resumeName: "",
    };

    void saveProfile(nextProfile).then((result) => {
      const savedProfile = result.profile ?? nextProfile;
      setProfile(savedProfile);

      if (savedProfile.role !== "advisor") {
        setStudentDirectory((current) => syncStudentToDirectory(current, savedProfile, planner));
      }

      router.push(savedProfile.role === "advisor" ? "/advisor" : "/course_select");
    });
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete this account permanently? This action cannot be undone.")) {
      return;
    }

    setDeleteError("");
    setIsDeletingAccount(true);

    const result = await deleteAccount();
    if (!result.ok) {
      setDeleteError(result.error || "Unable to delete account.");
      setIsDeletingAccount(false);
      return;
    }

    clearAllSessionData();
    setProfile(defaultProfile);
    router.push("/login");
  };

  return (
    <div className="min-h-screen app-shell">
      <AppNavbar />

      <main className="page-wrap page-narrow">
        <section className="site-card profile-card anim-fade-in">
          <Link href={isAdvisor ? "/advisor" : "/course_select"} className="back-link">
            &larr; Back to Dashboard
          </Link>

          <h1>Personal Information</h1>
          <p className="section-copy">
            Please update your profile details and privacy settings below.
          </p>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label className="site-label">First Name</label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    firstName: event.target.value,
                  })
                }
                placeholder="e.g. Jane"
                required
                className="site-input"
              />
            </div>

            <div className="form-group">
              <label className="site-label">Last Name</label>
              <input
                type="text"
                value={profile.lastName}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    lastName: event.target.value,
                  })
                }
                placeholder="e.g. Doe"
                required
                className="site-input"
              />
            </div>

            {!isAdvisor ? (
              <>
                <div className="form-group">
                  <label className="site-label">Primary Major</label>
                  <div className="major-search">
                    <input
                      type="text"
                      value={majorInputValue}
                      onChange={(event) => {
                        const nextQuery = event.target.value;
                        const exactMatch = availableMajors.find(
                          (major) => major.toLowerCase() === nextQuery.trim().toLowerCase(),
                        );

                        setMajorQuery(nextQuery);
                        setShowMajorOptions(true);
                        setMajorError("");
                        setProfile({
                          ...profile,
                          primaryMajor: exactMatch ?? "",
                          secondaryMajor: "",
                        });
                      }}
                      onFocus={() => setShowMajorOptions(true)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setShowMajorOptions(false);
                        }, 120);
                      }}
                      placeholder="Type keywords to find your major..."
                      required
                      className="site-input"
                    />
                    {showMajorOptions && filteredMajors.length > 0 ? (
                      <div className="major-option-list">
                        {filteredMajors.map((major) => (
                          <button
                            key={major}
                            type="button"
                            className="major-option"
                            onClick={() => selectMajor(major)}
                          >
                            {major}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {majorError ? <p className="auth-feedback auth-feedback-error">{majorError}</p> : null}
                </div>

                <div className="form-group">
                  <label className="site-label">Academic Year</label>
                  <select
                    value={profile.academicYear}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        academicYear: event.target.value,
                      })
                    }
                    required
                    className="site-input"
                  >
                    <option value="">Select your year</option>
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </>
            ) : null}

            <button type="submit" className="site-button">
              Save Profile
            </button>
          </form>

          <section className="danger-zone">
            <div>
              <h2 className="danger-zone-title">Delete Account</h2>
              <p className="section-copy">
                Permanently remove this account and its saved profile data.
              </p>
            </div>
            <button
              type="button"
              className="site-danger-button"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? "Deleting..." : "Delete Account"}
            </button>
          </section>
          {deleteError ? <p className="auth-feedback auth-feedback-error">{deleteError}</p> : null}

          <div className="privacy-note">
            <strong>Privacy Notice:</strong> Your personal information is stored locally in this
            browser session for the demo.
          </div>
        </section>
      </main>
    </div>
  );
}
