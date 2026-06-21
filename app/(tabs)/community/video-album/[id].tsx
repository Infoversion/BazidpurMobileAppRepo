import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, ActivityIndicator,
  useWindowDimensions, RefreshControl, TouchableOpacity,
  Alert, TextInput, Modal,
} from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { webAPI } from '@/lib/webApi'
import { ReportButton } from '@/components/ReportButton'
import { AppDialog } from '@/components/AppDialog'
import { useDialog } from '@/lib/useDialog'

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

interface VideoItem {
  id: string
  album_id: string
  title: string | null
  description: string | null
  youtube_id: string
  youtube_url: string
  is_hidden: boolean | null
  display_order: number
  created_at: string
}

function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim()
  // Bare ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  const m = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

// ── Add / edit video modal ──────────────────────────────────────────────────
function VideoFormModal({
  initial, onClose, onSave,
}: {
  initial: { title: string; description: string; youtubeUrl: string } | null
  onClose: () => void
  onSave: (data: { title: string; description: string; youtubeUrl: string }) => Promise<void>
}) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [url, setUrl] = useState(initial?.youtubeUrl ?? '')
  const [saving, setSaving] = useState(false)
  const isEdit = initial !== null && (initial.title || initial.youtubeUrl)
  const { dialog: fDialog, show: fShow, hide: fHide } = useDialog()

  async function submit() {
    if (!title.trim()) { fShow('error', 'Title required'); return }
    if (!url.trim()) { fShow('error', 'YouTube URL required'); return }
    if (!extractYouTubeId(url)) { fShow('error', 'Invalid YouTube URL'); return }
    setSaving(true)
    try {
      await onSave({ title: title.trim(), description: desc.trim(), youtubeUrl: url.trim() })
    } catch (e: any) {
      fShow('error', 'Error', e.message ?? 'Could not save.')
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
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
            {isEdit ? 'Edit Video' : 'Add Video'}
          </Text>
          <TouchableOpacity onPress={submit} disabled={saving || !title.trim() || !url.trim()}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !title.trim() || !url.trim() ? '#9ca3af' : '#2d1b69' }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>YouTube URL *</Text>
            <TextInput
              autoFocus={!isEdit}
              autoCapitalize="none" autoCorrect={false}
              value={url}
              onChangeText={setUrl}
              placeholder="https://youtube.com/watch?v=…"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Video title…"
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
        <AppDialog {...fDialog} onClose={fHide} />
      </View>
    </Modal>
  )
}

