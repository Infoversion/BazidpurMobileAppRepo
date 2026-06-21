import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'
import { CuratedNotice } from '@/components/CuratedNotice'
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
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="Memoirs" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Memoirs" showBack />
      <CuratedNotice message="Stories collected and published by the Bazidpur admin team." />
    <FlatList
      data={experiences}
      keyExtractor={e => e.id}
      style={{ backgroundColor: '#f2f2f7' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
      renderItem={({ item }) => {
        const coverUri = imgUri(item.cover_photo_url)
        const avatarUri = imgUri(item._resolvedAvatar)
        const chapterCount = item.chapters?.length ?? 0

        return (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/community/memoir/[id]' as any, params: { id: item.id } })}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 14, paddingVertical: 14,
              backgroundColor: '#ffffff', borderRadius: 16, gap: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
            }}
          >
            {/* Thumbnail — cover photo only, else emoji */}
            <View style={{ width: 62, height: 62, borderRadius: 12, overflow: 'hidden', flexShrink: 0, backgroundColor: '#ecfdf5' }}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={{ width: 62, height: 62 }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 26 }}>📖</Text>
                </View>
              )}
            </View>

            {/* Text */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1c1e', marginBottom: 3 }} numberOfLines={1}>
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
                <Text style={{ fontSize: 12, color: '#8e8e93', flex: 1 }} numberOfLines={1}>{item.author_name}</Text>
              </View>

              {item.summary ? (
                <Text style={{ fontSize: 12, color: '#aeaeb2', marginTop: 3 }} numberOfLines={1}>{item.summary}</Text>
              ) : null}
            </View>

            {/* Right: chapter count + report + chevron */}
            <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              {chapterCount > 0 ? (
                <View style={{ backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>
                    {chapterCount} ch.
                  </Text>
                </View>
              ) : null}
              <Text style={{ fontSize: 18, color: '#c7c7cc' }}>›</Text>
            </View>
          </TouchableOpacity>
        )
      }}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📖</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No memoirs yet</Text>
          <Text style={{ fontSize: 13, color: '#8e8e93' }}>Check back soon.</Text>
        </View>
      }
    />
    </View>
  )
}
