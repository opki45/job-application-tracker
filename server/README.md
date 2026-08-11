# Job Application Tracker — Backend

A REST API for tracking job applications through their lifecycle — from applied, to interviewing, to offer or rejection. I built it as the backend of a full-stack portfolio project; a React frontend will consume this API in a later phase.

**Stack:** Node.js, Express, MySQL (raw SQL via `mysql2`), JWT authentication, Jest + Supertest for testing.

## What it does

- **Authentication** — register, log in, and protect routes with JSON Web Tokens.
- **Applications CRUD** — create, read, update, and delete job applications.
- **Dashboard filtering** — list my applications, optionally filtered by status.
- **Per-user isolation** — every application belongs to one user; I can only ever see or change my own.

## Why I made these choices

I wrote this to understand every layer, not to lean on abstractions. The decisions below are deliberate, and I can defend each one.

**Raw SQL with `mysql2`, not an ORM.** All my SQL lives in the model layer and uses parameterized (`?`) queries. This keeps the data access transparent — I can read exactly what runs against the database — and it forced me to actually learn SQL rather than hide behind generated queries. The tradeoff is more boilerplate, which for a learning project is a feature, not a cost.

**Parameterized queries for SQL-injection safety.** Every value goes to MySQL through a `?` placeholder, so the query structure is compiled before any user data is seen. User input is always treated as a value, never as executable SQL. The one place I build SQL dynamically (partial updates) assembles column names from a fixed whitelist, never from user input, while the values still go through placeholders.

**bcrypt for passwords.** I never store raw passwords, only bcrypt hashes. bcrypt is deliberately slow and salts each hash automatically, so identical passwords produce different hashes and brute-forcing a leaked database is expensive. I use a cost factor of 10.

**JWT for stateless auth.** Login returns a signed token; the client sends it back as `Authorization: Bearer <token>` and my middleware verifies the signature on protected routes. The server stores no session state. Tokens are signed, not encrypted — the payload is readable, so I keep nothing secret in it and rely on the signature for tamper-proofing. Tokens expire after a day.

**No user enumeration on login.** A wrong password and an unknown email both return the same `401 Invalid credentials`, so an attacker can't use the endpoint to discover which emails have accounts.

**Ownership enforced inside every query.** Each applications query includes `WHERE user_id = ?`, where the user id comes from the verified token, not from the request. Asking for another user's application returns `404`, not `403` — I don't even reveal that the row exists.

**`app` and `server` are separate files.** `src/app.js` builds the Express app without listening; `src/server.js` starts the HTTP server. My tests import the app directly and drive it in memory with Supertest, no port opened.

## Project structure

```
src/
  config.js                  # loads .env (or .env.test under Jest)
  app.js                     # builds the Express app (no listen)
  server.js                  # starts the HTTP server
  db/
    pool.js                  # mysql2 connection pool
    schema.sql               # table definitions (database-agnostic)
  middleware/
    auth.js                  # verifies JWT, sets req.user
    errorHandler.js          # central error handler
  models/
    userModel.js             # SQL for users
    applicationModel.js      # SQL for applications (all user-scoped)
    oauthAccountModel.js     # SQL for oauth_accounts (encrypted tokens)
    processedEmailModel.js   # SQL for processed_emails (Gmail sync dedupe)
    candidateModel.js        # SQL for candidates (review queue)
    reminderModel.js         # SQL for reminders (optionally linked to an application)
  controllers/
    authController.js        # register / login / me / change password / delete account
    applicationController.js # CRUD + filtering + search/sort/pagination
    integrationController.js # Gmail OAuth connect/callback/status/disconnect
    syncController.js        # POST /api/sync/gmail (fetch/prefilter/extract pipeline)
    candidateController.js   # review queue: list / accept / dismiss
    reminderController.js    # reminders: list / create / update / delete
  routes/
    authRoutes.js
    applicationRoutes.js
    integrationRoutes.js
    syncRoutes.js
    candidateRoutes.js
    reminderRoutes.js
  integrations/
    googleClient.js          # OAuth boundary (auth URL, code exchange, revoke)
    gmailClient.js            # Gmail API boundary (list/get messages, message bodies)
  llm/
    extractApplication.js     # single adapter, dispatches to Ollama or Gemini
  reconcile.js                # normalize/match/forward-move logic (pure, no SQL/HTTP)
  utils/
    validation.js            # request validation
    tokenCrypto.js            # AES-256-GCM encrypt/decrypt for stored tokens
    emailPrefilter.js         # cheap heuristic: is a message worth an LLM call?
tests/
  helpers.js                 # resets the DB between tests
  auth.test.js
  applications.test.js
  integrations.test.js
  sync.test.js
  emailPrefilter.test.js
  extractApplication.test.js
  candidates.test.js
  reconcile.test.js
  reminders.test.js
```

