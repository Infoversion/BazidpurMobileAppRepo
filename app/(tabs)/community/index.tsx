import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

interface Counts { albums: number; poetry: number; memoirs: number; threads: number }

const FEATURES = [
  {
    key: 'gallery' as const,
    emoji: '📸',
    title: 'The Gallery',
    desc: 'Community photo albums',
    color: '#f59e0b',
    bg: '#fffbeb',
    href: '/(tabs)/community/gallery',
  },
  {
    key: 'poetry' as const,
    emoji: '✍️',
    title: 'Rhyme & Roots',
    desc: 'Poetry, ghazals & verse',
    color: '#7c3aed',
    bg: '#f5f3ff',
    href: '/(tabs)/community/poetry',
  },
  {
    key: 'memoirs' as const,
    emoji: '📖',
    title: 'Memoirs',
    desc: 'Stories & experiences',
    color: '#059669',
    bg: '#ecfdf5',
    href: '/(tabs)/community/memoirs',
  },
  {
    key: 'threads' as const,
    emoji: '💬',
    title: 'The Forum',
    desc: 'Discussions & conversations',
    color: '#2563eb',
    bg: '#eff6ff',
    href: '/(tabs)/community/forum',
  },
  {
    key: 'tree' as const,
    emoji: '🌳',
    title: 'Family Tree',
    desc: 'Explore the Bazidpur lineage',
    color: '#d97706',
    bg: '#fffbeb',
    href: '/(tabs)/tree',
  },
]

export default function CommunityHub() {
  const insets = useSafeAreaInsets()
  const [counts, setCounts] = useState<Counts>({ albums: 0, poetry: 0, memoirs: 0, threads: 0 })
  const [loading, setLoading] = useState(true)

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

  const countFor = (key: 'gallery' | 'poetry' | 'memoirs' | 'threads' | 'tree') => {
    const map: Record<string, number> = {
      gallery: counts.albums,
      poetry: counts.poetry,
      memoirs: counts.memoirs,
      threads: counts.threads,
    }
    return map[key] ?? 0
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Purple header */}
      <View style={{
        backgroundColor: '#2d1b69',
        paddingTop: insets.top + 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
      }}>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
          Members Area
        </Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>
          Community
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
          Connect · Share · Discover
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {FEATURES.map(f => {
          const count = countFor(f.key)
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => router.push(f.href as any)}
              activeOpacity={0.82}
              style={{
                backgroundColor: '#fff',
                borderRadius: 18,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.07,
                shadowRadius: 8,
                elevation: 3,
                borderWidth: 1,
                borderColor: '#f3f4f6',
              }}
            >
              {/* Icon circle */}
              <View style={{
                width: 52, height: 52, borderRadius: 14,
                backgroundColor: f.bg,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 26 }}>{f.emoji}</Text>
              </View>

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
                  {f.title}
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>{f.desc}</Text>
              </View>

              {/* Count + arrow */}
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {loading && f.key !== 'tree' ? (
                  <ActivityIndicator size="small" color={f.color} />
                ) : count > 0 ? (
                  <View style={{ backgroundColor: f.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: f.color }}>{count}</Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: 20, color: '#d1d5db' }}>›</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}
