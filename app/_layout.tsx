import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'
import { Alert, Platform, LogBox } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { usePreventScreenCapture, addScreenshotListener } from 'expo-screen-capture'
import { AuthProvider } from '@/lib/auth-context'
import '../global.css'

LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered'])

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Blocks screenshots & screen recording on Android via FLAG_SECURE
  usePreventScreenCapture()

  useEffect(() => {
    SplashScreen.hideAsync()
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)

    // iOS cannot block screenshots, but we can detect and warn
    if (Platform.OS === 'ios') {
      const sub = addScreenshotListener(() => {
        Alert.alert(
          'Screenshot Detected',
          'Content in this app is private to the Bazidpur family. Please do not share externally.',
          [{ text: 'Understood', style: 'default' }]
        )
      })
      return () => sub.remove()
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(public)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}
