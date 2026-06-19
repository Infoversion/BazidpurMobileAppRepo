import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, useWindowDimensions, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { WebView } from 'react-native-webview'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Photo, Video } from '@/lib/types'
import PhotoLightbox from '@/components/gallery/PhotoLightbox'
import { LikesComments } from '@/components/LikesComments'
import { PurpleHeader } from '@/components/PurpleHeader'
import { CuratedNotice } from '@/components/CuratedNotice'

const PAGE_SIZE = 20

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaAlbum {
  id: string
  title: string
  description: string | null
  cover_photo_url: string | null
  album_type: 'photos' | 'videos'
}

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

// ─── Cover grid ───────────────────────────────────────────────────────────────

function CoverGrid({ covers, placeholder, size }: { covers: string[]; placeholder?: 'photo' | 'video'; size: number }) {
  if (covers.length === 0) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22 }}>{placeholder === 'video' ? '🎬' : '📷'}</Text>
    </View>
  )
  if (covers.length === 1) return (
    <Image source={{ uri: covers[0] }} style={{ width: size, height: '100%' }} contentFit="cover" />
  )
  const half = size / 2
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: size, height: '100%' }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: half, height: '50%', backgroundColor: '#d1d1d6' }}>
          {covers[i] && <Image source={{ uri: covers[i] }} style={{ width: half, height: '100%' }} contentFit="cover" />}
        </View>
      ))}
    </View>
  )
}

// ─── Album rail ───────────────────────────────────────────────────────────────

function AlbumRail({
  albums, selectedId, rootCount, rootLabel, rootCovers, onSelect, countForAlbum, coversForAlbum, mediaType,
}: {
  albums: MediaAlbum[]
  selectedId: string | null
  rootCount: number
  rootLabel: string
  rootCovers: string[]
  onSelect: (id: string | null) => void
  countForAlbum: (id: string) => number
  coversForAlbum: (id: string) => string[]
  mediaType: 'photos' | 'videos'
}) {
  const { width } = useWindowDimensions()
  if (rootCount === 0 && albums.length === 0) return null
  const CARD_W = Math.floor((width - 44) / 3)
  const IMG_H = CARD_W
  const itemWord = mediaType === 'photos' ? 'photo' : 'video'

  const nameOverlay = (label: string) => (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.52)' }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' }}>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 5 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', lineHeight: 15, textAlign: 'left', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} numberOfLines={2}>{label}</Text>
        </View>
      </View>
    </>
  )

  return (
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea', paddingTop: 10, paddingBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#8e8e93', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' }}>Albums</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        {rootCount > 0 && (
          <TouchableOpacity onPress={() => onSelect(null)} activeOpacity={0.75}
            style={{ width: CARD_W, borderRadius: 10, borderWidth: 2, borderColor: selectedId === null ? '#2d1b69' : '#e5e5ea', overflow: 'hidden', backgroundColor: '#f9f9f9' }}>
            <View style={{ width: CARD_W, height: IMG_H, backgroundColor: '#f2f2f7', overflow: 'hidden' }}>
              <CoverGrid covers={rootCovers} placeholder={mediaType === 'videos' ? 'video' : 'photo'} size={CARD_W} />
              {nameOverlay(rootLabel)}
            </View>
            <View style={{ paddingHorizontal: 6, paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: '#e5e5ea' }}>
              <Text style={{ fontSize: 11, color: '#8e8e93' }}>{rootCount} {itemWord}{rootCount !== 1 ? 's' : ''}</Text>
            </View>
          </TouchableOpacity>
        )}
        {albums.map(album => {
          const count = countForAlbum(album.id)
          const covers = coversForAlbum(album.id)
          const active = selectedId === album.id
          return (
            <TouchableOpacity key={album.id} onPress={() => onSelect(album.id)} activeOpacity={0.75}
              style={{ width: CARD_W, borderRadius: 10, borderWidth: 2, borderColor: active ? '#2d1b69' : '#e5e5ea', overflow: 'hidden', backgroundColor: '#f9f9f9' }}>
              <View style={{ width: CARD_W, height: IMG_H, backgroundColor: '#f2f2f7', overflow: 'hidden' }}>
                <CoverGrid covers={covers} placeholder={mediaType === 'videos' ? 'video' : 'photo'} size={CARD_W} />
                {nameOverlay(album.title)}
              </View>
              <View style={{ paddingHorizontal: 6, paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: '#e5e5ea' }}>
                <Text style={{ fontSize: 11, color: '#8e8e93' }}>{count} {itemWord}{count !== 1 ? 's' : ''}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
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
  const tileSize = (width - 44) / 3

  if (photos.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>🖼️</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No photos yet</Text>
        <Text style={{ fontSize: 13, color: '#8e8e93' }}>Community photos will appear here.</Text>
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
            width: tileSize, borderRadius: 10, overflow: 'hidden',
            backgroundColor: '#ffffff',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
          }}
          onPress={() => onPress(index)}
          activeOpacity={0.85}
        >
          <Image
            source={{ uri: item.thumbnail_url || item.r2_url }}
            style={{ width: tileSize, height: tileSize }}
            contentFit="cover"
          />
        </TouchableOpacity>
      )}
    />
  )
}

// ─── Video card (inline player) ────────────────────────────────────────────────

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
        <LikesComments entityType="video" entityId={item.id} />
      </View>
    </View>
  )
}

