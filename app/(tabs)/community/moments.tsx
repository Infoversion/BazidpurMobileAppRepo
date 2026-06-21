import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, useWindowDimensions, RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { WebView } from 'react-native-webview'
import { supabase } from '@/lib/supabase'
import PhotoLightbox from '@/components/gallery/PhotoLightbox'
import { LikesComments } from '@/components/LikesComments'
import { PurpleHeader } from '@/components/PurpleHeader'
import { CuratedNotice } from '@/components/CuratedNotice'
import type { Photo } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TmAlbum {
  id: string
  title: string
  description: string | null
  cover_photo_url: string | null
  album_type: 'photos' | 'videos'
}

interface TMPhoto {
  id: string
  title: string
  description?: string
  r2_url: string
  thumbnail_url: string
  album_id: string | null
}

interface TMVideo {
  id: string
  title: string
  description?: string
  youtube_id: string
  youtube_url: string
  album_id: string | null
}

// ─── Album rail ───────────────────────────────────────────────────────────────

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
          {covers[i] && (
            <Image source={{ uri: covers[i] }} style={{ width: half, height: '100%' }} contentFit="cover" />
          )}
        </View>
      ))}
    </View>
  )
}

function AlbumRail({
  albums, selectedId, rootCount, rootLabel, rootCovers, onSelect, countForAlbum, coversForAlbum, mediaType,
}: {
  albums: TmAlbum[]
  selectedId: string | null
  rootCount: number
  rootLabel: string
  rootCovers: string[]
  onSelect: (id: string | null) => void
  countForAlbum: (id: string) => number
  coversForAlbum: (id: string) => string[]
  mediaType: 'photos' | 'videos'
}) {
  if (rootCount === 0 && albums.length === 0) return null
  const { width } = useWindowDimensions()
  const CARD_W = Math.floor((width - 44) / 3)   // same width as photo tiles
  const IMG_H = CARD_W                            // square
  const itemWord = mediaType === 'photos' ? 'photo' : 'video'

  const nameOverlay = (label: string) => (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.52)' }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' }}>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 5 }}>
          <Text
            style={{ fontSize: 11, fontWeight: '800', color: '#fff', lineHeight: 15, textAlign: 'left', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
            numberOfLines={2}
          >{label}</Text>
        </View>
      </View>
    </>
  )

  return (
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea', paddingTop: 10, paddingBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#8e8e93', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' }}>
        Albums
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>

        {rootCount > 0 && (
          <TouchableOpacity
            onPress={() => onSelect(null)}
            activeOpacity={0.75}
            style={{ width: CARD_W, borderRadius: 10, borderWidth: 2, borderColor: selectedId === null ? '#2d1b69' : '#e5e5ea', overflow: 'hidden', backgroundColor: '#f9f9f9' }}
          >
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
            <TouchableOpacity
              key={album.id}
              onPress={() => onSelect(album.id)}
              activeOpacity={0.75}
              style={{ width: CARD_W, borderRadius: 10, borderWidth: 2, borderColor: active ? '#2d1b69' : '#e5e5ea', overflow: 'hidden', backgroundColor: '#f9f9f9' }}
            >
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

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({ item, cardWidth, thumbHeight }: { item: TMVideo; cardWidth: number; thumbHeight: number }) {
  const [playing, setPlaying] = useState(false)
  const thumb = `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}>
      {playing ? (
        <View style={{ width: cardWidth, height: thumbHeight, backgroundColor: '#000' }}>
          <WebView
            source={{ uri: `https://www.bazidpur.com/api/yt-embed/${item.youtube_id}` }}
            style={{ height: thumbHeight, width: cardWidth, backgroundColor: '#000' }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      ) : (
        <TouchableOpacity onPress={() => setPlaying(true)} activeOpacity={0.85}>
          <Image source={{ uri: thumb }} style={{ width: cardWidth, height: thumbHeight }} contentFit="cover" />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 22, marginLeft: 4 }}>▶</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1c1e', marginBottom: 4, lineHeight: 20 }} numberOfLines={2}>{item.title}</Text>
            {item.description ? <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 18 }} numberOfLines={2}>{item.description}</Text> : null}
          </View>
        </View>
        <LikesComments entityType="timeless_moment_video" entityId={item.id} />
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TimelessMomentsScreen() {
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos')
  const [albums, setAlbums] = useState<TmAlbum[]>([])
  const [photos, setPhotos] = useState<TMPhoto[]>([])
  const [videos, setVideos] = useState<TMVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPhotoAlbumId, setSelectedPhotoAlbumId] = useState<string | null>(null)
  const [selectedVideoAlbumId, setSelectedVideoAlbumId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const { width } = useWindowDimensions()
  const tileSize = (width - 44) / 3
  const cardWidth = width - 32
  const thumbHeight = (cardWidth * 9) / 16

  async function fetchData() {
    const [{ data: albs }, { data: p }, { data: v }] = await Promise.all([
      supabase.from('tm_albums').select('id, title, description, cover_photo_url, album_type').eq('is_hidden', false).order('display_order'),
      supabase.from('timeless_moments').select('id, title, description, r2_url, thumbnail_url, album_id').or('is_active.is.null,is_active.eq.true').order('display_order'),
      supabase.from('timeless_moment_videos').select('id, title, description, youtube_id, youtube_url, album_id').eq('is_active', true).order('display_order'),
    ])

    const newAlbums = (albs ?? []) as TmAlbum[]
    const newPhotos = (p ?? []) as TMPhoto[]
    const newVideos = (v ?? []) as TMVideo[]

    setAlbums(newAlbums)
    setPhotos(newPhotos)
    setVideos(newVideos)

    // Default photo album: root if it has content, else first non-empty album
    const photoAlbs = newAlbums.filter(a => a.album_type === 'photos')
    if (newPhotos.filter(ph => !ph.album_id).length === 0 && photoAlbs.length > 0) {
      const first = photoAlbs.find(a => newPhotos.some(ph => ph.album_id === a.id))
      setSelectedPhotoAlbumId(first?.id ?? null)
    }

    // Default video album: root if it has content, else first non-empty album
    const videoAlbs = newAlbums.filter(a => a.album_type === 'videos')
    if (newVideos.filter(vi => !vi.album_id).length === 0 && videoAlbs.length > 0) {
      const first = videoAlbs.find(a => newVideos.some(vi => vi.album_id === a.id))
      setSelectedVideoAlbumId(first?.id ?? null)
    }
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────────────────────

  const photoAlbums = albums.filter(a => a.album_type === 'photos')
  const videoAlbums = albums.filter(a => a.album_type === 'videos')

  const rootPhotos = photos.filter(p => !p.album_id)
  const rootVideos = videos.filter(v => !v.album_id)

  const visiblePhotoAlbums = photoAlbums.filter(a => photos.some(p => p.album_id === a.id))
  const visibleVideoAlbums = videoAlbums.filter(a => videos.some(v => v.album_id === a.id))

  const albumPhotos = selectedPhotoAlbumId === null
    ? rootPhotos
    : photos.filter(p => p.album_id === selectedPhotoAlbumId)

  const albumVideos = selectedVideoAlbumId === null
    ? rootVideos
    : videos.filter(v => v.album_id === selectedVideoAlbumId)

  // Map to Photo[] for lightbox
  const lightboxPhotos: Photo[] = albumPhotos.map(p => ({
    id: p.id,
    title: p.title || '',
    description: p.description,
    r2_url: p.r2_url,
    thumbnail_url: p.thumbnail_url || p.r2_url,
    display_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }))

  // ── Tab bar ───────────────────────────────────────────────────────────────────

  const tabLabels: Record<'photos' | 'videos', string> = {
    photos: `✨  Photos${photos.length > 0 ? ` (${photos.length})` : ''}`,
    videos: `🎬  Videos${videos.length > 0 ? ` (${videos.length})` : ''}`,
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      <PurpleHeader title="Timeless Moments" showBack />
      <CuratedNotice message="A curated collection of moments selected by the Bazidpur admin team." />

      {/* Tab switcher */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 9, padding: 2 }}>
          {(['photos', 'videos'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center', backgroundColor: activeTab === tab ? '#fff' : 'transparent' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab ? '#1c1c1e' : '#8e8e93' }}>
                {tabLabels[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>

      ) : activeTab === 'photos' ? (
        <View style={{ flex: 1 }}>
          <AlbumRail
            albums={visiblePhotoAlbums}
            selectedId={selectedPhotoAlbumId}
            rootCount={rootPhotos.length}
            rootLabel="All Photos"
            rootCovers={rootPhotos.slice(0, 4).map(p => p.thumbnail_url || p.r2_url)}
            onSelect={id => { setSelectedPhotoAlbumId(id) }}
            countForAlbum={id => photos.filter(p => p.album_id === id).length}
            coversForAlbum={id => photos.filter(p => p.album_id === id).slice(0, 4).map(p => p.thumbnail_url || p.r2_url)}
            mediaType="photos"
          />
          {(visiblePhotoAlbums.length > 0 || rootPhotos.length > 0) && (
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e' }}>
                {selectedPhotoAlbumId === null ? 'All Photos' : (photoAlbums.find(a => a.id === selectedPhotoAlbumId)?.title ?? '')}
              </Text>
            </View>
          )}
          {albumPhotos.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>✨</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No photos yet</Text>
              <Text style={{ fontSize: 13, color: '#8e8e93' }}>Check back soon.</Text>
            </View>
          ) : (
            <FlatList
              key="photos"
              data={albumPhotos}
              keyExtractor={p => p.id}
              numColumns={3}
              columnWrapperStyle={{ gap: 6 }}
              contentContainerStyle={{ padding: 16, gap: 6, paddingBottom: 90 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={{ width: tileSize, borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
                  onPress={() => setLightboxIndex(index)}
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
          )}
        </View>

      ) : (
        <View style={{ flex: 1 }}>
          <AlbumRail
            albums={visibleVideoAlbums}
            selectedId={selectedVideoAlbumId}
            rootCount={rootVideos.length}
            rootLabel="All Videos"
            rootCovers={rootVideos.slice(0, 4).map(v => `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`)}
            onSelect={id => { setSelectedVideoAlbumId(id) }}
            countForAlbum={id => videos.filter(v => v.album_id === id).length}
            coversForAlbum={id => videos.filter(v => v.album_id === id).slice(0, 4).map(v => `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`)}
            mediaType="videos"
          />
          {(visibleVideoAlbums.length > 0 || rootVideos.length > 0) && (
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e' }}>
                {selectedVideoAlbumId === null ? 'All Videos' : (videoAlbums.find(a => a.id === selectedVideoAlbumId)?.title ?? '')}
              </Text>
            </View>
          )}
          {albumVideos.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🎬</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No videos yet</Text>
              <Text style={{ fontSize: 13, color: '#8e8e93' }}>Check back soon.</Text>
            </View>
          ) : (
            <FlatList
              key="videos"
              data={albumVideos}
              keyExtractor={v => v.id}
              contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 90 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
              renderItem={({ item }) => (
                <VideoCard item={item} cardWidth={cardWidth} thumbHeight={thumbHeight} />
              )}
            />
          )}
        </View>
      )}

      {lightboxIndex !== null && activeTab === 'photos' && (
        <PhotoLightbox
          photos={lightboxPhotos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          entityType="timeless_moment"
        />
      )}

    </View>
  )
}
