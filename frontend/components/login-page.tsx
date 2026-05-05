"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAccount, registerAccount } from "@/frontend/lib/auth-client";
import { useProfileSession } from "@/frontend/lib/session";

type RegisterRole = "student" | "advisor";

export function LoginPage() {
  const router = useRouter();
  const [profile, setProfile] = useProfileSession();
  const [showRegister, setShowRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerState, setRegisterState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student" as RegisterRole,
    primaryMajor: "Computer Science (B.S.)",
  });
  const [overlayName, setOverlayName] = useState("");
  const [overlayTarget, setOverlayTarget] = useState("/");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile.firstName && !overlayName) {
      router.push(profile.role === "advisor" ? "/advisor" : "/course_select");
    }
  }, [overlayName, profile.firstName, profile.role, router]);

  useEffect(() => {
    if (!overlayName) {
      return;
    }

    let current = 0;
    const interval = window.setInterval(() => {
      current += 1;
      setProgress(current);
      if (current >= 100) {
        window.clearInterval(interval);
        window.setTimeout(() => {
          router.push(overlayTarget);
        }, 400);
      }
    }, 20);

    return () => {
      window.clearInterval(interval);
    };
  }, [overlayName, overlayTarget, router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthError("");
    setStatusMessage("");

    const result = await loginAccount(loginEmail, loginPassword);

    if (result.error || !result.profile) {
      setAuthError(result.error || "Login succeeded, but no profile data was returned.");
      setIsSubmitting(false);
      return;
    }

    setProfile(result.profile);
    setOverlayName(result.profile.firstName || loginEmail.split("@")[0] || "Student");
    setOverlayTarget(result.profile.role === "advisor" ? "/advisor" : "/course_select");
    setProgress(0);
    setLoginPassword("");
    setIsSubmitting(false);
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthError("");
    setStatusMessage("");

    const result = await registerAccount({
      ...registerState,
      role: registerState.role,
      primaryMajor: registerState.role === "advisor" ? "" : registerState.primaryMajor,
    });

    if (result.error) {
      setAuthError(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.requiresEmailConfirmation) {
      setStatusMessage("Account created. Check your email and confirm the account before logging in.");
      setShowRegister(false);
      setRegisterState({
        firstName: "",
        lastName: "",
        email: registerState.email,
        password: "",
        role: registerState.role,
        primaryMajor: "Computer Science (B.S.)",
      });
      setIsSubmitting(false);
      return;
    }

    if (!result.profile) {
      setAuthError("Account created, but the app could not start a login session.");
      setIsSubmitting(false);
      return;
    }

    setProfile(result.profile);
    setOverlayName(result.profile.firstName || "Student");
    setOverlayTarget("/profile");
    setProgress(0);
    setIsSubmitting(false);
  };

  return (
    <div className="auth-page">
      <div className="login-wrapper login-wrapper-animated">
        <div className="login-left">
          <h1>USER LOGIN</h1>
          <p className="login-copy">
            Register and login now use Supabase authentication and database before entering the planner.
          </p>
        </div>

        <div className="divider login-divider" />

        <div className="login-right">
          {!showRegister ? (
            <form onSubmit={handleLogin} className="auth-form">
              <h2>Sign In</h2>
              <input
                type="text"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="Email"
                required
                className="site-input"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                required
                className="site-input"
              />
              {authError ? <p className="auth-feedback auth-feedback-error">{authError}</p> : null}
              {statusMessage ? (
                <p className="auth-feedback auth-feedback-success">{statusMessage}</p>
              ) : null}
              <button type="submit" className="site-button" disabled={isSubmitting}>
                {isSubmitting ? "SIGNING IN..." : "LOGIN"}
              </button>
              <p className="auth-switch">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="inline-link"
                  onClick={() => {
                    setShowRegister(true);
                    setAuthError("");
                    setStatusMessage("");
                  }}
                >
                  Create one
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <h2>Create Account</h2>
              <div className="form-group">
                <label className="site-label">Account Type</label>
                <div className="account-type-picker" role="tablist" aria-label="Account type">
                  <button
                    type="button"
                    className={`account-type-option ${registerState.role === "student" ? "account-type-option-active" : ""}`}
                    onClick={() =>
                      setRegisterState((current) => ({
                        ...current,
                        role: "student",
                      }))
                    }
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    className={`account-type-option ${registerState.role === "advisor" ? "account-type-option-active" : ""}`}
                    onClick={() =>
                      setRegisterState((current) => ({
                        ...current,
                        role: "advisor",
                        primaryMajor: "",
                      }))
                    }
                  >
                    Advisor
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={registerState.firstName}
                onChange={(event) =>
                  setRegisterState((current) => ({ ...current, firstName: event.target.value }))
                }
                placeholder="First Name"
                required
                className="site-input"
              />
              <input
                type="text"
                value={registerState.lastName}
                onChange={(event) =>
                  setRegisterState((current) => ({ ...current, lastName: event.target.value }))
                }
                placeholder="Last Name"
                required
                className="site-input"
              />
              <input
                type="text"
                value={registerState.email}
                onChange={(event) =>
                  setRegisterState((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="Email"
                required
                className="site-input"
              />
              <input
                type="password"
                value={registerState.password}
                onChange={(event) =>
                  setRegisterState((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Password"
                required
                className="site-input"
              />
              {authError ? <p className="auth-feedback auth-feedback-error">{authError}</p> : null}
              {statusMessage ? (
                <p className="auth-feedback auth-feedback-success">{statusMessage}</p>
              ) : null}
              <button type="submit" className="site-button" disabled={isSubmitting}>
                {isSubmitting ? "CREATING..." : "CREATE ACCOUNT"}
              </button>
              <p className="auth-switch">
                Already have an account?{" "}
                <button
                  type="button"
                  className="inline-link"
                  onClick={() => {
                    setShowRegister(false);
                    setAuthError("");
                    setStatusMessage("");
                  }}
                >
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {overlayName ? (
        <div className="success-overlay">
          <div className="welcome-text">Welcome back, {overlayName}</div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="percentage-text">{progress}%</div>
        </div>
      ) : null}
    </div>
  );
}
