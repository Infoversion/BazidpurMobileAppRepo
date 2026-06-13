import { Stack } from 'expo-router'
import { BackButton } from '@/components/BackButton'

export default function AdminLayout() {
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
      <Stack.Screen name="members" options={{ title: 'Member Management' }} />
      <Stack.Screen name="contacts" options={{ title: 'Contact Submissions' }} />
      <Stack.Screen name="media" options={{ title: 'Media' }} />
      <Stack.Screen name="moments" options={{ title: 'Timeless Moments' }} />
      <Stack.Screen name="whatsapp" options={{ title: 'WhatsApp Archive' }} />
      <Stack.Screen name="invite" options={{ title: 'Send Invitations' }} />
      <Stack.Screen name="library" options={{ title: 'The Reading Room' }} />
      <Stack.Screen name="app-stats" options={{ title: 'App Statistics' }} />
      <Stack.Screen name="family-tree" options={{ title: 'Family Tree' }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
    </Stack>
  )
}
