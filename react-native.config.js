module.exports = {
  dependencies: {
    'react-native-reanimated': {
      platforms: { ios: null, android: null },
    },
    'react-native-worklets': {
      platforms: { ios: null, android: null },
    },
    '@react-native-community/javascriptcore': {
      platforms: { android: null }, // iOS-only — JSC swap is not needed on Android
    },
  },
}
