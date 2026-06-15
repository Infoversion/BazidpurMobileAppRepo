import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { supabase } from '@/lib/supabase'
import type { Photo, Video } from '@/lib/types'
import PhotoLightbox from '@/components/gallery/PhotoLightbox'
import VideoPlayer from '@/components/gallery/VideoPlayer'
import { CuratedNotice } from '@/components/CuratedNotice'

const PAGE_SIZE = 40

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
  const tileSize = (width - 48) / 2

  if (photos.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🖼️</Text>
        <Text style={{ fontSize: 14, color: '#9ca3af' }}>No photos yet</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={photos}
      keyExtractor={p => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={{ width: tileSize, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f3f4f6' }}
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
  const thumbHeight = ((width - 32) * 9) / 16

  if (videos.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🎬</Text>
        <Text style={{ fontSize: 14, color: '#9ca3af' }}>No videos yet</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={videos}
      keyExtractor={v => v.id}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
      renderItem={({ item }) => {
        const thumb = item.thumbnail_url
          || `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`
        return (
          <TouchableOpacity
            style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: '#f3f4f6' }}
            onPress={() => onPress(item)}
            activeOpacity={0.85}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: thumb }}
                style={{ width: width - 32, height: thumbHeight }}
                contentFit="cover"
              />
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.25)',
              }}>
                <View style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 22, marginLeft: 4 }}>▶</Text>
                </View>
              </View>
            </View>
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 }} numberOfLines={2}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18 }} numberOfLines={2}>
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

export default function PublicMediaScreen() {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)

  async function fetchData() {
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from('photos').select('*').eq('is_active', true).order('display_order').limit(PAGE_SIZE),
      supabase.from('videos').select('*').eq('is_active', true).order('display_order').limit(PAGE_SIZE),
    ])
    setPhotos(p ?? [])
    setVideos(v ?? [])
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [])

  const TABS: Array<{ key: 'photos' | 'videos'; label: string; emoji: string }> = [
    { key: 'photos', label: 'Photos', emoji: '📷' },
    { key: 'videos', label: 'Videos', emoji: '🎬' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f7' }}>

      <CuratedNotice message="A curated selection of photos and videos from the Bazidpur admin team." />

      {/* Tab switcher */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={{
                paddingHorizontal: 20, paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.key ? '#2d1b69' : 'transparent',
              }}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={{
                fontSize: 14, fontWeight: '500',
                color: activeTab === tab.key ? '#2d1b69' : '#9ca3af',
              }}>
                {tab.emoji}{'  '}{tab.label}
                {tab.key === 'photos' && photos.length > 0 ? ` (${photos.length})` : ''}
                {tab.key === 'videos' && videos.length > 0 ? ` (${videos.length})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
