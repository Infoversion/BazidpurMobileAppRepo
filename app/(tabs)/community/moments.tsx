import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { WebView } from 'react-native-webview'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import PhotoLightbox from '@/components/gallery/PhotoLightbox'
import { LikesComments } from '@/components/LikesComments'
import { PurpleHeader } from '@/components/PurpleHeader'
import { CuratedNotice } from '@/components/CuratedNotice'
import type { Photo, Video } from '@/lib/types'

interface TmAlbum {
  id: string
  title: string
  description: string | null
  cover_photo_url: string | null
  photo_count: number
  video_count: number
}

const PAGE_SIZE = 40

// ─── Segmented control ────────────────────────────────────────────────────────

function SegmentedControl<T extends string>({
  options, value, onChange, labels,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  labels: Record<T, string>
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 9, padding: 2 }}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={{
            flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center',
            backgroundColor: value === opt ? '#ffffff' : 'transparent',
            shadowColor: value === opt ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12, shadowRadius: 2, elevation: value === opt ? 1 : 0,
          }}
          onPress={() => onChange(opt)}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: value === opt ? '#1c1c1e' : '#8e8e93' }}>
            {labels[opt]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Album grid ───────────────────────────────────────────────────────────────

function AlbumGrid({
  albums, width, refreshing, onRefresh,
}: {
  albums: TmAlbum[]
  width: number
  refreshing: boolean
  onRefresh: () => void
}) {
  const tileSize = (width - 52) / 2

  if (albums.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>📁</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No albums yet</Text>
        <Text style={{ fontSize: 13, color: '#8e8e93' }}>Check back soon.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={albums}
      keyExtractor={a => a.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{
            width: tileSize, borderRadius: 14, overflow: 'hidden',
            backgroundColor: '#ffffff',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          }}
          onPress={() => router.push({ pathname: '/(tabs)/community/moments/[albumId]' as any, params: { albumId: item.id } })}
          activeOpacity={0.85}
        >
          {item.cover_photo_url ? (
            <Image source={{ uri: item.cover_photo_url }} style={{ width: tileSize, height: tileSize * 0.75 }} contentFit="cover" />
          ) : (
            <View style={{ width: tileSize, height: tileSize * 0.75, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 36 }}>📁</Text>
            </View>
          )}
          <View style={{ padding: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1c1e' }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>
              {item.photo_count} photo{item.photo_count !== 1 ? 's' : ''}
              {item.video_count > 0 ? ` · ${item.video_count} video${item.video_count !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  )
}

// ─── Photo grid ───────────────────────────────────────────────────────────────

function PhotoGrid({
  photos, onPress, refreshing, onRefresh,
}: {
  photos: Photo[]
  onPress: (index: number) => void
  refreshing: boolean
  onRefresh: () => void
}) {
  const { width } = useWindowDimensions()
  const tileSize = (width - 44) / 3

  if (photos.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>✨</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No photos yet</Text>
        <Text style={{ fontSize: 13, color: '#8e8e93' }}>Check back soon.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={photos}
      keyExtractor={p => p.id}
      numColumns={3}
      columnWrapperStyle={{ gap: 6 }}
      contentContainerStyle={{ padding: 16, gap: 6, paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={{
            width: tileSize, borderRadius: 14, overflow: 'hidden',
            backgroundColor: '#ffffff',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          }}
          onPress={() => onPress(index)}
          activeOpacity={0.85}
        >
          <Image
            source={{ uri: item.thumbnail_url || item.r2_url }}
            style={{ width: tileSize, height: tileSize }}
            contentFit="cover"
          />
          {item.title ? (
            <View style={{ padding: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#374151' }} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      )}
    />
  )
}

// ─── Video list ───────────────────────────────────────────────────────────────

function VideoCard({ item, cardWidth, thumbHeight }: { item: Video; cardWidth: number; thumbHeight: number }) {
  const [playing, setPlaying] = useState(false)
  const thumb = item.thumbnail_url
    || `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`

  return (
    <View
      style={{
        borderRadius: 16, overflow: 'hidden', backgroundColor: '#ffffff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
      }}
    >
      {playing ? (
        <View style={{ width: cardWidth, height: thumbHeight, backgroundColor: '#000' }}>
          <WebView
            source={{ uri: `https://www.youtube.com/embed/${item.youtube_id}?autoplay=1&playsinline=1&modestbranding=1&rel=0&origin=https://bazidpur.com` }}
            style={{ height: thumbHeight, width: cardWidth, backgroundColor: '#000' }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          />
        </View>
      ) : (
        <TouchableOpacity onPress={() => setPlaying(true)} activeOpacity={0.85}>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: thumb }}
              style={{ width: cardWidth, height: thumbHeight }}
              contentFit="cover"
            />
            <View style={{
              position: 'absolute', inset: 0,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}>
              <View style={{
                width: 54, height: 54, borderRadius: 27,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: '#fff', fontSize: 22, marginLeft: 4 }}>▶</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1c1e', marginBottom: 4, lineHeight: 20 }} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 18 }} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <LikesComments entityType="timeless_moment_video" entityId={item.id} />
      </View>
    </View>
  )
}

function VideoList({
  videos, refreshing, onRefresh,
}: {
  videos: Video[]
  refreshing: boolean
  onRefresh: () => void
}) {
  const { width } = useWindowDimensions()
  const cardWidth = width - 32
  const thumbHeight = (cardWidth * 9) / 16

  if (videos.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>🎬</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No videos yet</Text>
        <Text style={{ fontSize: 13, color: '#8e8e93' }}>Check back soon.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={videos}
      keyExtractor={v => v.id}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      renderItem={({ item }) => (
        <VideoCard item={item} cardWidth={cardWidth} thumbHeight={thumbHeight} />
      )}
    />
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TimelessMomentsScreen() {
  const [activeTab, setActiveTab] = useState<'albums' | 'photos' | 'videos'>('albums')
  const [albums, setAlbums] = useState<TmAlbum[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { width } = useWindowDimensions()

  async function fetchData() {
    const [{ data: albs }, { data: p }, { data: v }] = await Promise.all([
      supabase
        .from('tm_albums')
        .select('id, title, description, cover_photo_url, photo_count:timeless_moments(count), video_count:timeless_moment_videos(count)')
        .eq('is_hidden', false)
        .order('display_order'),
      supabase
        .from('timeless_moments')
        .select('id, title, description, r2_url, thumbnail_url')
        .is('album_id', null)
        .order('display_order')
        .limit(PAGE_SIZE),
      supabase
        .from('timeless_moment_videos')
        .select('*')
        .is('album_id', null)
        .eq('is_active', true)
        .order('display_order', { nullsFirst: false })
        .limit(PAGE_SIZE),
    ])
    setAlbums((albs ?? []).map((a: any) => ({
      ...a,
      photo_count: a.photo_count?.[0]?.count ?? 0,
      video_count: a.video_count?.[0]?.count ?? 0,
    })))
    setPhotos((p ?? []) as Photo[])
    setVideos((v ?? []) as Video[])
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [])

  const tabLabels: Record<'albums' | 'photos' | 'videos', string> = {
    albums: `📁  Albums${albums.length ? ` (${albums.length})` : ''}`,
    photos: `✨  Photos`,
    videos: `🎬  Videos`,
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      <PurpleHeader title="Timeless Moments" showBack />

      <CuratedNotice message="A curated collection of moments selected by the Bazidpur admin team." />

      {/* Segmented control sub-bar */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
        <SegmentedControl
          options={['albums', 'photos', 'videos']}
          value={activeTab}
          onChange={setActiveTab}
          labels={tabLabels}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'albums' ? (
            <AlbumGrid
              albums={albums}
              width={width}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : activeTab === 'photos' ? (
            <PhotoGrid
              photos={photos}
              onPress={setLightboxIndex}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : (
            <VideoList
              videos={videos}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}
        </View>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          entityType="timeless_moment"
        />
      )}

    </View>
  )
}
