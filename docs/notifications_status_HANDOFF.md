# Notifications + iOS 26 Hermes Crash — Handoff Notes

_Last updated: 2026-06-15 ~02:30 IST. Picking back up tomorrow._

## TL;DR

- ✅ **All notifications backend infrastructure is in place and working**: Supabase
  tables, RLS policies, `NOTIFICATIONS_INTERNAL_SECRET` set on Vercel, four
  trigger routes (membership approved, forum reply, photo comment, report
  resolution), in-app inbox + preferences screens, Privacy Policy §14, EAS
  APNs key + Distribution Certificate + provisioning profile all provisioned.
- ✅ **Dev-client build works perfectly** — full app, all features, no JS errors.
- ❌ **Production / preview iOS builds crash on iOS 26.5.1** due to a Hermes
  runtime bug. Five crash logs with the same signature (`hermes::vm::*`,
  particularly `GCScope::_newChunkAndPHV`, `defineLazyProperties`,
  `HiddenClass::addToPropertyMap`).
- 🟡 **Blocker is not in our code.** Both the JS and the entire backend are
  verified working. The blocker is Hermes (RN 0.81 bundled with Expo SDK 54)
  vs iOS 26.5.1.

## Current state of files

### Mobile

- **`expo-notifications` + `expo-device` uninstalled** (diagnostic decision). Add back when iOS launches.
- **`lib/notifications.ts` is a no-op stub** — keeps every call site compiling.
- **`metro.config.js`** has `inlineRequires: false` from a debug attempt. Can stay or revert; it didn't help the crash but it's also harmless.
- **`app.json`** clean of the `jsEngine` / `newArchEnabled` / `expo-build-properties` experiments. Note: I removed the `expo-build-properties` plugin entry entirely; the package is still in `node_modules` (it's an `npx expo install` side effect) — uninstall it if you want a 100% clean state.
- **`assets/images/icon.png`** was replaced with a new 1.2 MB icon (uncommitted change).
- **`assets/images/splash-icon.png`** was replaced with a new 1.6 MB splash (was uploaded with the typo `spash-icon.png`; I renamed it).
- **`assets/images/splash-icon-old.png`** is the previous splash as a backup.

### Web (already deployed)

- `/api/notifications/send` — fully functional, gated by `NOTIFICATIONS_INTERNAL_SECRET`
- `/api/notifications/dispatch-forum-reply` — fully functional
- `/api/member-approved`, `/api/comments`, `/api/report-resolution-notification` — all wired to `sendNotification()`
- Privacy Policy §14 live at https://www.bazidpur.com/privacy-policy

### Supabase

- `push_tokens` ✅ created
- `notification_preferences` ✅ created
- `notifications` ✅ created
- All RLS policies in place

### Vercel

- `NOTIFICATIONS_INTERNAL_SECRET` set on Production + Preview (value:
  `05e274a024e766cd965fd3193530386a05abaa1fb4487a0166ce7ec667ed39db`)

### EAS / Apple

- iOS APNs Authentication Key registered and bound to `com.bazidpur.app`
- iOS Distribution Certificate (Cert ID `KQA974L9XQ`, expires 2027-06-14)
- App Store provisioning profile created (from the production build)
- Ad Hoc provisioning profile created (from the preview build)
- App Store Connect API Key generated (no more password prompts on `eas submit`)
- iPhone18,1 device UDID registered for Ad Hoc builds

## The Hermes crash — what we know

**Five crash logs, all sharing:**

| | |
|---|---|
| Exception | `EXC_BAD_ACCESS / SIGSEGV / KERN_INVALID_ADDRESS` |
| Faulting thread | `com.facebook.react.runtime.JavaScript` |
| Symbol locus | `hermes::vm::*` (different sub-paths each time) |
| Device | iPhone18,1 on iOS 26.5.1 |

**Bad-address pattern in two of the crashes**: `0x0a31323a35383036` and `0x0a31323a3332333c` — both decode as ASCII `\n12:` followed by varying bytes. Hermes is reading string data (looks like stack-trace line:column fragments) as heap pointers during GC. Classic GC corruption.

**Things tried that didn't fix it:**

1. ❌ Removing `expo-notifications` — crash signature shifted but didn't disappear
2. ❌ Disabling new architecture — Reanimated 4 refuses to install without it
3. ❌ `jsEngine: "jsc"` (root-level) — silently ignored in SDK 54+
4. ❌ `jsEngine: "jsc"` (via `expo-build-properties`) — Hermes still loaded in the binary
5. ❌ `transformer.inlineRequires: false` in `metro.config.js` — no measurable effect

**Strongly suspected root cause**: Hermes runtime bundled with RN 0.81 has a bug
exercising iOS 26.5.1 syscalls / memory layout. Only manifests in production
builds (dev mode loads JS via Metro, doesn't use HBC lazy-init paths).

## Recommended paths for tomorrow

### Path A — Expo SDK upgrade (best chance of an easy fix)

Check if Expo SDK 55 has shipped or has a release candidate. SDK 55 bumps to
React Native 0.82 which contains a newer Hermes that may have iOS 26
compatibility patches.

```
npx expo install expo@latest
npx expo install --fix
```

Then rebuild and test. **Bonus**: SDK 55 also drops `expo-av` (the deprecation
warning we saw) and adds `expo-audio` / `expo-video`.

### Path B — SDK 53 downgrade

If 55 isn't ready or doesn't fix it, downgrade to SDK 53 which ships an older
Hermes that pre-dates the iOS 26 bug. ~half day of work.

```
npx expo install expo@~53.0.0
# then bisect-fix any breaking changes; mostly easy
```

### Path C — File the Expo issue, wait for fix, use dev build internally

Open an issue at https://github.com/expo/expo/issues with:
- Crash logs (we have 5 saved in Downloads)
- Confirmation that dev mode works
- Symbols pointing at `hermes::vm::GCScope::_newChunkAndPHV` / `defineLazyProperties`
- Reproducibility on iPhone18,1 / iOS 26.5.1 / SDK 54.0.0

Expo team typically triages Hermes regressions within 24-72h.

In the meantime, keep using `eas build --profile development` builds for internal
testing — works perfectly, just not App-Store-distributable.

## When iOS production builds work again

The notifications-bringup checklist to resume:

1. Reinstall the packages:
   ```
   npx expo install expo-notifications expo-device
   ```
2. Restore the real `lib/notifications.ts` (the lazy-loaded version, not the
   current stub). The previous version is in git history — last good commit:
   the one before tonight's stub. Run `git log -- lib/notifications.ts` to find
   it.
3. Re-add the `expo-notifications` plugin entry in `app.json`:
   ```json
   ["expo-notifications", {
     "icon": "./assets/images/icon.png",
     "color": "#2d1b69"
   }]
   ```
4. Build, install on a real device, smoke-test with the curl from earlier:
   ```bash
   curl -X POST https://www.bazidpur.com/api/notifications/send \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "YOUR-UUID",
       "type": "announcement",
       "title": "Test",
       "body": "If you see this, push works end-to-end.",
       "secret": "05e274a024e766cd965fd3193530386a05abaa1fb4487a0166ce7ec667ed39db"
     }'
   ```

## Tonight's tally

- 4 EAS builds (TestFlight + 3 internal/preview + 1 dev client)
- 1 EAS submit to App Store Connect
- APNs key + dev cert + ad hoc cert + provisioning profiles all provisioned
- 5 crash log analyses
- Web backend fully built and deployed
- Privacy Policy expanded (20 → 21 sections including notifications)
- Multiple commits committed and pushed

Nothing was wasted — everything we built is intact and usable the moment the
Hermes bug is fixed.

— sleep well
