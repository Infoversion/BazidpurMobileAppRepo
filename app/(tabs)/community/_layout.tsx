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
      <Stack.Screen name="gallery" options={{ title: 'The Gallery' }} />
      <Stack.Screen name="reading-room" options={{ title: 'The Reading Room' }} />
      <Stack.Screen name="album/[id]" options={{ title: '' }} />
      <Stack.Screen name="poetry" options={{ title: 'Rhyme & Roots' }} />
      <Stack.Screen name="moments" options={{ title: 'Timeless Moments' }} />
      <Stack.Screen name="memoirs" options={{ title: 'Memoirs' }} />
      <Stack.Screen name="memoir/[id]" options={{ title: '' }} />
      <Stack.Screen name="forum/index" options={{ title: 'The Forum' }} />
      <Stack.Screen name="forum/[id]" options={{ headerShown: false }} />
    </Stack>
  )
}
