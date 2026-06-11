import { Stack } from 'expo-router'
import { BackButton } from '@/components/BackButton'

export default function PublicLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      headerShadowVisible: false,
      headerStyle: { backgroundColor: '#f2f2f7' },
      headerTitleStyle: { fontWeight: '700', color: '#1c1c1e' },
      headerTintColor: '#2d1b69',
      headerLeft: () => <BackButton />,
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="about" options={{ headerShown: true, title: 'About Bazidpur' }} />
      <Stack.Screen name="fazihat-shah-warsi" options={{ headerShown: true, title: 'Fazihat Shah Warsi' }} />
      <Stack.Screen name="contact" options={{ headerShown: true, title: 'Contact Us' }} />
      <Stack.Screen name="media" options={{ headerShown: true, title: 'Media' }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
    </Stack>
  )
}
