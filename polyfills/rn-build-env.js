// Bypass expo/fetch's ExpoFetchModule which doesn't register in JSC new arch.
// Must run before any __r() calls — injected via Metro getPolyfills in metro.config.js.
(function () {
  if (typeof process !== 'undefined') {
    if (!process.env) process.env = {};
    process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';
  }
})();
