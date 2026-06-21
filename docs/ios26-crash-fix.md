# iOS 26 Production Crash — Root Cause & Fix

**Status:** Resolved in v1.1.1 (build 8), confirmed crash-free on TestFlight 2026-06-21  
**Affected devices:** iPhone 16 Pro (iPhone18,1), iOS 26+  
**Not affected:** iOS 17/18, dev-client builds (different JS loading path)

---

## The Symptom

Every production TestFlight build crashed ~0.4 seconds after launch. The crash came through `expo.controller.errorRecoveryQueue` — Expo's named dispatch queue for JS fatal errors in new arch. Dev-client builds on the same device worked perfectly.

Three distinct crash signatures appeared across SDK 54 and SDK 56 builds — all unrelated on the surface but sharing the same root cause:

| SDK | Crash type | Frames |
|-----|-----------|--------|
| SDK 54 | `EXC_BAD_ACCESS / SIGSEGV` | `hermes::vm::GCScope::_newChunkAndPHV` → `HiddenClass::addToPropertyMap` (GC during main bundle lazy-property init) |
| SDK 56 | `EXC_CRASH / SIGABRT` | `WorkletRuntime::legacyModeInit()` → `hermes::hbc::BCProviderFromSrc::create` → Hermes IRGen (worklets compiling JS source at runtime) |
| SDK 56 | `EXC_CRASH / SIGABRT` | `hermes::vm::stringPrototypeSplit` → `HadesGC::youngGenCollection` → `HadesGC::scanDirtyCards` (GC corruption during normal regex string ops) |

**Root cause: Hermes V1 + iOS 26 = unpredictable crashes in multiple unrelated code paths.**  
Hermes V1 became the default JS engine in React Native 0.84+. It has multiple unfixed bugs on iOS 26.

---

## What Did NOT Work (do not retry)

### 1. Reanimated 3 downgrade
Tried `react-native-reanimated@^3.19.5` to avoid v4's worklets runtime crash.  
**Failed:** Reanimated 3 is C++ incompatible with RN 0.85 — `no type named 'Shared' in facebook::react::ContextContainer`, `UIManagerAnimationDelegate` and `LayoutAnimationsProxy` API changes. Reanimated 3 only supports through ~RN 0.79.

### 2. Removing Reanimated entirely
Refactored lightbox and memoir to use built-in `Animated`, dropped `runOnJS`.  
**Failed:** `react-native-css-interop` (NativeWind v4 dependency) has lazy `require('react-native-reanimated')` calls. Metro fails at bundle time even if no animation classes are used: `Unable to resolve module react-native-reanimated`.

### 3. Worklets bundle mode
Set `['react-native-worklets/plugin', { bundleMode: true }]` + `getBundleModeMetroConfig` to pre-compile worklets at build time (avoiding runtime Hermes IRGen).  
**Failed:** Race condition on EAS's eager bundler — babel writes `.worklets/<hash>.js` files mid-bundle that Metro can't SHA-1. `expo export:embed --eager` fails with `Error: Failed to get the SHA-1 for: ...react-native-worklets/.worklets/...js`.

### 4. Legacy Hermes (`hermesc 0.15.0`)
Set `useHermesV1: false` + `buildReactNativeFromSource: true` + `hermes-compiler: 0.15.0` override.  
**Failed:** `hermesc 0.15.0` predates JavaScript private fields (`#x` syntax). A dependency in the tree uses them. Build fails with hundreds of `error: private properties are not supported`.

### 5. `ENV['USE_HERMES'] = '0'` alone in Podfile
Set this to exclude Hermes pod without specifying an alternative.  
**Failed:** RN 0.85.3 calls `error_if_try_to_use_jsc_from_core()` which calls `exit()` if `USE_HERMES=0` AND `USE_THIRD_PARTY_JSC` is not set. `pod install` exits immediately.

### 6. EAS builds
Continued using EAS throughout investigation.  
**Problem:** Not wrong per se, but `buildReactNativeFromSource: true` (required for the JSC fix) makes EAS builds take ~30–45 minutes instead of ~5 minutes. Switched to Xcode Archive for faster iteration.

---

## The Fix That Worked

