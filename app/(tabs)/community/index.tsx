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
  bg: string
  depth: string   // darker shade — the extruded "bottom edge"
}

const TILES: Tile[] = [
  { emoji: '✨', label: 'Timeless Moments', sub: 'Curated moments',    route: '/(tabs)/community/moments', bg: '#fde68a', depth: '#b45309' },
  { emoji: '🖼️', label: 'The Gallery',     sub: 'Photos & albums',    route: '/(tabs)/community/gallery', bg: '#fed7aa', depth: '#92400e' },
  { emoji: '✍️', label: 'Rhymes & Roots',  sub: 'Urdu & Persian',     route: '/(tabs)/community/poetry',  bg: '#ddd6fe', depth: '#5b21b6' },
  { emoji: '📖', label: 'Memoirs',         sub: 'Personal stories',   route: '/(tabs)/community/memoirs', bg: '#bbf7d0', depth: '#065f46' },
  { emoji: '📚', label: 'Reading Room',     sub: 'Books & journals',   route: '/(tabs)/community/reading-room', bg: '#e0e7ff', depth: '#3730a3' },
  { emoji: '💬', label: 'The Forum',       sub: 'Community threads',  route: '/(tabs)/community/forum',   bg: '#bae6fd', depth: '#0369a1' },
  { emoji: '🌳', label: 'Family Tree',     sub: 'Trace lineage',      route: '/(tabs)/tree',              bg: '#99f6e4', depth: '#0f766e' },
  { emoji: '📜', label: 'Lineage',         sub: 'Ten generations',    route: '/(tabs)/lineage',           bg: '#fef08a', depth: '#854d0e' },
{ emoji: '⚙️', label: 'Admin',           sub: 'Manage content',     route: '/(tabs)/admin', adminOnly: true, bg: '#fca5a5', depth: '#991b1b' },
]

const DEPTH = 5

export default function CommunityScreen() {
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const tiles = TILES.filter(t => !t.adminOnly || isAdmin)
  const tileW = (width - 48) / 3

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
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

        {/* Tile grid — 3 per row */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tiles.map(tile => (
              <View key={tile.label} style={{ width: tileW, height: tileW + DEPTH }}>

                {/* Extruded depth layer */}
                <View style={{
                  position: 'absolute',
                  left: 0, top: DEPTH,
                  width: tileW, height: tileW,
                  backgroundColor: tile.depth,
                  borderRadius: 16,
                }} />

                {/* Tile face */}
                <TouchableOpacity
                  onPress={() => router.push(tile.route as any)}
                  activeOpacity={0.88}
                  style={{
                    position: 'absolute',
                    left: 0, top: 0,
                    width: tileW, height: tileW,
                    backgroundColor: tile.bg,
                    borderRadius: 16,
                    padding: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Top-left highlight edge
                    borderTopWidth: 1.5,
                    borderLeftWidth: 1.5,
                    borderTopColor: 'rgba(255,255,255,0.75)',
                    borderLeftColor: 'rgba(255,255,255,0.75)',
                  }}
                >
                  <View style={{
                    width: 46, height: 46, borderRadius: 13,
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 8,
                  }}>
                    <Text style={{ fontSize: 24 }}>{tile.emoji}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1c1c1e', textAlign: 'center', lineHeight: 15 }}>
                    {tile.label}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#374151', textAlign: 'center', marginTop: 2, lineHeight: 12, opacity: 0.75 }}>
                    {tile.sub}
                  </Text>
                </TouchableOpacity>

              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  )
}
