import { Stack } from 'expo-router'

export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="about" options={{ headerShown: true, title: 'About Bazidpur' }} />
      <Stack.Screen name="fazihat-shah-warsi" options={{ headerShown: true, title: 'Fazihat Shah Warsi' }} />
      <Stack.Screen name="contact" options={{ headerShown: true, title: 'Contact Us' }} />
      <Stack.Screen name="media" options={{ headerShown: true, title: 'Media' }} />
    </Stack>
  )
}
