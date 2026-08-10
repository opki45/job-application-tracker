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
  controllers/
    authController.js        # register / login / me
    applicationController.js # CRUD + filtering
    integrationController.js # Gmail OAuth connect/callback/status/disconnect
    syncController.js        # POST /api/sync/gmail (fetch + prefilter pipeline)
  routes/
    authRoutes.js
    applicationRoutes.js
    integrationRoutes.js
    syncRoutes.js
  integrations/
    googleClient.js          # OAuth boundary (auth URL, code exchange, revoke)
    gmailClient.js            # Gmail API boundary (list/get messages)
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
```

Phase 2 (Gmail auto-import) is in progress — see [`../docs/PHASE2.md`](../docs/PHASE2.md) for the full design. OAuth connect and the fetch+prefilter sync pipeline are built; the LLM extraction adapter, review-queue endpoints, and reconciliation are not yet.

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

`password` must be at least 8 characters. Duplicate email → `409`. Bad credentials → `401`.

### Applications

| Method | Path                    | Auth | Body / Query                  | Success                 |
|--------|-------------------------|------|-------------------------------|-------------------------|
| GET    | `/api/applications`     | ✅   | `?status=<status>` (optional) | `200 { applications }`  |
| POST   | `/api/applications`     | ✅   | see fields below              | `201 { application }`   |
| GET    | `/api/applications/:id` | ✅   | –                             | `200 { application }`   |
| PUT    | `/api/applications/:id` | ✅   | any subset of fields          | `200 { application }`   |
| DELETE | `/api/applications/:id` | ✅   | –                             | `204` (no body)         |

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
| POST   | `/api/sync/gmail`                 | ✅   | Runs the fetch + prefilter pipeline. `200 { scanned, shortlisted }`. `400` if Gmail isn't connected |

`POST /api/sync/gmail` doesn't write to `applications` yet — it lists recent mail, skips anything already recorded in `processed_emails`, and reports which messages passed the heuristic prefilter (sender/keyword match). The LLM extraction step that turns those into review-queue `candidates` isn't built yet.

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

- Finish Phase 2 — Gmail auto-import: LLM extraction adapter, review-queue endpoints, reconciliation (see [`../docs/PHASE2.md`](../docs/PHASE2.md))
- Pagination on the applications list
- Rate limiting on login and a CORS/security-header layer
- Later phase: RAG / evaluation harnesses
