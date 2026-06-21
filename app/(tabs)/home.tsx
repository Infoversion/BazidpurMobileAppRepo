import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'
import type { LandingPhoto } from '@/lib/types'

const CIRCLE_SIZE = 68
const OVERLAP = 22

export default function HomeScreen() {
  const { session, role } = useAuth()
  const isMember = ['member', 'admin', 'superadmin'].includes(role ?? '')
  const [photos, setPhotos] = useState<LandingPhoto[]>([])

  useEffect(() => {
    supabase
      .from('landing_photos')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(7)
      .then(({ data }) => setPhotos(data ?? []))
  }, [])

  const totalWidth = photos.length > 0
    ? photos.length * CIRCLE_SIZE - (photos.length - 1) * OVERLAP
    : 0

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PurpleHeader title="Home" hideVisitorActions />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingBottom: 110,
          paddingTop: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
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

        {!session ? (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 40 }}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup')}
              style={{ backgroundColor: '#2d1b69', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>Join the Community</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={{ backgroundColor: '#f3f4f6', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 15, color: '#374151', fontWeight: '600' }}>Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : isMember ? (
          <View style={{
            marginTop: 36, backgroundColor: '#f5f3ff',
            borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
            alignItems: 'center', maxWidth: 300,
          }}>
            <Text style={{ fontSize: 22, marginBottom: 10 }}>🤝</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2d1b69', textAlign: 'center', marginBottom: 8 }}>
              You're in — welcome home!
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
              Tap the{' '}
              <Text style={{ fontWeight: '700', color: '#2d1b69' }}>Community</Text>
              {' '}icon in the tab bar below to explore stories, memoirs, family tree, photos and more.
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', maxWidth: 300, marginTop: 36 }}>
            <View style={{
              backgroundColor: '#fffbeb',
              borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
              alignItems: 'center',
              borderWidth: 1, borderColor: '#fde68a',
              marginBottom: 20,
            }}>
              <Text style={{ fontSize: 22, marginBottom: 10 }}>⏳</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400e', textAlign: 'center', marginBottom: 8 }}>
                Request under review
              </Text>
              <Text style={{ fontSize: 13, color: '#78350f', textAlign: 'center', lineHeight: 20 }}>
                Your membership request is being reviewed by our admins. You'll receive an email once it's approved. Thanks for your patience!
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/signup')}
                style={{ backgroundColor: '#2d1b69', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
              >
                <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>Join the Community</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={{ backgroundColor: '#f3f4f6', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 }}
              >
                <Text style={{ fontSize: 15, color: '#374151', fontWeight: '600' }}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Photo collage */}
        {photos.length > 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <View style={{ width: totalWidth, height: CIRCLE_SIZE, flexDirection: 'row' }}>
              {photos.map((photo, i) => (
                <View
                  key={photo.id}
                  style={{
                    position: 'absolute',
                    left: i * (CIRCLE_SIZE - OVERLAP),
                    width: CIRCLE_SIZE,
                    height: CIRCLE_SIZE,
                    borderRadius: CIRCLE_SIZE / 2,
                    overflow: 'hidden',
                    borderWidth: 2.5,
                    borderColor: '#fff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                    elevation: i + 1,
                  }}
                >
                  <Image
                    source={{ uri: photo.r2_url }}
                    style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
                    contentFit="cover"
                  />
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: '#c4c4c6', marginTop: 14, letterSpacing: 0.5 }}>
              Bazidpur, Bihar, India
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push('/(public)/privacy-policy')}
          style={{ marginTop: 32 }}
        >
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>Privacy Policy</Text>
        </TouchableOpacity>


      </ScrollView>
    </View>
  )
}
