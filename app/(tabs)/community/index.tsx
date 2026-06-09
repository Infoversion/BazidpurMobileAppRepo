import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface Counts { albums: number; poetry: number; memoirs: number; threads: number }

// ── Featured hero card ─────────────────────────────────────────────────────────
function FeaturedCard({
  emoji, label, title, desc, count, countLabel,
  gradient, onPress,
}: {
  emoji: string
  label: string
  title: string
  desc: string
  count: number
  countLabel: string
  gradient: [string, string]
  onPress: () => void
}) {
  const { width } = useWindowDimensions()
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
        height: 200,
        shadowColor: gradient[0],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      {/* Gradient background via layered views */}
      <View style={{ flex: 1, backgroundColor: gradient[0] }}>
        <View style={{
          position: 'absolute', right: -20, top: -20,
          width: 180, height: 180, borderRadius: 90,
          backgroundColor: gradient[1], opacity: 0.5,
        }} />
        <View style={{
          position: 'absolute', right: 40, bottom: -40,
          width: 140, height: 140, borderRadius: 70,
          backgroundColor: gradient[1], opacity: 0.3,
        }} />

        {/* Content */}
        <View style={{ flex: 1, padding: 22, justifyContent: 'space-between' }}>
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
            </View>
            <Text style={{ fontSize: 36 }}>{emoji}</Text>
          </View>

          {/* Bottom text */}
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 4 }}>{title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', flex: 1 }}>{desc}</Text>
              {count > 0 ? (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{count} {countLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Horizontal section card ────────────────────────────────────────────────────
function SectionCard({
  emoji, title, desc, count, color, bg, onPress,
}: {
  emoji: string
  title: string
  desc: string
  count: number
  color: string
  bg: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        width: 150,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 }} numberOfLines={1}>{title}</Text>
      <Text style={{ fontSize: 12, color: '#8e8e93', marginBottom: 10 }} numberOfLines={2}>{desc}</Text>
      {count > 0 ? (
        <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color }}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

// ── iOS grouped list row ───────────────────────────────────────────────────────
function ListRow({
  emoji, title, desc, count, color, isFirst, isLast, onPress,
}: {
  emoji: string
  title: string
  desc: string
  count?: number
  color: string
  isFirst?: boolean
  isLast?: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderTopLeftRadius: isFirst ? 12 : 0,
        borderTopRightRadius: isFirst ? 12 : 0,
        borderBottomLeftRadius: isLast ? 12 : 0,
        borderBottomRightRadius: isLast ? 12 : 0,
        gap: 14,
      }}
    >
      <View style={{
        width: 34, height: 34, borderRadius: 8,
        backgroundColor: color + '20',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{title}</Text>
        <Text style={{ fontSize: 12, color: '#8e8e93', marginTop: 1 }}>{desc}</Text>
      </View>
      {count != null && count > 0 ? (
        <Text style={{ fontSize: 13, color: '#8e8e93', marginRight: 4 }}>{count}</Text>
      ) : null}
      <Text style={{ fontSize: 18, color: '#c7c7cc' }}>›</Text>
    </TouchableOpacity>
  )
}

function ListSeparator() {
  return <View style={{ height: 1, backgroundColor: '#f2f2f7', marginLeft: 64 }} />
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function CommunityHub() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [counts, setCounts] = useState<Counts>({ albums: 0, poetry: 0, memoirs: 0, threads: 0 })
  const [loading, setLoading] = useState(true)

  const firstName = user?.first_name ?? ''

  useEffect(() => {
    async function load() {
      const [a, p, m, t] = await Promise.all([
        supabase.from('photo_albums').select('*', { count: 'exact', head: true }).eq('is_hidden', false),
        supabase.from('poetry').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('experiences').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('threads').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('room', 'general'),
      ])
      setCounts({ albums: a.count ?? 0, poetry: p.count ?? 0, memoirs: m.count ?? 0, threads: t.count ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      >
        {/* ── Header ── */}
        <View style={{
          backgroundColor: '#f2f2f7',
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#8e8e93', letterSpacing: 0.3 }}>
            MEMBERS AREA
          </Text>
          <Text style={{ fontSize: 34, fontWeight: '800', color: '#1c1c1e', letterSpacing: -0.5, marginTop: 4 }}>
            Community
          </Text>
          {firstName ? (
            <Text style={{ fontSize: 15, color: '#8e8e93', marginTop: 4 }}>
              Welcome back, {firstName}
            </Text>
          ) : null}
        </View>

        {/* ── Featured hero — The Gallery ── */}
        <FeaturedCard
          emoji="📸"
          label="Featured"
          title="The Gallery"
          desc="Community photo albums"
          count={counts.albums}
          countLabel="albums"
          gradient={['#d97706', '#f59e0b']}
          onPress={() => router.push('/(tabs)/community/gallery' as any)}
        />

        {/* ── Discover section — horizontal scroll ── */}
        <View style={{ marginTop: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1c1c1e' }}>Discover</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            <SectionCard
              emoji="✍️"
              title="Rhyme & Roots"
              desc="Poetry, ghazals & verse"
              count={counts.poetry}
              color="#7c3aed"
              bg="#f5f3ff"
              onPress={() => router.push('/(tabs)/community/poetry' as any)}
            />
            <SectionCard
              emoji="📖"
              title="Memoirs"
              desc="Stories & experiences"
              count={counts.memoirs}
              color="#059669"
              bg="#ecfdf5"
              onPress={() => router.push('/(tabs)/community/memoirs' as any)}
            />
            <SectionCard
              emoji="💬"
              title="The Forum"
              desc="Discussions & conversations"
              count={counts.threads}
              color="#2563eb"
              bg="#eff6ff"
              onPress={() => router.push('/(tabs)/community/forum' as any)}
            />
          </ScrollView>
        </View>

        {/* ── Explore section — grouped list ── */}
        <View style={{ marginTop: 28, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginBottom: 14 }}>Explore</Text>
          <View style={{
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
          }}>
            <ListRow
              emoji="🌳"
              title="Family Tree"
              desc="Explore the Bazidpur lineage"
              color="#d97706"
              isFirst
              onPress={() => router.push('/(tabs)/tree' as any)}
            />
            <ListSeparator />
            <ListRow
              emoji="📜"
              title="Ancestral Lineage"
              desc="The ancestral chain of descent"
              color="#7c3aed"
              isLast
              onPress={() => router.push('/(tabs)/lineage' as any)}
            />
          </View>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <ActivityIndicator size="small" color="#8e8e93" />
          </View>
        ) : null}

      </ScrollView>
    </View>
  )
}
