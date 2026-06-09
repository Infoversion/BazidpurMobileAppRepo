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
  totalPoetry: number
  totalExperiences: number
  draftExperiences: number
  totalPhotoAlbums: number
  totalAlbumPhotos: number
  totalVideoAlbums: number
  totalAlbumVideos: number
  unreadContacts: number
  totalContacts: number
  totalChats: number
  totalMoments: number
  totalMomentVideos: number
}

function StatCard({
  value, label, sub, accent, alert,
}: {
  value: number
  label: string
  sub?: string
  accent: string
  alert?: boolean
}) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: alert ? '#fde68a' : '#f3f4f6',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
      overflow: 'hidden',
    }}>
      {/* Top accent line */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accent, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
      <Text style={{ fontSize: 34, fontWeight: '800', color: alert ? '#d97706' : '#111827', marginTop: 4 }}>
        {value.toLocaleString()}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 2 }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{sub}</Text> : null}
      {alert && value > 0 ? (
        <View style={{ marginTop: 6, backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 }}>Action needed</Text>
        </View>
      ) : null}
    </View>
  )
}

function CompactStat({ value, label, sub, color }: { value: number; label: string; sub?: string; color: string }) {
  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 16,
      borderWidth: 1, borderColor: '#f3f4f6',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
      overflow: 'hidden',
    }}>
      <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, backgroundColor: color, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }} />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginLeft: 8 }}>{value.toLocaleString()}</Text>
    </View>
  )
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
      { count: totalPoetry },
      { count: totalExperiences },
      { count: draftExperiences },
      { count: totalPhotoAlbums },
      { count: totalAlbumPhotos },
      { count: unreadContacts },
      { count: totalContacts },
      { count: totalChats },
      { count: totalMoments },
      { count: totalMomentVideos },
      { count: totalVideoAlbums },
      { count: totalAlbumVideos },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'member'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'pending'),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['admin', 'superadmin']),
      supabase.from('family_tree_nodes').select('*', { count: 'exact', head: true }),
      supabase.from('photos').select('*', { count: 'exact', head: true }),
      supabase.from('videos').select('*', { count: 'exact', head: true }),
      supabase.from('poetry').select('*', { count: 'exact', head: true }),
      supabase.from('experiences').select('*', { count: 'exact', head: true }),
      supabase.from('experiences').select('*', { count: 'exact', head: true }).eq('is_published', false),
      supabase.from('photo_albums').select('*', { count: 'exact', head: true }),
      supabase.from('album_photos').select('*', { count: 'exact', head: true }),
      supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('is_read', false),
      supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
      supabase.from('whatsapp_chats').select('*', { count: 'exact', head: true }),
      supabase.from('timeless_moments').select('*', { count: 'exact', head: true }),
      supabase.from('timeless_moment_videos').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('video_albums').select('*', { count: 'exact', head: true }),
      supabase.from('video_album_items').select('*', { count: 'exact', head: true }),
    ])

    setStats({
      totalUsers: totalUsers ?? 0,
      totalMembers: totalMembers ?? 0,
      pendingCount: pendingCount ?? 0,
      adminCount: adminCount ?? 0,
      familyTreeNodes: familyTreeNodes ?? 0,
      totalPhotos: totalPhotos ?? 0,
      totalVideos: totalVideos ?? 0,
      totalPoetry: totalPoetry ?? 0,
      totalExperiences: totalExperiences ?? 0,
      draftExperiences: draftExperiences ?? 0,
      totalPhotoAlbums: totalPhotoAlbums ?? 0,
      totalAlbumPhotos: totalAlbumPhotos ?? 0,
      totalVideoAlbums: totalVideoAlbums ?? 0,
      totalAlbumVideos: totalAlbumVideos ?? 0,
      unreadContacts: unreadContacts ?? 0,
      totalContacts: totalContacts ?? 0,
      totalChats: totalChats ?? 0,
      totalMoments: totalMoments ?? 0,
      totalMomentVideos: totalMomentVideos ?? 0,
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

        {/* ── Hero stats — 2×2 grid ───────────────────────────────────── */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard value={s.totalUsers} label="Total Registered" sub="all accounts" accent="#64748b" />
            <StatCard value={s.totalMembers} label="Active Members" sub="approved" accent="#22c55e" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard
              value={s.pendingCount}
              label="Pending Review"
              sub="awaiting approval"
              accent={s.pendingCount > 0 ? '#f59e0b' : '#e5e7eb'}
              alert={s.pendingCount > 0}
            />
            <StatCard value={s.adminCount} label="Admins & Staff" sub="admins + superadmins" accent="#3b82f6" />
          </View>
        </View>

        {/* ── Content stats — single scrollable row ───────────────────── */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Content
          </Text>
          <View style={{ gap: 8 }}>
            <CompactStat
              value={s.familyTreeNodes}
              label="Family Tree"
              sub="documented family members"
              color="#10b981"
            />
            <CompactStat
              value={s.totalPhotos + s.totalVideos}
              label="Media"
              sub={`${s.totalPhotos} photos · ${s.totalVideos} videos`}
              color="#06b6d4"
            />
            <CompactStat
              value={s.totalMoments + s.totalMomentVideos}
              label="Timeless Moments"
              sub={`${s.totalMoments} photos · ${s.totalMomentVideos} videos`}
              color="#8b5cf6"
            />
            <CompactStat
              value={s.totalPhotoAlbums + s.totalVideoAlbums}
              label="Gallery Albums"
              sub={`${s.totalPhotoAlbums} photo (${s.totalAlbumPhotos}) · ${s.totalVideoAlbums} video (${s.totalAlbumVideos})`}
              color="#14b8a6"
            />
            <CompactStat
              value={s.totalPoetry}
              label="Rhymes & Roots"
              sub="poems & ghazals"
              color="#ec4899"
            />
            <CompactStat
              value={s.totalExperiences}
              label="Memoirs"
              sub={s.draftExperiences > 0 ? `${s.draftExperiences} unpublished draft${s.draftExperiences > 1 ? 's' : ''}` : 'all published'}
              color="#7c3aed"
            />
            <CompactStat
              value={s.totalContacts}
              label="Contact Messages"
              sub={s.unreadContacts > 0 ? `${s.unreadContacts} unread` : 'all read'}
              color="#f43f5e"
            />
            <CompactStat
              value={s.totalChats}
              label="WhatsApp Archive"
              sub="imported chat files"
              color="#0ea5e9"
            />
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
              onPress={() => openWeb('/admin/members')}
            />

            <ActionCard
              emoji="✉️"
              title="Contact Submissions"
              sub={`${s.totalContacts} total · ${s.unreadContacts} unread`}
              badge={s.unreadContacts > 0 ? `${s.unreadContacts} unread` : null}
              badgeColor="#fee2e2"
              onPress={() => openWeb('/admin/contacts')}
            />

            <ActionCard
              emoji="🌳"
              title="Family Tree"
              sub={`${s.familyTreeNodes} nodes`}
              onPress={() => router.push('/(tabs)/tree')}
            />

            <ActionCard
              emoji="📖"
              title="Memoirs"
              sub={`${s.totalExperiences} total${s.draftExperiences > 0 ? ` · ${s.draftExperiences} draft` : ''}`}
              badge={s.draftExperiences > 0 ? `${s.draftExperiences} drafts` : null}
              badgeColor="#fef3c7"
              onPress={() => openWeb('/admin/experiences')}
            />

            <ActionCard
              emoji="✍️"
              title="Rhymes & Roots"
              sub={`${s.totalPoetry} poems & ghazals`}
              onPress={() => openWeb('/admin/poetry')}
            />

            <ActionCard
              emoji="📸"
              title="Media"
              sub={`${s.totalPhotos} photos · ${s.totalVideos} videos`}
              onPress={() => openWeb('/admin/media')}
            />

            <ActionCard
              emoji="✨"
              title="Timeless Moments"
              sub={`${s.totalMoments} moments`}
              onPress={() => openWeb('/admin/timeless-moments')}
            />

            <ActionCard
              emoji="💬"
              title="WhatsApp Archive"
              sub={`${s.totalChats} chats imported`}
              onPress={() => openWeb('/admin/whatsapp')}
            />

            <ActionCard
              emoji="📨"
              title="Send Invitations"
              sub="Invite family to join"
              onPress={() => openWeb('/admin/invitations')}
            />

            {isSuperadmin ? (
              <>
                <ActionCard
                  emoji="📊"
                  title="Site Statistics"
                  sub="Sessions & page views"
                  onPress={() => openWeb('/admin/site-statistics')}
                />
                <ActionCard
                  emoji="📋"
                  title="Event Logs"
                  sub="System event log files"
                  onPress={() => openWeb('/admin/logs')}
                />
                <ActionCard
                  emoji="🔧"
                  title="Configuration"
                  sub="Notifications & site settings"
                  onPress={() => openWeb('/admin/configuration')}
                />
              </>
            ) : null}

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
