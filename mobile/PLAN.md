# Mobile UI Redesign — match `designs/mobile-view.png`

## Context

The mobile app (Core MVP, built earlier this session) works, but its UI was
never designed against a reference — it's plain form/list styling. `designs/mobile-view.png`
is an iPhone showcase with 6 screens: login, home, applications list, review
queue, an individual-application detail view, and analytics. The user wants
the mobile app rebuilt visually to match this reference, and it explicitly
introduces two screens that don't exist yet (application detail, analytics)
and a different navigation shape (a 5-icon bottom bar with a center add
button, plus a hamburger) than the 3-tab bar currently built.

**No backend changes are needed anywhere in this plan.** Every screen is
either already backed by an existing endpoint (`GET/POST/PUT/DELETE
/applications`, `GET /applications/:id`, `GET/POST /candidates`,
`/candidates/:id/accept|dismiss`, `/integrations/gmail/*`, `POST
/sync/gmail`) or is client-derived from data those endpoints already return
(sparklines, the analytics charts, the calendar month view). This stays true
to the "mobile is just a new client" principle the rest of the app follows.

Decisions made while planning, called out so they're not a surprise mid-build:

- **Nav scope** (per your answer): Calendar and More get built for real, not
  stubbed. Analytics has no bottom-tab slot in the mockup (its screenshot
  still shows "Dashboard" highlighted), so it's reached via the hamburger
  icon instead of a tab.
- **Bottom bar is hand-built, not React Navigation's `<Tabs>`.** The mockup's
  Analytics/Detail screens keep the tab bar visible with "Dashboard" staying
  highlighted even though neither is really the Dashboard tab — that's not
  something `<Tabs>` does naturally without fighting nested-stack-per-tab
  wiring. A small custom `BottomTabBar` component (reads the current route via
  `usePathname()`, decides its own highlight) plus a flat `Stack` is simpler
  and gives per-screen control over when the bar even shows (Review Queue and
  the Add-application modal hide it, matching the mockup).
- **The center `+`** opens a modal "Add application" screen rather than
  scrolling to a form on Home — cleaner than replicating a scroll-to-form
  interaction, still one tap.
- **"Continue with Google," "Remember me," "Forgot password"**: none of these
  have backend support (Google login is a separate, bigger feature from the
  Gmail *read-only import* OAuth that already exists; there's no
  password-reset endpoint). They're included visually for fidelity to the
  design; tapping shows a lightweight "not available yet" message rather than
  silently doing nothing or pretending to work. Easy to wire up for real
  later if wanted.
- **Application-detail "Activity" timeline**: there's no audit-log table, so
  a real per-status-change history isn't derivable. It's simplified to what
  the row's own fields actually support: "Added" (`created_at`), "Imported
  from Gmail" (if `source === 'email'`), "Last updated" (`updated_at`, only
  if different from `created_at`). Noting this so a full audit trail is
  understood as separate, future backend work, not something quietly skipped.
- **Sparklines on the Home stat cards**: real, not decorative filler — each
  card's line is that status's applications bucketed by week of
  `date_applied`, so the four cards actually show different shapes.
- **Charts need `react-native-svg`** (SDK 54's blessed version, `15.12.1`) —
  the only new dependency this plan adds. Everything else (donut, line chart,
  wave decoration) is hand-rolled SVG, matching the web app's own
  hand-rolled-not-a-library charts.
- **No custom fonts** — system font, same as today, to avoid an
  `expo-font` + asset-loading detour the design doesn't obviously require.

## File structure after this change

```
mobile/app/
  _layout.js                 root Stack: login, register, (app)
  login.js                   redesigned
  register.js                redesigned
  (app)/
    _layout.js                auth-guard (same Redirect pattern as today), flat Stack
    index.js                  Home/Dashboard
    applications.js           Applications list
    application/[id].js       NEW — application detail
    review-queue.js           moved here from (tabs); no bottom bar when shown
    calendar.js                NEW
    analytics.js                NEW — reached via hamburger, not a tab
    more.js                     NEW
    add-application.js          NEW — modal, opened by the `+` button

mobile/src/components/
  TopBar.js                  hamburger -> /analytics, logo, Gmail status pill
  BottomTabBar.js             5 icons, highlight from usePathname(), + -> modal
  Sparkline.js                small SVG polyline, used by StatCard
  StatCard.js                 rewritten to host a Sparkline
  CompanyLogo.js               NEW — mirrors client/src/components/CompanyLogo.jsx
  StatusPill.js                NEW — read-only colored badge (list rows, detail)
  StatusPicker.js              restyled only, logic unchanged
  PickerField.js                NEW — generalized version of StatusPicker's modal-sheet
                                 pattern, reused for the status filter and the
                                 Analytics time-range/granularity dropdowns
  ApplicationRow.js            rewritten — summary-only, taps through to detail
  CandidateCard.js              restyled to match the mockup's card more closely
  DonutChart.js                 NEW — SVG donut, Analytics
  LineChart.js                  NEW — SVG line+dots, Analytics
  WaveBackground.js             NEW — decorative SVG wave, login/register
```

`(tabs)/` is removed entirely (renamed to `(app)/`, no longer a `<Tabs>` group).

## Verification

- `npx expo install --check` after adding `react-native-svg`.
- `npx expo export --platform android` after each phase below that touches
  routing/screens — catches import/route-config errors without a device.
- Start the dev server for real (`npx expo start`), confirm Metro responds
  (`curl localhost:8081/status`), regenerate the QR code the same way as
  before, and hand it to you to actually check on-device — same disclosure as
  last time: I can't visually verify RN rendering from this sandbox.
- Update `mobile/README.md`'s architecture notes (custom bottom bar instead
  of `<Tabs>`, new screens) and the root `README.md`'s mobile section/roadmap
  (Calendar/Analytics/More move from "future" to "done").
