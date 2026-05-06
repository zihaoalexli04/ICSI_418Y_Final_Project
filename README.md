# Degree Audit Planner

A **Next.js 16 + React 19 + TypeScript** web application for course planning and degree audit workflows.
It supports account registration/login, profile management, course browsing/search, and uses Supabase for authentication and data storage.

---

## 1. Overview

Degree Audit Planner is designed for student course-planning scenarios and provides:

- User registration / login / logout
- Session handling with HTTP-only cookies
- Profile retrieval and updates
- Course list, course detail, and course search
- Student and advisor-facing pages

---

## 2. Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Backend layer**: Next.js Route Handlers (`app/api/*`)
- **Auth & Data**: Supabase (Auth + database tables)
- **Key libraries**: `@supabase/supabase-js`, `bcrypt`

---

## 3. Project Structure

```text
final-project/
├─ app/ # Next.js routes and API entrypoints
│ ├─ api/
│ │ ├─ auth/ # register/login/logout/session
│ │ ├─ courses/ # course list/search/detail
│ │ └─ profile/ # profile read/update
│ ├─ advisor/ # advisor pages
│ ├─ course_detail/ # course detail page
│ ├─ course_select/ # course selection page
│ ├─ gen_ed/ # general education page
│ ├─ login/ # login page
│ └─ profile/ # profile page
├─ backend/lib/ # server core logic (auth, Supabase access, sessions)
├─ frontend/components/ # UI components/pages
├─ frontend/lib/ # client API/session helpers
├─ shared/ # shared data and course utilities
├─ scripts/ # utility scripts
└─ .env.local # local environment variables
```

## 4. Environment Variables

Create `.env.local` in the project root and define at least:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SESSION_SIGNING_SECRET=your_custom_session_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to clients.
- If `SESSION_SIGNING_SECRET` is missing, the app falls back to `SUPABASE_SERVICE_ROLE_KEY` for session signing (a dedicated secret is recommended).

## 5. Install & Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Production build/run:

```bash
npm run build
npm run start
```

## 6. Core API Endpoints

Auth

- POST /api/auth/register — register a new user
- POST /api/auth/login — log in
- POST /api/auth/logout — log out
- GET /api/auth/session — fetch current session state

Profile

- GET /api/profile — get current user profile
- PUT /api/profile — update current user profile

Courses

- GET /api/courses — list courses
- GET /api/courses/search?q=...&limit=100 — search courses
- GET /api/courses/[slug] — get course details

## 7. Session & Authentication Model

After successful login/registration, backend sets a planner session cookie.

- Cookie settings: httpOnly, sameSite=lax, secure (in production), path=/.
- Session token is HMAC-signed and includes expiration (default: 7 days).
- Protected APIs identify the current user from this session cookie.

## 8. Development Notes

- Uses Next.js App Router; page routes are under `app/`.
- Frontend and backend APIs are in the same repository for easier iteration.
- Course data is primarily read from the database; some flows can fall back to local shared course data in `shared/site-data.ts`.

## 9. Troubleshooting

Missing environment variable errors at startup

- Verify `.env.local` exists and all required keys are present.

Registration/login failures

- Check Supabase Auth configuration.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is valid.

Course search issues

- Verify schema/columns in the Supabase courses table.
- Confirm server-side permissions for reading course data.

## 10. License

This repository appears to be for course/project use.
Add a formal license (for example, MIT) if you plan to publish it publicly.
