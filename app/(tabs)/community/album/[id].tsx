import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, ActivityIndicator,
  useWindowDimensions, RefreshControl, TouchableOpacity,
  Alert, TextInput, Modal, ScrollView, Share, Switch,
} from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import PhotoLightbox from '@/components/gallery/PhotoLightbox'
import type { AlbumPhoto, Album, Photo } from '@/lib/types'

const R2    = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'
const WEB   = 'https://bazidpur.com'

function toPhoto(ap: AlbumPhoto): Photo {
  return {
    id: ap.id,
    title: ap.caption || '',
    r2_url: ap.r2_url.startsWith('http') ? ap.r2_url : `${R2}/${ap.r2_url}`,
    thumbnail_url: ap.thumbnail_url || ap.r2_url,
    display_order: ap.display_order,
    is_active: !(ap.is_hidden ?? false),
    created_at: ap.created_at,
    updated_at: ap.created_at,
  }
}

function imgUri(url: string) {
  return url.startsWith('http') ? url : `${R2}/${url}`
}

// ── Edit album modal ───────────────────────────────────────────────────────────
function EditAlbumModal({
  album, onClose, onSave,
}: { album: Album; onClose: () => void; onSave: (title: string, description: string) => void }) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState(album.title)
  const [desc,  setDesc]  = useState(album.description ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    await supabase.from('photo_albums').update({ title: title.trim(), description: desc.trim() || null }).eq('id', album.id)
    onSave(title.trim(), desc.trim())
    setSaving(false)
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
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Edit Album</Text>
          <TouchableOpacity onPress={save} disabled={saving || !title.trim()}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !title.trim() ? '#9ca3af' : '#2d1b69' }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title</Text>
            <TextInput
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
              placeholder="Optional description…"
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

