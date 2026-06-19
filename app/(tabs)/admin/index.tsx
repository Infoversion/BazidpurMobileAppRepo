import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { RoleBadge } from '@/components/RoleBadge'
import Svg, { Path, Line, Circle } from 'react-native-svg'

const W = 'white'
const SW = 2

function HelpIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={W} strokeWidth={SW} />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="17" x2="12.01" y2="17" stroke={W} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  )
}

function SignOutIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 17l5-5-5-5" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="21" y1="12" x2="9" y2="12" stroke={W} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  )
}

interface Stats {
  totalUsers: number
  totalMembers: number
  pendingCount: number
  adminCount: number
  familyTreeNodes: number
  totalPhotos: number
  totalVideos: number
  totalPhotoAlbums: number
  totalAlbumPhotos: number
  totalVideoAlbums: number
  totalAlbumVideos: number
  unreadContacts: number
  totalContacts: number
  totalChats: number
  totalMoments: number
  totalMomentVideos: number
  totalBooks: number
  reportCount: number
}

function AdminTile({
  emoji, label, stat, badge, tileSize, onPress,
}: {
  emoji: string
  label: string
  stat?: number | null
  badge?: number | null
  tileSize: number
  onPress?: (() => void) | null
}) {
  const inner = (
    <>
      {!!badge && (
        <View style={{
          position: 'absolute', top: 9, right: 9, zIndex: 1,
          backgroundColor: '#ef4444', borderRadius: 10,
          minWidth: 20, height: 20,
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 5,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      <Text style={{ fontSize: 32, marginBottom: 6 }}>{emoji}</Text>
      <Text
        style={{ fontSize: 11, fontWeight: '700', color: '#1c1c1e', textAlign: 'center', lineHeight: 14 }}
        numberOfLines={2}
      >
        {label}
      </Text>
      {stat != null && (
        <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 4, fontWeight: '500' }}>
          {stat.toLocaleString()}
        </Text>
      )}
    </>
  )

  const style = {
    width: tileSize, height: tileSize,
    backgroundColor: '#fff',
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={style}>
        {inner}
      </TouchableOpacity>
    )
  }
  return <View style={[style, { opacity: 0.55 }]}>{inner}</View>
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { user } = useAuth()
  const isSuperadmin = user?.role === 'superadmin'
  const initials = user
    ? [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'
    : '?'

  const tileSize = Math.floor((width - 32 - 20) / 3)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/(tabs)/home')
  }

  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const [
      { count: totalUsers },
      { count: totalMembers },
      { count: pendingCount },
      { count: adminCount },
      { count: familyTreeNodes },
      { count: totalPhotos },
      { count: totalVideos },
      { count: totalPhotoAlbums },
      { count: totalAlbumPhotos },
      { count: unreadContacts },
      { count: totalContacts },
      { count: totalChats },
      { count: totalMoments },
      { count: totalMomentVideos },
      { count: totalVideoAlbums },
      { count: totalAlbumVideos },
      { count: totalBooks },
      { count: reportCount },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).not('role', 'eq', 'pending'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'member'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'pending'),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['admin', 'superadmin']),
      supabase.from('family_tree_nodes').select('*', { count: 'exact', head: true }),
      supabase.from('photos').select('*', { count: 'exact', head: true }),
      supabase.from('videos').select('*', { count: 'exact', head: true }),
      supabase.from('photo_albums').select('*', { count: 'exact', head: true }),
      supabase.from('album_photos').select('*', { count: 'exact', head: true }),
      supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('is_read', false),
      supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
      supabase.from('whatsapp_chats').select('*', { count: 'exact', head: true }),
      supabase.from('timeless_moments').select('*', { count: 'exact', head: true }),
      supabase.from('timeless_moment_videos').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('video_albums').select('*', { count: 'exact', head: true }),
      supabase.from('video_album_items').select('*', { count: 'exact', head: true }),
      supabase.from('library_books').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('reports').select('*', { count: 'exact', head: true }),
    ])

    setStats({
      totalUsers: totalUsers ?? 0,
      totalMembers: totalMembers ?? 0,
      pendingCount: pendingCount ?? 0,
      adminCount: adminCount ?? 0,
      familyTreeNodes: familyTreeNodes ?? 0,
      totalPhotos: totalPhotos ?? 0,
      totalVideos: totalVideos ?? 0,
      totalPhotoAlbums: totalPhotoAlbums ?? 0,
      totalAlbumPhotos: totalAlbumPhotos ?? 0,
      totalVideoAlbums: totalVideoAlbums ?? 0,
      totalAlbumVideos: totalAlbumVideos ?? 0,
      unreadContacts: unreadContacts ?? 0,
      totalContacts: totalContacts ?? 0,
      totalChats: totalChats ?? 0,
      totalMoments: totalMoments ?? 0,
      totalMomentVideos: totalMomentVideos ?? 0,
      totalBooks: totalBooks ?? 0,
      reportCount: reportCount ?? 0,
    })
  }

  const initialLoad = useRef(true)
  useEffect(() => { load().finally(() => setLoading(false)) }, [])
  useFocusEffect(useCallback(() => {
    if (initialLoad.current) { initialLoad.current = false; return }
    load()
  }, []))

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f7' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  const s = stats!

  const tiles = [
    { emoji: '👥', label: 'Members',          stat: s.totalUsers,                         badge: null,                              onPress: () => router.push({ pathname: '/(tabs)/admin/members' as any, params: { tab: 'all' } }) },
    { emoji: '⏳', label: 'Pending',           stat: s.pendingCount,                       badge: s.pendingCount > 0 ? s.pendingCount : null, onPress: () => router.push({ pathname: '/(tabs)/admin/members' as any, params: { tab: 'pending' } }) },
    { emoji: '🛡️', label: 'Admins',            stat: s.adminCount,                         badge: null,                              onPress: () => router.push({ pathname: '/(tabs)/admin/members' as any, params: { tab: 'admin' } }) },
    { emoji: '🌳', label: 'Family Tree',       stat: s.familyTreeNodes,                    badge: null,                              onPress: () => router.push('/(tabs)/admin/family-tree' as any) },
    { emoji: '📸', label: 'Media',             stat: s.totalPhotos + s.totalVideos,        badge: null,                              onPress: () => router.push('/(tabs)/admin/media') },
    { emoji: '✨', label: 'Timeless\nMoments', stat: s.totalMoments + s.totalMomentVideos, badge: null,                              onPress: () => router.push('/(tabs)/admin/moments') },
    { emoji: '🗂️', label: 'Albums',            stat: s.totalPhotoAlbums + s.totalVideoAlbums, badge: null,                          onPress: null },
    { emoji: '📚', label: 'Reading Room',      stat: s.totalBooks,                         badge: null,                              onPress: () => router.push('/(tabs)/admin/library' as any) },
    { emoji: '✉️', label: 'Contacts',          stat: s.totalContacts,                      badge: s.unreadContacts > 0 ? s.unreadContacts : null, onPress: () => router.push('/(tabs)/admin/contacts') },
    { emoji: '💬', label: 'WhatsApp',          stat: s.totalChats,                         badge: null,                              onPress: () => router.push('/(tabs)/admin/whatsapp') },
    { emoji: '📨', label: 'Invitations',       stat: null,                                 badge: null,                              onPress: () => router.push('/(tabs)/admin/invite') },
    { emoji: '⚑',  label: 'Flagged',           stat: s.reportCount,                        badge: s.reportCount > 0 ? s.reportCount : null, onPress: () => router.push('/(tabs)/admin/reports' as any) },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f7' }}>

      {/* Header */}
      <View style={{
        backgroundColor: '#1e1b4b',
        paddingTop: insets.top + 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'flex-end',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>Admin</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
            {isSuperadmin ? 'Superadmin' : 'Admin'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
          <TouchableOpacity
            onPress={() => router.push('/(public)/help')}
            style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}
          >
            <HelpIcon />
          </TouchableOpacity>

          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/more')}
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: 'rgba(255,255,255,0.22)',
                overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {user?.photo_url ? (
                <Image source={{ uri: user.photo_url }} style={{ width: 34, height: 34 }} contentFit="cover" />
              ) : (
                <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>{initials}</Text>
              )}
            </TouchableOpacity>
            {user?.role && (
              <View style={{ position: 'absolute', bottom: -3, right: -4 }}>
                <RoleBadge role={user.role} size={14} />
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}
          >
            <SignOutIcon />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90, gap: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        showsVerticalScrollIndicator={false}
      >

        {/* Tile grid */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Overview
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {tiles.map(tile => (
              <AdminTile
                key={tile.label}
                emoji={tile.emoji}
                label={tile.label}
                stat={tile.stat}
                badge={tile.badge}
                tileSize={tileSize}
                onPress={tile.onPress}
              />
            ))}
          </View>
        </View>

        {/* Life of an Admin */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Life of an Admin
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 36, lineHeight: 44 }}>🧑‍💼</Text>
              <Text style={{ fontSize: 22, lineHeight: 28 }}>📋✅</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2d1b69', textAlign: 'center' }}>Stamp of Approval</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14 }}>Carefully vetting every soul seeking entry to the Bazidpur family</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 36, lineHeight: 44 }}>👩‍🌾</Text>
              <Text style={{ fontSize: 22, lineHeight: 28 }}>🌳✨</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2d1b69', textAlign: 'center' }}>Tree Whisperer</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14 }}>Lovingly growing the family tree, one branch at a time</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 36, lineHeight: 44 }}>🛡️</Text>
              <Text style={{ fontSize: 22, lineHeight: 28 }}>⚔️🏰</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2d1b69', textAlign: 'center' }}>Guardian of the Village</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14 }}>Standing watch so the community stays safe and wholesome</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 36, lineHeight: 44 }}>🌙</Text>
              <Text style={{ fontSize: 22, lineHeight: 28 }}>💻☕</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2d1b69', textAlign: 'center' }}>Late-Night Hero</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14 }}>Running on chai and dedication, keeping Bazidpur alive after dark</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#c4b5fd', textAlign: 'center', marginTop: 16, marginBottom: 4, fontStyle: 'italic' }}>
            JazakAllah Khayran for your service 💜
          </Text>
        </View>

      </ScrollView>
    </View>
  )
}
