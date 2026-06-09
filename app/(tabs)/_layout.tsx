import { Tabs } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { ActivityIndicator, View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>
}

export default function TabLayout() {
  const { session, loading } = useAuth()
  const insets = useSafeAreaInsets()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

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
      {/* ── Always-visible tabs ── */}
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: () => <TabIcon emoji="🕌" />,
        }}
      />
      <Tabs.Screen
        name="zahoor-ali"
        options={{
          title: 'Zahoor Ali',
          tabBarIcon: () => <TabIcon emoji="✨" />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Media',
          tabBarIcon: () => <TabIcon emoji="📷" />,
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: 'Contact',
          tabBarIcon: () => <TabIcon emoji="✉️" />,
        }}
      />

      {/* ── Community: members only ── */}
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: () => <TabIcon emoji="🤝" />,
          href: session ? undefined : null,
        }}
      />

      {/* ── Hidden screens (accessible via Community tiles) ── */}
      <Tabs.Screen name="tree"    options={{ href: null }} />
      <Tabs.Screen name="lineage" options={{ href: null }} />
      <Tabs.Screen name="more"    options={{ href: null }} />
      <Tabs.Screen name="admin"   options={{ href: null }} />
      <Tabs.Screen name="home"    options={{ href: null }} />
    </Tabs>
  )
}
