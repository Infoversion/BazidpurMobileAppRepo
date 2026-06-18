import { useState, useRef, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import {
  ActivityIndicator, View, Text, TouchableOpacity, Animated, Easing,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Svg, { Polyline, Path, Circle } from 'react-native-svg'
import { usePathname } from 'expo-router'
import type { Session } from '@supabase/supabase-js'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'
const HIDDEN = new Set(['index', 'contact', 'tree', 'lineage', 'more', 'admin', 'blocked-users', 'notifications', 'notification-settings'])

function getSubScreenIcon(pathname: string): string | null {
  if (pathname.includes('/community/gallery') || pathname.includes('/community/album')) return '🖼️'
  if (pathname.includes('/community/moments')) return '✨'
  if (pathname.includes('/community/poetry'))  return '✍️'
  if (pathname.includes('/community/memoir'))  return '📖'
  if (pathname.includes('/community/reading-room')) return '📚'
  if (pathname.includes('/community/forum'))   return '💬'
  if (pathname.includes('/tree'))              return '🌳'
  if (pathname.includes('/lineage'))           return '📜'
  if (pathname.includes('/admin'))             return '⚙️'
  if (pathname.includes('/more'))              return '👤'
  return null
}

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>
}

function PortraitIcon({ uri }: { uri: string }) {
  const SIZE = 28
  const ZOOM = 2.4
  const imgSize = SIZE * ZOOM
  const hOffset = (SIZE - imgSize) / 2
  return (
    <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' }}>
      <Image
        source={{ uri }}
        style={{ position: 'absolute', width: imgSize, height: imgSize, left: hOffset - 1, top: 0 }}
        contentFit="cover"
      />
    </View>
  )
}

const MEMBER_ROLES = ['member', 'admin', 'superadmin']

interface CustomTabBarProps extends BottomTabBarProps {
  session: Session | null
  role: string | null
}

function CustomTabBar({ state, descriptors, navigation, session, role }: CustomTabBarProps) {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const slideY    = useRef(new Animated.Value(0)).current
  const pillAlpha = useRef(new Animated.Value(0)).current
  const pillScale = useRef(new Animated.Value(0.8)).current
  const pulseScale = useRef(new Animated.Value(1)).current
  // Stable derived value so native-driver listeners don't get reattached on
  // every render (which caused "onAnimatedValueUpdate with no listeners" spam).
  const combinedScale = useRef(Animated.multiply(pillScale, pulseScale)).current
  const [collapsed, setCollapsed] = useState(false)
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null)

  // pulse loop while collapsed
  useEffect(() => {
    if (collapsed) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.08,
            duration: 850,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 850,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
      pulseRef.current.start()
    } else {
      pulseRef.current?.stop()
      pulseScale.setValue(1)
    }
    return () => pulseRef.current?.stop()
  }, [collapsed])

  function collapse() {
    const offScreen = 100 + insets.bottom
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: offScreen,
        damping: 14,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.spring(pillAlpha, {
        toValue: 1,
        delay: 120,
        damping: 14,
        stiffness: 120,
        useNativeDriver: true,
      }),
      Animated.spring(pillScale, {
        toValue: 1,
        delay: 120,
        damping: 12,
        stiffness: 130,
        useNativeDriver: true,
      }),
    ]).start(() => setCollapsed(true))
  }

  function expand() {
    setCollapsed(false)
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        damping: 15,
        stiffness: 120,
        useNativeDriver: true,
      }),
      Animated.timing(pillAlpha, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(pillScale, {
        toValue: 0.8,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const visibleRoutes = state.routes.filter(r => {
    if (HIDDEN.has(r.name)) return false
    if (r.name === 'community' && !MEMBER_ROLES.includes(role ?? '')) return false
    return true
  })

  const activeRoute   = state.routes[state.index]
  const activeOptions = descriptors[activeRoute?.key]?.options
  const bottom        = insets.bottom + 12

  return (
    <>
      {/* ── Full tab bar ───────────────────────────────── */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom,
          left: 16,
          right: 16,
          transform: [{ translateY: slideY }],
        }}
      >
        {/* Grip handle */}
        <TouchableOpacity
          onPress={collapse}
          hitSlop={{ top: 10, bottom: 2, left: 60, right: 60 }}
          style={{ alignItems: 'center', paddingBottom: 5 }}
        >
          <View style={{
            width: 32, height: 4, borderRadius: 2,
            backgroundColor: 'rgba(0,0,0,0.14)',
          }} />
        </TouchableOpacity>

        {/* Tab row */}
        <View style={{
          height: 62,
          borderRadius: 32,
          backgroundColor: '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.08)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
          elevation: 16,
          paddingTop: 6,
          paddingBottom: 8,
          overflow: 'hidden',
        }}>
          {visibleRoutes.map(route => {
            const { options } = descriptors[route.key]
            const focused = state.routes[state.index]?.name === route.name

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name)
              }
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
              >
                {options.tabBarIcon?.({
                  focused,
                  color: focused ? '#2d1b69' : '#9ca3af',
                  size: 20,
                })}
                <Text style={{
                  fontSize: 10, fontWeight: '600',
                  color: focused ? '#2d1b69' : '#9ca3af',
                }}>
                  {options.title}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Animated.View>

      {/* ── Mini pill (collapsed state) ────────────────── */}
      <Animated.View
        pointerEvents={collapsed ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          bottom: bottom + 2,
          left: 24,
          opacity: pillAlpha,
        }}
      >
        <Animated.View style={{ transform: [{ scale: combinedScale }] }}>
          <TouchableOpacity
            onPress={expand}
            activeOpacity={0.82}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#2d1b69',
              borderRadius: 28,
              paddingHorizontal: 20,
              paddingVertical: 12,
              shadowColor: '#2d1b69',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.45,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            {/* Active tab icon */}
            {getSubScreenIcon(pathname)
              ? <Text style={{ fontSize: 22 }}>{getSubScreenIcon(pathname)}</Text>
              : activeOptions?.tabBarIcon?.({ focused: true, color: '#fff', size: 22 })
            }
            {/* Expand chevron */}
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Polyline
                points="6 15 12 9 18 15"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </>
  )
}

export default function TabLayout() {
  const { session, role, loading } = useAuth()

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
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} session={session} role={role} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => {
            const c = focused ? '#f97316' : '#9ca3af'
            const fill = focused ? '#f97316' : 'none'
            return (
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                {/* Chimney — drawn before house so roof covers base */}
                <Path d="M16 9V4h3v8" fill={fill} stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                {/* House body */}
                <Path d="M3 12l9-9 9 9v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill={fill} stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                {/* Door */}
                <Path d="M9.5 22v-7h5v7" stroke={focused ? '#fff' : '#9ca3af'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )
          },
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
          tabBarIcon: () => (
            <PortraitIcon uri={`${R2}/about/fazihat-shah-warsi.jpg`} />
          ),
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          tabBarIcon: ({ focused }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" style={{ opacity: focused ? 1 : 0.8 }}>
              <Path
                d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                fill="#f97316" stroke="#f97316" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              />
              <Circle cx="12" cy="13" r="4" fill="#fff" stroke="#f97316" strokeWidth={1.8} />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ focused }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" style={{ opacity: focused ? 1 : 0.8 }}>
              <Path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                fill="#f97316" stroke="#f97316" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              />
              <Circle cx="9" cy="7" r="4" fill="#f97316" stroke="#f97316" strokeWidth={1.8} />
              <Path
                d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke="#f97316" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              />
            </Svg>
          ),
          href: session ? undefined : null,
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="index"   options={{ href: null }} />
      <Tabs.Screen name="contact" options={{ href: null }} />
      <Tabs.Screen name="tree"    options={{ href: null }} />
      <Tabs.Screen name="lineage" options={{ href: null }} />
      <Tabs.Screen name="more"    options={{ href: null }} />
      <Tabs.Screen name="admin"   options={{ href: null }} />
      <Tabs.Screen name="blocked-users" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="notification-settings" options={{ href: null }} />
    </Tabs>
  )
}
