import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, RefreshControl,
  Modal, TextInput, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PurpleHeader } from '@/components/PurpleHeader'
import { ReportButton } from '@/components/ReportButton'
import { useBlockedUsers, confirmBlockUser } from '@/components/BlockUserButton'
import type { Album } from '@/lib/types'

interface VideoAlbum {
  id: string
  user_id: string
  title: string
  description?: string | null
  is_hidden: boolean
  display_order: number
  created_at: string
  user?: { first_name: string; last_name: string }
}
interface VideoAlbumWithThumbs extends VideoAlbum { _youtubeIds: string[] }

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

  if (cover) {
    return <Image source={{ uri: cover }} style={{ width: size, height: size }} contentFit="cover" />
  }

  const half = size / 2
  const slots = [thumbUrls[0], thumbUrls[1], thumbUrls[2], thumbUrls[3]]

  if (slots.filter(Boolean).length === 0) {
    return (
      <View style={{ width: size, height: size, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 34 }}>📷</Text>
      </View>
    )
  }

  if (slots.filter(Boolean).length === 1) {
    const uri = imgUri(slots[0])
    return uri
      ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      : <View style={{ width: size, height: size, backgroundColor: '#e5e5ea' }} />
  }

  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
      {[0, 1, 2, 3].map(i => {
        const uri = imgUri(slots[i])
        return (
          <View key={i} style={{ width: half, height: half, padding: 0.5 }}>
            {uri
              ? <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" />
              : <View style={{ flex: 1, backgroundColor: '#d1d1d6' }} />
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

function CreateAlbumModal({ onClose, onCreated }: { onClose: () => void; onCreated: (album: Album) => void }) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { Alert.alert('Error', 'Not signed in.'); return }

      // Check admin status — admins bypass the per-member limit
      const { data: profile } = await supabase
        .from('users').select('role').eq('id', session.user.id).single()
      const isAdmin = ['admin', 'superadmin'].includes(profile?.role || '')

      // Read max photo albums from site config
      let maxPhotoAlbums = 3
      const { data: cfg } = await supabase
        .from('site_content').select('content').eq('section', 'media_albums_config').single()
      if (cfg?.content) {
        try { maxPhotoAlbums = Math.max(1, Number(JSON.parse(cfg.content).maxPhotoAlbums) || 3) } catch { /* default */ }
      }

      const { count: existingCount } = await supabase
        .from('photo_albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      if (!isAdmin && (existingCount ?? 0) >= maxPhotoAlbums) {
        Alert.alert('Limit reached', `You can create up to ${maxPhotoAlbums} photo album${maxPhotoAlbums === 1 ? '' : 's'}.`)
        return
      }

      const { data, error } = await supabase
        .from('photo_albums')
        .insert({
          user_id: session.user.id,
          title: title.trim(),
          description: desc.trim() || null,
          display_order: existingCount ?? 0,
        })
        .select()
        .single()

      if (error) { Alert.alert('Error', error.message); return }
      onCreated(data as Album)
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not create album. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 20,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 15, color: '#6b7280' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>New Album</Text>
          <TouchableOpacity onPress={save} disabled={saving || !title.trim()}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !title.trim() ? '#9ca3af' : '#2d1b69' }}>
              {saving ? 'Creating…' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title *</Text>
            <TextInput
              autoFocus
              value={title}
              onChangeText={setTitle}
              placeholder="Album title…"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 16, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}
              maxLength={200}
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Optional…"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 15, color: '#374151', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top' }}
              multiline
              maxLength={1000}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Segmented control (Photos / Videos) ─────────────────────────────────────

function SegmentedControl({ value, onChange, labels }: {
  value: 'photos' | 'videos'
  onChange: (v: 'photos' | 'videos') => void
  labels: Record<'photos' | 'videos', string>
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 10, padding: 3, gap: 3 }}>
      {(['photos', 'videos'] as const).map(opt => (
        <TouchableOpacity
          key={opt}
          style={{
            flex: 1, paddingVertical: 9, borderRadius: 7, alignItems: 'center',
            backgroundColor: value === opt ? '#2d1b69' : '#ffffff',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: value === opt ? 0.18 : 0.06, shadowRadius: 2,
            elevation: value === opt ? 2 : 1,
          }}
          onPress={() => onChange(opt)}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: value === opt ? '#ffffff' : '#374151' }}>
            {labels[opt]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Video album cover (1, 2, 3, or 4 YouTube thumbs) ────────────────────────

function VideoAlbumCover({ youtubeIds, size }: { youtubeIds: string[]; size: number }) {
  const thumb = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`
  const ids = youtubeIds.slice(0, 4)

  if (ids.length === 0) {
    return (
      <View style={{ width: size, height: size, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 34 }}>🎬</Text>
      </View>
    )
  }

  if (ids.length === 1) {
    return <Image source={{ uri: thumb(ids[0]) }} style={{ width: size, height: size }} contentFit="cover" />
  }

  const half = size / 2

  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
      {[0, 1, 2, 3].map(i => {
        const id = ids[i]
        return (
          <View key={i} style={{ width: half, height: half, padding: 0.5 }}>
            {id
              ? <Image source={{ uri: thumb(id) }} style={{ flex: 1 }} contentFit="cover" />
              : <View style={{ flex: 1, backgroundColor: '#d1d1d6' }} />}
          </View>
        )
      })}
    </View>
  )
}

// ─── Create video album modal ────────────────────────────────────────────────

function CreateVideoAlbumModal({ onClose, onCreated }: { onClose: () => void; onCreated: (album: VideoAlbum) => void }) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { Alert.alert('Error', 'Not signed in.'); return }

      const { data: profile } = await supabase
        .from('users').select('role').eq('id', session.user.id).single()
      const isAdmin = ['admin', 'superadmin'].includes(profile?.role || '')

      let maxVideoAlbums = 3
      const { data: cfg } = await supabase
        .from('site_content').select('content').eq('section', 'media_albums_config').single()
      if (cfg?.content) {
        try { maxVideoAlbums = Math.max(1, Number(JSON.parse(cfg.content).maxVideoAlbums) || 3) } catch { /* default */ }
      }

      const { count: existingCount } = await supabase
        .from('video_albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      if (!isAdmin && (existingCount ?? 0) >= maxVideoAlbums) {
        Alert.alert('Limit reached', `You can create up to ${maxVideoAlbums} video album${maxVideoAlbums === 1 ? '' : 's'}.`)
        return
      }

      const { data, error } = await supabase
        .from('video_albums')
        .insert({
          user_id: session.user.id,
          title: title.trim(),
          description: desc.trim() || null,
          display_order: existingCount ?? 0,
        })
        .select()
        .single()

      if (error) { Alert.alert('Error', error.message); return }
      onCreated(data as VideoAlbum)
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not create album. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 20,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 15, color: '#6b7280' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>New Video Album</Text>
          <TouchableOpacity onPress={save} disabled={saving || !title.trim()}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !title.trim() ? '#9ca3af' : '#2d1b69' }}>
              {saving ? 'Creating…' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title *</Text>
            <TextInput
              autoFocus
              value={title}
              onChangeText={setTitle}
              placeholder="Album title…"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 16, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}
              maxLength={200}
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Optional…"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 15, color: '#374151', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top' }}
              multiline
              maxLength={1000}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function GalleryScreen() {
  const { width } = useWindowDimensions()
  const colW = (width - 44) / 2
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos')
  const [albums, setAlbums] = useState<AlbumWithThumbs[]>([])
  const [videoAlbums, setVideoAlbums] = useState<VideoAlbumWithThumbs[]>([])
  const { isBlocked, refresh: refreshBlocks } = useBlockedUsers()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createVideoOpen, setCreateVideoOpen] = useState(false)

  async function loadPhotoAlbums() {
    const { data: albumData } = await supabase
      .from('photo_albums')
      .select('id, title, description, cover_photo_url, is_hidden, display_order, created_at, user_id, user:user_id(first_name, last_name)')
      .eq('is_active', true)
      .or(user ? `is_hidden.eq.false,user_id.eq.${user.id}` : 'is_hidden.eq.false')
      .order('display_order')

    const raw = (albumData ?? []) as unknown as Album[]

    if (raw.length === 0) { setAlbums([]); return }

    const albumIds = raw.map(a => a.id)
    const { data: photoData } = await supabase
      .from('album_photos')
      .select('id, album_id, thumbnail_url, r2_url, display_order')
      .in('album_id', albumIds)
      .not('is_hidden', 'is', true)
      .order('display_order')

    const photosByAlbum: Record<string, string[]> = {}
    for (const p of (photoData ?? []) as { album_id: string; thumbnail_url?: string; r2_url: string }[]) {
      if (!photosByAlbum[p.album_id]) photosByAlbum[p.album_id] = []
      if (photosByAlbum[p.album_id].length < 4) {
        photosByAlbum[p.album_id].push(p.thumbnail_url || p.r2_url)
      }
    }

    const withThumbs = raw
      .map(a => ({ ...a, _thumbUrls: photosByAlbum[a.id] ?? [] }))
      .filter(a => a._thumbUrls.length > 0 || a.cover_photo_url || a.user_id === user?.id)
    setAlbums([
      ...withThumbs.filter(a => a.user_id === user?.id),
      ...withThumbs.filter(a => a.user_id !== user?.id),
    ])
  }

  async function loadVideoAlbums() {
    // Resolve user id from current session — useAuth context may not be hydrated yet on first focus.
    const { data: { session } } = await supabase.auth.getSession()
    const myId = session?.user?.id ?? user?.id

    const { data: albumData, error } = await supabase
      .from('video_albums')
      .select('id, title, description, is_hidden, display_order, created_at, user_id, user:user_id(first_name, last_name)')
      .or(myId ? `is_hidden.eq.false,user_id.eq.${myId}` : 'is_hidden.eq.false')
      .order('display_order')

    if (error) {
      console.error('[gallery] video_albums query error', error.message)
      setVideoAlbums([])
      return
    }

    const raw = (albumData ?? []) as unknown as VideoAlbum[]

    if (raw.length === 0) { setVideoAlbums([]); return }

    const albumIds = raw.map(a => a.id)
    const { data: itemData } = await supabase
      .from('video_album_items')
      .select('album_id, youtube_id, display_order')
      .in('album_id', albumIds)
      .order('display_order')

    const idsByAlbum: Record<string, string[]> = {}
    for (const it of (itemData ?? []) as { album_id: string; youtube_id: string }[]) {
      if (!idsByAlbum[it.album_id]) idsByAlbum[it.album_id] = []
      if (idsByAlbum[it.album_id].length < 4) idsByAlbum[it.album_id].push(it.youtube_id)
    }

    const withThumbs = raw
      .map(a => ({ ...a, _youtubeIds: idsByAlbum[a.id] ?? [] }))
      // Keep all of the current user's own albums (even empty);
      // hide other users' empty albums.
      .filter(a => a._youtubeIds.length > 0 || a.user_id === myId)

    setVideoAlbums([
      ...withThumbs.filter(a => a.user_id === myId),
      ...withThumbs.filter(a => a.user_id !== myId),
    ])
  }

  async function load() {
    await Promise.all([loadPhotoAlbums(), loadVideoAlbums()])
  }

  useFocusEffect(useCallback(() => { load().finally(() => setLoading(false)) }, []))

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="The Gallery" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  // Hide content from members the current user has blocked
  const visibleAlbums = albums.filter(a => !isBlocked(a.user_id))
  const visibleVideoAlbums = videoAlbums.filter(a => !isBlocked(a.user_id))

  const tabLabels: Record<'photos' | 'videos', string> = {
    photos: `📷  Photo${visibleAlbums.length ? ` (${visibleAlbums.length})` : ''}`,
    videos: `🎬  Video${visibleVideoAlbums.length ? ` (${visibleVideoAlbums.length})` : ''}`,
  }

  const showingEmpty = activeTab === 'photos' ? !visibleAlbums.length : !visibleVideoAlbums.length

  function onLongPressAlbum(item: { user_id: string; user?: { first_name: string; last_name: string } }) {
    if (!user || item.user_id === user.id) return
    const name = item.user ? `${item.user.first_name} ${item.user.last_name}` : undefined
    confirmBlockUser({
      blockerId: user.id,
      userId: item.user_id,
      userName: name,
      onBlocked: refreshBlocks,
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="The Gallery" showBack />

      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
        <SegmentedControl value={activeTab} onChange={setActiveTab} labels={tabLabels} />
      </View>

      {showingEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>{activeTab === 'photos' ? '📸' : '🎬'}</Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>
            No {activeTab === 'photos' ? 'photo' : 'video'} albums yet
          </Text>
          <Text style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center' }}>
            Community {activeTab === 'photos' ? 'photo' : 'video'} albums will appear here.
          </Text>
          {user ? (
            <TouchableOpacity
              onPress={() => activeTab === 'photos' ? setCreateOpen(true) : setCreateVideoOpen(true)}
              style={{ marginTop: 24, backgroundColor: '#2d1b69', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Create First Album</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : activeTab === 'photos' ? (
        <FlatList
          data={visibleAlbums}
          keyExtractor={a => a.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100, backgroundColor: '#f2f2f7' }}
          style={{ backgroundColor: '#f2f2f7' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          renderItem={({ item }) => {
            const isOwn = item.user_id === user?.id
            const author = item.user ? `${item.user.first_name} ${item.user.last_name}` : ''
            return (
              <TouchableOpacity
                style={{
                  width: colW, borderRadius: 16, overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  borderWidth: isOwn ? 2 : 0,
                  borderColor: isOwn ? '#2d1b69' : 'transparent',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isOwn ? 0.14 : 0.08, shadowRadius: 10, elevation: isOwn ? 5 : 3,
                }}
                onPress={() => router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id: item.id } })}
                onLongPress={() => onLongPressAlbum(item)}
                activeOpacity={0.85}
              >
                <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#e5e5ea', overflow: 'hidden' }}>
                  <AlbumCover coverUrl={item.cover_photo_url} thumbUrls={item._thumbUrls} size={colW} />
                  {isOwn && (
                    <View style={{
                      position: 'absolute', top: 8, left: 8,
                      backgroundColor: '#2d1b69', borderRadius: 6,
                      paddingHorizontal: 7, paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Your Album</Text>
                    </View>
                  )}
                  {!isOwn && (
                    <View style={{
                      position: 'absolute', top: 6, right: 6,
                      backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14,
                      paddingHorizontal: 6, paddingVertical: 2,
                    }}>
                      <ReportButton contentType="photo_album" contentId={item.id} size="sm" />
                    </View>
                  )}
                </View>
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1c1e' }} numberOfLines={1}>{item.title}</Text>
                  {!isOwn && author ? <Text style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }} numberOfLines={1}>{author}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(item.created_at)}</Text>
                    {item._thumbUrls.length > 0 ? (
                      <Text style={{ fontSize: 11, color: '#aeaeb2' }}>{item._thumbUrls.length >= 4 ? '4+' : item._thumbUrls.length} photos</Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      ) : (
        <FlatList
          data={visibleVideoAlbums}
          keyExtractor={a => a.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100, backgroundColor: '#f2f2f7' }}
          style={{ backgroundColor: '#f2f2f7' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          renderItem={({ item }) => {
            const isOwn = item.user_id === user?.id
            const author = item.user ? `${item.user.first_name} ${item.user.last_name}` : ''
            return (
              <TouchableOpacity
                style={{
                  width: colW, borderRadius: 16, overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  borderWidth: isOwn ? 2 : 0,
                  borderColor: isOwn ? '#2d1b69' : 'transparent',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isOwn ? 0.14 : 0.08, shadowRadius: 10, elevation: isOwn ? 5 : 3,
                }}
                onPress={() => router.push({ pathname: '/(tabs)/community/video-album/[id]' as any, params: { id: item.id } })}
                onLongPress={() => onLongPressAlbum(item)}
                activeOpacity={0.85}
              >
                <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#e5e5ea', overflow: 'hidden' }}>
                  <VideoAlbumCover youtubeIds={item._youtubeIds} size={colW} />
                  {isOwn && (
                    <View style={{
                      position: 'absolute', top: 8, left: 8,
                      backgroundColor: '#2d1b69', borderRadius: 6,
                      paddingHorizontal: 7, paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Your Album</Text>
                    </View>
                  )}
                  {!isOwn && (
                    <View style={{
                      position: 'absolute', top: 6, right: 6,
                      backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14,
                      paddingHorizontal: 6, paddingVertical: 2,
                    }}>
                      <ReportButton contentType="video_album" contentId={item.id} size="sm" />
                    </View>
                  )}
                </View>
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1c1e' }} numberOfLines={1}>{item.title}</Text>
                  {!isOwn && author ? <Text style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }} numberOfLines={1}>{author}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(item.created_at)}</Text>
                    {item._youtubeIds.length > 0 ? (
                      <Text style={{ fontSize: 11, color: '#aeaeb2' }}>{item._youtubeIds.length >= 4 ? '4+' : item._youtubeIds.length} videos</Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}

      {/* Create FAB — logged-in users only; routes to the active tab's modal */}
      {user ? (
        <TouchableOpacity
          onPress={() => activeTab === 'photos' ? setCreateOpen(true) : setCreateVideoOpen(true)}
          style={{
            position: 'absolute', bottom: 120, right: 20,
            width: 50, height: 50, borderRadius: 25,
            backgroundColor: '#2d1b69',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
          }}
        >
          <Text style={{ fontSize: 26, color: '#fff', lineHeight: 30 }}>+</Text>
        </TouchableOpacity>
      ) : null}

      {createOpen && (
        <CreateAlbumModal
          onClose={() => setCreateOpen(false)}
          onCreated={album => {
            setAlbums(prev => prev.length ? [{ ...album, _thumbUrls: [] }, ...prev] : [{ ...album, _thumbUrls: [] }])
            setCreateOpen(false)
            router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id: album.id } })
          }}
        />
      )}

      {createVideoOpen && (
        <CreateVideoAlbumModal
          onClose={() => setCreateVideoOpen(false)}
          onCreated={album => {
            setVideoAlbums(prev => [{ ...album, _youtubeIds: [] }, ...prev])
            setCreateVideoOpen(false)
            router.push({ pathname: '/(tabs)/community/video-album/[id]' as any, params: { id: album.id } })
          }}
        />
      )}
    </View>
  )
}
