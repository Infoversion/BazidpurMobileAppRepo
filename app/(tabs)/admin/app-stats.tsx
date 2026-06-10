import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, ActivityIndicator,
  RefreshControl, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

interface AppStats {
  // Members
  totalMembers: number
  newMembersThisWeek: number
  newMembersThisMonth: number
  pendingMembers: number
  // Forum
  totalThreads: number
  totalReplies: number
  newThreadsThisMonth: number
  newRepliesThisMonth: number
  // Gallery
  totalAlbums: number
  totalAlbumPhotos: number
  newAlbumPhotosThisMonth: number
  // Moments
  totalMoments: number
  newMomentsThisMonth: number
  // Content totals
  totalPoetry: number
  totalExperiences: number
  totalBooks: number
  // Family
  totalFamilyNodes: number
}

function weekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

function monthAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

// ── Stat block components ────────────────────────────────────────────────────

function BigStat({ value, label, sub, accent }: { value: number; label: string; sub?: string; accent: string }) {
  return (
    <View style={{
      flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
      overflow: 'hidden',
    }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accent, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
      <Text style={{ fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 4 }}>{value.toLocaleString()}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 2 }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</Text> : null}
    </View>
  )
}

function GrowthStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden',
    }}>
      <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, backgroundColor: color, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 8 }}>{label}</Text>
      <View style={{ backgroundColor: value > 0 ? color + '22' : '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: value > 0 ? color : '#9ca3af' }}>
          {value > 0 ? `+${value}` : '0'}
        </Text>
      </View>
    </View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 }}>
      {title}
    </Text>
  )
}

