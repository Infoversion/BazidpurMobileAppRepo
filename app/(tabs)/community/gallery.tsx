import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, RefreshControl,
  Modal, TextInput, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PurpleHeader } from '@/components/PurpleHeader'
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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { Alert.alert('Error', 'Not signed in.'); setSaving(false); return }

    const res = await fetch(
      `https://bazidpur.com/api/albums?_t=${encodeURIComponent(session.access_token)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() || undefined }),
      }
    )
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { Alert.alert('Error', json.error ?? 'Failed to create album.'); return }
    onCreated(json.album as Album)
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

export default function GalleryScreen() {
  const { width } = useWindowDimensions()
  const colW = (width - 44) / 2
  const { user } = useAuth()
  const [albums, setAlbums] = useState<AlbumWithThumbs[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  async function load() {
    const { data: albumData } = await supabase
      .from('photo_albums')
      .select('id, title, description, cover_photo_url, is_hidden, display_order, created_at, user_id, user:user_id(first_name, last_name)')
      .eq('is_hidden', false)
      .order('display_order')

    const raw = (albumData ?? []) as unknown as Album[]

    if (raw.length === 0) { setAlbums([]); return }

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
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="The Gallery" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="The Gallery" showBack />

      {!albums.length ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📸</Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No albums yet</Text>
          <Text style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center' }}>Community photo albums will appear here.</Text>
          {user ? (
            <TouchableOpacity
              onPress={() => setCreateOpen(true)}
              style={{ marginTop: 24, backgroundColor: '#2d1b69', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Create First Album</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={a => a.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100, backgroundColor: '#f2f2f7' }}
          style={{ backgroundColor: '#f2f2f7' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          renderItem={({ item }) => {
            const author = item.user ? `${item.user.first_name} ${item.user.last_name}` : ''
            return (
              <TouchableOpacity
                style={{
                  width: colW, borderRadius: 16, overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
                }}
                onPress={() => router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id: item.id } })}
                activeOpacity={0.85}
              >
                <View style={{ width: colW, height: colW, backgroundColor: '#e5e5ea', overflow: 'hidden' }}>
                  <AlbumCover coverUrl={item.cover_photo_url} thumbUrls={item._thumbUrls} size={colW} />
                </View>
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1c1e' }} numberOfLines={1}>{item.title}</Text>
                  {author ? <Text style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }} numberOfLines={1}>{author}</Text> : null}
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
      )}

      {/* Create album FAB — logged-in users only */}
      {user ? (
        <TouchableOpacity
          onPress={() => setCreateOpen(true)}
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
    </View>
  )
}
