# Landed — Mobile (Expo Go)

A React Native companion to the [web app](../client) and [API](../server), built with Expo Router. Same backend, same account — log in with the same email/password you use on the web.

**Scope (v1):** login/register, a home screen with stats + quick-add, the full applications list (status changes, notes, delete), and the Gmail review queue (sync, accept/dismiss). Calendar, Analytics, Reminders, and Settings are web-only for now — see the root README's roadmap.

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

- **Expo Router** (file-based routing, `app/`). The `(tabs)` group is a ["protected layout route"](https://docs.expo.dev/router/advanced/authentication/) — one auth check in `app/(tabs)/_layout.js` guards every screen inside it, rather than repeating the check per screen.
- **Token storage**: `expo-secure-store` (native encrypted storage) instead of the web app's `localStorage` — `src/AuthContext.js` has the same shape as `client/src/AuthContext.jsx` otherwise.
- **`src/api.js`** mirrors `client/src/api.js` closely on purpose (same `get/post/put/del` shape) so the two codebases stay easy to compare.
- **Gmail connect is a real trade-off, not a shortcut I'm hiding**: tapping "Connect Gmail" opens the *existing* web OAuth flow in the system browser (`expo-web-browser`) rather than building a second, mobile-specific OAuth client. Google's redirect lands on the web app (`CLIENT_URL`), not back inside Expo Go — there's no custom URL scheme wired up for that. `GmailContext.refresh()` re-checks status whenever the Review Queue or Home tab regains focus, which covers "switch back to the app after finishing in the browser" well enough for a v1. A proper native deep-link back into the app (a mobile-specific Google OAuth client, or `CLIENT_URL` awareness of which flow started it) is real future work, not something worth faking here.
- **No native `<select>`**: `src/components/StatusPicker.js` stands in for the web app's styled `<select>` with a small modal list — same 5 statuses, same colors.
- **Status colors** (`src/theme.js`) mirror `client/src/index.css`'s custom properties and the same validated palette from `designs/app-ui-design.png.png`, so this reads as the same product, not a reskin.

## Known limitations

- No Calendar/Analytics/Reminders/Settings screens yet (by design — Core MVP scope, see above)
- No push notifications
- No offline support — every screen fetches fresh on focus, no local cache
- Verified via Metro bundler starting cleanly and a code review, not on a physical device/simulator from this environment — there's no way to visually confirm rendering without you scanning the QR code yourself
