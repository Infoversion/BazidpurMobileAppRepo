import { Stack } from 'expo-router'

export default function CommunityLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: '#2d1b69',
        headerBackTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: '#111827' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="gallery" options={{ title: 'The Gallery' }} />
      <Stack.Screen name="album/[id]" options={{ title: '' }} />
      <Stack.Screen name="poetry" options={{ title: 'Rhyme & Roots' }} />
      <Stack.Screen name="memoirs" options={{ title: 'Memoirs' }} />
      <Stack.Screen name="memoir/[id]" options={{ title: '' }} />
      <Stack.Screen name="forum/index" options={{ title: 'The Forum' }} />
      <Stack.Screen name="forum/[id]" options={{ headerShown: false }} />
    </Stack>
  )
}
