const {
  withAppDelegate,
  withPodfileProperties,
  withDangerousMod,
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

const withJSC = (config) => {
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

      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile')
      let contents = fs.readFileSync(podfilePath, 'utf8')

      if (!contents.includes("ENV['USE_THIRD_PARTY_JSC']")) {
        contents = `ENV['USE_THIRD_PARTY_JSC'] = '1'\nENV['USE_HERMES'] = '0'\n${contents}`
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
      end
    end
`
        contents = contents.replace(
          /(react_native_post_install\([\s\S]*?\)\s*\n)/,
          (m) => `${m}${hook}`
        )
      }

      fs.writeFileSync(podfilePath, contents)
      return cfg
    },
  ])

  return config
}

module.exports = createRunOncePlugin(withJSC, pkg.name, pkg.version)
