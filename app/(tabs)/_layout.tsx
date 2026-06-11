import { Tabs } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { ActivityIndicator, View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>
}

function PortraitIcon({ uri, focused }: { uri: string; focused: boolean }) {
  const SIZE = 28
  const ZOOM = 2.4
  const imgSize = SIZE * ZOOM
  const hOffset = (SIZE - imgSize) / 2  // centers horizontally
  return (
    <View style={{
      width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden',
    }}>
      <Image
        source={{ uri }}
        style={{ position: 'absolute', width: imgSize, height: imgSize, left: hOffset - 1, top: 0 }}
        contentFit="cover"
      />
    </View>
  )
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
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2d1b69',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
        tabBarStyle: {
          position: 'absolute',
          bottom: insets.bottom + 12,
          left: 28,
          right: 28,
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
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: () => <TabIcon emoji="🏡" />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('@/assets/images/about-icon.png')}
              style={{ width: 28, height: 28, opacity: focused ? 1 : 0.45 }}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="zahoor-ali"
        options={{
          title: 'Zahoor Ali',
          tabBarIcon: ({ focused }) => (
            <PortraitIcon uri={`${R2}/about/fazihat-shah-warsi.jpg`} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          tabBarIcon: () => <TabIcon emoji="📷" />,
        }}
      />
      {/* ── Community: members only ── */}
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: () => <TabIcon emoji="👥" />,
          href: session ? undefined : null,
        }}
      />

      {/* ── Hidden screens ── */}
      <Tabs.Screen name="index"   options={{ href: null }} />
      <Tabs.Screen name="contact" options={{ href: null }} />
      <Tabs.Screen name="tree"    options={{ href: null }} />
      <Tabs.Screen name="lineage" options={{ href: null }} />
      <Tabs.Screen name="more"    options={{ href: null }} />
      <Tabs.Screen name="admin"   options={{ href: null }} />
    </Tabs>
  )
}