**Swap the JS engine from Hermes to JavaScriptCore via `@react-native-community/javascriptcore@0.2.0`.**

### Required changes

#### `package.json`
```bash
npm install @react-native-community/javascriptcore@0.2.0
```

#### `app.json`
```json
{
  "expo": {
    "ios": {
      "jsEngine": "jsc"
    },
    "plugins": [
      "./plugins/withJSC.js",
      ["expo-build-properties", {
        "ios": {
          "buildReactNativeFromSource": true
        }
      }]
    ]
  }
}
```

> `buildReactNativeFromSource: true` is **mandatory** — `React-jsc` pod depends on `RCT-Folly`, which only exists as a separate pod when building RN from source. The prebuilt XCFramework path bundles it opaquely as `ReactNativeDependencies` and omits the separate pod.

#### `plugins/withJSC.js`
A local Expo config plugin that applies six patches:

**1. AppDelegate.swift** — import ReactJSC and override the JS runtime factory:
```swift
import ReactJSC

class ReactNativeDelegate ... {
  override func createJSRuntimeFactory() -> JSRuntimeFactoryRef {
    return jsrt_create_jsc_factory()
  }
}
```

**2. Podfile** — set `USE_THIRD_PARTY_JSC=1` at the top (NOT `USE_HERMES=0` — that causes pod install to exit):
```ruby
ENV['USE_THIRD_PARTY_JSC'] = '1'
```
`use_react_native!` checks this env var and includes `React-jsc` instead of `hermes-engine`. `react_native_post_install` then automatically sets `USE_HERMES=false` on all targets.

**3. `React-RCTAppDelegate.podspec` space bug (RN 0.85.3)** — missing space between two compiler flags:
```ruby
# Before (broken — creates one invalid token):
other_cflags = "$(inherited) " + new_arch_enabled_flag + js_engine_flags()
# -DRCT_NEW_ARCH_ENABLED=1-DUSE_THIRD_PARTY_JSC=1  ← clang sees this as undefined

# After (fixed):
other_cflags = "$(inherited) " + new_arch_enabled_flag + " " + js_engine_flags()
```
Without this fix, `USE_THIRD_PARTY_JSC` is never defined and `RCTAppSetupUtils.h` imports the missing Hermes header.

**4. `RCTDefaultReactNativeFactoryDelegate.mm` (RN 0.85.3)** — adds missing `#else` branch so the file compiles when `USE_THIRD_PARTY_JSC=1`:
```objc
// Before: no return when USE_THIRD_PARTY_JSC=1 → -Werror,-Wreturn-type
#if USE_THIRD_PARTY_JSC != 1
  return jsrt_create_hermes_factory();
#endif

// After:
#if USE_THIRD_PARTY_JSC != 1
  return jsrt_create_hermes_factory();
#else
  return jsrt_create_jsc_factory();
#endif
```

**5. `post_install` GCC defines** — forces `USE_HERMES=0` and `USE_THIRD_PARTY_JSC=1` as preprocessor definitions on every pod target. Must run **after** `react_native_post_install` (which resets build settings on React-Core):
```ruby
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |config|
    defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
    defs << 'USE_HERMES=0' unless defs.include?('USE_HERMES=0')
    defs << 'USE_THIRD_PARTY_JSC=1' unless defs.include?('USE_THIRD_PARTY_JSC=1')
    config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
  end
end
```

**6. expo-av shims** — `expo-modules-core` SDK 56 removed protocols that `expo-av@16.0.8` ObjC headers still import. Shim headers are written into `Pods/Headers/Public/ExpoModulesCore/ExpoModulesCore/`:
- `EXEventEmitter.h`
- `EXEventEmitterService.h`
- `EXLegacyExpoViewProtocol.h`
- `EXLegacyFunctions.h` (replaces `EXFatal`, `EXErrorWithMessage`, `EXLog*`)

#### `polyfills/rn-build-env.js` (Metro polyfill)
JSC lacks built-in `TextEncoder`/`TextDecoder` (Hermes has them). Several deps need them — including RN's own URL polyfill which calls `new TextEncoder()` at module top-level (~line 155k of the bundle).

