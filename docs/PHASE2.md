# Phase 2 — Gmail auto-import (build spec)

This is an implementation brief for Phase 2 of Landed. It's written to be handed to
Claude Code. Follow the existing conventions in this repo (see "Conventions" below)
and build in the order given, keeping each step independently testable.

## Context (current state)

Monorepo:
- `server/` — Express + MySQL API. Raw parameterized SQL via `mysql2` in a model
  layer only. Layered as routes → controllers → models. JWT auth via
  `src/middleware/auth.js` (sets `req.user`). Central error handler. Jest +
  Supertest integration tests against a `job_tracker_test` database (loaded via
  `.env.test` when `NODE_ENV=test`).
- `client/` — React (Vite), React Router, plain CSS. `src/api.js` is a fetch
  wrapper that attaches the JWT. `AuthContext` holds auth state.

Existing tables: `users`, `applications` (user-scoped, `status` ENUM
'applied','interviewing','offer','rejected','accepted').

## Goal

Let a user connect their Gmail (read-only) so Landed auto-detects job applications
and status changes from their inbox, instead of the user adding everything by hand.
Detections are **proposed** to the user in a review queue; nothing is written to the
`applications` table without the user confirming (or without an explicit
high-confidence auto-accept setting).

## Non-goals (Phase 2)

- No browser extension.
- No public Google verification — run the OAuth app in "testing" mode with the
  developer + named test users only.
- No RAG / chat assistant yet (that's Phase 3).

## LLM provider decision

Extraction runs through a single adapter so the provider can be swapped without
touching the pipeline:

```
server/src/llm/extractApplication.js
  async function extractApplication(emailText) -> {
    is_job_related: boolean,
    company: string|null,
    role: string|null,
    status: 'applied'|'interviewing'|'offer'|'rejected'|'accepted'|null,
    confidence: number   // 0..1
  }
```

- Default implementation calls a **local Ollama** model (`llama3.1:8b`) at
  `http://localhost:11434`. Free, and email text never leaves the machine.
- Keep a second implementation stub for **Google Gemini** (free tier) selectable via
  `LLM_PROVIDER=ollama|gemini` in env, for when the app is deployed to a host that
  can't run Ollama.
- Request structured JSON output. Validate the returned object against the shape
  above; on parse failure, treat as `is_job_related: false`.

## Data model changes

Add to `server/src/db/schema.sql` (and load into both `job_tracker` and
`job_tracker_test`). Keep everything InnoDB, utf8mb4, and user-scoped.

```sql
CREATE TABLE oauth_accounts (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  provider       VARCHAR(32) NOT NULL,          -- 'google'
  access_token   TEXT NOT NULL,                 -- encrypted at rest
  refresh_token  TEXT NOT NULL,                 -- encrypted at rest
  expires_at     DATETIME NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_oauth_user_provider (user_id, provider),
  CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE processed_emails (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  gmail_message_id  VARCHAR(255) NOT NULL,
  processed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_processed (user_id, gmail_message_id),
  CONSTRAINT fk_processed_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE candidates (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               INT UNSIGNED NOT NULL,
  source_message_id     VARCHAR(255) NOT NULL,
  company               VARCHAR(255),
  role                  VARCHAR(255),
  status                ENUM('applied','interviewing','offer','rejected','accepted'),
  confidence            DECIMAL(3,2),
  matched_application_id INT UNSIGNED,          -- set if it looks like a status update
  state                 ENUM('pending','accepted','dismissed') NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_candidates_user_state (user_id, state),
  CONSTRAINT fk_candidates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE applications
  ADD COLUMN source ENUM('manual','email') NOT NULL DEFAULT 'manual';
```

Do NOT store raw email bodies anywhere. Persist only extracted fields + the message id.

## API endpoints (all require auth except the OAuth callback)

- `GET  /api/integrations/gmail/connect`  → `{ url }` (Google OAuth consent URL)
- `GET  /api/integrations/gmail/callback` → exchanges `code`, stores encrypted
  tokens in `oauth_accounts`, redirects back to the client
- `GET  /api/integrations/gmail/status`   → `{ connected: boolean }`
- `DELETE /api/integrations/gmail`         → revoke + delete tokens
- `POST /api/sync/gmail`                    → run the pipeline; returns
  `{ created: n, updated: n, candidates: n }`
- `GET  /api/candidates`                    → pending candidates for the user
- `POST /api/candidates/:id/accept`         → create a new application (or advance
  the matched one), mark candidate accepted
- `POST /api/candidates/:id/dismiss`        → mark candidate dismissed

## Pipeline (`POST /api/sync/gmail`)

1. Load the user's Google tokens; refresh if expired.
2. `users.messages.list` with a query scoped to recent, likely-relevant mail
   (e.g. `newer_than:30d` plus keyword filter). Skip any `gmail_message_id`
   already in `processed_emails`.
3. **Prefilter** each message with cheap heuristics (sender domain, subject/body
   keywords: applied, application received, interview, unfortunately, offer). Only
   shortlisted messages go to the LLM.
4. `extractApplication(emailText)` on each shortlisted message.
5. **Reconcile**:
   - Not job-related → record in `processed_emails`, drop.
   - Job-related, no match against the user's applications (normalized company +
     role) → create a `candidate` (new application proposal).
   - Job-related, matches an existing application, and the email implies a *later*
     stage → create a `candidate` with `matched_application_id` (status-update
     proposal). Status may only move FORWARD in this order:
     applied < interviewing < offer/rejected < accepted. Use email date to order.
   - Record the `gmail_message_id` in `processed_emails` either way.
6. Return counts. Candidates await user review; accepting one writes to
   `applications` (with `source='email'`) or updates the matched application.

## Security & privacy

- Encrypt `access_token`/`refresh_token` at rest with AES using a server-only key
  (`TOKEN_ENC_KEY` env var). Never send tokens to the client.
- All Gmail scopes read-only (`gmail.readonly`).
- LLM/Gmail calls are server-side only.
- Store extracted fields + message id only; never raw email content.

## New env vars (add to `.env.example` and `.env.test.example`)

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
TOKEN_ENC_KEY=            # 32-byte hex, for encrypting stored tokens
LLM_PROVIDER=ollama       # ollama | gemini
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
GEMINI_API_KEY=           # only if LLM_PROVIDER=gemini
```

## Testing

- Follow the existing Jest + Supertest pattern; reset the test DB between tests.
- Mock the Gmail client and the `extractApplication` adapter in tests (do NOT hit
  real Google or a real model in the suite). Provide fixture emails.
- Cover: reconciliation (new vs update, forward-only status), dedupe via
  `processed_emails`, candidate accept creates a `source='email'` application,
  and per-user isolation on all new endpoints.

## Build order (each step independently testable)

1. OAuth connect + callback + token storage (encrypted) + `status` endpoint +
   client "Connect Gmail" button showing Connected ✓. No email reading yet.
2. Fetch + prefilter; log shortlisted messages. No LLM yet.
3. Add the `extractApplication` Ollama adapter; write `candidates`.
4. Review-queue UI + accept/dismiss; accept creates `source='email'` applications.
5. Reconciliation (status-advancement on matched applications) + tests throughout.

## Conventions to follow (match the existing codebase)

- Raw parameterized SQL in the model layer only; never string-build values.
- Layered: routes → controllers → models. Controllers use try/catch + `next(err)`.
- Every applications/candidates query scoped by `user_id` from `req.user`.
- Code comments in first person ("I ...").
- Write Jest tests alongside each route, not after.
- Keep `app.js` (no listen) separate from `server.js`.
