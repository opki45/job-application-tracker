# JAT — Landed (Job Application Tracker)

Source material for CV/resume writing. Everything below reflects what was
actually built and verified in this repository, not aspirational scope —
where something is partial, decorative, or paused, that's stated explicitly
rather than glossed over.

## One-line summary

A full-stack job application tracker with AI-powered Gmail auto-import: a
Node/Express/MySQL API, a React web frontend, and a React Native mobile
companion (currently paused mid-development), built solo end to end —
schema design, auth, a Gmail OAuth + LLM extraction pipeline, a full design
system with light/dark theming, and a real automated test suite.

## Tech stack

**Backend:** Node.js, Express 5, MySQL (raw SQL via `mysql2`, no ORM),
JWT authentication (`jsonwebtoken`), `bcrypt` password hashing, Jest +
Supertest for integration testing, `googleapis` for Gmail OAuth/API access,
`dotenv` for config.

**Frontend (web):** React 19, React Router 7, Vite, plain CSS with a
custom-property-based design system (no CSS framework/library), `oxlint`.

**Mobile:** React Native (Expo SDK 54), Expo Router (file-based routing),
`expo-secure-store` (encrypted token storage), `expo-web-browser`,
`react-native-svg` (hand-rolled charts), `react-native-safe-area-context`.

**Database:** MySQL, hand-written parameterized SQL, a hand-rolled schema
(no migration framework — `schema.sql` applied directly), separate dev/test
databases.

**No ORM, no CSS framework, no charting library, no state-management
library** — these were deliberate choices to keep the implementation
transparent and demonstrate fundamentals (raw SQL, hand-rolled SVG charts,
React Context for shared state) rather than lean on abstractions.

## Architecture

- **Layered backend**: routes → controllers → models, strictly separated.
  Routes only map URLs to handlers; controllers hold request/response logic
  and never touch SQL; models are the only place SQL is written.
- **Per-user data isolation enforced at the query level**: every
  applications query takes `userId` first and includes `WHERE user_id = ?`
  inside the query itself, not as a bolt-on check — makes it structurally
  hard to forget. Cross-user access returns `404`, never `403` (doesn't
  reveal whether a resource exists).
- **Dynamic SQL updates built from a column whitelist**
  (`WRITABLE_COLUMNS`): column *names* never come from user input, only
  values, and those stay parameterized — a defensive pattern against both
  SQL injection and accidentally-writable fields.
- **Testable app/server split**: `app.js` builds and exports the Express
  app without calling `.listen()`; `server.js` is the only place that
  starts the HTTP server. Tests import `app.js` directly and drive it
  in-memory with Supertest — no open port, no real network in CI.
- **JWT auth**: stateless, signed (not encrypted — payload is readable, no
  secrets in it), 1-day expiry, bcrypt cost 10. Login returns an identical
  `401` for "unknown email" and "wrong password" to prevent user
  enumeration. A centralized error-handling middleware maps DB constraint
  errors (`ER_DUP_ENTRY`) to proper HTTP status codes and hides all other
  error detail behind a generic `500` (real error logged server-side only).
- **135 backend integration tests** (Jest + Supertest) against a real
  MySQL test database, covering auth, CRUD, ownership boundaries, the OAuth
  flows (mocked at the Google API boundary — the app's own controller/model
  code runs for real against a fixture), the LLM extraction pipeline, and
  the reconciliation logic.

## Features

### Core application tracking
- Full CRUD for job applications (company, role, status, date applied, job
  description, notes) with a 5-stage status enum (`applied → interviewing
  → offer/rejected → accepted`) enforced both in the DB schema and in
  application-layer validation.
- A dedicated Applications page with search, sortable columns, and real
  backend pagination — separate from the dashboard's lighter unpaginated
  summary view.
- A Calendar page: every application plotted on its `date_applied`,
  colour-coded by status, entirely derived from existing data (no new
  backend).
- An Analytics page: a status funnel, an applications-over-time trend, and
  a Gmail-vs-manual source split — also fully derived from existing data.
  Colours reuse one reserved, validated status palette (checked for
  colourblind-safe contrast with a script, not eyeballed) rather than an
  ad hoc scheme per chart.
- Reminders: a genuinely new feature (own DB table) for follow-up nudges,
  optionally linked to a specific application — if that application is
  later deleted, the reminder survives and just unlinks
  (`ON DELETE SET NULL`) rather than disappearing.
- Company logos fetched live (favicon service) with a deterministic
  coloured-initial fallback when no logo is found.

### Gmail auto-import (AI pipeline)
The largest single feature: connect Gmail (read-only OAuth scope), and an
LLM turns matching emails into structured, reviewable application data —
nothing is written to the applications table without explicit user
approval.
- **OAuth**: connect/callback/status/disconnect endpoints; access + refresh
  tokens encrypted at rest (AES) before ever touching the database.
- **Fetch + prefilter**: lists recent Gmail messages, dedupes against
  already-seen messages (a `processed_emails` table — no email content
  stored, just IDs), and prefilters for likely job-application content
  *before* anything reaches the LLM (cost/latency control).
- **LLM extraction**: a single adapter interface behind an `LLM_PROVIDER`
  environment switch, supporting both a local model (Ollama) and a cloud
  model (Gemini) with zero code changes to swap — built and tested against
  both, ultimately running on Gemini in practice after local inference
  proved too unreliable on the dev machine.