An `index.js` import is too late — RN pre-modules evaluate before the entry module body runs. The fix is registering the polyfill via Metro's `getPolyfills` so it runs as a raw script at the very top of the bundle, before the module system:

```js
// metro.config.js
const originalGetPolyfills = config.serializer.getPolyfills
config.serializer.getPolyfills = (ctx) => [
  path.resolve(__dirname, 'polyfills/rn-build-env.js'),
  ...originalGetPolyfills(ctx),
]
```

The polyfill also sets `process.env.EXPO_PUBLIC_USE_RN_FETCH = '1'` to bypass `ExpoFetchModule` (module 916), which doesn't register in JSC new arch and would cause a `requireNativeModule` throw.

#### `CountryStatePicker.tsx` — deep imports
JSC has a stricter stack limit than Hermes. The `country-state-city` barrel `index.js` pulls in `city.json` (7.7 MB) at parse time, causing `RangeError: Maximum call stack size exceeded`. Fix:
```ts
// Before (barrel — pulls in 7.7MB city.json):
import { Country, State } from 'country-state-city'

// After (deep imports — only country.json 96KB + state.json 544KB):
import Country from 'country-state-city/lib/country'
import State from 'country-state-city/lib/state'
```

#### `react-native.config.js`
Exclude reanimated and worklets from native linking (JS-only, no native pods needed):
```js
module.exports = {
  dependencies: {
    'react-native-reanimated': { platforms: { ios: null, android: null } },
    'react-native-worklets': { platforms: { ios: null, android: null } },
  },
}
```

---

## Build Process (Xcode, not EAS)

EAS remains functional but slow (~30–45 min) due to `buildReactNativeFromSource: true`. For production builds, use Xcode directly:

```bash
# 1. Regenerate native project
npx expo prebuild --clean --platform ios

# 2. Install pods
cd ios && pod install && cd ..

# 3. Open in Xcode
open ios/Bazidpur.xcworkspace
```

In Xcode:
1. Set scheme to **Any iOS Device (arm64)**
2. Signing & Capabilities → select your Apple Developer Team
3. **Product → Archive**
4. Organizer → **Distribute App → App Store Connect → Upload**

> **Note on symbol upload:** Xcode may warn about missing dSYM for `hermesvm.framework`. This is a non-fatal warning — the binary uploads successfully. The warning appears because Apple's validator expects Hermes symbols but we're using JSC. The app works correctly.

---

## Secondary Issues Discovered (JSC-specific)

### `Animated.multiply` / `Animated.add` listener churn
Inline derived Animated values in JSX create new nodes every render, flooding the log with `WARN Sending onAnimatedValueUpdate with no listeners registered`.  
**Fix:** Memoize with `useRef`:
```tsx
const combinedScale = useRef(Animated.multiply(pillScale, pulseScale)).current
```

### `TextEncoder` silent splash hang
After JSC swap, app silently hung on splash screen — no red box, no crash dialog. On device, dev launcher showed `[runtime not ready]: ReferenceError: Can't find variable: TextEncoder`.  
**Fix:** Metro polyfill (described above). Verify placement: `curl 'http://localhost:8081/index.bundle?platform=ios&dev=true' | grep -n 'global.TextEncoder'` — should appear in first ~1000 lines of bundle.

---

## When to Remove This Workaround

If a future Expo/RN release fixes Hermes V1 on iOS 26 (check issues for `GCScope::_newChunkAndPHV`, `HadesGC::scanDirtyCards`, `HiddenClass::addToPropertyMap`), remove:
- `plugins/withJSC.js` and its entry in `app.json`
- `"jsEngine": "jsc"` from `app.json`
- `@react-native-community/javascriptcore` from `package.json`
- `buildReactNativeFromSource: true` from expo-build-properties
- The `TextEncoder` polyfill from `polyfills/rn-build-env.js` (keep the `EXPO_PUBLIC_USE_RN_FETCH` line until ExpoFetchModule is confirmed working in JSC new arch)
- Deep import fix in `CountryStatePicker.tsx` can be reverted if barrel no longer causes stack overflow

Test thoroughly on iOS 26 (latest) before shipping after any engine change.
