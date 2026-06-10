import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { supabase } from '@/lib/supabase'
import PhotoLightbox from '@/components/gallery/PhotoLightbox'
import VideoPlayer from '@/components/gallery/VideoPlayer'
import type { Photo, Video } from '@/lib/types'

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
  const tileSize = (width - 52) / 2

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
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 90 }}
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

function VideoList({
  videos, onPress, refreshing, onRefresh,
}: {
  videos: Video[]
  onPress: (video: Video) => void
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
      renderItem={({ item }) => {
        const thumb = item.thumbnail_url
          || `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`
        return (
          <TouchableOpacity
            style={{
              borderRadius: 16, overflow: 'hidden', backgroundColor: '#ffffff',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
            }}
            onPress={() => onPress(item)}
            activeOpacity={0.85}
          >
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
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1c1e', marginBottom: 4, lineHeight: 20 }} numberOfLines={2}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 18 }} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )
      }}
    />
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TimelessMomentsScreen() {
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)

  async function fetchData() {
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase
        .from('timeless_moments')
        .select('id, title, description, r2_url, thumbnail_url')
        .order('display_order')
        .limit(PAGE_SIZE),
      supabase
        .from('timeless_moment_videos')
        .select('id, title, description, youtube_id, youtube_url, thumbnail_url')
        .eq('is_active', true)
        .order('display_order')
        .limit(PAGE_SIZE),
    ])
    setPhotos((p ?? []) as Photo[])
    setVideos((v ?? []) as Video[])
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [])

  const tabLabels: Record<'photos' | 'videos', string> = {
    photos: `✨  Photos${photos.length ? ` (${photos.length})` : ''}`,
    videos: `🎬  Videos${videos.length ? ` (${videos.length})` : ''}`,
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      {/* Segmented control sub-bar */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
        <SegmentedControl
          options={['photos', 'videos']}
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
          {activeTab === 'photos' ? (
            <PhotoGrid
              photos={photos}
              onPress={setLightboxIndex}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : (
            <VideoList
              videos={videos}
              onPress={setActiveVideo}
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
        />
      )}

      {activeVideo && (
        <VideoPlayer
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </View>
  )
}