Phase 2 (Gmail auto-import) is feature-complete per [`../docs/PHASE2.md`](../docs/PHASE2.md)'s build order — OAuth, the fetch → prefilter → LLM extract → reconcile pipeline, and the review queue (accept/dismiss) are all built and verified end to end against a real Gmail inbox, real applications, and both real LLM providers.

Beyond Phase 2: the dashboard's sidebar now links to real pages, not placeholders — full applications search/sort/pagination, a calendar view, analytics derived from existing data, a full reminders feature (new table, optionally linked to an application), and account settings (Gmail connect, change password, delete account).

## Getting started

### Prerequisites

- Node.js 18+ and npm
- A running MySQL server

### 1. Install dependencies

```bash
npm install
```

### 2. Create the databases and tables

The schema file is database-agnostic, so I run it against whichever database I name:

```bash
# create the databases
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS job_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS job_tracker_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# build the tables in each
mysql -u root -p job_tracker      < src/db/schema.sql
mysql -u root -p job_tracker_test < src/db/schema.sql
```

### 3. Configure environment

```bash
cp .env.example .env
```

Then edit `.env` with your MySQL credentials and a real `JWT_SECRET`. I generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

For tests, I copy `.env` to `.env.test` and change `DB_NAME` to `job_tracker_test`. Jest sets `NODE_ENV=test`, and `config.js` loads `.env.test` automatically, so tests never touch my real data.

`.env.example` also has a Phase 2 section (`GOOGLE_CLIENT_ID`, `TOKEN_ENC_KEY`, `OLLAMA_MODEL`, etc.) — those are only needed if you're setting up the Gmail integration; the core app runs fine without them. See [`../docs/PHASE2.md`](../docs/PHASE2.md).

### 4. Run

```bash
npm run dev     # auto-restarts on file changes
# or
npm start
```

The server runs at `http://localhost:3000`. Check `GET /health`.

## Tests

The tests are integration tests: they run against a real MySQL test database and drive the API through Supertest, so they exercise the routing, auth, and SQL together.

```bash
npm test
```

They run with `--runInBand` (one file at a time) because they share one database and reset it between tests.

## API reference

All responses are JSON. Protected endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Path                 | Auth | Body                  | Success                |
|--------|----------------------|------|-----------------------|------------------------|
| POST   | `/api/auth/register` | –    | `{ email, password }` | `201 { user }`         |
| POST   | `/api/auth/login`    | –    | `{ email, password }` | `200 { user, token }`  |
| GET    | `/api/auth/me`       | ✅   | –                     | `200 { user }`         |
| PUT    | `/api/auth/password` | ✅   | `{ currentPassword, newPassword }` | `204`      |
| DELETE | `/api/auth/me`       | ✅   | `{ password }`        | `204`                   |
| GET    | `/api/auth/google`   | –    | –                     | `302` to Google's consent screen |
| GET    | `/api/auth/google/callback` | – | Public (Google redirect) | `302` to `CLIENT_URL/login?google_code=...` or `?google=error` |
| POST   | `/api/auth/google/exchange` | – | `{ code }`         | `200 { user, token }`  |

`password` must be at least 8 characters. Duplicate email → `409`. Bad credentials → `401`.

