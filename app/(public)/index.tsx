import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

export default function LandingScreen() {
  const { session, user } = useAuth()
  const insets = useSafeAreaInsets()

  const avatarUri = user?.photo_url
    ? (user.photo_url.startsWith('http') ? user.photo_url : `${R2}/${user.photo_url}`)
    : null
  const initial  = user ? (user.first_name?.charAt(0) ?? '').toUpperCase() : '?'
  const fullName = user ? `${user.first_name} ${user.last_name}` : ''

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>

      {/* ── Purple top bar — always visible ── */}
      <View style={{
        paddingTop: insets.top + 6,
        paddingBottom: 10,
        paddingHorizontal: 16,
        backgroundColor: '#2d1b69',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        {session ? (
          <>
            {/* Avatar */}
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' }}
              />
            ) : (
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{initial}</Text>
              </View>
            )}

            {/* Name */}
            <Text
              style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}
              numberOfLines={1}
            >
              {fullName}
            </Text>

            {/* Active badge */}
            {user?.is_active ? (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' }} />
            ) : null}

            {/* Members area button */}
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
                flexDirection: 'row', alignItems: 'center', gap: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>Members</Text>
              <Text style={{ fontSize: 14, color: '#fff' }}>›</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Village brand name */}
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>
              Bazidpur
            </Text>

            {/* Sign In — ghost button */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={{
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
                borderRadius: 8, paddingHorizontal: 13, paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>Sign In</Text>
            </TouchableOpacity>

            {/* Join — solid white button */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup')}
              style={{
                backgroundColor: '#fff',
                borderRadius: 8, paddingHorizontal: 13, paddingVertical: 6,
                flexDirection: 'row', alignItems: 'center', gap: 3,
              }}
            >
              <Text style={{ fontSize: 12, color: '#2d1b69', fontWeight: '700' }}>Join</Text>
              <Text style={{ fontSize: 13, color: '#2d1b69', fontWeight: '700' }}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', paddingTop: 64, paddingBottom: 48 }}>
          <Text style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12, fontWeight: '500' }}>
            Bihar, India · Est. c. 1500 AD
          </Text>
          <Text style={{ fontSize: 40, fontWeight: '700', color: '#111827', textAlign: 'center', letterSpacing: -1, marginBottom: 12, lineHeight: 48 }}>
            Bazidpur
          </Text>
          <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 26, maxWidth: 280 }}>
            Our village. Our roots. Our family.
          </Text>
          <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 22, marginTop: 8, maxWidth: 280 }}>
            A platform for families with Bazidpur roots to connect, share memories, and discover their heritage.
          </Text>
        </View>

        {/* Explore links */}
        <Text style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, fontWeight: '500', textAlign: 'center', marginBottom: 12 }}>
          Explore
        </Text>
        <View style={{ gap: 12 }}>
          {[
            { label: 'About Bazidpur',     sub: 'Village history & heritage',    href: '/(public)/about'              as const },
            { label: 'Fazihat Shah Warsi', sub: 'The saint of Bazidpur',         href: '/(public)/fazihat-shah-warsi' as const },
            { label: 'Media',              sub: 'Photos & videos from Bazidpur', href: '/(public)/media'              as const },
            { label: 'Contact Us',         sub: 'Get in touch',                  href: '/(public)/contact'            as const },
          ].map(item => (
            <TouchableOpacity
              key={item.href}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6',
                borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
              }}
              onPress={() => router.push(item.href)}
            >
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.label}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{item.sub}</Text>
              </View>
              <Text style={{ color: '#d1d5db', fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
