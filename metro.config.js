const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Disable inlineRequires for production bundles. The default lazy-import path
// crashes Hermes's defineLazyProperties on iOS 26.5.1 — symptoms ranged across
// HadesGC writeBarrier, HiddenClass property maps, and objectDefineProperty,
// but every failure traced back to the lazy bytecode init. Forcing eager
// imports adds ~50-100 ms to cold-start and eliminates the crash path.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
}

module.exports = withNativeWind(config, { input: './global.css' })
