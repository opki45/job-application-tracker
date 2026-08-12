# Landed — Mobile (Expo Go)

> **Status: paused.** Development stopped here after hitting real on-device
> bugs (layout content rendering under the iOS status bar/notch, among
> others) that weren't tracked down before the decision was made to defer
> the rest of this effort to a future phase. The code below is a real,
> mostly-working app as of the last commit, but nothing past that point has
> been re-verified — don't assume anything described here (including "fixed"
> claims from earlier in [`PLAN.md`](PLAN.md)) is actually correct on a real
> device until this is picked back up and re-tested.

A React Native companion to the [web app](../client) and [API](../server), built with Expo Router. Same backend, same account — log in with the same email/password you use on the web.

**Scope:** login/register, a home dashboard (stats with real per-status sparklines, quick-add, an inline review-queue preview), the full applications list, a dedicated application detail screen, the Gmail review queue, a Calendar month view, and an Analytics screen (status donut, applications-over-time line chart, source breakdown) — all built to match [`designs/mobile-view.png`](../designs/mobile-view.png). Reminders and full Settings (change password, delete account) are still web-only; the mobile "More" screen covers account basics (Gmail disconnect, logout) — see the root README's roadmap.

## Why this exists

The backend needed **zero changes** for this — it's just a new client hitting the same REST API the web app already uses (`server/src/app.js`). That's the whole point of a hand-rolled JSON API instead of something tightly coupled to one frontend.

## Prerequisites

- The backend running and reachable — see [`../server/README.md`](../server/README.md)
- [Expo Go](https://expo.dev/go) installed on your phone (App Store / Play Store)
- Your phone and dev machine on the **same Wi-Fi network**

## Setup

```bash
cd mobile
npm install
cp .env.example .env    # then edit EXPO_PUBLIC_API_URL -- see below
npm start                # opens the Expo dev tools; scan the QR code with Expo Go
```

### `EXPO_PUBLIC_API_URL`

A phone can't reach `localhost` and mean your dev machine — that resolves to the phone itself. Use your machine's LAN IP instead:

```bash
# Windows
ipconfig                    # look for "IPv4 Address" under your active adapter

# macOS/Linux
ifconfig | grep inet
```

Then set `EXPO_PUBLIC_API_URL=http://<that-ip>:3000` in `.env`. This is inlined into the JS bundle by Metro at build time (`EXPO_PUBLIC_*` is Expo's convention for client-exposed env vars, same mechanism the web client uses for `VITE_API_BASE_URL`) — restart `npm start` after changing it.

If the phone still can't connect, check that:
- Your backend is actually running (`cd server && npm run dev`) — `app.listen()` already binds to all interfaces, no server change needed
- Windows Firewall isn't blocking inbound connections on port 3000 (you may get a prompt the first time the server starts; allow it on private networks)
- The phone really is on the same Wi-Fi network, not mobile data

## Architecture notes

- **Expo Router** (file-based routing, `app/`). The `(app)` group is a ["protected layout route"](https://docs.expo.dev/router/advanced/authentication/) — one auth check in `app/(app)/_layout.js` guards every screen inside it, rather than repeating the check per screen.
- **The bottom bar is hand-built** (`src/components/BottomTabBar.js`), not React Navigation's `<Tabs>`. The design keeps the bar visible with "Dashboard" highlighted even on screens that aren't really the Dashboard tab (Analytics, the application detail screen) — a plain `Stack` plus a component that decides its own highlight from `usePathname()` matches that without fighting nested-stack-per-tab wiring. The center `+` opens `add-application.js` as a modal.
- **Analytics has no bottom-tab slot** — reached via `TopBar`'s hamburger icon (`router.push('/analytics')`), same as the design's own screenshots show (Dashboard stays highlighted while viewing it).
- **Token storage**: `expo-secure-store` (native encrypted storage) instead of the web app's `localStorage` — `src/AuthContext.js` has the same shape as `client/src/AuthContext.jsx` otherwise.
- **`src/api.js`** mirrors `client/src/api.js` closely on purpose (same `get/post/put/del` shape) so the two codebases stay easy to compare.
- **Gmail connect is a real trade-off, not a shortcut I'm hiding**: tapping "Connect Gmail" opens the *existing* web OAuth flow in the system browser (`expo-web-browser`) rather than building a second, mobile-specific OAuth client. Google's redirect lands on the web app (`CLIENT_URL`), not back inside Expo Go — there's no custom URL scheme wired up for that. `GmailContext.refresh()` re-checks status whenever a screen regains focus, which covers "switch back to the app after finishing in the browser" well enough for a v1. A proper native deep-link back into the app (a mobile-specific Google OAuth client, or `CLIENT_URL` awareness of which flow started it) is real future work, not something worth faking here.
- **No native `<select>`**: `src/components/StatusPicker.js` (editable) and `src/components/PickerField.js` (a generalized version, used for filters/dropdowns) stand in for the web app's styled `<select>` with a small modal list.
- **Charts are hand-rolled SVG** (`react-native-svg`), not a charting library — `src/components/DonutChart.js` and `LineChart.js`, matching the web app's own hand-rolled (not-a-library) charts. Status colors (`src/theme.js`) mirror `client/src/index.css`'s custom properties and the same validated palette, so this reads as the same product, not a reskin.
- **The application detail screen's "Activity" section** (`app/(app)/application/[id].js`) is derived from `created_at`/`updated_at`/`source` — there's no audit-log table, so a real per-status-change history isn't available. A full timeline is future backend work.
- **"Continue with Google," "Remember me," and "Forgot password"** on the auth screens are visually present (matching the design) but inert — none have backend support yet (Google login is a separate feature from the Gmail *read-only import* OAuth that already exists; there's no password-reset endpoint). Tapping them shows a message rather than silently doing nothing.

## Known limitations

- No Reminders screen, and Settings is limited to what's on the More screen (Gmail disconnect, logout) — change password / delete account stay web-only for now
- No push notifications
- No offline support — every screen fetches fresh on focus, no local cache
- Verified via Metro bundler starting cleanly (`npx expo export`) and a code review, not on a physical device/simulator from this environment — there's no way to visually confirm rendering without you scanning the QR code yourself