Both `password` endpoints re-verify the CURRENT password before acting, even though the request is already authenticated -- a valid JWT alone isn't proof you still know the password (the token could be hours old, the tab left open). Wrong current/confirmation password → `401`. Deleting cascades to every other table (applications, candidates, reminders, oauth_accounts, processed_emails) via `ON DELETE CASCADE` -- no manual cleanup needed. A Google-only account (see below) has no password to verify, so both endpoints return a clear `400` instead of crashing on a `NULL` hash.

**Sign in with Google** is a separate, identity-only OAuth flow from the Gmail import below -- same Google Cloud OAuth client (`GOOGLE_CLIENT_ID`/`SECRET`), a second registered redirect URI, and `openid email profile` scope instead of `gmail.readonly`. `google/callback` never hands the browser the real session token directly (a day-long bearer token in a URL is a bad idea -- browser history, `Referer` headers, server logs); it redirects with a 60-second single-purpose code that `google/exchange` trades for the real `{ user, token }` over a normal POST body. First sign-in creates a user with `password_hash NULL`; if that email already has a password account, it links `google_id` onto the existing row instead of creating a duplicate (safe because Google's `email_verified` claim vouches for the email).

### Applications

| Method | Path                    | Auth | Body / Query                  | Success                 |
|--------|-------------------------|------|-------------------------------|-------------------------|
| GET    | `/api/applications`     | ✅   | `?status=<status>` (optional) | `200 { applications }`  |
| GET    | `/api/applications?page=1` | ✅ | see below                    | `200 { applications, total, page, pageSize }` |
| POST   | `/api/applications`     | ✅   | see fields below              | `201 { application }`   |
| GET    | `/api/applications/:id` | ✅   | –                             | `200 { application }`   |
| PUT    | `/api/applications/:id` | ✅   | any subset of fields          | `200 { application }`   |
| DELETE | `/api/applications/:id` | ✅   | –                             | `204` (no body)         |

`page` is what switches the response shape. Without it: the plain `{ applications }` array the dashboard's summary table and the sync pipeline's reconciliation matching both expect (reconciliation needs the user's FULL set to match against, not one page). With it: `?page=1&pageSize=20&search=&sort=date_applied|company|role|status&order=asc|desc` -- `search` matches company or role (case-insensitive substring), `sort`/`order` default to `date_applied`/`desc` and silently fall back on an unrecognized value rather than erroring (it only affects display order).

**Application fields**

| Field             | Type   | Required | Notes                                                                 |
|-------------------|--------|----------|-----------------------------------------------------------------------|
| `company`         | string | yes      |                                                                       |
| `role`            | string | yes      |                                                                       |
| `status`          | enum   | no       | `applied`, `interviewing`, `offer`, `rejected`, `accepted` (default `applied`) |
| `date_applied`    | date   | no       | `YYYY-MM-DD` (defaults to today)                                      |
| `job_description` | string | no       |                                                                       |
| `notes`           | string | no       |                                                                       |

Requesting an application that doesn't exist, or that belongs to another user, returns `404`.

### Gmail integration (Phase 2)

| Method | Path                             | Auth | Notes                                                            |
|--------|-----------------------------------|------|-------------------------------------------------------------------|
| GET    | `/api/integrations/gmail/connect` | ✅   | `200 { url }` — Google OAuth consent URL                          |
| GET    | `/api/integrations/gmail/callback`| –    | Public (Google redirect, no auth header). Exchanges `code`, stores encrypted tokens, redirects to the client with `?gmail=connected` or `?gmail=error` |
| GET    | `/api/integrations/gmail/status`  | ✅   | `200 { connected }`                                                |
| DELETE | `/api/integrations/gmail`         | ✅   | Revokes with Google and deletes stored tokens. `204`               |
| POST   | `/api/sync/gmail`                 | ✅   | Runs the full fetch → prefilter → extract pipeline. `200 { scanned, shortlisted, candidates }`. `400` if Gmail isn't connected |

`POST /api/sync/gmail` lists recent mail, skips anything already in `processed_emails`, prefilters with cheap heuristics, runs the LLM (`src/llm/extractApplication.js`) on whatever passed, then reconciles each job-related result (`src/reconcile.js`) against the user's existing applications: no match → new-application candidate; matches and the status is a forward move → status-update candidate (`matched_application_id` set); matches but isn't a forward move → nothing proposed. It never writes to `applications` itself — that only happens when a candidate is accepted through the review queue. An LLM call that fails outright (provider down) intentionally leaves that message unprocessed for the next sync to retry, rather than recording it as "not job-related" and losing it for good.

**LLM provider:** `LLM_PROVIDER=ollama|gemini` in `.env` selects the adapter (see `.env.example`). Ollama is the spec's default (free, local, email never leaves the machine), but proved unreliable in practice on this machine — Gemini (`gemini-flash-latest`, free tier) is what's actually configured and verified end to end. Both are implemented and covered by mocked tests either way.

### Review queue (Phase 2)

| Method | Path                          | Auth | Body                                                | Success                        |
|--------|-------------------------------|------|------------------------------------------------------|---------------------------------|
| GET    | `/api/candidates`             | ✅   | –                                                    | `200 { candidates }` (pending only) |
| POST   | `/api/candidates/:id/accept`  | ✅   | see below                                            | `200`/`201 { application }`     |
| POST   | `/api/candidates/:id/dismiss` | ✅   | –                                                    | `204`                            |

`accept` has two shapes depending on whether the candidate was reconciled to an existing application:

- **`matched_application_id` set** (status-update proposal) — body is just an optional `{ status }` override; accepting **advances the matched application's status** (`200`) rather than creating a new row. Company/role are never touched (they already matched).
- **`matched_application_id` null** (new-application proposal) — body is an optional `{ company, role, status, date_applied }` override merged over the extraction, validated with the same rules `/api/applications` uses, then **creates a new application** (`201`) tagged `source='email'`. A candidate with a low-confidence/null field (e.g. no role) 400s on accept until the client fills it in and resends -- that's the whole edit-then-approve flow, there's no separate edit endpoint. `date_applied` defaults to the source email's own `Date` header (`candidates.email_date`, parsed at sync time) rather than whenever the sync happened to run, falling back to the candidate's `created_at` only if that header was ever missing/unparseable.

Once a candidate is accepted or dismissed it's gone from `GET /api/candidates` for good -- there's no path back to pending.

### Reminders

| Method | Path                  | Auth | Body                                          | Success            |
|--------|-----------------------|------|------------------------------------------------|---------------------|
| GET    | `/api/reminders`      | ✅   | –                                              | `200 { reminders }` |
| POST   | `/api/reminders`      | ✅   | `{ title, due_date, application_id? }`         | `201 { reminder }`  |
| PUT    | `/api/reminders/:id`  | ✅   | any subset of `{ title, due_date, done, application_id }` | `200 { reminder }` |
| DELETE | `/api/reminders/:id`  | ✅   | –                                              | `204`                |

`application_id` is optional -- a reminder can stand alone or reference a specific application, which is returned inlined as `application_company`/`application_role` (one query, not a second round trip). If given, the application must belong to the requesting user or the request `404`s (same "don't leak existence" rule as everywhere else). If that application is later deleted, the reminder survives with `application_id` set back to `null` (`ON DELETE SET NULL`) rather than being deleted itself -- deleting an application shouldn't silently delete an unrelated reminder. `GET` returns not-done reminders first, soonest due date first.

### Example

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"password123"}'

# Log in to get a token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"password123"}'

# Create an application
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"company":"Monzo","role":"Graduate Software Engineer"}'
```

## Roadmap

- Phase 2 hardening: pagination on `/api/candidates`, rate limiting on `/api/sync/gmail`, fuzzier company/role matching in `src/reconcile.js`
- Rate limiting on login and a CORS/security-header layer
- Later phase: RAG / evaluation harnesses
