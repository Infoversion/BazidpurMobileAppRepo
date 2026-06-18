import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, RefreshControl,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { WebView } from 'react-native-webview'
import { supabase } from '@/lib/supabase'
import PhotoLightbox from '@/components/gallery/PhotoLightbox'
import { LikesComments } from '@/components/LikesComments'
import { PurpleHeader } from '@/components/PurpleHeader'
import type { Photo, Video } from '@/lib/types'

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

function VideoCard({ item, cardWidth, thumbHeight }: { item: Video; cardWidth: number; thumbHeight: number }) {
  const [playing, setPlaying] = useState(false)
  const thumb = item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}>
      {playing ? (
        <View style={{ width: cardWidth, height: thumbHeight, backgroundColor: '#000' }}>
          <WebView
            source={{ uri: `https://www.youtube.com/embed/${item.youtube_id}?autoplay=1&playsinline=1&modestbranding=1&rel=0&origin=https://bazidpur.com` }}
            style={{ height: thumbHeight, width: cardWidth, backgroundColor: '#000' }}
            allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled domStorageEnabled
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          />
        </View>
      ) : (
        <TouchableOpacity onPress={() => setPlaying(true)} activeOpacity={0.85}>
          <Image source={{ uri: thumb }} style={{ width: cardWidth, height: thumbHeight }} contentFit="cover" />
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 22, marginLeft: 4 }}>▶</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 }} numberOfLines={2}>{item.title}</Text>
        {item.description ? <Text style={{ fontSize: 13, color: '#8e8e93' }} numberOfLines={2}>{item.description}</Text> : null}
        <LikesComments entityType="timeless_moment_video" entityId={item.id} />
      </View>
    </View>
  )
}

export default function MomentsAlbumScreen() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>()
  const [title, setTitle] = useState('')
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { width } = useWindowDimensions()
  const tileSize = (width - 52) / 2
  const cardWidth = width - 32
  const thumbHeight = (cardWidth * 9) / 16

  async function fetchData() {
    const [{ data: album }, { data: p }, { data: v }] = await Promise.all([
      supabase.from('tm_albums').select('title').eq('id', albumId).single(),
      supabase.from('timeless_moments').select('id, title, description, r2_url, thumbnail_url').eq('album_id', albumId).order('display_order'),
      supabase.from('timeless_moment_videos').select('*').eq('album_id', albumId).eq('is_active', true).order('display_order'),
    ])
    if (album) setTitle(album.title)
    setPhotos((p ?? []) as Photo[])
    setVideos((v ?? []) as Video[])
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)) }, [albumId])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [albumId])

  const tabLabels: Record<'photos' | 'videos', string> = {
    photos: `✨  Photos${photos.length ? ` (${photos.length})` : ''}`,
    videos: `🎬  Videos${videos.length ? ` (${videos.length})` : ''}`,
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title={title || 'Album'} showBack />

      {videos.length > 0 && (
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
          <SegmentedControl options={['photos', 'videos']} value={activeTab} onChange={setActiveTab} labels={tabLabels} />
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      ) : activeTab === 'photos' ? (
        photos.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>✨</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e' }}>No photos in this album</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={p => p.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 90 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={{ width: tileSize, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}
                onPress={() => setLightboxIndex(index)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.thumbnail_url || item.r2_url }} style={{ width: tileSize, height: tileSize }} contentFit="cover" />
                {item.title ? (
                  <View style={{ padding: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#374151' }} numberOfLines={1}>{item.title}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )}
          />
        )
      ) : (
        <FlatList
          data={videos}
          keyExtractor={v => v.id}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          renderItem={({ item }) => <VideoCard item={item} cardWidth={cardWidth} thumbHeight={thumbHeight} />}
        />
      )}

      {lightboxIndex !== null && activeTab === 'photos' && (
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
