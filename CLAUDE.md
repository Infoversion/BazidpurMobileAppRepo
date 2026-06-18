@AGENTS.md

---

# Bazidpur Mobile App — Complete Reference

## What This App Is

A private community and heritage app for families connected to **Bazidpur village, Nawada district, Bihar, India**. The village was founded by Shah Mahmood in honour of the Sufi saint Bayazid Bastami (~850 AD). The app serves as a digital home for the diaspora — family tree, history, community, poetry, memoirs, and media.

**Companion web app:** `/Users/nasirali/Documents/Projects/BazidpurWeb`
**GitHub (mobile):** `https://github.com/Infoversion/BazidpurMobileAppRepo`
**Live domain:** `https://bazidpur.com`
**EAS Project ID:** `214b0ec8-49ed-4d9e-8245-662a0860599c`
**Bundle ID:** `com.bazidpur.app`
**App version:** `1.0.0` / Build `1`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK ~54 / React Native 0.81.5 |
| Routing | Expo Router ~6 (file-based) |
| Styling | NativeWind v4 (Tailwind for RN) + inline StyleSheet |
| Auth & DB | Supabase (`@supabase/supabase-js ^2`) |
| Storage | Cloudflare R2 (CDN prefix: `https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev`) |
| API | `https://bazidpur.com/api` (Next.js backend) |
| SVG icons | `react-native-svg` 15.12.1 |
| Images | `expo-image` (NOT React Native's built-in Image) |
| Country/State data | `country-state-city` npm package |
| Build/Deploy | EAS Build (`eas build --platform ios --profile production`) |

---

## App Structure

```
app/
  (public)/          # Unauthenticated screens (no login required)
    index.tsx        # Landing/home for visitors
    about.tsx        # Public about page
    media.tsx        # Public media
    help.tsx         # Role-based help screen
    privacy-policy.tsx
    contact.tsx
    fazihat-shah-warsi.tsx
  (auth)/            # Login/signup flows
    login.tsx
    signup.tsx
    forgot-password.tsx
  (tabs)/            # Main app (post-login tab navigation)
    _layout.tsx      # ← ANIMATED TAB BAR (see below)
    home.tsx
    about.tsx
    zahoor-ali.tsx
    media.tsx
    more.tsx         # Profile page
    tree.tsx         # Family tree (hidden tab)
    lineage.tsx      # Lineage (hidden tab)
    admin/           # Admin panel (hidden tab)
    community/       # Community hub (hidden tab, members only)
      index.tsx      # Community landing
      gallery.tsx    # Photo/video albums
      moments.tsx    # Timeless moments
      poetry.tsx     # Urdu/Persian poetry & ghazal
      memoirs.tsx    # Life stories / experiences
      reading-room.tsx
      forum/
        index.tsx    # Thread list
        [id].tsx     # Thread detail + replies

components/
  PurpleHeader.tsx       # Universal header (purple bg, SVG icons)
  CountryStatePicker.tsx # Searchable country/state modal pickers
  ReportButton.tsx       # UGC report button (Apple compliance)
  DateOfBirthPicker.tsx
  RoleBadge.tsx
  BackButton.tsx
  gallery/               # Lightbox, video player

lib/
  auth-context.tsx   # useAuth() hook — session, user, signOut, refreshUser
  supabase.ts        # Supabase client
  types.ts           # All TypeScript interfaces
  webApi.ts
  family-tree-layout.ts
```

---

## User Roles

```
visitor    → not logged in, public screens only
pending    → signed up, awaiting admin approval
member     → approved, full community access
admin      → can moderate, manage content
superadmin → full access including user management
```

Auth flow: user signs up → status is `pending` → admin approves in web dashboard → user becomes `member`.

**Apple reviewer note:** Provide a pre-approved `member` account (NOT admin) as the demo account. Admin features link to the web dashboard — this is intentional and acceptable to Apple.

---

## Animated Tab Bar — `app/(tabs)/_layout.tsx`

The tab bar is **fully custom** — not the default Expo tab bar.

### Key behaviour
- **Grip handle** at top of bar → collapses bar off screen with spring animation
- **Mini pill** appears bottom-left when collapsed (deep purple `#2d1b69`)
- Pill **pulses** with `Easing.inOut(Easing.sin)` loop while collapsed
- Tap pill → bar expands back with spring animation
- Pill shows **sub-screen emoji** when inside a community sub-screen (e.g. 🌳 in Family Tree, 🖼️ in Gallery) via `getSubScreenIcon(pathname)`

### Animation values
- `slideY` — bar translate Y (0 = visible, `100 + insets.bottom` = hidden)
- `pillAlpha` — pill opacity (0 = hidden, 1 = visible)
- `pillScale` — pill scale spring
- `pulseScale` — pulse loop scale (1.0 ↔ 1.08)
- Combined scale: `Animated.multiply(pillScale, pulseScale)`

### Tab icons
| Tab | Icon | Notes |
|---|---|---|
| Home | SVG house + chimney | Orange `#f97316` filled when active, outline when inactive |
| About | `about-icon.png` | Cropped arch image, colour-boosted with Pillow |
| Zahoor Ali | Portrait photo | `PortraitIcon` component, ZOOM=2.4, left: hOffset-1, top: 0 |
| Media | SVG camera | Orange `#f97316`, 80% opacity when inactive |
| Community | SVG people | Orange `#f97316`, 80% opacity when inactive |

### Hidden tabs (no tab bar entry)
`index`, `contact`, `tree`, `lineage`, `more`, `admin`

### ⚠️ Critical gotcha
`Easing.sine` does NOT exist in React Native. Always use `Easing.sin` (no 'e').

---

## PurpleHeader Component

Universal header used on every screen. Background: `#2d1b69`.

### Props
```tsx
<PurpleHeader
  title="Screen Title"
  showBack           // shows back chevron
  hideVisitorActions // hides login/join buttons (e.g. on signup page)
/>
```

### Right-side icons (SVG, 34×34 with white border)
Order: **Help → Contact (envelope) → Avatar / Sign In / Join**

- Help icon → `/(public)/help`
- Contact icon → `/(public)/contact`
- Avatar shown when logged in, Sign In + Join shown to visitors

---

## CountryStatePicker Component

Searchable modal pickers for country and state/region.

```tsx
import { CountryPicker, StatePicker } from '@/components/CountryStatePicker'

<CountryPicker
  value={country}
  countryCode={countryCode}
  onChange={(name, code) => { setCountry(name); setCountryCode(code); setState('') }}
/>
<StatePicker
  value={state}
  countryCode={countryCode}
  onChange={(name) => setState(name)}
/>
```

- Uses `country-state-city` npm package
- Stores country/state **names** (not ISO codes) in Supabase
- StatePicker is disabled until a country is selected
- Purple-themed modal with auto-focus search

---

## ReportButton Component

Apple App Store compliance — required for UGC apps (guideline 1.2).

```tsx
import { ReportButton } from '@/components/ReportButton'
<ReportButton contentType="thread" contentId={item.id} />
```

Content types: `'thread' | 'reply' | 'poem' | 'memoir'`

Placed on: forum thread list, forum thread detail (thread + each reply), poetry sheet, memoir cards.

**Requires `reports` table in Supabase:**
```sql
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES users(id),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can submit reports" ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "admins can view reports" ON reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);
```

---

## Help Screen — `app/(public)/help.tsx`

Role-based accordion help screen with 17 sections.
- Accessible via `?` icon in PurpleHeader from every screen
- Content filtered by `effectiveRole`: `visitor | pending | member | admin | superadmin`
- Covers: navigation, tab bar collapse, all community features, family tree, profile, joining, admin panel
- Zahoor Ali description: "Fazihat Shah Warsi was bestowed by Hazrat Waris Ali Shah of Barabanki — an honourific title, NOT a pen name"

---

## Signup & Profile — Mandatory Fields

Both `signup.tsx` and `more.tsx` (profile) enforce:
- First name, Last name ✱
- Gender ✱
- Country ✱ (CountryPicker dropdown)
- State/Region ✱ (StatePicker dropdown)
- City/Village ✱
- Link to Bazidpur ✱

Signup also requires:
- Email, Password (min 8 chars), Confirm password ✱
- Privacy Policy acceptance checkbox ✱
- `privacy_policy_accepted_at` stored as ISO timestamp in Supabase user metadata

Create Account button is **disabled + grey** until privacy policy is accepted.

---

## Supabase Database Key Tables

| Table | Purpose |
|---|---|
| `users` | Profile data, role, location, `privacy_policy_accepted_at` |
| `threads` | Forum threads (`room='general'`, `is_deleted`, `is_pinned`) |
| `thread_replies` | Forum replies (`is_deleted`), supports rich media attachments |
| `thread_attachments` | Media files attached to forum replies (photo, audio, PDF, YouTube) |
| `reports` | UGC reports (content_type, content_id, reason) |
| `timeless_moments` | Photos for Timeless Moments |
| `timeless_moment_videos` | Videos for Timeless Moments |
| `experiences` | Memoir stories |
| `experience_chapters` | Memoir chapters |
| `poetry_verses` | Verses for poems |
| `photo_albums` | Community photo albums (NOT `albums` — that name is wrong) |
| `album_photos` | Photos within albums (`r2_url`, `thumbnail_url`, `is_hidden`, `display_order`) |
| `video_albums` | Community video albums |
| `video_album_items` | YouTube videos within video albums (`youtube_id`, `display_order`) |

---

## Assets

| File | Notes |
|---|---|
| `assets/images/splash-icon.png` | New splash (1024×1536, Islamic arch door) |
| `assets/images/about-icon.png` | Cropped + colour-boosted arch (square, 300×300) |
| `assets/images/icon.png` | App icon (1024×1024) ✅ correct size for App Store |

**To update about-icon.png** from the original splash:
```bash
python3 -c "
from PIL import Image, ImageEnhance
import colorsys
# crop 1024x1024 from top, add 80px top padding, boost HSV saturation x3
"
```

---

## App Store Submission Status

- ✅ `app.json` — bundle ID, build number `1`, photo permission strings
- ✅ `eas.json` — development / preview / production profiles, `autoIncrement: true`
- ✅ EAS CLI installed via Homebrew
- ✅ Report button added (Apple UGC guideline 1.2)
- ✅ Privacy policy at `bazidpur.com/privacy-policy`
- ⬜ App Store Connect listing created
- ⬜ Screenshots prepared (6.9" and 6.5" device sizes)
- ⬜ Production build: `eas build --platform ios --profile production`
- ⬜ Submit: `eas submit --platform ios`

**App Store keywords (100 chars):**
`bihar,india,village,heritage,family,genealogy,community,ancestry,roots,culture,lineage,diaspora,urdu,bazidpur`

**App Store subtitle (30 chars):**
`Family, Heritage & Community`

---

## Development Workflow

```bash
# Start dev server
npx expo start --clear

# Run on iOS simulator (native build — needed for splash, permissions)
npx expo run:ios

# Full clean native rebuild (use when native config changes)
npx expo prebuild --clean && npx expo run:ios

# Clear Xcode derived data (when splash/icon not updating)
rm -rf ~/Library/Developer/Xcode/DerivedData

# Production build via EAS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

> ⚠️ **iOS builds take ~30–45 min, not ~5 min.** This project ships a custom JavaScript engine (JSC instead of Hermes) to work around an iOS 26 + Hermes V1 crash. The setup requires `expo-build-properties` with `ios.buildReactNativeFromSource: true`, which compiles React Native from source on every EAS build instead of using prebuilt frameworks. Don't be surprised when a build runs ~6× slower than typical Expo iOS builds — this is expected, not broken. Full background: see "Hermes / iOS 26 / SDK 56 — Dead Ends" section at the bottom of this file.

---

## Things to Watch Out For

1. **`Easing.sin` not `Easing.sine`** — `Easing.sine` is undefined in React Native, causes silent crash
2. **Expo Router cache** — always use `--clear` when tab bar or navigation changes don't appear
3. **Port 8081 conflict** — if Metro won't start, check `lsof -i :8081` and kill the old process
4. **Splash screen caching** — iOS caches the launch screen separately from the app binary. After rebuilding, erase the simulator (`xcrun simctl erase <ID>`) to see the new splash
5. **`expo-image` not `Image` from react-native** — the project uses `expo-image` throughout for performance; don't switch to RN's built-in Image
6. **NativeWind + inline styles** — both are used. NativeWind classNames work on most components; use inline styles for dynamic/computed values
7. **Tab bar is fully custom** — do NOT use `tabBarStyle`, `tabBarOptions`, or any default tab bar props; everything goes through `CustomTabBar` in `_layout.tsx`
8. **Country/State pickers store names not codes** — `form.country` is "United Kingdom" not "GB"; this is intentional for readability in the DB
9. **Admin button to web dashboard** — intentional, acceptable to Apple. Ensure Apple reviewer is given a `member` account not `admin`
10. **Supabase `reports` table** — must be created manually in Supabase dashboard before ReportButton will persist data (SQL is in this file above)
11. **`autoIncrement: true` in `eas.json`** — EAS auto-increments `buildNumber` on each production build; do NOT manually change it between builds
12. **React Native SVG** — import individual elements: `import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg'`
13. **Photo upload — always resize + convert on device** — ALL photos from the mobile must go through `manipulateAsync` before upload, not just HEIC. Use: `manipulateAsync(uri, [{ resize: { width: 1920 } }], { compress: 0.85, format: SaveFormat.JPEG })`. This handles three things at once: (a) converts HEIC/HEIF → JPEG so browsers can display it, (b) caps file size to ~1–3 MB keeping under Vercel's 4.5 MB body limit, (c) removes need to detect file extension before deciding. Server-side `sharp` does NOT support HEIC — conversion must happen on device. See `app/(tabs)/community/album/[id].tsx` `addPhotos()` for the current implementation.
14. **Vercel serverless body size limit is 4.5 MB** — any multipart POST to `/api/*` larger than 4.5 MB returns a 413 error. This cannot be raised on the Hobby/Pro plan. The only fix is to resize/compress on the client before sending. Web uploads avoid this by using presigned R2 URLs (direct browser → R2), bypassing the Vercel function entirely. Mobile uploads currently go through the Vercel function as multipart — hence the mandatory resize in rule 13.
15. **Web vs mobile upload paths are different** — Web: presigned URL flow (`/api/albums/[id]/photos/presign` → direct PUT to R2 → register in DB). Mobile: multipart POST to `/api/albums/[id]/photos` → server generates thumbnail with sharp → uploads to R2. Both paths store `r2_url` and `thumbnail_url` in `album_photos`. If the multipart thumbnail generation fails (e.g. unsupported format), `thumbnail_url` falls back to `r2_url`.
16. **HEIC migration script** — If HEIC photos slipped through before rule 13 was enforced, run `BazidpurWeb/scripts/convert-heic-photos.mjs` locally. It queries `album_photos` for any `.heic`/`.heif` URLs, downloads from R2, converts with macOS `sips`, generates a thumbnail with `sharp`, re-uploads both as JPEG, and updates the DB rows.
17. **Empty album visibility** — Empty albums (0 photos) are hidden from other members in the albums list (`/albums`). The album owner always sees their own empty albums. Admins see all albums. This is enforced in `AlbumsClient.tsx` via `visibleOtherAlbums` filter before pagination. The album page (`/albums/[id]`) itself is still accessible by URL regardless.
18. **Forum rich media attachments** — Forum replies support photo, audio (recorded or uploaded), PDF, and YouTube link attachments. Attachments are stored in `thread_attachments` table and uploaded via presigned R2 URLs (`/api/forum/presign`). On web, attachments render inline (lightbox for photos, audio player, PDF link, YouTube iframe). On mobile, `[id].tsx` in `forum/` handles both upload and display.

---

## Hermes / iOS 26 / SDK 56 — Dead Ends That Wasted Days

Background: in June 2026 (around SDK 54→56 migration), the app crashed on launch in every production iOS build on iPhone18,1 / iOS 26.5.1. Dev-client builds worked fine. We burned ~10 EAS build cycles chasing this. **The actual root cause is `Hermes V1`** (the rewritten Hermes that became the default JS engine in React Native 0.84+) has multiple bugs on iOS 26. The fix that worked is swapping in JavaScriptCore via `@react-native-community/javascriptcore`. The plugin is `plugins/withJSC.js`. Everything below is what didn't work, so a future session doesn't go down the same paths.

### Crash signatures we saw (all in Hermes)
- **SDK 54 main bundle init** — `EXC_BAD_ACCESS / SIGSEGV`, frames in `hermes::vm::GCScope::_newChunkAndPHV` / `defineLazyProperties` / `HiddenClass::addToPropertyMap`. HBC lazy-property init crashing during main bundle load.
- **SDK 56 worklet runtime init** — `EXC_CRASH / SIGABRT` from `RCTExceptionsManager reportFatal:`, JS thread deep in `worklets::WorkletRuntime::legacyModeInit()` → `evaluateJavaScript()` → `hermes::hbc::BCProviderFromSrc::create` → `hermes::generateIRFromESTree`. Worklets compiling JS source at runtime through Hermes IRGen.
- **SDK 56 String.split with regex** — `EXC_CRASH / SIGABRT`, JS thread in `hermes::vm::stringPrototypeSplit` → `regExpPrototypeSymbolSplit` → string allocation triggering `HadesGC::youngGenCollection` → `HadesGC::scanDirtyCards` → `EvacAcceptor::visit`. GC corruption during normal regex string operations.

The common thread: **Hermes V1 + iOS 26 = unpredictable crashes in multiple unrelated code paths**. iOS 17/18 are unaffected (dev mode loads JS differently and doesn't hit the same Hermes paths).

### Things that DID NOT work
1. **Reanimated 3 downgrade** — Tried `react-native-reanimated@^3.19.5` to avoid Reanimated 4's worklets runtime crash. v3 is **C++ incompatible with RN 0.85**: Xcode errors `no type named 'Shared' in facebook::react::ContextContainer`, `UIManagerAnimationDelegate` API changed, `LayoutAnimationsProxy` API changed. Reanimated 3 only works through ~RN 0.79.
2. **Removing Reanimated entirely** — Refactored `PhotoLightbox.tsx` to use built-in `Animated` and dropped `runOnJS` from memoir. **But `react-native-css-interop`** (which nativewind v4 depends on) has lazy `require('react-native-reanimated')` calls. Metro fails to bundle: `Unable to resolve module react-native-reanimated`. Even if you don't use Tailwind animation classes, the imports still need to resolve at bundle time.
3. **JS-only reanimated/worklets** — Reinstall the packages so Metro resolves the imports, then exclude their native pods via `react-native.config.js`. Got past JS bundling, but didn't fix the crash because **the crash isn't reanimated/worklets — it's Hermes itself**.
4. **Worklets bundle mode** (`['react-native-worklets/plugin', { bundleMode: true }]` + `getBundleModeMetroConfig`) — Designed to pre-compile worklets at build time so they don't get eval'd at runtime through Hermes. **Race condition on EAS's eager bundler**: babel writes `.worklets/<hash>.js` files mid-bundle that Metro can't SHA-1, so `expo export:embed --eager` fails with `Error: Failed to get the SHA-1 for: ...react-native-worklets/.worklets/...js`.
5. **Legacy Hermes** (`useHermesV1: false` + `buildReactNativeFromSource: true` in expo-build-properties + `hermes-compiler: 0.15.0` override) — The escape hatch exists but `hermesc 0.15.0` predates JavaScript private fields (`#x` syntax), and some dependency in our tree uses them. Bundle compile fails with `error: private properties are not supported` × hundreds of lines. Also, even if it built, legacy Hermes likely has its own iOS 26 issues (it's the same lineage that crashed in SDK 54).

### The TextEncoder gotcha (only surfaces after JSC swap)
Once Hermes is replaced by JSC, the app launches the native shell fine and starts evaluating the JS bundle, then immediately silently fails with `ReferenceError: Can't find variable: TextEncoder`. The splash screen just stays up forever because JS errored out before mounting the root component. **Hermes ships TextEncoder/TextDecoder as built-in globals; JSC does not.** Several libraries in the dep tree need them — Supabase's `@supabase/realtime-js` for websocket framing is the canonical culprit, but the most aggressive caller is **React Native's own URL polyfill**: it does `var e = new TextEncoder()` at module top-level, around line 155k of the dev bundle. That means the polyfill has to run before *any* module evaluates, not just before user code.

**An `index.js` import is NOT early enough.** A previous iteration of this file recommended `import 'text-encoding-polyfill'` from a project-root `index.js` set as `package.json` `"main"`. That fails for two reasons: (a) RN's pre-modules (URL polyfill, etc.) evaluate before the entry module's body runs, and (b) `text-encoding-polyfill`'s IIFE ends with `}(this || {}))` — under Metro's strict-mode CommonJS module wrapper, `this` is `undefined`, so the polyfill sets `TextEncoder` on `{}` and the actual JSC global never gets it.

**The fix that works**: install the polyfill via Metro's `getPolyfills` so it runs as a raw script at the very top of the bundle, before the module system even exists. There's a minimal UTF-8 only implementation in `polyfills/text-encoder.js` (full WHATWG encodings aren't needed — URL polyfill and Supabase realtime only use UTF-8). `metro.config.js` prepends it to the default polyfill list:

```js
// metro.config.js
const originalGetPolyfills = config.serializer.getPolyfills
config.serializer.getPolyfills = (ctx) => [
  path.resolve(__dirname, 'polyfills/text-encoder.js'),
  ...originalGetPolyfills(ctx),
]
```

Metro polyfills are concatenated as raw scripts at the bundle top — they have NO `require()` available and run before `__d`/module registry is initialized. So the polyfill file must be standalone (no imports, no `require`), and it must assign to `global` directly. The `index.js` entry file is now just `import 'expo-router/entry'` — the TextEncoder polyfill happens earlier, via Metro.

When debugging "app launched but hung on splash" with JSC: always check `xcrun simctl spawn <udid> log show --last 1m --predicate 'process == "Bazidpur"'` and grep for `ReferenceError`. The error appears once in `com.facebook.react.log:javascript` and once in `com.facebook.react.log:native`. The visible app behavior is *just a stuck splash screen* — no red box, no crash dialog. On device (not simulator), the dev-launcher overlay shows `[runtime not ready]: ReferenceError: Can't find variable: TextEncoder` directly. To confirm the polyfill is correctly placed, `curl 'http://localhost:8081/index.bundle?platform=ios&dev=true' | grep -n 'global.TextEncoder'` should show the polyfill in the first ~1000 lines of the bundle, well before the URL polyfill around line 155k.

### `country-state-city` stack overflow on JSC
Symptom: `RangeError: Maximum call stack size exceeded` at the top-level `import { Country, State } from 'country-state-city'` line. Hermes handled this fine; JSC has a stricter stack limit and chokes parsing the package's data. Root cause is the package's barrel `index.js`:

```js
import Country from './country';
import State from './state';
import City from './city';  // <-- pulls in city.json, 7.7MB
```

Even if you only destructure `Country` and `State`, the whole barrel evaluates and parses the 7.7MB `city.json`. Fix is to import from the deep paths directly:

```ts
import Country from 'country-state-city/lib/country'
import State from 'country-state-city/lib/state'
```

This skips the City module entirely (`country.json` is 96KB, `state.json` is 544KB — both fine). If the app ever needs city data, add it as a third deep import and load lazily (e.g. inside a `useMemo` triggered by a state-picked-state). General lesson under JSC: any barrel that statically pulls in multi-megabyte JSON should be replaced with deep imports or lazy `require()`.

### `Animated.multiply` / `Animated.add` listener churn
Symptom: log flood of `WARN  Sending \`onAnimatedValueUpdate\` with no listeners registered.` whenever a `useNativeDriver: true` animation is running. Cause: a derived Animated value created inline in JSX, e.g.

```tsx
<Animated.View style={{ transform: [{ scale: Animated.multiply(a, b) }] }} />
```

Every render creates a NEW derived Animated value; the native driver registers a new listener and the old one's updates arrive at a node nobody is listening to. Memoize derived values with `useRef` (or `useMemo` whose deps are the input `useRef.current` values, which never change):

```tsx
const combinedScale = useRef(Animated.multiply(a, b)).current
// then in JSX: { scale: combinedScale }
```

`components/gallery/PhotoLightbox.tsx` already uses the `useMemo` pattern correctly. `app/(tabs)/_layout.tsx` was the offender (pulse + spring scale combined for the collapsed-bar pill).

### Things that DID work
- **Swap JS engine to JavaScriptCore.**
  - `npm install @react-native-community/javascriptcore@0.2.0`
  - Set `ios.jsEngine: "jsc"` in `app.json` (still recognized in SDK 56 for Podfile gating, despite being marked "deprecated").
  - Local Expo config plugin `plugins/withJSC.js` that:
    1. Patches `AppDelegate.swift` to `import ReactJSC` and override `createJSRuntimeFactory()` → `jsrt_create_jsc_factory()`.
    2. Prepends `ENV['USE_THIRD_PARTY_JSC'] = '1'` and `ENV['USE_HERMES'] = '0'` to the Podfile.
    3. Adds a `post_install` hook (placed **after** `react_native_post_install`, otherwise it gets clobbered) that sets `USE_HERMES=0` in `GCC_PREPROCESSOR_DEFINITIONS` on every pod target, so `RCTCxxBridge.mm`'s `#if !defined(USE_HERMES) || USE_HERMES == 1` guard skips the Hermes header.
    4. Patches an RN 0.85.3 bug in `node_modules/react-native/Libraries/AppDelegate/React-RCTAppDelegate.podspec`: `other_cflags = "$(inherited) " + new_arch_enabled_flag + js_engine_flags()` is missing a space between `new_arch_enabled_flag` (which ends in `-DRCT_NEW_ARCH_ENABLED=1`) and `js_engine_flags()` (which begins with `-DUSE_THIRD_PARTY_JSC=1`). Without the space, clang sees one bogus token `-DRCT_NEW_ARCH_ENABLED=1-DUSE_THIRD_PARTY_JSC=1` and `USE_THIRD_PARTY_JSC` is never actually defined, so `RCTAppSetupUtils.h`'s `#if USE_THIRD_PARTY_JSC != 1` guard imports the missing Hermes header. Patch adds the space.
  - Requires `expo-build-properties` plugin with `ios.buildReactNativeFromSource: true` — `@react-native-community/javascriptcore` depends on `RCT-Folly`, which is only declared as a pod when RN is built from source (the prebuilt-frameworks path uses an opaque `ReactNativeDependencies` umbrella). Tradeoff: builds take ~30–45 min instead of ~5 min.

### Apple App Store reviewer warning
Apple reviews on the latest iOS, which currently means iOS 26+. Do not assume an upcoming iOS bump will magically fix things — verify on the reviewer's likely iOS version (download an iOS 26 simulator or have a beta device) before submitting.

### Future SDK upgrade checklist
Before the next Expo SDK upgrade, check whether Expo / Hermes has shipped fixes for Hermes V1 on iOS 26 (search `expo/expo` and `facebook/react-native` issues for the symbols above — `GCScope::_newChunkAndPHV`, `HadesGC::scanDirtyCards`, `HiddenClass::addToPropertyMap`). If yes, the JSC workaround can be removed: delete `plugins/withJSC.js`, the `withJSC` plugin entry in `app.json`, the `ios.jsEngine: "jsc"` field, the `@react-native-community/javascriptcore` dep, and the `buildReactNativeFromSource` option. Test thoroughly on the latest iOS before shipping.

---

## PhotoLightbox — Known UX Limitations (post-Reanimated removal)

The Hermes-on-iOS-26 fix forced us to remove `react-native-reanimated` from the native build. `components/gallery/PhotoLightbox.tsx` was rewritten to use built-in `Animated` with legacy `PinchGestureHandler` / `PanGestureHandler` + `Animated.event` (`useNativeDriver: true`). This gives buttery-smooth pinch and pan because per-frame transform updates run entirely on the native thread. The price is **two missing features compared to Apple Photos**:

### Issue 1 — Pinch + simultaneous pan doesn't work
Two fingers down, pinch and drag at the same time. We can't combine "scale from gesture event" with "translation from gesture event focal-point delta" in a way that maps to Animated.Values natively. Doing it via the Animated.event listener works but requires `useNativeDriver: false`, which downgrades both pinch and pan to JS-thread — visibly less smooth + introduces release-time flicker. User chose smoothness over this feature.

### Issue 2 — Pinching on a corner always zooms toward center, not the corner
Apple Photos uses *scale-around-focal-point* math: `tx_new = (sFx - cx) * (1 - ratio) + sOx * ratio`. This requires multiplying the focal point's screen offset (from view center) by `(1 - ratio)` in an Animated chain. Implementable as `Animated.add(Animated.multiply(sFxMinusCx, oneMinusRatio), ...)` natively, but `sFx` (focal at pinch start) must be captured per-gesture, which means `setValue` from JS into an Animated.Value, which has a one-frame bridge delay. That delay caused jitter / shake in testing. JS-thread alternative same problem as Issue 1. User chose center-anchored zoom + smoothness over focal-anchored zoom + jitter.

### When to revisit
Either of these can be fixed cleanly if:
- **Reanimated 4 + Hermes V1 on iOS 26 stops crashing** (filed upstream): we revert to Reanimated, gestures run on UI thread via worklets, both features come back automatically. See "Hermes / iOS 26 / SDK 56 — Dead Ends" section above.
- **Reanimated 3 ships RN 0.85+ C++ compatibility**: we install it JS-only with the native pod excluded (same pattern as the current `react-native.config.js` setup), use its worklet APIs in PhotoLightbox.
- **React Native ships a new native-driver-friendly gesture API** with Animated.event-style multi-mapping or focal compute primitives.

Until then, leave PhotoLightbox alone. The smooth pinch + smooth pan + dismiss + double-tap are the 90% case. The missing 10% is a known acceptable trade-off.

### Related implementation note
PhotoLightbox uses ONE `PanGestureHandler` (no `key` swapping) with dynamic `failOffsetX` / `activeOffsetY` / event-handler props that change based on the `zoomed` state. We previously used `key={zoomed ? ... : ...}` to force a clean remount when mode flipped — but that caused a one-frame flicker on the first pinch release because the inner Animated.View with the transform was unmounting and losing its native-driver attachment. Stable mount avoids this. If a future change reintroduces the key-remount pattern, it'll bring back the first-pinch flicker.
