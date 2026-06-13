import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
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
  const initials = user
    ? [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'
    : '?'

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
        flexDirection: 'row',
        alignItems: 'flex-end',
      }}>
        <View style={{ flex: 1 }}>
<Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>Admin</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
            {isSuperadmin ? 'Superadmin' : 'Admin'}
          </Text>
        </View>

        {/* Right icons */}
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
            { icon: '👥', label: 'Approved Members', value: s.totalUsers,                              sub: 'members + admins',                                                            highlight: false,              onPress: () => router.push({ pathname: '/(tabs)/admin/members' as any, params: { tab: 'all' } }) },
            { icon: '⏳', label: 'Pending Review',   value: s.pendingCount,                            sub: 'awaiting approval',                                                           highlight: s.pendingCount > 0, onPress: () => router.push({ pathname: '/(tabs)/admin/members' as any, params: { tab: 'pending' } }) },
            { icon: '🛡️', label: 'Admins & Staff',   value: s.adminCount,                              sub: 'admins + superadmins',                                                        highlight: false,              onPress: () => router.push({ pathname: '/(tabs)/admin/members' as any, params: { tab: 'admin' } }) },
            { icon: '🌳', label: 'Family Tree',      value: s.familyTreeNodes,                         sub: 'documented members',                                                          highlight: false,              onPress: () => router.push('/(tabs)/admin/family-tree' as any) },
            { icon: '📸', label: 'Media',            value: s.totalPhotos + s.totalVideos,             sub: `${s.totalPhotos} photos · ${s.totalVideos} videos`,                          highlight: false,              onPress: () => router.push('/(tabs)/admin/media') },
            { icon: '✨', label: 'Timeless Moments', value: s.totalMoments + s.totalMomentVideos,      sub: `${s.totalMoments} photos · ${s.totalMomentVideos} videos`,                   highlight: false,              onPress: () => router.push('/(tabs)/admin/moments') },
            { icon: '🗂️', label: 'Gallery Albums',   value: s.totalPhotoAlbums + s.totalVideoAlbums,   sub: `${s.totalPhotoAlbums} photo · ${s.totalVideoAlbums} video`,                  highlight: false,              onPress: null },
            { icon: '📚', label: 'Reading Room',     value: s.totalBooks,                              sub: 'active books',                                                                highlight: false,              onPress: () => router.push('/(tabs)/admin/library' as any) },
            { icon: '✉️', label: 'Contact Submissions', value: s.totalContacts,                        sub: s.unreadContacts > 0 ? `${s.unreadContacts} unread` : 'all read',             highlight: s.unreadContacts > 0, onPress: () => router.push('/(tabs)/admin/contacts') },
            { icon: '💬', label: 'WhatsApp Archive',    value: s.totalChats,                           sub: 'chats imported',                                                              highlight: false,              onPress: () => router.push('/(tabs)/admin/whatsapp') },
            { icon: '📨', label: 'Send Invitations',    value: null,                                   sub: 'invite family to join',                                                       highlight: false,              onPress: () => router.push('/(tabs)/admin/invite') },
            { icon: '⚑',  label: 'Flagged Content',    value: s.reportCount,                          sub: s.reportCount > 0 ? 'requires review' : 'nothing flagged',                     highlight: s.reportCount > 0,  onPress: () => router.push('/(tabs)/admin/reports' as any) },
          ].map((row, i, arr) => {
            const isPending = row.label === 'Pending Review'
            const bgColor = row.highlight ? (isPending ? '#fffbeb' : '#fff1f2') : 'transparent'
            const textColor = row.highlight ? (isPending ? '#92400e' : '#9f1239') : '#374151'
            const numColor = row.highlight ? (isPending ? '#d97706' : '#e11d48') : '#111827'
            const inner = (
              <>
                <Text style={{ fontSize: 15, marginRight: 8 }}>{row.icon}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: textColor }}>
                  {row.label}{' '}
                  <Text style={{ color: '#9ca3af' }}>({row.sub})</Text>
                </Text>
                {row.value !== null && (
                  <Text style={{ fontSize: 14, fontWeight: '700', color: numColor }}>
                    {row.value.toLocaleString()}
                  </Text>
                )}
                {row.onPress ? <Text style={{ fontSize: 18, fontWeight: '700', color: '#9ca3af', marginLeft: 6 }}>›</Text> : null}
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

        {/* ── Fun admin scenes ─────────────────────────────────────────── */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Life of an Admin
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 36, lineHeight: 44 }}>🧑‍💼</Text>
              <Text style={{ fontSize: 22, lineHeight: 28 }}>📋✅</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2d1b69', textAlign: 'center' }}>Stamp of Approval</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14 }}>Carefully vetting every soul seeking entry to the Bazidpur family</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 36, lineHeight: 44 }}>👩‍🌾</Text>
              <Text style={{ fontSize: 22, lineHeight: 28 }}>🌳✨</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2d1b69', textAlign: 'center' }}>Tree Whisperer</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14 }}>Lovingly growing the family tree, one branch at a time</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 36, lineHeight: 44 }}>🛡️</Text>
              <Text style={{ fontSize: 22, lineHeight: 28 }}>⚔️🏰</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2d1b69', textAlign: 'center' }}>Guardian of the Village</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 14 }}>Standing watch so the community stays safe and wholesome</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#f3f4f6' }}>
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
