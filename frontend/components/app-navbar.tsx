"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAccount } from "@/frontend/lib/auth-client";
import { clearAllSessionData, useProfileSession } from "@/frontend/lib/session";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile] = useProfileSession();
  const isLoggedIn = Boolean(profile.firstName);
  const isAdvisor = profile.role === "advisor";
  const isAdvisorArea = pathname === "/advisor" || pathname.startsWith("/advisor/");

  const plannerHref = isLoggedIn ? (isAdvisor ? "/advisor" : "/course_select") : "/login";
  const profileHref = isLoggedIn ? "/profile" : "/login";

  const handleLogout = async () => {
    await logoutAccount();
    clearAllSessionData();
    router.push("/login");
  };

  return (
    <nav className="site-navbar">
      <Link href="/" className="site-brand">
        Degree Audit and Academic Planning System
      </Link>

      <div className="site-nav-group">
        <Link
          href="/"
          className={`site-nav-link ${isActive(pathname, "/") ? "site-nav-link-active" : ""}`}
        >
          Search
        </Link>
        <Link
          href={plannerHref}
          className={`site-nav-link ${(isAdvisorArea || isActive(pathname, "/course_select")) ? "site-nav-link-active" : ""}`}
        >
          Planner
        </Link>
        <Link
          href={profileHref}
          className={`site-nav-link ${isActive(pathname, "/profile") ? "site-nav-link-active" : ""}`}
        >
          {isLoggedIn ? "Profile" : "Sign In"}
        </Link>
        {isLoggedIn ? (
          <button type="button" className="site-ghost-button" onClick={handleLogout}>
            Logout
          </button>
        ) : null}
      </div>
    </nav>
  );
}
