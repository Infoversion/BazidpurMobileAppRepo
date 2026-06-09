import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Album } from '@/lib/types'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function imgUri(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${R2}/${url}`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  const m = Math.floor(d / 30)
  if (m < 12) return `${m}mo ago`
  return `${Math.floor(m / 12)}y ago`
}

// 4-photo collage or single cover
function AlbumCover({ coverUrl, thumbUrls, size }: { coverUrl?: string | null; thumbUrls: string[]; size: number }) {
  const cover = imgUri(coverUrl)

  // If cover photo set, show it full
  if (cover) {
    return <Image source={{ uri: cover }} style={{ width: size, height: size }} contentFit="cover" />
  }

  // 4-photo collage
  const half = size / 2
  const slots = [thumbUrls[0], thumbUrls[1], thumbUrls[2], thumbUrls[3]]

  if (slots.filter(Boolean).length === 0) {
    return (
      <View style={{ width: size, height: size, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 34 }}>📷</Text>
      </View>
    )
  }

  if (slots.filter(Boolean).length === 1) {
    const uri = imgUri(slots[0])
    return uri
      ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      : <View style={{ width: size, height: size, backgroundColor: '#e5e7eb' }} />
  }

  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
      {[0, 1, 2, 3].map(i => {
        const uri = imgUri(slots[i])
        return (
          <View key={i} style={{ width: half, height: half, padding: 0.5 }}>
            {uri
              ? <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" />
              : <View style={{ flex: 1, backgroundColor: '#d1d5db' }} />
            }
          </View>
        )
      })}
    </View>
  )
}

interface AlbumWithThumbs extends Album {
  _thumbUrls: string[]
}

export default function GalleryScreen() {
  const { width } = useWindowDimensions()
  const colW = (width - 48) / 2
  const [albums, setAlbums] = useState<AlbumWithThumbs[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: albumData } = await supabase
      .from('photo_albums')
      .select('id, title, description, cover_photo_url, is_hidden, display_order, created_at, user_id, user:user_id(first_name, last_name)')
      .eq('is_hidden', false)
      .order('display_order')

    const raw = (albumData ?? []) as unknown as Album[]

    if (raw.length === 0) { setAlbums([]); return }

    // Fetch first 4 photos for each album (for collage thumbnails)
    const albumIds = raw.map(a => a.id)
    const { data: photoData } = await supabase
      .from('album_photos')
      .select('id, album_id, thumbnail_url, r2_url, display_order')
      .in('album_id', albumIds)
      .eq('is_hidden', false)
      .order('display_order')

    const photosByAlbum: Record<string, string[]> = {}
    for (const p of (photoData ?? []) as { album_id: string; thumbnail_url?: string; r2_url: string }[]) {
      if (!photosByAlbum[p.album_id]) photosByAlbum[p.album_id] = []
      if (photosByAlbum[p.album_id].length < 4) {
        photosByAlbum[p.album_id].push(p.thumbnail_url || p.r2_url)
      }
    }

    setAlbums(raw.map(a => ({ ...a, _thumbUrls: photosByAlbum[a.id] ?? [] })))
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

  if (!albums.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📸</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>No albums yet</Text>
        <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>Community photo albums will appear here.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={albums}
      keyExtractor={a => a.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      renderItem={({ item }) => {
        const author = item.user ? `${item.user.first_name} ${item.user.last_name}` : ''
        return (
          <TouchableOpacity
            style={{ width: colW, borderRadius: 14, overflow: 'hidden', backgroundColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
            onPress={() => router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id: item.id } })}
            activeOpacity={0.85}
          >
            {/* Cover / collage */}
            <View style={{ width: colW, height: colW, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
              <AlbumCover coverUrl={item.cover_photo_url} thumbUrls={item._thumbUrls} size={colW} />
            </View>

            {/* Info */}
            <View style={{ padding: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>{item.title}</Text>
              {author ? <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }} numberOfLines={1}>{author}</Text> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                <Text style={{ fontSize: 10, color: '#9ca3af' }}>{timeAgo(item.created_at)}</Text>
                {item._thumbUrls.length > 0 ? (
                  <Text style={{ fontSize: 10, color: '#9ca3af' }}>{item._thumbUrls.length >= 4 ? '4+' : item._thumbUrls.length} photos</Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )
      }}
    />
  )
}
