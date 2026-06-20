import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { PurpleHeader } from '@/components/PurpleHeader'

type Tile = {
  emoji: string
  label: string
  sub: string
  route: string
  adminOnly?: boolean
}

const TILES: Tile[] = [
  { emoji: '✨', label: 'Timeless Moments', sub: 'Curated moments',   route: '/(tabs)/community/moments' },
  { emoji: '🖼️', label: 'The Gallery',     sub: 'Photos & albums',   route: '/(tabs)/community/gallery' },
  { emoji: '✍️', label: 'Rhymes & Roots',  sub: 'Urdu & Persian',    route: '/(tabs)/community/poetry' },
  { emoji: '📖', label: 'Memoirs',         sub: 'Personal stories',  route: '/(tabs)/community/memoirs' },
  { emoji: '📚', label: 'Reading Room',    sub: 'Books & journals',  route: '/(tabs)/community/reading-room' },
  { emoji: '💬', label: 'The Forum',       sub: 'Community threads', route: '/(tabs)/community/forum' },
  { emoji: '🌍', label: 'Scattered Roots', sub: 'Where we are',      route: '/(tabs)/community/scattered-roots' },
  { emoji: '🌳', label: 'Family Tree',     sub: 'Trace lineage',     route: '/(tabs)/tree' },
  { emoji: '📜', label: 'Lineage',         sub: 'Ten generations',   route: '/(tabs)/lineage' },
  { emoji: '⚙️', label: 'Admin',          sub: 'Manage content',    route: '/(tabs)/admin', adminOnly: true },
]

export default function CommunityScreen() {
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const tiles = TILES.filter(t => !t.adminOnly || isAdmin)
  const tileSize = Math.floor((width - 32 - 20) / 3)

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
      <PurpleHeader title="Community" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Welcome sub-header */}
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
          <Text style={{ fontSize: 14, color: '#8e8e93', lineHeight: 20 }}>
            Welcome{user?.first_name ? `, ${user.first_name}` : ''} — Members area
          </Text>
        </View>

        {/* Tile grid */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {tiles.map(tile => (
              <TouchableOpacity
                key={tile.label}
                onPress={() => router.push(tile.route as any)}
                activeOpacity={0.72}
                style={{
                  width: tileSize,
                  height: tileSize,
                  backgroundColor: '#fff',
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 32, marginBottom: 6 }}>{tile.emoji}</Text>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', color: '#1c1c1e', textAlign: 'center', lineHeight: 14 }}
                  numberOfLines={2}
                >
                  {tile.label}
                </Text>
                <Text
                  style={{ fontSize: 9, color: '#8e8e93', textAlign: 'center', marginTop: 3, lineHeight: 12 }}
                  numberOfLines={1}
                >
                  {tile.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  )
}
