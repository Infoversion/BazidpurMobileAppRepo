import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const WEB = 'https://bazidpur.com'

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
}



function ActionCard({
  emoji, title, sub, badge, badgeColor, onPress,
}: {
  emoji: string
  title: string
  sub: string
  badge?: string | null
  badgeColor?: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: '#fff',
        borderRadius: 14, padding: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1, borderColor: '#f3f4f6',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{title}</Text>
        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{sub}</Text>
      </View>
      {badge ? (
        <View style={{ backgroundColor: badgeColor ?? '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: badgeColor === '#fee2e2' ? '#991b1b' : '#92400e' }}>{badge}</Text>
        </View>
      ) : null}
      <Text style={{ fontSize: 18, color: '#d1d5db', flexShrink: 0 }}>›</Text>
    </TouchableOpacity>
  )
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const isSuperadmin = user?.role === 'superadmin'

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
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
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
    })
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  function openWeb(path: string) {
    Linking.openURL(`${WEB}${path}`)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  const s = stats!

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      {/* Header */}
      <View style={{
        backgroundColor: '#1e1b4b',
        paddingTop: insets.top + 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
      }}>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
          Admin Panel
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>Dashboard</Text>
        {isSuperadmin ? (
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Superadmin</Text>
        ) : (
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Admin</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Overview card ────────────────────────────────────────────── */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Overview
          </Text>
          <View style={{
            backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
          }}>
          <View style={{ height: 3, backgroundColor: '#2d1b69' }} />
          {[
            { label: 'Total Registered', value: s.totalUsers,                              sub: 'all accounts',                                                                highlight: false,              onPress: () => router.push({ pathname: '/(tabs)/admin/members' as any, params: { tab: 'all' } }) },
            { label: 'Pending Review',   value: s.pendingCount,                            sub: 'awaiting approval',                                                           highlight: s.pendingCount > 0, onPress: () => router.push({ pathname: '/(tabs)/admin/members' as any, params: { tab: 'pending' } }) },
            { label: 'Admins & Staff',   value: s.adminCount,                              sub: 'admins + superadmins',                                                        highlight: false,              onPress: null },
            { label: 'Family Tree',      value: s.familyTreeNodes,                         sub: 'documented members',                                                          highlight: false,              onPress: null },
            { label: 'Media',            value: s.totalPhotos + s.totalVideos,             sub: `${s.totalPhotos} photos · ${s.totalVideos} videos`,                          highlight: false,              onPress: null },
            { label: 'Timeless Moments', value: s.totalMoments + s.totalMomentVideos,      sub: `${s.totalMoments} photos · ${s.totalMomentVideos} videos`,                   highlight: false,              onPress: null },
            { label: 'Gallery Albums',   value: s.totalPhotoAlbums + s.totalVideoAlbums,   sub: `${s.totalPhotoAlbums} photo · ${s.totalVideoAlbums} video`,                  highlight: false,              onPress: null },
            { label: 'Reading Room',     value: s.totalBooks,                              sub: 'active books',                                                                highlight: false,              onPress: null },
            { label: 'Contact Messages', value: s.totalContacts,                           sub: s.unreadContacts > 0 ? `${s.unreadContacts} unread` : 'all read',             highlight: s.unreadContacts > 0, onPress: null },
          ].map((row, i, arr) => {
            const isPending = row.label === 'Pending Review'
            const bgColor = row.highlight ? (isPending ? '#fffbeb' : '#fff1f2') : 'transparent'
            const textColor = row.highlight ? (isPending ? '#92400e' : '#9f1239') : '#374151'
            const numColor = row.highlight ? (isPending ? '#d97706' : '#e11d48') : '#111827'
            const inner = (
              <>
                <Text style={{ flex: 1, fontSize: 13, color: textColor }}>
                  {row.label}{' '}
                  <Text style={{ color: '#9ca3af' }}>({row.sub})</Text>
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: numColor }}>
                  {row.value.toLocaleString()}
                </Text>
                {row.onPress ? <Text style={{ fontSize: 14, color: '#d1d5db', marginLeft: 6 }}>›</Text> : null}
              </>
            )
            return row.onPress ? (
              <TouchableOpacity
                key={row.label}
                onPress={row.onPress}
                activeOpacity={0.6}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 9, paddingHorizontal: 16,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6',
                  backgroundColor: bgColor,
                }}
              >
                {inner}
              </TouchableOpacity>
            ) : (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 9, paddingHorizontal: 16,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6',
                  backgroundColor: bgColor,
                }}
              >
                {inner}
              </View>
            )
          })}
          </View>
        </View>

        {/* ── Management actions ───────────────────────────────────────── */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Management
          </Text>
          <View style={{ gap: 8 }}>

            <ActionCard
              emoji="👥"
              title="Member Management"
              sub={`${s.totalMembers} members · ${s.pendingCount} pending`}
              badge={s.pendingCount > 0 ? `${s.pendingCount} awaiting` : null}
              badgeColor="#fef3c7"
              onPress={() => router.push('/(tabs)/admin/members')}
            />

            <ActionCard
              emoji="✉️"
              title="Contact Submissions"
              sub={`${s.totalContacts} total · ${s.unreadContacts} unread`}
              badge={s.unreadContacts > 0 ? `${s.unreadContacts} unread` : null}
              badgeColor="#fee2e2"
              onPress={() => router.push('/(tabs)/admin/contacts')}
            />

            <ActionCard
              emoji="🌳"
              title="Family Tree"
              sub={`${s.familyTreeNodes} nodes`}
              onPress={() => router.push('/(tabs)/tree')}
            />

            <ActionCard
              emoji="📸"
              title="Media"
              sub={`${s.totalPhotos} photos · ${s.totalVideos} videos`}
              onPress={() => router.push('/(tabs)/admin/media')}
            />

            <ActionCard
              emoji="✨"
              title="Timeless Moments"
              sub={`${s.totalMoments} moments`}
              onPress={() => router.push('/(tabs)/admin/moments')}
            />

            <ActionCard
              emoji="📚"
              title="The Reading Room"
              sub={`${s.totalBooks} books`}
              onPress={() => router.push('/(tabs)/admin/library' as any)}
            />

            <ActionCard
              emoji="💬"
              title="WhatsApp Archive"
              sub={`${s.totalChats} chats imported`}
              onPress={() => router.push('/(tabs)/admin/whatsapp')}
            />

            <ActionCard
              emoji="📨"
              title="Send Invitations"
              sub="Invite family to join"
              onPress={() => router.push('/(tabs)/admin/invite')}
            />


          </View>
        </View>

        {/* ── Open web admin ───────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => openWeb('/admin')}
          style={{
            backgroundColor: '#1e1b4b', borderRadius: 14,
            padding: 16, alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Open Full Web Admin ›</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>bazidpur.com/admin</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}
