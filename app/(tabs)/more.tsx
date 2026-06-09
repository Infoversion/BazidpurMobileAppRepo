import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

interface LinkRowProps {
  emoji: string
  label: string
  onPress: () => void
}

function LinkRow({ emoji, label, onPress }: LinkRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 15, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        backgroundColor: '#fff',
      }}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ flex: 1, fontSize: 16, color: '#111827' }}>{label}</Text>
      <Text style={{ fontSize: 18, color: '#d1d5db' }}>›</Text>
    </TouchableOpacity>
  )
}

export default function MoreScreen() {
  const { signOut, user } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.replace('/(public)')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#2d1b69' }}>More</Text>
          {user?.email ? (
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{user.email}</Text>
          ) : null}
        </View>

        {/* Public pages */}
        <Text style={{ fontSize: 12, color: '#9ca3af', paddingHorizontal: 20, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Explore
        </Text>
        <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          <LinkRow emoji="🏡" label="Home" onPress={() => router.push('/(public)')} />
          <LinkRow emoji="🕌" label="About Bazidpur" onPress={() => router.push('/(public)/about')} />
          <LinkRow emoji="✨" label="Fazihat Shah Warsi" onPress={() => router.push('/(public)/fazihat-shah-warsi')} />
          <LinkRow emoji="✉️" label="Contact Us" onPress={() => router.push('/(public)/contact')} />
        </View>

        {/* Sign out */}
        <View style={{ marginTop: 32, marginHorizontal: 20 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
              borderRadius: 12, paddingVertical: 14, alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#dc2626' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