- **Review queue**: extracted candidates land in a queue, editable
  before acceptance (edit-then-approve), never auto-committed.
- **Reconciliation**: each extraction is matched against the user's
  existing applications by normalized company + role. No match → proposed
  as a new application. Matches an existing one and the extracted status
  is a forward move in the status pipeline → proposed as a status update
  (accepting it advances the existing row instead of creating a duplicate).
  Matches but isn't a forward move → nothing proposed, silently discarded.
- The date an accepted candidate is filed under uses the *email's own
  send date* (parsed from the Gmail `Date` header), not the date the sync
  happened to run — a deliberately more accurate proxy for "when I
  actually applied."

### Authentication (beyond basic JWT)
- Full account management: change password and delete account, both
  **re-verifying the current password server-side** even though the
  request already carries a valid JWT — a token alone isn't proof you
  still know the password (could be hours old, tab left open).
- **Real "Continue with Google" sign-in** — not decorative. A second,
  identity-only OAuth flow reusing the same Google Cloud OAuth client as
  the Gmail import (different scope, different redirect URI, no new
  client). First sign-in with a given verified email creates an account;
  a returning verified email already registered by password gets
  `google_id` linked onto the existing row rather than creating a
  duplicate. The callback never puts the real session token in a URL — it
  hands back a 60-second single-use exchange code that the frontend
  immediately trades for the real token over a POST body, specifically to
  avoid a day-long bearer token ending up in browser history or `Referer`
  headers. Handles the "Google-only account has no password" edge case
  explicitly everywhere a password would normally be checked (login,
  change-password, delete-account) rather than letting it crash.

### Dark mode
A real, fully-covered light/dark/system theme, not a couple of flipped
variables. Consolidated ~99 previously-hardcoded hex colors scattered
across the stylesheet into a proper token system first (status colors,
tint families, hover states), *then* defined a complete second (dark)
value for every token — so dark mode covers literally every screen
consistently instead of leaving unstyled patches. System mode tracks the
OS/browser preference live via `prefers-color-scheme`, with an explicit
user choice always taking precedence, persisted to `localStorage`.

### UX/engineering polish
- Sidebar navigation restructured from a per-page-remount pattern into
  proper persistent layout routes (shared shell, only the page content
  swaps) — removed a redundant re-fetch of Gmail status and a UI flicker
  on every single navigation.
- Real page-transition animation using the browser's native View
  Transitions API, hand-driven via `flushSync` after discovering React
  Router's built-in support for it silently doesn't fire with this app's
  router configuration — diagnosed by instrumenting the browser API
  directly rather than assuming the library "just worked."
- An iterative screenshot-compare-refine workflow (Playwright-driven) used
  throughout to match hand-built UI against reference design mockups.

## Mobile app (React Native / Expo) — paused

A companion app covering login/register, a dashboard with real per-status
sparkline charts, the full applications list + detail view, the Gmail
review queue, a calendar, and an analytics screen — hitting the exact same
backend with zero server-side changes needed (proof the API is a real,
frontend-agnostic contract, not something coupled to the web client).

Notable engineering: downgraded the whole project from Expo SDK 57 to 54
after discovering Apple's App Store review backlog had the public Expo Go
app stuck on SDK 54 for months — diagnosed via research, not guesswork, and
required repinning every dependency to the SDK's own compatibility
manifest. Built a hand-rolled bottom tab bar (rather than the standard
library component) specifically to match a design reference's chrome
behavior that the standard component couldn't express without a deeper
navigation restructure.

**Status: development paused after real on-device bugs surfaced (content
rendering under the iOS status bar/notch, among others) that weren't
chased down before the decision was made to defer the rest of this effort
to a future phase.** The code is left in the repository, undeleted, with
its documentation explicitly flagged as unverified past that point.

## Scale

- 29 commits, solo project, built iteratively over one extended session
  with an AI pair-programming workflow (planning → implementation →
  automated + manual verification → commit, repeated per feature).
- ~9,200 lines of application code across the backend, web frontend, and
  mobile app (excluding node_modules/config).
- 2 client surfaces (web, mobile) against 1 shared REST API.
- 6 database tables: `users`, `applications`, `oauth_accounts`,
  `processed_emails`, `candidates`, `reminders`.
- 135 passing backend integration tests.
- 6 backend controllers / 6 models / 6 route files, strictly layered.

## Notable engineering habits demonstrated in this codebase

- Root-causing bugs before patching them (e.g., tracing a mobile layout bug
  to a completely unused dependency rather than papering over it with more
  hardcoded padding; tracing a "page transitions don't animate" complaint
  to React Router's view-transition integration silently no-op-ing, verified
  by instrumenting the actual browser API).
- Treating security properties (no user enumeration, ownership checks
  baked into queries, tokens encrypted at rest, short-lived exchange codes
  instead of tokens-in-URLs) as first-class design constraints, not
  after-the-fact hardening.
- Writing tests alongside new routes as a matter of course, not as cleanup
  — the Google-auth work alone added 20 new tests covering both the happy
  path and edge cases (expired codes, wrong-purpose tokens, a Google-only
  account hitting password-only endpoints).
- Being explicit in code comments and documentation about what's real
  versus decorative, what's a known limitation, and what's simplified and
  why — including in this file: the mobile app's paused status and its
  cause are stated plainly rather than omitted.
