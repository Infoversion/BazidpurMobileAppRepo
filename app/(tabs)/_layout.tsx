import { Tabs, router } from 'expo-router'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ActivityIndicator, View, Text, Image, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>
}

// Avatar shown in the Me tab — photo if available, else initial, with green active badge
function AvatarTabIcon() {
  const { user } = useAuth()
  const uri = user?.photo_url
    ? (user.photo_url.startsWith('http') ? user.photo_url : `${R2}/${user.photo_url}`)
    : null
  const initial = user ? (user.first_name?.charAt(0) ?? '').toUpperCase() : '?'

  return (
    <View style={{ width: 28, height: 28 }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#2d1b69' }}
        />
      ) : (
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{initial}</Text>
        </View>
      )}
      {user?.is_active ? (
        <View style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 9, height: 9, borderRadius: 5,
          backgroundColor: '#22c55e', borderWidth: 1.5, borderColor: '#fff',
        }} />
      ) : null}
    </View>
  )
}

export default function TabLayout() {
  const { session, loading, user } = useAuth()
  const insets = useSafeAreaInsets()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(public)')
    }
  }, [session, loading])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  if (!session) return null

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2d1b69',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
        tabBarStyle: {
          position: 'absolute',
          bottom: insets.bottom + 12,
          left: 16,
          right: 16,
          height: 62,
          borderRadius: 32,
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
          elevation: 16,
          paddingTop: 6,
          paddingBottom: 8,
        },
      }}
    >
      {/* Home — custom button navigates to public area, never activates this tab */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: () => <TabIcon emoji="🏡" />,
          tabBarButton: ({ style, children, accessibilityState }) => (
            <TouchableOpacity
              style={style}
              accessibilityState={accessibilityState ?? undefined}
              onPress={() => router.push('/(public)')}
            >
              {children}
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Moments',
          tabBarIcon: () => <TabIcon emoji="🖼️" />,
        }}
      />
      <Tabs.Screen
        name="tree"
        options={{
          title: 'Family Tree',
          tabBarIcon: () => <TabIcon emoji="🌳" />,
        }}
      />
      <Tabs.Screen
        name="lineage"
        options={{
          title: 'Lineage',
          tabBarIcon: () => <TabIcon emoji="📜" />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: () => <TabIcon emoji="🤝" />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: () => <TabIcon emoji="⚙️" />,
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Me',
          tabBarIcon: () => <AvatarTabIcon />,
        }}
      />
    </Tabs>
  )
}
