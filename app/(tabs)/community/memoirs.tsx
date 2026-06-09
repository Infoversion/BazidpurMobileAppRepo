import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Experience } from '@/lib/types'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function imgUri(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${R2}/${url}`
}

interface ExperienceWithCount extends Experience {
  chapters?: { id: string }[]
  _resolvedAvatar?: string | null
}

export default function MemoirsScreen() {
  const [experiences, setExperiences] = useState<ExperienceWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('experiences')
      .select('id, title, summary, author_name, author_bio, author_photo_url, author_user_id, cover_photo_url, is_published, display_order, created_at, chapters:experience_chapters(id)')
      .eq('is_published', true)
      .order('display_order')

    const raw = (data ?? []) as ExperienceWithCount[]

    // Fetch user profile photos for linked authors that have no author_photo_url
    const linkedIds = raw
      .filter(e => !e.author_photo_url && e.author_user_id)
      .map(e => e.author_user_id as string)

    let memberPhotos: Record<string, string | null> = {}
    if (linkedIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, photo_url')
        .in('id', linkedIds)
      for (const u of (users ?? []) as { id: string; photo_url: string | null }[]) {
        memberPhotos[u.id] = u.photo_url
      }
    }

    setExperiences(raw.map(e => ({
      ...e,
      _resolvedAvatar: e.author_photo_url
        || (e.author_user_id ? memberPhotos[e.author_user_id] ?? null : null),
    })))
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#2d1b69" /></View>
  }

  return (
    <FlatList
      data={experiences}
      keyExtractor={e => e.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      contentContainerStyle={{ paddingVertical: 8 }}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6', marginLeft: 76 }} />}
      renderItem={({ item }) => {
        const coverUri = imgUri(item.cover_photo_url)
        const avatarUri = imgUri(item._resolvedAvatar)
        const chapterCount = item.chapters?.length ?? 0

        return (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/community/memoir/[id]' as any, params: { id: item.id } })}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: '#fff',
              gap: 12,
            }}
          >
            {/* Thumbnail — cover photo only, else emoji */}
            <View style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0, backgroundColor: '#ecfdf5' }}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={{ width: 60, height: 60 }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 26 }}>📖</Text>
                </View>
              )}
            </View>

            {/* Text */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 }} numberOfLines={1}>
                {item.title}
              </Text>

              {/* Author row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 18, height: 18, borderRadius: 9 }} contentFit="cover" />
                ) : (
                  <View style={{
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>
                      {item.author_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={{ fontSize: 12, color: '#6b7280', flex: 1 }} numberOfLines={1}>{item.author_name}</Text>
              </View>

              {item.summary ? (
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }} numberOfLines={1}>{item.summary}</Text>
              ) : null}
            </View>

            {/* Right: chapter count + chevron */}
            <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              {chapterCount > 0 ? (
                <View style={{ backgroundColor: '#ecfdf5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>
                    {chapterCount} ch.
                  </Text>
                </View>
              ) : null}
              <Text style={{ fontSize: 18, color: '#d1d5db' }}>›</Text>
            </View>
          </TouchableOpacity>
        )
      }}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📖</Text>
          <Text style={{ fontSize: 14, color: '#9ca3af' }}>No memoirs yet</Text>
        </View>
      }
    />
  )
}
