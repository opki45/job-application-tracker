# Landed — Full-Stack Job Application Tracker

Landed is a full-stack web app for tracking job applications through their lifecycle — applied, interviewing, offer, rejected, accepted. I built it end to end to turn a scattered job search into one clean, organised dashboard.

**Live demo:** _add your deployed URL here_

## Tech stack

| Layer     | Tech                                                          |
|-----------|--------------------------------------------------------------|
| Frontend  | React (Vite), React Router, plain CSS                        |
| Backend   | Node.js, Express, JWT auth                                   |
| Database  | MySQL (raw SQL via `mysql2`, no ORM)                         |
| Testing   | Jest + Supertest (backend integration tests)                |

This is a monorepo: the Express API lives in `server/`, the React app in `client/`.

## Features

- **Authentication** — register, log in, and protected routes using JSON Web Tokens; sessions persist across refreshes.
- **Application tracking** — full CRUD for applications (company, role, status, date, job description, notes).
- **Dashboard** — summary stats, status filtering, and rows colour-coded by status so you can scan at a glance.
- **Notes** — expandable per-application notes for recruiter names, next steps, and interview dates.
- **Company logos** — each application shows the real company logo, with a coloured initial as a fallback.
- **Per-user isolation** — every application is scoped to its owner; you only ever see your own data.

## Screenshots

_Add screenshots to a `docs/` folder and reference them here, e.g.:_

```md
![Landing page](docs/landing.png)
![Dashboard](docs/dashboard.png)
```

## Architecture

The backend is layered — **routes → controllers → models** — so responsibilities stay separated: routes map URLs to handlers, controllers hold request/response logic, and the model layer is the only place that writes SQL. The frontend talks to the API through a small `fetch` wrapper and a Vite dev proxy, so in development there's no CORS to configure.

```
server/                     Express API
  src/
    app.js                  builds the app (no listen — testable)
    server.js               starts the HTTP server
    db/                     mysql2 pool + schema.sql
    middleware/             JWT auth, central error handler
    models/                 all SQL lives here (user-scoped)
    controllers/            register / login / applications CRUD / Gmail integration + sync
    routes/                 auth + application + integration + sync routes
    integrations/           Gmail/Google API boundary modules (mocked in tests)
    utils/                  request validation, token encryption, email prefilter
  tests/                    Jest + Supertest integration tests

client/                     React app (Vite)
  src/
    api.js                  fetch wrapper (attaches JWT, parses errors)
    AuthContext.jsx         auth state + token persistence
    ProtectedRoute.jsx      redirects if not logged in
    pages/                  Login, Register, Dashboard
    components/             Logo, ApplicationItem, AuthLayout, ProductPreview, GmailConnect, ReviewQueue
```

## Design decisions (and why)

- **Raw SQL, not an ORM** — all SQL is parameterized and lives in the model layer, so the data access is transparent and demonstrates SQL fundamentals. Injection is prevented by sending query structure and values separately.
- **bcrypt + JWT** — passwords are hashed with bcrypt (salted, slow by design); auth is stateless via signed JWTs, verified by middleware on protected routes. Login returns the same error for unknown email and wrong password to prevent user enumeration.
- **Ownership enforced in every query** — each applications query includes `WHERE user_id = ?`, with the user id taken from the verified token, never the request. Accessing another user's row returns 404.
- **`app` and `server` split** — the Express app is built and exported without listening, so tests drive it in memory with Supertest and no open port.
- **Separate test database** — tests run against `job_tracker_test` (loaded automatically via `.env.test` when `NODE_ENV=test`), so they never touch real data.

## Getting started

### Prerequisites

- Node.js 18+
- A running MySQL server

### 1. Backend

```bash
cd server
npm install

# create both databases and load the tables
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS job_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS job_tracker_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p job_tracker      < src/db/schema.sql
mysql -u root -p job_tracker_test < src/db/schema.sql

# configure environment
cp .env.example .env        # then edit with your MySQL password + a JWT secret
cp .env .env.test           # then set DB_NAME=job_tracker_test

npm run dev                 # API on http://localhost:3000
```

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev                 # app on http://localhost:5173
```

Open `http://localhost:5173`, create an account, and start tracking. The Vite dev server proxies `/api` to the backend on port 3000.

### 3. Tests

```bash
cd server
npm test                    # runs the backend integration suite
```

More detail on the API and backend design is in [`server/README.md`](server/README.md).

## Phase 2 — Gmail auto-import (feature-complete)

Full build spec: [`docs/PHASE2.md`](docs/PHASE2.md). Connect Gmail (read-only), auto-detect application-related emails, extract structured data with an LLM, and surface it in a review queue — nothing is written to `applications` without the user approving it. All five build-order steps are done and verified end to end against a real Gmail inbox, real applications, and both real LLM providers:

- **OAuth** — connect/callback/status/disconnect, tokens encrypted at rest (`GmailConnect` on the dashboard).
- **Fetch + prefilter** — `POST /api/sync/gmail` lists recent mail, dedupes against already-seen messages, and prefilters for likely-job-related content before anything reaches the LLM.
- **LLM extraction** — `src/llm/extractApplication.js`, one adapter behind `LLM_PROVIDER=ollama|gemini`.
- **Review queue** — `GET /api/candidates`, accept/dismiss, edit-then-approve UI. Accepted candidates write to `applications` through the existing model, tagged `source='email'`.
- **Reconciliation** — each job-related extraction is matched (normalized company + role) against the user's existing applications. No match → new-application candidate. Matches and the extracted status is a forward move (`applied < interviewing < offer/rejected < accepted`) → status-update candidate, and accepting it advances the existing application instead of creating a duplicate. Matches but isn't a forward move (same stage restated) → nothing proposed.

**LLM provider note:** the code supports both `ollama` (local) and `gemini` (cloud) behind one `LLM_PROVIDER` switch, per `docs/PHASE2.md`. In practice, local Ollama inference was too unreliable on this machine to build against (a 3B model timed out / hung mid-generation on a real sync run), so **Gemini (`gemini-flash-latest`, free tier) is the provider actually in use** for now. Ollama's adapter, config, and tests are all still there — flipping `LLM_PROVIDER=ollama` in `.env` switches back with no code changes.

**Known gaps / next hardening pass:** no pagination on `GET /api/candidates`; no rate limit on `POST /api/sync/gmail` (a user could trigger repeated syncs back to back); company/role matching is exact-after-normalization, not fuzzy, so a genuinely different-looking company name for the same employer won't reconcile.

## Roadmap

- Deploy (frontend host + backend host + cloud MySQL)
- Pagination on the applications list
- Rate limiting on login and a security-header layer
- Later phase: RAG / evaluation harnesses