// ─── Video list ───────────────────────────────────────────────────────────────

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
        <Text style={{ fontSize: 13, color: '#8e8e93' }}>Community videos will appear here.</Text>
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
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const [photoAlbums, setPhotoAlbums] = useState<MediaAlbum[]>([])
  const [videoAlbums, setVideoAlbums] = useState<MediaAlbum[]>([])
  const [selectedPhotoAlbumId, setSelectedPhotoAlbumId] = useState<string | null>(null)
  const [selectedVideoAlbumId, setSelectedVideoAlbumId] = useState<string | null>(null)

  async function fetchData() {
    const [{ data: p }, { data: v }, { data: albs }] = await Promise.all([
      supabase.from('photos').select('*').eq('is_active', true).order('display_order').limit(PAGE_SIZE),
      supabase.from('videos').select('*').eq('is_active', true).order('display_order').limit(PAGE_SIZE),
      supabase.from('media_albums').select('id, title, description, cover_photo_url, album_type').eq('is_hidden', false).order('display_order'),
    ])
    const newPhotos = (p ?? []) as Photo[]
    const newVideos = (v ?? []) as Video[]
    const newAlbums = (albs ?? []) as MediaAlbum[]

    setPhotos(newPhotos)
    setVideos(newVideos)

    const pAlbs = newAlbums.filter(a => a.album_type === 'photos')
    const vAlbs = newAlbums.filter(a => a.album_type === 'videos')
    setPhotoAlbums(pAlbs)
    setVideoAlbums(vAlbs)

    // Auto-select first non-empty photo album if root is empty
    if ((newPhotos as any[]).filter(ph => !ph.album_id).length === 0 && pAlbs.length > 0) {
      const first = pAlbs.find(a => (newPhotos as any[]).some(ph => ph.album_id === a.id))
      setSelectedPhotoAlbumId(first?.id ?? null)
    }

    // Auto-select first non-empty video album if root is empty
    if ((newVideos as any[]).filter(vi => !vi.album_id).length === 0 && vAlbs.length > 0) {
      const first = vAlbs.find(a => (newVideos as any[]).some(vi => vi.album_id === a.id))
      setSelectedVideoAlbumId(first?.id ?? null)
    }
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const rootPhotos = (photos as any[]).filter(p => !p.album_id)
  const rootVideos = (videos as any[]).filter(v => !v.album_id)

  const albumPhotos = selectedPhotoAlbumId === null
    ? rootPhotos
    : (photos as any[]).filter(p => p.album_id === selectedPhotoAlbumId)

  const albumVideos = selectedVideoAlbumId === null
    ? rootVideos
    : (videos as any[]).filter(v => v.album_id === selectedVideoAlbumId)

  const visiblePhotoAlbums = photoAlbums.filter(a => (photos as any[]).some(p => p.album_id === a.id))
  const visibleVideoAlbums = videoAlbums.filter(a => (videos as any[]).some(v => v.album_id === a.id))

  const tabLabels: Record<'photos' | 'videos', string> = {
    photos: `📷  Photos${photos.length ? ` (${photos.length})` : ''}`,
    videos: `🎬  Videos${videos.length ? ` (${videos.length})` : ''}`,
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Media" />

      <CuratedNotice message="A curated selection of photos and videos from the Bazidpur admin team." />

      {/* Segmented control sub-bar */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10 }}>
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
            <View style={{ flex: 1 }}>
              <AlbumRail
                albums={visiblePhotoAlbums}
                selectedId={selectedPhotoAlbumId}
                rootCount={rootPhotos.length}
                rootLabel="All Photos"
                rootCovers={rootPhotos.slice(0, 4).map((p: any) => p.thumbnail_url || p.r2_url)}
                onSelect={id => setSelectedPhotoAlbumId(id)}
                countForAlbum={id => (photos as any[]).filter(p => p.album_id === id).length}
                coversForAlbum={id => (photos as any[]).filter(p => p.album_id === id).slice(0, 4).map((p: any) => p.thumbnail_url || p.r2_url)}
                mediaType="photos"
              />
              {(visiblePhotoAlbums.length > 0 || rootPhotos.length > 0) && (
                <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e' }}>
                    {selectedPhotoAlbumId === null ? 'All Photos' : (photoAlbums.find(a => a.id === selectedPhotoAlbumId)?.title ?? '')}
                  </Text>
                </View>
              )}
              <PhotoGrid
                photos={albumPhotos as Photo[]}
                onPress={setLightboxIndex}
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <AlbumRail
                albums={visibleVideoAlbums}
                selectedId={selectedVideoAlbumId}
                rootCount={rootVideos.length}
                rootLabel="All Videos"
                rootCovers={rootVideos.slice(0, 4).map((v: any) => v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`)}
                onSelect={id => setSelectedVideoAlbumId(id)}
                countForAlbum={id => (videos as any[]).filter(v => v.album_id === id).length}
                coversForAlbum={id => (videos as any[]).filter(v => v.album_id === id).slice(0, 4).map((v: any) => v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`)}
                mediaType="videos"
              />
              {(visibleVideoAlbums.length > 0 || rootVideos.length > 0) && (
                <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e' }}>
                    {selectedVideoAlbumId === null ? 'All Videos' : (videoAlbums.find(a => a.id === selectedVideoAlbumId)?.title ?? '')}
                  </Text>
                </View>
              )}
              <VideoList
                videos={albumVideos as Video[]}
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            </View>
          )}
        </View>
      )}

      {lightboxIndex !== null && activeTab === 'photos' && (
        <PhotoLightbox
          photos={albumPhotos as Photo[]}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

    </View>
  )
}
