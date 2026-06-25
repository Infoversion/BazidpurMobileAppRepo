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
    // react-native-pdf 6.x: gradle namespace is com.wonday.rnpdf but the Java
    // class lives in org.wonday.pdf — autolinking generates the wrong import,
    // so we override it here.
    'react-native-pdf': {
      platforms: {
        ios: null,     // replaced by PDF.js WebView — disable native pod
        android: {
          packageImportPath: 'import org.wonday.pdf.RNPDFPackage;',
          packageInstance: 'new RNPDFPackage()',
        },
      },
    },
  },
}
