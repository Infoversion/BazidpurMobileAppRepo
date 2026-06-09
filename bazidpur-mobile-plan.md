# Bazidpur Mobile App — Draft Development Plan

> Status: Draft · Last updated: 2026-06-04 (family tree layout updated)
> Trigger phrase to resume: **"I am ready for mobile app development"**

---

## Overview

A native iOS + Android app for the Bazidpur family community. Shares the existing Supabase backend (zero backend changes). Members log in with the same credentials as the website.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native (Expo SDK 52+) | Single codebase for iOS + Android |
| Language | TypeScript | Same as web project |
| Routing | expo-router (App Router style) | Mirrors Next.js file-based routing |
| Styling | NativeWind v4 (Tailwind for RN) | Same design instincts as web |
| Backend | Supabase (existing) | Zero changes — same DB, auth, RLS, storage |
| Auth | `@supabase/supabase-js` | Identical to web SDK |
| Images | Expo Image + Cloudflare R2 | Same R2 public URLs |
| Family Tree canvas | react-native-svg | Node + connector rendering |
| Touch gestures | react-native-gesture-handler | Pan + pinch-to-zoom on canvas |
| Animations | react-native-reanimated | Smooth canvas transitions, slide-in panels |
| Maps | react-native-maps | World map with member locations |
| Video | expo-av / WebView (YouTube) | Timeless Moments video tab |
| Build | EAS Build (Expo Application Services) | Cloud builds, no Xcode/Android Studio daily |
| Distribution | App Store + Google Play | TestFlight / Internal Track for testing |

---

## Repository & Project Structure

### Git
```
GitHub: Infoversion/BazidpurProjectRepo   ← web (existing, unchanged)
GitHub: Infoversion/BazidpurApp           ← mobile (new repo)
```

### Local folders
```
~/Documents/
├── bazidpur/          ← web project (existing)
└── bazidpur-app/      ← mobile project (new)
```

### VS Code workspace
Single multi-root workspace file (`~/Documents/bazidpur.code-workspace`) opens both:
```json
{
  "folders": [
    { "name": "Web", "path": "./bazidpur" },
    { "name": "App", "path": "./bazidpur-app" }
  ]
}
```

### Mobile project structure
```
bazidpur-app/
├── app/
│   ├── _layout.tsx              ← root layout, auth gate
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (tabs)/
│       ├── _layout.tsx          ← bottom tab bar
│       ├── index.tsx            ← Home / dashboard
│       ├── tree.tsx             ← Family Tree
│       ├── gallery.tsx          ← Timeless Moments
│       ├── members.tsx          ← Members directory
│       └── profile.tsx          ← My profile
├── components/
│   ├── family-tree/
│   ├── gallery/
│   └── ui/                      ← shared buttons, cards, etc.
├── lib/
│   ├── supabase.ts              ← Supabase client (same pattern as web)
│   └── types.ts                 ← shared DB types (copied from web)
├── hooks/
├── constants/
│   └── colors.ts
├── app.json                     ← Expo config
├── eas.json                     ← EAS build profiles
└── .env.local                   ← same Supabase keys as web
```

---

## Navigation

Bottom tab bar (5 tabs):

| Tab | Icon | Screen |
|---|---|---|
| Home | House | Dashboard — recent activity, quick links |
| Tree | GitBranch | Family Tree (touch-optimised) |
| Gallery | Image | Timeless Moments (photos + videos) |
| Members | Users | Directory + world map |
| Profile | User | My account, settings |

---

## Features by Phase

### Phase 1 — Core read-only app (estimated 2–3 weeks)

**Authentication**
- Login screen (email + password)
- Signup screen (name, country/state/city dropdowns)
- Forgot password flow
- Auth gate — redirect to login if not authenticated
- Role awareness (member, admin, superadmin)

**Family Tree**

Layout approach: **Pannable/Zoomable Canvas** (same left-to-right generation layout as web, adapted for touch).

Rationale: the Bazidpur tree has multiple generations and two Haveli branches — spatial context matters. Members need to see where they fit in the whole picture, not just navigate parent → child. This is the same approach used by Ancestry, MyHeritage, and FamilySearch on mobile.

```
┌─────────────────────────────┐
│  🔍  Search...       [⊡]   │  ← search bar + minimap toggle
│─────────────────────────────│
│                             │
│  [Gen1]──[Gen2]──[Gen3]     │  ← pinch to zoom in/out
│            └──[Gen3]        │     one-finger drag to pan
│  [Gen1]──[Gen2]──[Gen3]     │     tap node → popover
│                   └──[Gen4] │
│                             │
│─────────────────────────────│
│ 45 · 32 alive · Gen1:1 …   │  ← status bar (horizontally scrollable)
└─────────────────────────────┘
```

**Canvas behaviours:**
- **Default load** — zoomed to fit the full tree on screen; everything visible at once
- **Pinch to zoom** — zoom in to read names clearly, zoom out for full picture
- **One-finger drag** — pan across the canvas
- **Double-tap a node** — centre and zoom to that person
- **Minimap** — small ~80×60px thumbnail (top-right corner) showing full tree with a rectangle indicating the current viewport position; tap to toggle on/off
- **Zoom controls** — `+` / `–` buttons for accessibility (not everyone can pinch)
- **"Find me" button** — if the logged-in user exists in the tree, centres and zooms to their node

**Node interactions:**
- Tap node → **popover** with name, dates, spouse
  - Share link button (copies `bazidpur://tree?node=xxx`)
  - Show Lineage → slide-in panel from right
  - How am I related to…? → tap second node → result card at bottom
