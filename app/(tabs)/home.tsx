import { Redirect } from 'expo-router'

// This screen exists so expo-router doesn't complain about the Tabs.Screen name="home".
// In practice the tab button is intercepted in _layout.tsx and navigates to /(public) directly.
export default function HomeTab() {
  return <Redirect href="/(public)" />
}