function ContentRow({ emoji, label, value, sub }: { emoji: string; label: string; value: number; sub?: string }) {
  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: '#f3f4f6',
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{value.toLocaleString()}</Text>
    </View>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function AppStatsScreen() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [stats, setStats] = useState<AppStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadedAt, setLoadedAt] = useState('')

  async function load() {
    const week  = weekAgo()
    const month = monthAgo()

    const [
      { count: totalMembers },
      { count: newMembersThisWeek },
      { count: newMembersThisMonth },
      { count: pendingMembers },
      { count: totalThreads },
      { count: totalReplies },
      { count: newThreadsThisMonth },
      { count: newRepliesThisMonth },
      { count: totalAlbums },
      { count: totalAlbumPhotos },
      { count: newAlbumPhotosThisMonth },
      { count: totalMoments },
      { count: newMomentsThisMonth },
      { count: totalPoetry },
      { count: totalExperiences },
      { count: totalBooks },
      { count: totalFamilyNodes },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['member', 'admin', 'superadmin']),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['member', 'admin', 'superadmin']).gte('created_at', week),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['member', 'admin', 'superadmin']).gte('created_at', month),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'pending'),
      supabase.from('threads').select('*', { count: 'exact', head: true }),
      supabase.from('thread_replies').select('*', { count: 'exact', head: true }),
      supabase.from('threads').select('*', { count: 'exact', head: true }).gte('created_at', month),
      supabase.from('thread_replies').select('*', { count: 'exact', head: true }).gte('created_at', month),
      supabase.from('photo_albums').select('*', { count: 'exact', head: true }),
      supabase.from('album_photos').select('*', { count: 'exact', head: true }),
      supabase.from('album_photos').select('*', { count: 'exact', head: true }).gte('created_at', month),
      supabase.from('timeless_moments').select('*', { count: 'exact', head: true }),
      supabase.from('timeless_moments').select('*', { count: 'exact', head: true }).gte('created_at', month),
      supabase.from('poetry').select('*', { count: 'exact', head: true }),
      supabase.from('experiences').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('library_books').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('family_tree_nodes').select('*', { count: 'exact', head: true }),
    ])

    setStats({
      totalMembers:            totalMembers ?? 0,
      newMembersThisWeek:      newMembersThisWeek ?? 0,
      newMembersThisMonth:     newMembersThisMonth ?? 0,
      pendingMembers:          pendingMembers ?? 0,
      totalThreads:            totalThreads ?? 0,
      totalReplies:            totalReplies ?? 0,
      newThreadsThisMonth:     newThreadsThisMonth ?? 0,
      newRepliesThisMonth:     newRepliesThisMonth ?? 0,
      totalAlbums:             totalAlbums ?? 0,
      totalAlbumPhotos:        totalAlbumPhotos ?? 0,
      newAlbumPhotosThisMonth: newAlbumPhotosThisMonth ?? 0,
      totalMoments:            totalMoments ?? 0,
      newMomentsThisMonth:     newMomentsThisMonth ?? 0,
      totalPoetry:             totalPoetry ?? 0,
      totalExperiences:        totalExperiences ?? 0,
      totalBooks:              totalBooks ?? 0,
      totalFamilyNodes:        totalFamilyNodes ?? 0,
    })
    setLoadedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  const s = stats!
  const halfW = (width - 48) / 2

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f2f2f7' }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Member overview ───────────────────────────────────── */}
      <View>
        <SectionHeader title="Members" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <BigStat value={s.totalMembers} label="Total Members" sub="approved accounts" accent="#2d1b69" />
          {s.pendingMembers > 0 ? (
            <BigStat value={s.pendingMembers} label="Pending Approval" sub="awaiting review" accent="#f59e0b" />
          ) : (
            <BigStat value={s.totalFamilyNodes} label="Family Tree" sub="documented members" accent="#10b981" />
          )}
        </View>
        <View style={{ gap: 8 }}>
          <SectionHeader title="Member growth" />
          <GrowthStat value={s.newMembersThisWeek}  label="New this week"  color="#2d1b69" />
          <GrowthStat value={s.newMembersThisMonth} label="New this month" color="#7c3aed" />
        </View>
      </View>

      {/* ── Forum activity ────────────────────────────────────── */}
      <View>
        <SectionHeader title="Forum (last 30 days)" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <BigStat value={s.totalThreads}  label="Total Threads"  sub="all time" accent="#0369a1" />
          <BigStat value={s.totalReplies}  label="Total Replies"  sub="all time" accent="#0891b2" />
        </View>
        <View style={{ gap: 8 }}>
          <GrowthStat value={s.newThreadsThisMonth}  label="New threads this month"  color="#0369a1" />
          <GrowthStat value={s.newRepliesThisMonth}  label="New replies this month"   color="#0891b2" />
        </View>
      </View>

      {/* ── Gallery activity ──────────────────────────────────── */}
      <View>
        <SectionHeader title="Gallery (last 30 days)" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <BigStat value={s.totalAlbums}      label="Total Albums" sub="all time" accent="#d97706" />
          <BigStat value={s.totalAlbumPhotos} label="Total Photos" sub="in albums" accent="#b45309" />
        </View>
        <GrowthStat value={s.newAlbumPhotosThisMonth} label="Photos added this month" color="#d97706" />
      </View>

      {/* ── Moments activity ──────────────────────────────────── */}
      <View>
        <SectionHeader title="Timeless Moments (last 30 days)" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <BigStat value={s.totalMoments} label="Total Moments" sub="all time" accent="#8b5cf6" />
          <GrowthStat value={s.newMomentsThisMonth} label="Added this month" color="#8b5cf6" />
        </View>
      </View>

      {/* ── Content library ───────────────────────────────────── */}
      <View>
        <SectionHeader title="Content Library" />
        <View style={{ gap: 8 }}>
          <ContentRow emoji="📖" label="Memoirs"        value={s.totalExperiences} sub="published" />
          <ContentRow emoji="✍️" label="Rhyme & Roots"  value={s.totalPoetry}      sub="poems & ghazals" />
          <ContentRow emoji="📚" label="Reading Room"   value={s.totalBooks}       sub="active books" />
          <ContentRow emoji="🌳" label="Family Tree"    value={s.totalFamilyNodes} sub="documented members" />
        </View>
      </View>

      {loadedAt ? (
        <Text style={{ fontSize: 11, color: '#c7c7cc', textAlign: 'center', marginTop: 4 }}>
          Last updated at {loadedAt} · Pull to refresh
        </Text>
      ) : null}
    </ScrollView>
  )
}