- Long-press node → context menu (admin only: Edit, Add child, Move, Copy, Delete)

**Search:**
- Tap search bar → keyboard + live filter
- Matching nodes highlight; non-matches fade (same as web)
- Tap a result → canvas animates and zooms to that person

**Status bar** (fixed 30px at bottom of canvas):
- Total · alive · deceased · male/female · Bari Haveli · Manjhli Haveli · Gen1 Gen2… counts
- Horizontally scrollable on narrow screens
- Tap a Gen label → highlights that generation (all others fade); tap again to clear

**Generation highlight:**
- Tap any Gen label in status bar → all nodes in that generation glow, others dim
- Visual orientation aid especially when zoomed out

**Lineage panel** (slide-in from right, covers ~75% of screen width):
- Full ancestor chain root → selected person
- Tap any ancestor → canvas pans + zooms to them
- Dismiss by swiping right or tapping ✕

**Relationship finder:**
- Tap "How am I related to…?" in popover → violet banner appears at top
- Tap any second node → result card slides up from bottom
- Shows relationship label (e.g. "3rd cousin", "uncle")
- Dismiss result card by swiping down

**Deep links:**
- `bazidpur://tree?node=<id>` → opens tree, animates to that node
- Shareable via iOS share sheet / Android share intent

**Implementation notes:**
- Built with `react-native-svg` for the canvas rendering
- `react-native-gesture-handler` + `react-native-reanimated` for smooth pan/pinch
- Layout algorithm reused from web (same generation-based positioning logic, ported to TS)
- Node cards sized for touch targets (minimum 44×44pt per Apple HIG)

**Timeless Moments**
- Photos tab: grid (2-col), tap → full-screen lightbox with swipe navigation
- Videos tab: list of YouTube thumbnails, tap → full-screen embed
- Likes + comments on photos and videos
- Pagination (page size from config)

**Photo Gallery**
- Grid of community photos
- Lightbox with swipe
- Likes + comments

**Members Directory**
- Searchable list of approved members
- Member card: name, location, avatar
- Tap → member detail (photo, location, joined date)

---

### Phase 2 — Full member features (estimated 1–2 weeks)

**World Map**
- react-native-maps with green dots for member locations
- Tap dot → member name card
- Cluster markers when zoomed out

**Member Albums**
- Browse albums created by members
- Album detail: photo grid, title, description
- Lightbox within album
- Likes + comments per album

**Experiences**
- List of published experiences
- Chapter-by-chapter reading view
- Rich text rendered (HTML → RN renderer)
- Share experience link

**Poetry / Ghazals**
- List of poems
- Verse-by-verse reader
- RTL support for Urdu text

**WhatsApp Archive** *(read-only)*
- Browse by chat / by date
- Message thread view
- Media tab (photos, videos)

---

### Phase 3 — Admin + notifications (estimated 1 week)

**Admin screens** *(admin/superadmin role only)*
- Pending members list — approve / reject with one tap
- Basic content moderation (delete comments)

**Push notifications** *(Expo Notifications + Supabase Edge Function)*
- New member signup alert → admins
- New content published → all members
- Member approval → notify the approved member
- Deep link from notification to relevant screen

---

## Accounts & One-time Setup

| Item | Cost | Who |
|---|---|---|
| Apple Developer Program | $99 / year | Nasir |
| Google Play Developer | $25 one-time | Nasir |
| EAS Build (Expo) | Free tier (30 builds/month) | Nasir |
| TestFlight (iOS testing) | Free (included with Apple Developer) | — |
| Google Play Internal Track | Free | — |

---

## Development Workflow

1. **Daily dev** — `npx expo start` → scan QR in Expo Go app on phone
2. **Testing builds** — `eas build --profile preview` → TestFlight / Internal Track
3. **Production** — `eas build --profile production` → App Store / Play Store submission
4. **Web stays unchanged** — all on Vercel, unaffected by mobile work

---

## Shared with Web (reuse as-is)

- Supabase project, DB tables, RLS policies
- All `/api/*` Next.js routes (called via fetch from the app where needed)
- Cloudflare R2 public URLs for images
- Environment variables (same `NEXT_PUBLIC_SUPABASE_URL` + keys)
- User roles and auth logic

---

## Key Differences from Web

| Web | Mobile |
|---|---|
| Mouse hover for tooltips | Tap for popovers |
| Scroll to pan tree | One-finger pan + pinch zoom |
| CSS/Tailwind | NativeWind (Tailwind syntax → RN StyleSheet) |
| Next.js Image | expo-image |
| Browser storage | expo-secure-store (for auth tokens) |
| window.location | expo-router navigation + deep links |
| CSS animations | react-native Animated / Reanimated |

---

## Open Questions (to resolve before starting)

1. Should the app be publicly listed on the App Store / Play Store, or invite-only via TestFlight?
2. Should signup be allowed from the app, or web-only?
3. Admin features in the app — just member approval, or more?
4. Offline support — cache tree/photos for use without internet? (Phase 2 stretch goal)
5. App name and bundle ID (e.g. `com.bazidpur.app`)
6. App icon and splash screen assets needed

---

## Resuming This Plan

When ready, say: **"I am ready for mobile app development"**

First session will:
1. Resolve open questions above
2. `npx create-expo-app bazidpur-app --template tabs` scaffold
3. Install and configure: NativeWind, Supabase client, expo-router
4. Build auth screens (login + signup)
5. Build bottom tab navigation shell
6. Begin Phase 1 — Family Tree
