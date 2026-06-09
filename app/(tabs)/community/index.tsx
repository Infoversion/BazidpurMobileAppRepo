import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

type Tile = {
  emoji: string
  label: string
  sub: string
  route: string
  adminOnly?: boolean
  color: string
}

const TILES: Tile[] = [
  { emoji: '🖼️', label: 'Gallery',     sub: 'Photos & albums',    route: '/(tabs)/community/gallery', color: '#fff7ed' },
  { emoji: '✍️', label: 'Poetry',      sub: 'Urdu & Persian',     route: '/(tabs)/community/poetry',  color: '#fdf4ff' },
  { emoji: '📖', label: 'Memoirs',     sub: 'Personal stories',   route: '/(tabs)/community/memoirs', color: '#f0fdf4' },
  { emoji: '💬', label: 'Forum',       sub: 'Community threads',  route: '/(tabs)/community/forum',   color: '#eff6ff' },
  { emoji: '🌳', label: 'Family Tree', sub: 'Trace lineage',      route: '/(tabs)/tree',              color: '#f0fdf4' },
  { emoji: '📜', label: 'Lineage',     sub: 'Ten generations',    route: '/(tabs)/lineage',           color: '#fefce8' },
  { emoji: '👤', label: 'My Profile',  sub: 'Settings & sign out',route: '/(tabs)/more',              color: '#f5f3ff' },
  { emoji: '⚙️', label: 'Admin',       sub: 'Manage content',     route: '/(tabs)/admin', adminOnly: true, color: '#fff1f2' },
]

export default function CommunityScreen() {
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const tiles = TILES.filter(t => !t.adminOnly || isAdmin)
  const tileW = (width - 48) / 3  // 16 padding each side + 8px gaps between 3 columns

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#8e8e93', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
            Members Area
          </Text>
          <Text style={{ fontSize: 34, fontWeight: '700', color: '#1c1c1e', letterSpacing: -0.5, marginBottom: 4 }}>
            Community
          </Text>
          <Text style={{ fontSize: 14, color: '#8e8e93', lineHeight: 20 }}>
            Welcome{user?.first_name ? `, ${user.first_name}` : ''}
          </Text>
        </View>

        {/* Tile grid — 3 per row */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tiles.map(tile => (
              <TouchableOpacity
                key={tile.label}
                onPress={() => router.push(tile.route as any)}
                activeOpacity={0.8}
                style={{
                  width: tileW,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 2,
                  minHeight: tileW,
                }}
              >
                <View style={{
                  width: 50, height: 50, borderRadius: 14,
                  backgroundColor: tile.color,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}>
                  <Text style={{ fontSize: 26 }}>{tile.emoji}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1c1e', textAlign: 'center', lineHeight: 17 }}>
                  {tile.label}
                </Text>
                <Text style={{ fontSize: 10, color: '#8e8e93', textAlign: 'center', marginTop: 3, lineHeight: 14 }}>
                  {tile.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
