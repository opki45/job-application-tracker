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

This is a monorepo: the Express API lives in `server/`, the React web app in `client/`, and a React Native companion app (Expo Go) lives in `mobile/` — see [`mobile/README.md`](mobile/README.md). The mobile app is the same backend, same account, no server changes needed; it covers login, the home dashboard, the full applications list, and the Gmail review queue (Calendar/Analytics/Reminders/Settings are web-only for now).

## Features

- **Authentication** — register, log in, and protected routes using JSON Web Tokens; sessions persist across refreshes. Full account management too: change password, delete account (both re-verify the current password even though the request is already authenticated).
- **Application tracking** — full CRUD for applications (company, role, status, date, job description, notes), plus a dedicated Applications page with search, sortable columns, and real backend pagination.
- **Dashboard** — summary stats, status filtering, and rows colour-coded by status so you can scan at a glance.
- **Gmail auto-import** — connect Gmail, and an LLM extracts job-application emails into a review queue; nothing touches your tracked applications until you accept it (see the Phase 2 section below).
- **Calendar** — a month view of every application plotted on its date applied, colour-coded by status.
- **Analytics** — a status funnel, an applications-over-time trend, and a Gmail-vs-manual breakdown, all derived from data you already have (no separate tracking).
- **Reminders** — follow-up nudges, optionally linked to a specific application; survive if that application is later deleted (they just unlink).
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
    controllers/            auth / applications CRUD+pagination / Gmail integration + sync / reminders
    routes/                 auth + application + integration + sync + candidate + reminder routes
    integrations/           Gmail/Google API boundary modules (mocked in tests)
    utils/                  request validation, token encryption, email prefilter
  tests/                    Jest + Supertest integration tests

client/                     React app (Vite)
  src/
    api.js                  fetch wrapper (attaches JWT, parses errors)
    AuthContext.jsx         auth state + token persistence
    GmailContext.jsx        Gmail connection status, shared across pages
    ProtectedRoute.jsx      redirects if not logged in
    pages/                  Login, Register, Dashboard, Applications, Calendar, Analytics, Reminders, Settings
    components/             AppShell (topbar+sidebar shell), Sidebar, GmailConnect, ReviewQueue,
                             ApplicationItem, CompanyLogo, Logo, AuthLayout, ProductPreview

mobile/                     React Native app (Expo Router) — same backend, no server changes needed
  app/                       file-based routes: login, register, (tabs) group
  src/                       api.js, AuthContext, GmailContext, theme, shared components
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

## Beyond Phase 2: a real sidebar, not placeholders

The dashboard's sidebar originally had nav items with nowhere to go (Applications, Calendar, Analytics, Reminders, Settings — decorative, by explicit choice at the time). All five are now real pages:

- **Applications** — the full list with search, sortable columns, and real backend pagination (`GET /api/applications?page=`), not just the dashboard's unpaginated summary table.
- **Calendar** — a month view plotting every application on its `date_applied`, colour-coded by status. No new backend — derived from data already there.
- **Analytics** — a status funnel, an applications-over-time trend, and a Gmail-vs-manual split. Also fully derived from existing data; colours reuse the app's one reserved status palette (validated colourblind-safe via the dataviz skill's validator, not eyeballed).
- **Reminders** — a genuinely new feature: its own table, optionally linked to a specific application (`ON DELETE SET NULL` if that application is later deleted, so the reminder survives).
- **Settings** — Gmail connect/disconnect (moved here too, shared via `GmailContext` instead of re-fetched per page), change password, delete account (password + typed "DELETE" confirmation; cascades via the existing `ON DELETE CASCADE` foreign keys), and a decorative light/dark/system theme picker (no real dark theme exists yet).

## Mobile (Expo Go)

A React Native companion app lives in [`mobile/`](mobile/README.md) — login, home dashboard, full applications list, and the Gmail review queue, all against the same backend with no server changes. See that README for setup (you'll need your dev machine's LAN IP so a phone can reach the API) and the honest trade-off on how Gmail connect works there (opens the existing web OAuth flow in the system browser; no native deep-link back into the app yet).

## Roadmap

- Deploy (frontend host + backend host + cloud MySQL)
- Rate limiting on login and a security-header layer
- A real dark theme (the picker in Settings and the sidebar toggle are both decorative right now)
- Mobile: Calendar/Analytics/Reminders/Settings screens, a native deep-link back from the Gmail OAuth browser flow
- Later phase: RAG / evaluation harnesses