// ── Inline video card (mirrors forum AttachmentDisplay) ─────────────────────
function VideoCard({
  item, cardWidth, thumbHeight, canManage, isOwnContent, isFirst, isLast,
  onMove, onToggleHide, onDelete, onEdit,
}: {
  item: VideoItem
  cardWidth: number
  thumbHeight: number
  canManage: boolean
  isOwnContent: boolean
  isFirst: boolean
  isLast: boolean
  onMove: (id: string, direction: 'up' | 'down') => void
  onToggleHide: (id: string, hide: boolean) => void
  onDelete: (id: string) => void
  onEdit: (item: VideoItem) => void
}) {
  const [playing, setPlaying] = useState(false)
  const hidden = item.is_hidden === true

  return (
    <View
      style={{
        borderRadius: 16, overflow: 'hidden', backgroundColor: '#ffffff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
        opacity: hidden ? 0.65 : 1,
      }}
    >
      {playing && item.youtube_id ? (
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
              source={{ uri: `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg` }}
              style={{ width: cardWidth, height: thumbHeight }}
              contentFit="cover"
            />
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
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
            {hidden ? (
              <View style={{
                position: 'absolute', top: 8, left: 8,
                backgroundColor: '#f59e0b', borderRadius: 6,
                paddingHorizontal: 8, paddingVertical: 3,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Hidden</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      )}

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1c1e', marginBottom: 4, lineHeight: 20 }} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 18 }} numberOfLines={3}>
                {item.description}
              </Text>
            ) : null}
          </View>
          {!isOwnContent ? (
            <View style={{ paddingTop: 2 }}>
              <ReportButton contentType="video_album_item" contentId={item.id} size="sm" />
            </View>
          ) : null}
        </View>
      </View>

      {canManage ? (
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6',
        }}>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => onMove(item.id, 'up')} disabled={isFirst}
              style={{ padding: 8, opacity: isFirst ? 0.25 : 1 }}>
              <Text style={{ fontSize: 16, color: '#6b7280' }}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onMove(item.id, 'down')} disabled={isLast}
              style={{ padding: 8, opacity: isLast ? 0.25 : 1 }}>
              <Text style={{ fontSize: 16, color: '#6b7280' }}>↓</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => onEdit(item)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2d1b69' }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onToggleHide(item.id, !hidden)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#f59e0b' }}>
                {hidden ? 'Show' : 'Hide'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item.id)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#ef4444' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  )
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function VideoAlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const cardWidth = width - 32
  const thumbHeight = (cardWidth * 9) / 16

  const [album, setAlbum] = useState<VideoAlbum | null>(null)
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [role, setRole] = useState<string>('member')
  const { dialog, show, hide } = useDialog()

  // Modals
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<VideoItem | null>(null)

  async function loadRole() {
    if (!user) return
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    setRole(data?.role || 'member')
  }

  async function load() {
    const [albumRes, itemsRes] = await Promise.all([
      supabase.from('video_albums')
        .select('id, title, description, user_id, is_hidden, display_order, created_at, user:user_id(first_name, last_name)')
        .eq('id', id).single(),
      supabase.from('video_album_items')
        .select('id, album_id, title, description, youtube_id, youtube_url, is_hidden, display_order, created_at')
        .eq('album_id', id).order('display_order'),
    ])
    if (albumRes.error) console.error('[video-album] album load error', albumRes.error.message)
    if (itemsRes.error) console.error('[video-album] items load error', itemsRes.error.message)
    setAlbum(albumRes.data as unknown as VideoAlbum)
    setVideos((itemsRes.data ?? []) as VideoItem[])
  }

  useEffect(() => {
    Promise.all([load(), loadRole()]).finally(() => setLoading(false))
  }, [id])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [id])

  const isOwner = !!(user && album && user.id === album.user_id)
  const isAdmin = role === 'admin' || role === 'superadmin'
  const canManage = isOwner || isAdmin

  // Non-admins, non-owners can't see hidden videos
  const visibleVideos = canManage ? videos : videos.filter(v => !v.is_hidden)

  // ── Actions ──
  async function handleAdd({ title, description, youtubeUrl }: { title: string; description: string; youtubeUrl: string }) {
    const youtube_id = extractYouTubeId(youtubeUrl)
    if (!youtube_id) { show('error', 'Invalid YouTube URL'); return }

    // Enforce per-album limit (from media_albums_config.maxVideosPerVideoAlbum)
    let maxPerAlbum = 10
    const { data: cfg } = await supabase
      .from('site_content').select('content').eq('section', 'media_albums_config').single()
    if (cfg?.content) {
      try { maxPerAlbum = Math.max(1, Number(JSON.parse(cfg.content).maxVideosPerVideoAlbum) || 10) } catch { /* default */ }
    }
    if (!isAdmin && videos.length >= maxPerAlbum) {
      throw new Error(`This album is limited to ${maxPerAlbum} videos.`)
    }

    const { data, error } = await supabase
      .from('video_album_items')
      .insert({
        album_id: id,
        title: title || null,
        description: description || null,
        youtube_url: youtubeUrl,
        youtube_id,
        display_order: videos.length,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setVideos(prev => [...prev, data as VideoItem])
    setAddOpen(false)
  }

  async function handleEdit({ title, description, youtubeUrl }: { title: string; description: string; youtubeUrl: string }) {
    if (!editTarget) return
    const youtube_id = extractYouTubeId(youtubeUrl)
    if (!youtube_id) { show('error', 'Invalid YouTube URL'); return }
    const { error } = await supabase
      .from('video_album_items')
      .update({ title: title || null, description: description || null, youtube_url: youtubeUrl, youtube_id })
      .eq('id', editTarget.id)
    if (error) throw new Error(error.message)
    setVideos(prev => prev.map(v => v.id === editTarget.id ? { ...v, title: title || null, description: description || null, youtube_url: youtubeUrl, youtube_id } : v))
    setEditTarget(null)
  }

  async function handleDelete(videoId: string) {
    Alert.alert('Delete video?', 'This will permanently remove it from this album.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('video_album_items').delete().eq('id', videoId)
          if (error) { show('error', 'Error', error.message); return }
          setVideos(prev => prev.filter(v => v.id !== videoId))
        },
      },
    ])
  }

  async function handleToggleHide(videoId: string, hide: boolean) {
    const { error } = await supabase.from('video_album_items').update({ is_hidden: hide }).eq('id', videoId)
    if (error) { show('error', 'Error', error.message); return }
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, is_hidden: hide } : v))
  }

  async function handleMove(videoId: string, direction: 'up' | 'down') {
    const idx = videos.findIndex(v => v.id === videoId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= videos.length) return
    const reordered = [...videos]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    const updates = reordered.map((v, i) => ({ id: v.id, display_order: i }))
    setVideos(reordered.map((v, i) => ({ ...v, display_order: i })))
    await Promise.all(updates.map(u =>
      supabase.from('video_album_items').update({ display_order: u.display_order }).eq('id', u.id)
    ))
  }

  async function handleDeleteAlbum() {
    if (!album) return
    Alert.alert('Delete album?', `"${album.title}" and all its videos will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('video_album_items').delete().eq('album_id', album.id)
          const { error } = await supabase.from('video_albums').delete().eq('id', album.id)
          if (error) { show('error', 'Error', error.message); return }
          router.back()
        },
      },
    ])
  }

  async function handleToggleHideAlbum() {
    if (!album) return
    const next = !album.is_hidden
    const res = await webAPI('/api/video-albums', 'PATCH', { id: album.id, is_hidden: next })
    if (!res.ok) { show('error', 'Error', `Could not update album (${res.status})`); return }
    setAlbum({ ...album, is_hidden: next })
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <Stack.Screen options={{ title: 'Album' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  if (!album) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text style={{ fontSize: 17, color: '#6b7280' }}>Album not found.</Text>
      </View>
    )
  }

  const author = album.user ? `${album.user.first_name} ${album.user.last_name}` : ''

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <Stack.Screen options={{
        title: album.title || 'Video Album',
        headerRight: () => (
          canManage ? (
            <TouchableOpacity onPress={() => setAddOpen(true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#2d1b69' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Add Video</Text>
            </TouchableOpacity>
          ) : null
        ),
      }} />

      <FlatList
        data={visibleVideos}
        keyExtractor={v => v.id}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            {album.description ? (
              <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 }}>{album.description}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {author ? (
                <Text style={{ fontSize: 12, color: '#8e8e93' }}>by {author}</Text>
              ) : <View />}
              {/* Object-level flagging — videos are reported individually inside
                  the album (VideoCard), not at the container level. */}
            </View>
            {canManage && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity onPress={handleToggleHideAlbum}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>
                    {album.is_hidden ? 'Show album' : 'Hide album'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteAlbum}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#b91c1c' }}>Delete album</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <VideoCard
            item={item}
            cardWidth={cardWidth}
            thumbHeight={thumbHeight}
            canManage={canManage}
            isOwnContent={isOwner}
            isFirst={index === 0}
            isLast={index === visibleVideos.length - 1}
            onMove={handleMove}
            onToggleHide={handleToggleHide}
            onDelete={handleDelete}
            onEdit={setEditTarget}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🎬</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No videos yet</Text>
            {canManage ? (
              <Text style={{ fontSize: 13, color: '#8e8e93' }}>Tap "Add Video" to add one.</Text>
            ) : null}
          </View>
        }
      />

      {addOpen && (
        <VideoFormModal
          initial={{ title: '', description: '', youtubeUrl: '' }}
          onClose={() => setAddOpen(false)}
          onSave={handleAdd}
        />
      )}
      {editTarget && (
        <VideoFormModal
          initial={{
            title: editTarget.title ?? '',
            description: editTarget.description ?? '',
            youtubeUrl: editTarget.youtube_url ?? '',
          }}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
      <AppDialog {...dialog} onClose={hide} />
    </View>
  )
}
