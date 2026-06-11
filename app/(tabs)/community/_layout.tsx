import { Stack } from 'expo-router'
import { BackButton } from '@/components/BackButton'

export default function CommunityLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: '#2d1b69',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f2f2f7' },
        headerTitleStyle: { fontWeight: '700', color: '#1c1c1e' },
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="gallery" options={{ headerShown: false }} />
      <Stack.Screen name="reading-room" options={{ headerShown: false }} />
      <Stack.Screen name="album/[id]" options={{ title: '' }} />
      <Stack.Screen name="poetry" options={{ headerShown: false }} />
      <Stack.Screen name="moments" options={{ headerShown: false }} />
      <Stack.Screen name="memoirs" options={{ headerShown: false }} />
      <Stack.Screen name="memoir/[id]" options={{ title: '' }} />
      <Stack.Screen name="forum/index" options={{ headerShown: false }} />
      <Stack.Screen name="forum/[id]" options={{ headerShown: false }} />
    </Stack>
  )
}