- Commit + push at the end, following this repo's established pattern
  (exclude the pre-existing uncommitted deploy-prep files, `Co-Authored-By`
  trailer).

---

## Steps

### Phase 0 — Setup
- [x] Add `react-native-svg` via `npx expo install react-native-svg`
- [x] Create `mobile/PLAN.md` in the repo with this checklist (kept in sync
      as steps complete)

### Phase 1 — Shared shell components
- [x] `src/components/TopBar.js` (hamburger -> `/analytics`, "Landed"
      wordmark, Gmail status pill — pill triggers `gmail.connect()` when
      disconnected, is read-only when connected)
- [x] `src/components/BottomTabBar.js` (Dashboard/Applications/`+`/Calendar/More;
      highlight via `usePathname()`; `+` -> `router.push('/add-application')`)
- [x] `src/components/Sparkline.js` (small SVG polyline, takes an array of numbers)
- [x] `src/components/CompanyLogo.js` (favicon fetch + initial fallback, mirrors
      `client/src/components/CompanyLogo.jsx`)
- [x] `src/components/StatusPill.js` (read-only colored badge)
- [x] `src/components/PickerField.js` (generalized modal-sheet picker, extracted
      from `StatusPicker`'s pattern)
- [x] `src/components/WaveBackground.js` (decorative SVG wave)
- [x] `src/components/StatCard.js` rewritten to host a `Sparkline`
- [ ] Verify: `npx expo export --platform android` still succeeds

### Phase 2 — Navigation restructure
- [x] Rename `app/(tabs)/` to `app/(app)/`, convert its `_layout.js` from
      `<Tabs>` to a plain `<Stack>` (keep the existing auth-guard `Redirect`
      logic unchanged)
- [x] Update `app/_layout.js`'s `Stack.Screen` name from `(tabs)` to `(app)`
- [x] Move `review-queue.js` into `(app)/` as a plain stack screen (no bottom bar)
- [x] Verify: app still boots to Home, login/logout roundtrip works, bundle exports cleanly

### Phase 3 — Auth screens
- [x] Rebuild `login.js`: logo header, "Track. Organize. **Get hired.**"
      headline, segmented Log in/Create account pill (navigates `/login` <->
      `/register`), icon-prefixed email/password fields, Remember me +
      Forgot password (inert, shows a message), primary Log in button,
      divider, Google button (inert, shows a message), terms footer,
      `WaveBackground` behind the form
- [x] Rebuild `register.js` with the same visual language (Create account
      active on the segmented pill)
- [x] Verify: bundle exports cleanly. **Still needs your on-device check** —
      registering/logging in/inert-button behavior can't be exercised from
      this sandbox; covered in the final on-device pass (Phase 12)

### Phase 4 — Home/Dashboard (`(app)/index.js`)
- [x] `TopBar` at the top
- [x] 2x2 stats grid, each `StatCard` with a real per-status weekly-bucketed
      `Sparkline`
- [x] "Add an application" card (existing create logic, restyled)
- [x] Gmail connect prompt card — **only rendered when not connected**
      (matches the mockup, which never shows it); once connected the space
      is simply not there
- [x] "Review queue N — Sync Gmail now" section, inline candidate cards
      (reuses `CandidateCard`), section header taps through to `/review-queue`
- [x] `BottomTabBar` at the bottom, Dashboard highlighted
- [x] Verify: bundle exports cleanly. **On-device check pending** (Phase 12)

### Phase 5 — Applications list (`(app)/applications.js`)
- [x] `TopBar`, "Your applications" header, "All statuses" filter via
      `PickerField`, "N results" count, a working sort toggle (date asc/desc)
- [x] Rewrite `ApplicationRow.js`: `CompanyLogo`, company/role, `StatusPill`,
      source icon, date — **no inline expand/notes/delete**; tapping the row
      pushes `/application/[id]`
- [x] `BottomTabBar`, Applications highlighted
- [x] Verify: bundle exports cleanly. **On-device check pending** (Phase 12)

### Phase 6 — Application detail (`(app)/application/[id].js`) — NEW
- [x] Back arrow + "Application" header + overflow menu (delete)
- [x] `CompanyLogo`, company, role, `StatusPill`
- [x] Date applied, Source, Status (`PickerField`, writes via existing `PUT`)
- [x] Notes textarea with character count, save button
- [x] Activity section: Added / Imported from Gmail / Last updated, derived
      from existing fields (see Context — no new backend)
- [x] Delete application (confirm, same `Alert` pattern as today), navigates
      back to the list on success
- [x] No `BottomTabBar` change needed — this screen is nested under `(app)`
      so the bar stays visible per the mockup
- [x] Verify: bundle exports cleanly. **On-device check pending** (Phase 12)

### Phase 7 — Review queue (`(app)/review-queue.js`)
- [x] Restyle header (back arrow, "Review queue N", "Sync now")
- [x] Restyle `CandidateCard` to match the mockup's card treatment more closely
      (label pill styling, confidence % placement) — accept/dismiss logic unchanged
- [x] No `BottomTabBar` on this screen (matches the mockup)
- [x] Verify: bundle exports cleanly. **On-device check pending** (Phase 12)

### Phase 8 — Calendar (`(app)/calendar.js`) — NEW
- [x] Month grid view of applications by `date_applied`, color-coded by
      status (mirrors `client/src/pages/CalendarPage.jsx`'s logic), prev/next
      month controls, tap a day to see what's on it
- [x] `TopBar` + `BottomTabBar`, Calendar highlighted
- [x] Verify: bundle exports cleanly. **On-device check pending** (Phase 12)

### Phase 9 — Analytics (`(app)/analytics.js`) — NEW
- [x] Stats row (Total/Applied/Interviewing/Offers, plain numbers)
- [x] "Applications over time" — `LineChart`, real week/month toggle via `PickerField`
- [x] "Applications by status" — `DonutChart` + legend, reuses the existing
      validated status palette (`colors.status`)
- [x] "Source breakdown" — Gmail vs. manual stacked bar + counts
- [x] "Last 30 days" range picker — real client-side filtering (7/30/90/all)
- [x] `BottomTabBar` shown with **Dashboard** highlighted (matches the mockup)
- [x] Verify: bundle exports cleanly. **On-device check pending** (Phase 12)

### Phase 10 — More (`(app)/more.js`) — NEW
- [x] Account section: email, Disconnect Gmail (only if connected), Logout
- [x] `TopBar` + `BottomTabBar`, More highlighted
- [x] Verify: bundle exports cleanly. **On-device check pending** (Phase 12)

### Phase 11 — Add-application modal (`(app)/add-application.js`) — NEW
- [x] Modal presentation (`Stack.Screen options={{ presentation: 'modal' }}`),
      reuses the existing create-application call (POST `/applications`);
      also adds a Status picker, going a bit further than Home's minimal
      inline form since this is a dedicated add screen
- [x] No `BottomTabBar` (it's a modal)
- [x] Verify: bundle exports cleanly, all routes wired into `(app)/_layout.js`.
      **On-device check pending** (Phase 12)

### Phase 12 — Wrap-up
- [x] Consistency pass (found and fixed: a hardcoded green hex that should've
      used the new `colors.success` token; `formatDateTime` in the detail
      screen relying on `new Date()` parsing a MySQL TIMESTAMP string, which
      isn't reliable across JS engines — switched to slicing the date part
      and reusing the existing safe parse-from-parts approach)
- [x] `npx expo install --check` and `npx expo export --platform android` one
      final time — clean
- [x] Started the dev server, confirmed it serves (`curl localhost:8081/status`),
      regenerated the QR code
- [x] Updated `mobile/README.md` and root `README.md`
- [x] Mark all `mobile/PLAN.md` checkboxes complete, commit, push
