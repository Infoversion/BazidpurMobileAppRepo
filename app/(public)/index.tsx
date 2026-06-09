import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

export default function LandingScreen() {
  const { session, user } = useAuth()
  const insets = useSafeAreaInsets()

  // Logged-in users should not see this page — redirect them to tabs
  if (session) {
    router.replace('/(tabs)')
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>

      {/* Purple top bar */}
      <View style={{
        paddingTop: insets.top + 6,
        paddingBottom: 10,
        paddingHorizontal: 16,
        backgroundColor: '#2d1b69',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>
          Bazidpur
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={{
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
            borderRadius: 8, paddingHorizontal: 13, paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>Sign In</Text>
        </TouchableOpacity>
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
      </View>

      {/* Hero */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 16, fontWeight: '500', textAlign: 'center' }}>
          Bihar, India · Est. c. 1500 AD
        </Text>
        <Text style={{ fontSize: 52, fontWeight: '700', color: '#111827', textAlign: 'center', letterSpacing: -2, marginBottom: 16, lineHeight: 58 }}>
          Bazidpur
        </Text>
        <Text style={{ fontSize: 17, color: '#6b7280', textAlign: 'center', lineHeight: 26, marginBottom: 8 }}>
          Our village. Our roots. Our family.
        </Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22, maxWidth: 280 }}>
          A platform for families with Bazidpur roots to connect, share memories, and discover their heritage.
        </Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 40 }}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup')}
            style={{
              backgroundColor: '#2d1b69', borderRadius: 14,
              paddingHorizontal: 28, paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>Join the Family</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={{
              backgroundColor: '#f3f4f6', borderRadius: 14,
              paddingHorizontal: 24, paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 15, color: '#374151', fontWeight: '600' }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  )
}
