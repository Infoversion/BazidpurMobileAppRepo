const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// JSC has no TextEncoder/TextDecoder. RN's URL polyfill constructs them at
// module top-level, before any user code — so prepend ours to Metro's polyfill
// list. Polyfills run before everything else, including all pre-modules.
const originalGetPolyfills = config.serializer.getPolyfills
config.serializer.getPolyfills = (ctx) => [
  path.resolve(__dirname, 'polyfills/text-encoder.js'),
  ...originalGetPolyfills(ctx),
]

module.exports = withNativeWind(config, { input: './global.css' })
