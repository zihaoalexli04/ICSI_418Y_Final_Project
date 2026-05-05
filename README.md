# Degree Audit Planner

This project keeps the current Next.js structure and now uses PostgreSQL in the backend.

- `frontend/`: client components and browser-side helpers
- `backend/`: server-side auth and database logic
- `shared/`: shared course data and utilities
- `app/`: Next.js routes and API entrypoints

## Structure

```text
final-project/
├── app/                 # Next routes and /api endpoints
├── backend/
│   └── lib/             # PostgreSQL pool, auth, server helpers
├── frontend/
│   ├── components/      # UI pages/components
│   └── lib/             # client fetch/session helpers
├── shared/              # shared course data and mappers
└── .env.local           # local PostgreSQL connection string
```

## Database Connection

The backend reads:

```bash
DATABASE_URL=postgresql://user_418_database:Qwert%2F12345@192.168.56.1:5433/course_catalog
```

from `.env.local`.

## How To Launch

1. Open a terminal in `final-project`.
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

## Production

```bash
npm run build
npm start
```

## PostgreSQL Behavior

On first backend use, the app will connect to PostgreSQL and create these tables if they do not already exist:

- `users`
- `profiles`
- `sessions`
- `courses`

The required `users` table is created as:

```sql
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Registration now:

- checks whether the email already exists
- hashes the password with `bcrypt`
- inserts the user into PostgreSQL
- inserts a matching profile row

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/courses`
- `GET /api/courses/[slug]`
