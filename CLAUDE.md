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
| `thread_replies` | Forum replies (`is_deleted`) |
| `reports` | UGC reports (content_type, content_id, reason) |
| `timeless_moments` | Photos for Timeless Moments |
| `timeless_moment_videos` | Videos for Timeless Moments |
| `experiences` | Memoir stories |
| `experience_chapters` | Memoir chapters |
| `poetry_verses` | Verses for poems |
| `albums` | Community photo albums |
| `album_photos` | Photos within albums |

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
`bihar,india,village,heritage,family,genealogy,community,ancestry,roots,culture,lineage,diaspora,urdu`

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
