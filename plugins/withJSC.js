const {
  withAppDelegate,
  withPodfileProperties,
  withDangerousMod,
  withXcodeProject,
  createRunOncePlugin,
} = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const pkg = { name: 'with-jsc', version: '1.0.0' }

function patchAppDelegate(contents) {
  let next = contents

  if (!/^\s*import\s+ReactJSC\b/m.test(next)) {
    next = next.replace(
      /(import\s+ReactAppDependencyProvider\b[^\n]*\n)/,
      (match) => `${match}import ReactJSC\n`
    )
    if (!/^\s*import\s+ReactJSC\b/m.test(next)) {
      next = `import ReactJSC\n${next}`
    }
  }

  if (!/createJSRuntimeFactory\s*\(/.test(next)) {
    next = next.replace(
      /(class\s+ReactNativeDelegate[^\{]*\{)/,
      (m) => `${m}\n  override func createJSRuntimeFactory() -> JSRuntimeFactoryRef {\n    return jsrt_create_jsc_factory()\n  }\n`
    )
  }

  return next
}

const HERMES_DSYM_SCRIPT = `\
# Generate dSYM for hermesvm.framework — it is a prebuilt binary with no dSYM shipped.
# Apple's upload validator warns if any embedded framework UUID has no matching dSYM.
# dsymutil creates a valid DWARF bundle directly from the binary. Only runs for Release
# so it doesn't slow down Debug builds.
HERMES="\${BUILT_PRODUCTS_DIR}/\${FRAMEWORKS_FOLDER_PATH}/hermesvm.framework/hermesvm"
DSYM_OUT="\${DWARF_DSYM_FOLDER_PATH}/hermesvm.framework.dSYM"
if [ "\${CONFIGURATION}" = "Release" ] && [ -f "$HERMES" ] && [ ! -d "$DSYM_OUT" ]; then
  dsymutil "$HERMES" -o "$DSYM_OUT" 2>/dev/null || true
fi
`

const withJSC = (config) => {
  // Add a build phase that generates a dSYM for hermesvm.framework during Archive.
  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults
    const objects = project.hash.project.objects

    // Idempotency check
    const existing = objects['PBXShellScriptBuildPhase'] || {}
    if (Object.values(existing).some(p => p && p.name === '"Generate hermesvm dSYM"')) {
      return cfg
    }

    // Find the main app target (Bazidpur)
    const nativeTargets = objects['PBXNativeTarget'] || {}
    const appEntry = Object.entries(nativeTargets).find(
      ([k, t]) => t && typeof t === 'object' && t.name === 'Bazidpur'
    )
    if (!appEntry) return cfg
    const [, appTarget] = appEntry

    // Create the shell script build phase
    const phaseUUID = project.generateUuid()
    if (!objects['PBXShellScriptBuildPhase']) objects['PBXShellScriptBuildPhase'] = {}
    objects['PBXShellScriptBuildPhase'][phaseUUID] = {
      isa: 'PBXShellScriptBuildPhase',
      buildActionMask: '2147483647',
      files: [],
      inputFileListPaths: [],
      inputPaths: [],
      name: '"Generate hermesvm dSYM"',
      outputFileListPaths: [],
      outputPaths: [],
      runOnlyForDeploymentPostprocessing: '0',
      shellPath: '/bin/sh',
      shellScript: JSON.stringify(HERMES_DSYM_SCRIPT),
      showEnvVarsInLog: '0',
    }
    objects['PBXShellScriptBuildPhase'][phaseUUID + '_comment'] = 'Generate hermesvm dSYM'

    // Append phase to the target's buildPhases list
    if (!Array.isArray(appTarget.buildPhases)) appTarget.buildPhases = []
    appTarget.buildPhases.push({ value: phaseUUID, comment: 'Generate hermesvm dSYM' })

    return cfg
  })

  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') return cfg
    cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents)
    return cfg
  })

  config = withPodfileProperties(config, (cfg) => {
    cfg.modResults['expo.jsEngine'] = 'jsc'
    return cfg
  })

  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      // Patch RN 0.85.3 bug: React-RCTAppDelegate.podspec concatenates
      // -DRCT_NEW_ARCH_ENABLED=1 and -DUSE_THIRD_PARTY_JSC=1 without a separating space,
      // turning them into one undefined macro. Without USE_THIRD_PARTY_JSC defined,
      // RCTAppSetupUtils.h falls back to importing the missing Hermes header.
      const rnPodspecPath = path.join(
        cfg.modRequest.projectRoot,
        'node_modules/react-native/Libraries/AppDelegate/React-RCTAppDelegate.podspec'
      )
      if (fs.existsSync(rnPodspecPath)) {
        let podspec = fs.readFileSync(rnPodspecPath, 'utf8')
        podspec = podspec.replace(
          'other_cflags = "$(inherited) " + new_arch_enabled_flag + js_engine_flags()',
          'other_cflags = "$(inherited) " + new_arch_enabled_flag + " " + js_engine_flags()'
        )
        fs.writeFileSync(rnPodspecPath, podspec)
      }

      // Patch RN 0.85.3 bug: RCTDefaultReactNativeFactoryDelegate.mm's createJSRuntimeFactory()
      // only returns inside `#if USE_THIRD_PARTY_JSC != 1`. With USE_THIRD_PARTY_JSC=1 there's
      // no return statement, failing `-Werror,-Wreturn-type`. Subclasses override this anyway,
      // but the base must compile. Add an #else branch that returns the JSC factory.
      const factoryDelegatePath = path.join(
        cfg.modRequest.projectRoot,
        'node_modules/react-native/Libraries/AppDelegate/RCTDefaultReactNativeFactoryDelegate.mm'
      )
      if (fs.existsSync(factoryDelegatePath)) {
        let src = fs.readFileSync(factoryDelegatePath, 'utf8')
        src = src.replace(
          '#if USE_THIRD_PARTY_JSC != 1\n  return jsrt_create_hermes_factory();\n#endif\n}',
          '#if USE_THIRD_PARTY_JSC != 1\n  return jsrt_create_hermes_factory();\n#else\n  return jsrt_create_jsc_factory();\n#endif\n}'
        )
        if (!src.includes('<React-jsc/RCTJscInstanceFactory.h>')) {
          src = src.replace(
            '#if USE_THIRD_PARTY_JSC != 1\n#import <React/RCTHermesInstanceFactory.h>\n#endif',
            '#if USE_THIRD_PARTY_JSC != 1\n#import <React/RCTHermesInstanceFactory.h>\n#else\n#import <React-jsc/RCTJscInstanceFactory.h>\n#endif'
          )
        }
        fs.writeFileSync(factoryDelegatePath, src)
      }

      // expo-av@16.0.8 SDK 56 Swift patches
      const videoViewModulePath = path.join(
        cfg.modRequest.projectRoot,
        'node_modules/expo-av/ios/EXAV/Video/VideoViewModule.swift'
      )
      if (fs.existsSync(videoViewModulePath)) {
        let src = fs.readFileSync(videoViewModulePath, 'utf8')
        const patched = src.replace('resolver: promise.resolver', 'resolver: promise.legacyResolver')
        if (patched !== src) fs.writeFileSync(videoViewModulePath, patched)
      }

      const expoVideoViewPath = path.join(
        cfg.modRequest.projectRoot,
        'node_modules/expo-av/ios/EXAV/ExpoVideoView.swift'
      )
      if (fs.existsSync(expoVideoViewPath)) {
        let src = fs.readFileSync(expoVideoViewPath, 'utf8')
        const patched = src.replace(
          'guard let legacyModuleRegistry = appContext?.legacyModuleRegistry else {\n      fatalError("Unable to get the legacyModuleRegistry from appContext.")\n    }',
          'let legacyModuleRegistry = appContext?.value(forKey: "legacyModuleRegistry") as? EXModuleRegistry'
        )
        if (patched !== src) fs.writeFileSync(expoVideoViewPath, patched)
      }

      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile')
      let contents = fs.readFileSync(podfilePath, 'utf8')

      // Set USE_THIRD_PARTY_JSC=1 so use_react_native! includes React-jsc instead of hermes.
      // Do NOT set USE_HERMES=0 — RN 0.85.3 calls exit() if USE_HERMES=0 without USE_THIRD_PARTY_JSC=1,
      // and if USE_THIRD_PARTY_JSC=1, react_native_post_install automatically sets USE_HERMES=false.
      if (!contents.includes("ENV['USE_THIRD_PARTY_JSC']")) {
        contents = `ENV['USE_THIRD_PARTY_JSC'] = '1'\n${contents}`
      }

      // Silence all CocoaPods-managed pod warnings — they are almost entirely
      // third-party deprecation noise unrelated to our code.
      if (!contents.includes('inhibit_all_warnings!')) {
        contents = contents.replace(
          /^(platform :ios,.+\n)/m,
          (m) => `${m}inhibit_all_warnings!\n`
        )
      }

      if (!contents.includes("require 'fileutils'")) {
        contents = contents.replace("require 'json'", "require 'json'\nrequire 'fileutils'")
      }

      if (!contents.includes('# withJSC: force JSC defines')) {
        const hook = `
    # withJSC: force USE_HERMES=0 and USE_THIRD_PARTY_JSC=1 preprocessor defines so every pod's
    # #if USE_THIRD_PARTY_JSC != 1 guard correctly skips Hermes header imports (RCTCxxBridge.mm,
    # RCTAppSetupUtils.h, ExpoReactNativeFactory, etc). Must run AFTER react_native_post_install
    # which resets some build settings on React-Core.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] unless defs.is_a?(Array)
        defs << 'USE_HERMES=0' unless defs.include?('USE_HERMES=0')
        defs << 'USE_THIRD_PARTY_JSC=1' unless defs.include?('USE_THIRD_PARTY_JSC=1')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs

        # Raise any pod whose deployment target is below 16.0. Pods stuck on
        # iOS 9–15 generate "deployment target ... is set to X.0, but the range
        # of supported deployment target versions is 12.0 to 26.5.99" warnings.
        dt = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if dt && dt.to_f < 16.0
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
        end

        if config.name == 'Release'
          config.build_settings['DEBUG_INFORMATION_FORMAT'] = 'dwarf-with-dsym'
        end
      end
    end

    # expo-av@16.0.8 compatibility shims: protocols removed from expo-modules-core SDK 56
    # but still imported by expo-av headers.
    shim_dir = File.join(__dir__, 'Pods/Headers/Public/ExpoModulesCore/ExpoModulesCore')
    FileUtils.mkdir_p(shim_dir)
    {
      'EXEventEmitter.h' => <<~OBJC,
        #pragma once
        #import <Foundation/Foundation.h>
        @protocol EXEventEmitter <NSObject>
        - (NSArray<NSString *> *)supportedEvents;
        - (void)startObserving;
        - (void)stopObserving;
        @end
      OBJC
      'EXEventEmitterService.h' => <<~OBJC,
        #pragma once
        #import <Foundation/Foundation.h>
        @protocol EXEventEmitterService <NSObject>
        - (void)sendEventWithName:(NSString *)eventName body:(id)body;
        @end
      OBJC
      'EXLegacyExpoViewProtocol.h' => <<~OBJC,
        #pragma once
        #import <Foundation/Foundation.h>
        @class EXModuleRegistry;
        @protocol EXLegacyExpoViewProtocol <NSObject>
        @optional
        - (void)setModuleRegistry:(EXModuleRegistry *)moduleRegistry;
        @end
      OBJC
      'EXLegacyFunctions.h' => <<~OBJC
        // Shim: EXFatal, EXErrorWithMessage, EXLog* removed from expo-modules-core SDK 56.
        #pragma once
        #import <Foundation/Foundation.h>
        static inline NSError *EXErrorWithMessage(NSString *message) {
          return [NSError errorWithDomain:@"EXAVError" code:0
            userInfo:@{ NSLocalizedDescriptionKey: message }];
        }
        static inline void EXFatal(NSError *error) {
          NSLog(@"[EXAV] Fatal: %@", error.localizedDescription);
        }
        #define EXLogInfo(...)  NSLog(__VA_ARGS__)
        #define EXLogWarn(...)  NSLog(__VA_ARGS__)
        #define EXLogError(...) NSLog(__VA_ARGS__)
        #ifndef UMPromiseResolveBlock
        typedef void (^UMPromiseResolveBlock)(id _Nullable value);
        #endif
        #ifndef UMPromiseRejectBlock
        typedef void (^UMPromiseRejectBlock)(NSString * _Nonnull code, NSString * _Nonnull message, NSError * _Nullable error);
        #endif
      OBJC
    }.each do |filename, content|
      filepath = File.join(shim_dir, filename)
      File.write(filepath, content) unless File.exist?(filepath)
    end

    # Inject EXLegacyFunctions.h into EXAV's prefix header so every ObjC
    # compilation unit in the pod can see EXFatal / EXErrorWithMessage.
    exav_pch = File.join(__dir__, 'Pods/Target Support Files/EXAV/EXAV-prefix.pch')
    if File.exist?(exav_pch)
      pch = File.read(exav_pch)
      injection = "\n#ifdef __OBJC__\n#import <ExpoModulesCore/EXLegacyFunctions.h>\n#endif\n"
      File.write(exav_pch, pch + injection) unless pch.include?('EXLegacyFunctions')
    end

    # Change hermesvm from a required link (-framework) to a weak link (-weak_framework)
    # in the xcconfig files. hermes_enabled:false means hermesvm is not embedded in the
    # app bundle, but CocoaPods still adds -framework "hermesvm" to OTHER_LDFLAGS.
    # A required link causes dyld to crash at launch when hermesvm.framework is absent.
    # Weak-linking lets the binary start without hermesvm — safe because we use JSC
    # via the AppDelegate override and hermesvm is never actually called.
    Dir.glob(File.join(__dir__, 'Pods/Target Support Files/Pods-Bazidpur/*.xcconfig')).each do |xcconfig_path|
      xcconfig_content = File.read(xcconfig_path)
      patched_xcconfig = xcconfig_content.gsub('-framework "hermesvm"', '-weak_framework "hermesvm"')
      File.write(xcconfig_path, patched_xcconfig) if patched_xcconfig != xcconfig_content
    end

`
        contents = contents.replace(
          /(react_native_post_install\([\s\S]*?\)\s*\n)/,
          (m) => `${m}${hook}`
        )
      }

      // Force hermes_enabled:true so hermesvm.framework is always embedded.
      // hermesvm provides JSI symbols (e.g. facebook::jsi::JSError) that other
      // dynamic frameworks resolve at load time via the flat namespace — even when
      // JSC is the actual JS engine. Without hermesvm embedded the app crashes at
      // launch with "symbol not found in flat namespace". The dSYM warning during
      // App Store upload is cosmetic and does not block submission.
      contents = contents.replace(
        /:hermes_enabled\s*=>\s*podfile_properties\[[^\]]+\]\s*==\s*nil[^\n]+\n/,
        '    :hermes_enabled => true, # must stay true — hermesvm provides JSI symbols needed by other dylibs\n'
      )

      fs.writeFileSync(podfilePath, contents)
      return cfg
    },
  ])

  return config
}

module.exports = createRunOncePlugin(withJSC, pkg.name, pkg.version)