// ── Caption modal ──────────────────────────────────────────────────────────────
function CaptionModal({
  photo, onClose, onSave,
}: { photo: AlbumPhoto; onClose: () => void; onSave: (caption: string) => void }) {
  const insets = useSafeAreaInsets()
  const [value, setValue] = useState(photo.caption ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('album_photos').update({ caption: value.trim() || null }).eq('id', photo.id)
    onSave(value.trim())
    setSaving(false)
  }

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 20,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 15, color: '#6b7280' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Caption</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: saving ? '#9ca3af' : '#2d1b69' }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 20 }}>
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder="Add a caption…"
            placeholderTextColor="#9ca3af"
            style={{ fontSize: 16, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, minHeight: 80, textAlignVertical: 'top' }}
            multiline
            maxLength={300}
          />
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'right' }}>{value.length}/300</Text>
        </View>
      </View>
    </Modal>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const tileSize = (width - 4) / 3

  const [album,         setAlbum]         = useState<Album | null>(null)
  const [photos,        setPhotos]         = useState<AlbumPhoto[]>([])
  const [loading,       setLoading]        = useState(true)
  const [refreshing,    setRefreshing]     = useState(false)
  const [lightboxIndex, setLightboxIndex]  = useState<number | null>(null)

  // Manage mode
  const [manageMode,    setManageMode]     = useState(false)
  const [editAlbumOpen, setEditAlbumOpen]  = useState(false)
  const [captionPhoto,  setCaptionPhoto]   = useState<AlbumPhoto | null>(null)
  const [saving,        setSaving]         = useState<string | null>(null)

  // Upload
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; pct: number } | null>(null)
  const uploadCancelRef = useRef<(() => void) | null>(null)

  async function load() {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('photo_albums').select('id, title, description, user_id, is_hidden, cover_photo_url, display_order, created_at, user:user_id(first_name, last_name)').eq('id', id).single(),
      supabase.from('album_photos').select('id, album_id, r2_url, thumbnail_url, caption, display_order, is_hidden, created_at').eq('album_id', id).order('display_order'),
    ])
    setAlbum(a as unknown as Album)
    setPhotos((p ?? []) as unknown as AlbumPhoto[])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [id])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [id])

  const isOwner = !!(user && album && user.id === album.user_id)
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const canManage = isOwner || isAdmin

  // Only show visible photos in lightbox; manage mode shows hidden too
  const visiblePhotos = manageMode ? photos : photos.filter(p => !p.is_hidden)
  const mapped = visiblePhotos.map(toPhoto)
  const author = album?.user ? `${album.user.first_name} ${album.user.last_name}` : ''

  // ── Photo actions ────────────────────────────────────────────────────────────

  async function deletePhoto(photo: AlbumPhoto) {
    Alert.alert('Delete photo', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setSaving(photo.id)
          await supabase.from('album_photos').delete().eq('id', photo.id)
          setPhotos(prev => prev.filter(p => p.id !== photo.id))
          setSaving(null)
        },
      },
    ])
  }

  async function toggleHidePhoto(photo: AlbumPhoto) {
    const newHidden = !(photo.is_hidden ?? false)
    setSaving(photo.id)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetch(`https://www.bazidpur.com/api/albums/${id}/photos?_t=${encodeURIComponent(session.access_token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ photoId: photo.id, is_hidden: newHidden }),
      })
    }
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_hidden: newHidden } : p))
    setSaving(null)
  }

  async function movePhoto(photo: AlbumPhoto, dir: 'up' | 'down') {
    const idx = photos.findIndex(p => p.id === photo.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= photos.length) return
    const arr = [...photos]
    ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
    const updated = arr.map((p, i) => ({ ...p, display_order: i }))
    setPhotos(updated)
    const results = await Promise.all(
      updated.map(p => supabase.from('album_photos').update({ display_order: p.display_order }).eq('id', p.id))
    )
    const failed = results.find(r => r.error)
    if (failed?.error) {
      setPhotos(photos)
      Alert.alert('Could not reorder', failed.error.message)
    }
  }

  // ── Add photos ──────────────────────────────────────────────────────────────

  async function addPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 10,
    })
    if (result.canceled || !result.assets.length) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { Alert.alert('Error', 'Not signed in.'); return }

    const assets = result.assets
    setUploadProgress({ current: 0, total: assets.length, pct: 0 })

    const uploaded: AlbumPhoto[] = []
    let cancelled = false
    uploadCancelRef.current = () => { cancelled = true }

    for (let i = 0; i < assets.length; i++) {
      if (cancelled) break
      const asset = assets[i]
      const ext = (asset.uri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase()

      // Resize to max 1920px and convert to JPEG (handles HEIC + keeps files under 4.5MB Vercel limit)
      let uploadUri = asset.uri
      try {
        const converted = await manipulateAsync(
          asset.uri,
          [{ resize: { width: 1920 } }],
          { compress: 0.85, format: SaveFormat.JPEG },
        )
        uploadUri = converted.uri
      } catch { /* fall back to original URI */ }

      const mimeType = 'image/jpeg'
      // Explicit www. host — apex 308-redirects to www; FileSystem.createUploadTask
      // happens to follow that redirect today, but keeping the chain to a single
      // hop is defensive (matches every other mobile endpoint).
      const url = `https://www.bazidpur.com/api/albums/${id}/photos?_t=${encodeURIComponent(session.access_token)}`

      const task = FileSystem.createUploadTask(
        url, uploadUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType,
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
        ({ totalBytesSent, totalBytesExpectedToSend }) => {
          const filePct = totalBytesExpectedToSend > 0
            ? Math.round((totalBytesSent / totalBytesExpectedToSend) * 100)
            : 0
          const overall = Math.round(((i + filePct / 100) / assets.length) * 100)
          setUploadProgress({ current: i + 1, total: assets.length, pct: Math.min(overall, 99) })
        }
      )

      try {
        const res = await task.uploadAsync()
        if (!res || res.status < 200 || res.status >= 300) {
          let msg = `Upload failed (${res?.status ?? 'no response'})`
          try { const j = JSON.parse(res?.body ?? '{}'); msg = j.error ?? msg } catch {}
          Alert.alert('Upload error', `Photo ${i + 1}: ${msg}`)
          break
        }
        const parsed = JSON.parse(res.body)
        if (parsed.photo) uploaded.push(parsed.photo as AlbumPhoto)
      } catch (e) {
        Alert.alert('Upload error', `Photo ${i + 1} failed.`)
        break
      }
    }

    uploadCancelRef.current = null
    setUploadProgress(null)
    if (uploaded.length > 0) {
      setPhotos(prev => [...prev, ...uploaded])
    }
  }

  // ── Album actions ────────────────────────────────────────────────────────────

  async function hideAlbum() {
    Alert.alert(
      album?.is_hidden ? 'Show album' : 'Hide album',
      album?.is_hidden ? 'Make this album visible to all members?' : 'Hide this album from other members?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: album?.is_hidden ? 'Show' : 'Hide', onPress: async () => {
            const newHidden = !album?.is_hidden
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              await fetch(`https://www.bazidpur.com/api/albums?_t=${encodeURIComponent(session.access_token)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ id, is_hidden: newHidden }),
              })
            }
            setAlbum(prev => prev ? { ...prev, is_hidden: newHidden } : prev)
          },
        },
      ]
    )
  }

  async function deleteAlbum() {
    Alert.alert('Delete album', 'This will delete the album and all its photos. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('album_photos').delete().eq('album_id', id)
          await supabase.from('photo_albums').delete().eq('id', id)
          router.back()
        },
      },
    ])
  }

  async function shareAlbum() {
    await Share.share({
      message: `Check out "${album?.title}" on Bazidpur`,
      url: `${WEB}/albums/${id}`,
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const listData = manageMode ? photos : visiblePhotos

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <Stack.Screen options={{
        title: album?.title || 'Album',
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity
              onPress={shareAlbum}
              style={{ padding: 8 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 17 }}>🔗</Text>
            </TouchableOpacity>
            {canManage && (
              <TouchableOpacity
                onPress={() => setManageMode(m => !m)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: manageMode ? '#2d1b69' : '#f3f4f6',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: manageMode ? '#fff' : '#374151' }}>
                  {manageMode ? 'Done' : 'Manage'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ),
      }} />

      {loading ? (
        <View style={{ flex: 1, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={p => p.id}
          numColumns={manageMode ? 1 : 3}
          key={manageMode ? 'manage' : 'view'}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          ListHeaderComponent={
            <>
              {/* Album info */}
              {(album?.description || author || manageMode) ? (
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      {author ? <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>by {author}</Text> : null}
                      {album?.description ? <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{album.description}</Text> : null}
                    </View>
                    {/* Object-level flagging — photos are reported from the
                        photo viewer (LightboxToolbar), not at album level. */}
                  </View>
                  {album?.is_hidden ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#d97706' }}>Hidden from members</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* No album-level likes/comments — those live inside the photo
                  viewer (LightboxToolbar) on each photo (entity album_photo). */}

              {/* Manage: album-level actions */}
              {manageMode && canManage ? (
                <View style={{ padding: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                    Album Settings
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      onPress={() => setEditAlbumOpen(true)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}
                    >
                      <Text style={{ fontSize: 15 }}>✏️</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Edit Info</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={hideAlbum}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}
                    >
                      <Text style={{ fontSize: 15 }}>{album?.is_hidden ? '👁' : '🙈'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>
                        {album?.is_hidden ? 'Show Album' : 'Hide Album'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={shareAlbum}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}
                    >
                      <Text style={{ fontSize: 15 }}>🔗</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1d4ed8' }}>Share Link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={deleteAlbum}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}
                    >
                      <Text style={{ fontSize: 15 }}>🗑️</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#dc2626' }}>Delete Album</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={addPhotos}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}
                  >
                    <Text style={{ fontSize: 15 }}>➕</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#16a34a' }}>Add Photos</Text>
                  </TouchableOpacity>

                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>
                    Photos ({photos.length}) · tap to manage
                  </Text>
                </View>
              ) : null}
            </>
          }
          renderItem={({ item, index }) => {
            const uri = imgUri(item.r2_url)
            const isHidden = item.is_hidden ?? false

            if (manageMode) {
              // List view with controls
              return (
                <View style={{
                  flexDirection: 'row', gap: 12, padding: 12,
                  borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
                  backgroundColor: isHidden ? '#fffbeb' : '#fff',
                }}>
                  {/* Thumbnail */}
                  <TouchableOpacity
                    onPress={() => {
                      const visIdx = visiblePhotos.findIndex(p => p.id === item.id)
                      if (visIdx >= 0) setLightboxIndex(visIdx)
                    }}
                    onLongPress={() => {}}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: 72, height: 72, borderRadius: 8, opacity: isHidden ? 0.5 : 1 }}
                      contentFit="cover"
                    />
                    {isHidden ? (
                      <View style={{ position: 'absolute', top: 3, right: 3, backgroundColor: '#f59e0b', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>Hidden</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  {/* Caption + controls */}
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity
                      onPress={() => setCaptionPhoto(item)}
                      style={{ backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8 }}
                    >
                      <Text style={{ fontSize: 13, color: item.caption ? '#374151' : '#9ca3af' }} numberOfLines={2}>
                        {item.caption || '+ Add caption…'}
                      </Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {/* Move up */}
                      <TouchableOpacity
                        onPress={() => movePhoto(item, 'up')}
                        disabled={index === 0}
                        style={{ opacity: index === 0 ? 0.3 : 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 14 }}>↑</Text>
                      </TouchableOpacity>

                      {/* Move down */}
                      <TouchableOpacity
                        onPress={() => movePhoto(item, 'down')}
                        disabled={index === photos.length - 1}
                        style={{ opacity: index === photos.length - 1 ? 0.3 : 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 14 }}>↓</Text>
                      </TouchableOpacity>

                      {/* Hide/show */}
                      <TouchableOpacity
                        onPress={() => toggleHidePhoto(item)}
                        disabled={saving === item.id}
                        style={{ backgroundColor: isHidden ? '#fef3c7' : '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isHidden ? '#92400e' : '#6b7280' }}>
                          {saving === item.id ? '…' : isHidden ? 'Show' : 'Hide'}
                        </Text>
                      </TouchableOpacity>

                      {/* Delete */}
                      <TouchableOpacity
                        onPress={() => deletePhoto(item)}
                        disabled={saving === item.id}
                        style={{ backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#dc2626' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )
            }

            // Normal grid view
            return (
              <TouchableOpacity
                onPress={() => setLightboxIndex(index)}
                onLongPress={() => {}}
                style={{ width: tileSize, height: tileSize, padding: 1 }}
                activeOpacity={0.85}
              >
                <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" />
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📷</Text>
              <Text style={{ fontSize: 14, color: '#9ca3af' }}>No photos in this album</Text>
            </View>
          }
        />
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={mapped}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          entityType="album_photo"
          ownerId={album?.user_id}
        />
      )}

      {editAlbumOpen && album ? (
        <EditAlbumModal
          album={album}
          onClose={() => setEditAlbumOpen(false)}
          onSave={(title, description) => {
            setAlbum(prev => prev ? { ...prev, title, description } : prev)
            setEditAlbumOpen(false)
          }}
        />
      ) : null}

      {captionPhoto ? (
        <CaptionModal
          photo={captionPhoto}
          onClose={() => setCaptionPhoto(null)}
          onSave={caption => {
            setPhotos(prev => prev.map(p => p.id === captionPhoto.id ? { ...p, caption } : p))
            setCaptionPhoto(null)
          }}
        />
      ) : null}

      {uploadProgress !== null && (
        <View style={{
          position: 'absolute', left: 0, right: 0, top: insets.top,
          backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 20, paddingVertical: 14,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          zIndex: 1000, elevation: 10,
        }}>
          <ActivityIndicator color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
              Uploading {uploadProgress.current} of {uploadProgress.total}…
            </Text>
            <View style={{ marginTop: 6, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
              <View style={{ width: `${uploadProgress.pct}%`, height: 4, backgroundColor: '#4ade80', borderRadius: 2 }} />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { uploadCancelRef.current?.(); setUploadProgress(null) }}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ color: '#f87171', fontWeight: '600', fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
