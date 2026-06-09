import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function resolveUri(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${R2}/${url}`
}

interface RowProps {
  emoji: string
  label: string
  onPress: () => void
  isLast?: boolean
}

function Row({ emoji, label, onPress, isLast }: RowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: '#f2f2f7',
      }}
    >
      <View style={{
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 17 }}>{emoji}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 16, color: '#1c1c1e', fontWeight: '400' }}>{label}</Text>
      <Text style={{ fontSize: 18, color: '#c7c7cc' }}>›</Text>
    </TouchableOpacity>
  )
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 12, fontWeight: '500', color: '#8e8e93',
      paddingHorizontal: 20, paddingTop: 24, paddingBottom: 6,
      textTransform: 'uppercase', letterSpacing: 0.6,
    }}>
      {title}
    </Text>
  )
}

export default function MoreScreen() {
  const { signOut, user } = useAuth()

  const avatarUri = resolveUri(user?.photo_url)
  const initials = user ? `${user.first_name?.charAt(0) ?? ''}${user.last_name?.charAt(0) ?? ''}` : '?'

  async function handleSignOut() {
    await signOut()
    router.replace('/(public)')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Page title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: 34, fontWeight: '700', color: '#1c1c1e', letterSpacing: -0.5 }}>
            Me
          </Text>
        </View>

        {/* Profile card */}
        <View style={{
          backgroundColor: '#ffffff', borderRadius: 16,
          marginHorizontal: 16, marginTop: 4,
          padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        }}>
          <View style={{
            width: 60, height: 60, borderRadius: 30,
            overflow: 'hidden', backgroundColor: '#2d1b69',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 60, height: 60 }} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#ffffff' }}>{initials}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: '#1c1c1e' }}>
              {user?.first_name} {user?.last_name}
            </Text>
            {user?.email ? (
              <Text style={{ fontSize: 13, color: '#8e8e93', marginTop: 2 }}>{user.email}</Text>
            ) : null}
            {user?.role && user.role !== 'member' ? (
              <View style={{
                marginTop: 6, alignSelf: 'flex-start',
                backgroundColor: '#f0effe', borderRadius: 6,
                paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#2d1b69', textTransform: 'capitalize' }}>
                  {user.role}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Explore section */}
        <SectionLabel title="Explore" />
        <View style={{
          borderRadius: 12, marginHorizontal: 16, overflow: 'hidden',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
        }}>
          <Row emoji="🏡" label="Home" onPress={() => router.push('/(public)')} />
          <Row emoji="🕌" label="About Bazidpur" onPress={() => router.push('/(public)/about')} />
          <Row emoji="✨" label="Fazihat Shah Warsi" onPress={() => router.push('/(public)/fazihat-shah-warsi')} />
          <Row emoji="✉️" label="Contact Us" onPress={() => router.push('/(public)/contact')} isLast />
        </View>

        {/* Sign out */}
        <View style={{ marginTop: 32, marginHorizontal: 16, marginBottom: 90 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: '#ffffff', borderRadius: 12,
              paddingVertical: 15, alignItems: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#ff3b30' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
