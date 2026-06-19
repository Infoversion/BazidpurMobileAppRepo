import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, RefreshControl, TextInput,
  Alert, ActionSheetIOS, Platform, ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import * as FileSystem from 'expo-file-system/legacy'

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaTab = 'photos' | 'videos'
type StatusFilter = 'all' | 'active' | 'hidden'

const MAX_FILE_BYTES = 10 * 1024 * 1024

interface PickedImage { uri: string; fileSize?: number }
interface UploadState { current: number; total: number; pct: number; label: string }

interface TmAlbum {
  id: string
  title: string
  album_type: 'photos' | 'videos'
  is_hidden: boolean
}

interface MomentPhoto {
  id: string
  title?: string
  description?: string
  r2_url: string
  thumbnail_url?: string
  display_order: number
  is_active?: boolean
  album_id?: string | null
  created_at: string
}

interface MomentVideo {
  id: string
  title?: string
  description?: string
  youtube_id: string
  youtube_url?: string
  thumbnail_url?: string
  display_order: number
  is_active: boolean
  album_id?: string | null
  created_at: string
}

interface FormState {
  title: string
  description: string
  displayOrder: string
  youtubeUrl: string
  images: PickedImage[]
}

const PAGE_SIZE = 25
const EMPTY_FORM: FormState = { title: '', description: '', displayOrder: '', youtubeUrl: '', images: [] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : (url.length === 11 ? url : null)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function webApiUpload(
  apiUrl: string, uri: string,
  fields: { title: string; description: string; display_order: number },
  onProgress: (pct: number, label: string) => void
): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in.')
  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg'
  const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
  onProgress(0, 'Uploading…')
  const url = `${apiUrl}?_t=${encodeURIComponent(session.access_token)}`
  const task = FileSystem.createUploadTask(url, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
    parameters: { title: fields.title || '', description: fields.description || '', display_order: String(fields.display_order) },
    headers: { Authorization: `Bearer ${session.access_token}` },
  }, ({ totalBytesSent, totalBytesExpectedToSend }) => {
    if (totalBytesExpectedToSend > 0) onProgress(Math.round((totalBytesSent / totalBytesExpectedToSend) * 95), 'Uploading…')
  })
  const result = await task.uploadAsync()
  if (!result) throw new Error('Upload failed — no response.')
  onProgress(98, 'Saving…')
  if (result.status < 200 || result.status >= 300) {
    let errMsg = `Server returned ${result.status}`
    try { const j = JSON.parse(result.body); errMsg = (j.error ?? j.message ?? errMsg) as string } catch {}
    throw new Error(errMsg)
  }
  const parsed = JSON.parse(result.body)
  return (parsed.photo as Record<string, unknown>) ?? parsed
}

// ─── Segmented control ────────────────────────────────────────────────────────

function Seg<T extends string>({ tabs, selected, onSelect }: { tabs: { key: T; label: string }[]; selected: T; onSelect: (k: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(118,118,128,0.12)', borderRadius: 9, padding: 2, marginHorizontal: 16, marginTop: 10, marginBottom: 8 }}>
      {tabs.map(tab => {
        const active = tab.key === selected
        return (
          <TouchableOpacity key={tab.key} onPress={() => onSelect(tab.key)} activeOpacity={0.8}
            style={[{ flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 7 }, active && { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}>
            <Text style={{ fontSize: 12, fontWeight: active ? '600' : '400', color: active ? '#000' : 'rgba(60,60,67,0.6)' }}>{tab.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function ActiveBadge({ active }: { active: boolean | undefined }) {
  if (active === undefined) return null
  return (
    <View style={{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: active ? '#d1fae5' : '#fee2e2' }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: active ? '#065f46' : '#991b1b' }}>{active ? 'ACTIVE' : 'HIDDEN'}</Text>
    </View>
  )
}

// ─── Cover grid (shared) ──────────────────────────────────────────────────────

function CoverGrid({ covers, size }: { covers: string[]; size: number }) {
  if (covers.length === 0) return null
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

// ─── Album rail ───────────────────────────────────────────────────────────────

function AlbumRail({
  albums, selectedId, onSelect, onLongPress, onAdd,
  coversForAlbum, countForAlbum, rootCovers, rootCount, mediaType,
}: {
  albums: TmAlbum[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onLongPress: (album: TmAlbum) => void
  onAdd: () => void
  coversForAlbum: (id: string) => string[]
  countForAlbum: (id: string) => number
  rootCovers: string[]
  rootCount: number
  mediaType: 'photos' | 'videos'
}) {
  const CARD_W = 90
  const IMG_H = 68
  const itemWord = mediaType === 'photos' ? 'photo' : 'video'

  const nameOverlay = (label: string) => (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.32)' }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 5, paddingVertical: 4 }}>
        <Text
          style={{ fontSize: 10, fontWeight: '800', color: '#fff', lineHeight: 13, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}
          numberOfLines={2}
        >{label}</Text>
      </View>
    </>
  )

  return (
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea', paddingTop: 8, paddingBottom: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: '#8e8e93', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 6, textTransform: 'uppercase' }}>Albums</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>

        {/* Root card */}
        <TouchableOpacity
          onPress={() => onSelect(null)}
          style={{ width: CARD_W, borderRadius: 8, borderWidth: 2, borderColor: selectedId === null ? '#2d1b69' : '#e5e5ea', overflow: 'hidden', backgroundColor: '#f9f9f9' }}
          activeOpacity={0.75}
        >
          <View style={{ width: CARD_W, height: IMG_H, backgroundColor: '#ede9fe', overflow: 'hidden' }}>
            {rootCovers.length > 0
              ? <CoverGrid covers={rootCovers} size={CARD_W} />
              : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>📂</Text></View>
            }
            {nameOverlay('Root')}
          </View>
          <View style={{ paddingHorizontal: 5, paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: '#e5e5ea' }}>
            <Text style={{ fontSize: 10, color: '#8e8e93' }}>{rootCount} {itemWord}{rootCount !== 1 ? 's' : ''}</Text>
          </View>
        </TouchableOpacity>

        {/* Album cards */}
        {albums.map(album => {
          const active = selectedId === album.id
          const covers = coversForAlbum(album.id)
          const count = countForAlbum(album.id)
          return (
            <TouchableOpacity
              key={album.id}
              onPress={() => onSelect(album.id)}
              onLongPress={() => onLongPress(album)}
              style={{ width: CARD_W, borderRadius: 8, borderWidth: 2, borderColor: active ? '#2d1b69' : '#e5e5ea', overflow: 'hidden', backgroundColor: '#f9f9f9', opacity: album.is_hidden ? 0.55 : 1 }}
              activeOpacity={0.75}
            >
              <View style={{ width: CARD_W, height: IMG_H, backgroundColor: '#ede9fe', overflow: 'hidden' }}>
                {covers.length > 0
                  ? <CoverGrid covers={covers} size={CARD_W} />
                  : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>📁</Text></View>
                }
                {album.is_hidden && (
                  <View style={{ position: 'absolute', top: 2, right: 2, zIndex: 10, backgroundColor: '#f59e0b', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>H</Text>
                  </View>
                )}
                {nameOverlay(album.title)}
              </View>
              <View style={{ paddingHorizontal: 5, paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: '#e5e5ea' }}>
                <Text style={{ fontSize: 10, color: active ? '#2d1b69' : '#8e8e93' }}>{count} {itemWord}{count !== 1 ? 's' : ''}</Text>
              </View>
            </TouchableOpacity>
          )
        })}

        {/* Add album button */}
        <TouchableOpacity
          onPress={onAdd}
          style={{ width: CARD_W, borderRadius: 8, borderWidth: 2, borderColor: '#e5e5ea', borderStyle: 'dashed', overflow: 'hidden', backgroundColor: '#f9f9f9', alignItems: 'center', justifyContent: 'center', height: IMG_H + 28 }}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 22, color: '#8e8e93' }}>+</Text>
          <Text style={{ fontSize: 9, color: '#8e8e93', marginTop: 2 }}>Album</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

// ─── Album picker modal (move-to-album) ──────────────────────────────────────

function AlbumPickerModal({
  albums, mediaType, onPick, onClose,
}: {
  albums: TmAlbum[]
  mediaType: MediaTab
  onPick: (albumId: string | null) => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const relevant = albums.filter(a => a.album_type === mediaType)
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: insets.top + 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)' }}>
          <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 16, color: '#2d1b69' }}>Cancel</Text></TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>Move to Album</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          <TouchableOpacity onPress={() => onPick(null)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 22 }}>📂</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e' }}>Root (unassigned)</Text>
          </TouchableOpacity>
          {relevant.map(album => (
            <TouchableOpacity key={album.id} onPress={() => onPick(album.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 22 }}>📁</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e' }}>{album.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Create album modal ───────────────────────────────────────────────────────

function CreateAlbumModal({
  mediaType, onClose, onCreate,
}: {
  mediaType: MediaTab
  onClose: () => void
  onCreate: (title: string) => Promise<void>
}) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try { await onCreate(title.trim()) } finally { setSaving(false) }
  }
  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f2f2f7' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: insets.top + 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)' }}>
          <TouchableOpacity onPress={onClose} disabled={saving}><Text style={{ fontSize: 16, color: saving ? 'rgba(60,60,67,0.3)' : '#2d1b69' }}>Cancel</Text></TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>New {mediaType === 'photos' ? 'Photo' : 'Video'} Album</Text>
          <TouchableOpacity onPress={save} disabled={saving || !title.trim()}>
            {saving ? <ActivityIndicator color="#2d1b69" /> : <Text style={{ fontSize: 16, fontWeight: '600', color: title.trim() ? '#2d1b69' : 'rgba(60,60,67,0.3)' }}>Create</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16 }}>
            <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 4 }}>Album title</Text>
            <TextInput
              autoFocus
              style={{ fontSize: 16, color: '#000', paddingVertical: 4 }}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter album name…"
              returnKeyType="done"
              onSubmitEditing={save}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Form modal (add / edit photo or video) ───────────────────────────────────

function FormModal({ visible, title: modalTitle, mediaType, initial, saving, uploadState, onSave, onClose }: {
  visible: boolean; title: string; mediaType: MediaTab
  initial: FormState; saving: boolean; uploadState: UploadState | null
  onSave: (f: FormState) => void; onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const isNew = !initial.title && !initial.youtubeUrl

  useEffect(() => { if (visible) setForm(initial) }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pickImages() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo library access in Settings.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, allowsEditing: false, exif: false,
    })
    if (result.canceled) return
    const oversized = result.assets.filter(a => a.fileSize != null && a.fileSize > MAX_FILE_BYTES)
    const valid = result.assets.filter(a => a.fileSize == null || a.fileSize <= MAX_FILE_BYTES)
    if (oversized.length > 0) Alert.alert(`${oversized.length} photo${oversized.length > 1 ? 's' : ''} skipped`, `Over the ${formatBytes(MAX_FILE_BYTES)} limit.`)
    if (valid.length > 0) setForm(f => ({ ...f, images: [...f.images, ...valid.map(a => ({ uri: a.uri, fileSize: a.fileSize ?? undefined }))] }))
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f2f2f7' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)' }}>
          <TouchableOpacity onPress={onClose} disabled={saving}><Text style={{ fontSize: 16, color: saving ? 'rgba(60,60,67,0.3)' : '#2d1b69' }}>Cancel</Text></TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>{modalTitle}</Text>
          <TouchableOpacity onPress={() => onSave(form)} disabled={saving}>
            {saving ? <ActivityIndicator color="#2d1b69" /> : <Text style={{ fontSize: 16, fontWeight: '600', color: '#2d1b69' }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          {uploadState && (
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#2d1b69' }}>Photo {uploadState.current} of {uploadState.total}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(60,60,67,0.5)' }}>{uploadState.label}</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${uploadState.pct}%` as any, backgroundColor: '#2d1b69', borderRadius: 4 }} />
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', textAlign: 'right' }}>{uploadState.pct}%</Text>
            </View>
          )}

          {mediaType === 'photos' && isNew && !uploadState && (
            <View style={{ gap: 8 }}>
              <TouchableOpacity onPress={pickImages}
                style={{ backgroundColor: '#fff', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2d1b69', borderStyle: 'dashed', paddingVertical: 28 }}>
                <Text style={{ fontSize: 36 }}>📷</Text>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#2d1b69', marginTop: 6 }}>
                  {form.images.length > 0 ? '+ Add More Photos' : 'Tap to choose photo(s)'}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(60,60,67,0.4)', marginTop: 4 }}>Max {formatBytes(MAX_FILE_BYTES)} per photo</Text>
              </TouchableOpacity>
              {form.images.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {form.images.map((img, i) => (
                    <View key={i} style={{ alignItems: 'center', gap: 2 }}>
                      <View style={{ position: 'relative' }}>
                        <Image source={{ uri: img.uri }} style={{ width: 80, height: 80, borderRadius: 8 }} contentFit="cover" />
                        <TouchableOpacity onPress={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                          style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ff3b30', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      {img.fileSize != null && <Text style={{ fontSize: 9, color: 'rgba(60,60,67,0.45)' }}>{formatBytes(img.fileSize)}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 14 }}>
            {mediaType === 'videos' && (
              <>
                <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 4 }}>YouTube URL or Video ID</Text>
                <TextInput style={{ fontSize: 16, color: '#000', paddingVertical: 4 }} value={form.youtubeUrl}
                  onChangeText={v => setForm(f => ({ ...f, youtubeUrl: v }))}
                  placeholder="https://youtube.com/watch?v=…" autoCapitalize="none" />
                <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.1)' }} />
              </>
            )}
            {(['title', 'description', 'displayOrder'] as const).map((key, idx) => (
              <View key={key}>
                {idx > 0 && <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.1)', marginBottom: 14 }} />}
                <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 4 }}>
                  {key === 'title' ? 'Title' : key === 'description' ? 'Description' : 'Display Order'}
                </Text>
                <TextInput
                  style={{ fontSize: 16, color: '#000', paddingVertical: 4 }}
                  value={String(form[key] ?? '')}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={key === 'displayOrder' ? '0' : `Optional ${key}`}
                  keyboardType={key === 'displayOrder' ? 'numeric' : 'default'}
                  autoCapitalize={key === 'displayOrder' ? 'none' : 'sentences'}
                  multiline={key === 'description'}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Row components ───────────────────────────────────────────────────────────

function PhotoRow({ item, onAction }: { item: MomentPhoto; onAction: () => void }) {
  return (
    <TouchableOpacity onPress={onAction} activeOpacity={0.6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10 }}>
      <View style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f2f2f7', flexShrink: 0 }}>
        <Image source={{ uri: item.thumbnail_url || item.r2_url }} style={{ width: 52, height: 52 }} contentFit="cover" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: '#000', marginBottom: 2 }} numberOfLines={1}>{item.title || '(Untitled)'}</Text>
        {item.description ? <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)' }} numberOfLines={1}>{item.description}</Text> : null}
        <Text style={{ fontSize: 11, color: 'rgba(60,60,67,0.35)', marginTop: 1 }}>Order: {item.display_order}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <ActiveBadge active={item.is_active} />
        <Text style={{ fontSize: 20, color: '#c7c7cc' }}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

function VideoRow({ item, onAction }: { item: MomentVideo; onAction: () => void }) {
  const thumb = item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`
  return (
    <TouchableOpacity onPress={onAction} activeOpacity={0.6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10 }}>
      <View style={{ width: 72, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000', flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={{ uri: thumb }} style={{ width: 72, height: 52 }} contentFit="cover" />
        <View style={{ position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 9, marginLeft: 2 }}>▶</Text>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: '#000', marginBottom: 2 }} numberOfLines={1}>{item.title || '(Untitled)'}</Text>
        {item.description ? <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)' }} numberOfLines={1}>{item.description}</Text> : null}
        <Text style={{ fontSize: 11, color: 'rgba(60,60,67,0.35)', marginTop: 1 }}>Order: {item.display_order}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <ActiveBadge active={item.is_active} />
        <Text style={{ fontSize: 20, color: '#c7c7cc' }}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MomentsAdminScreen() {
  const insets = useSafeAreaInsets()

  // Media tab + filters
  const [mediaTab, setMediaTab] = useState<MediaTab>('photos')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Content
  const [photos, setPhotos] = useState<MomentPhoto[]>([])
  const [videos, setVideos] = useState<MomentVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [counts, setCounts] = useState({ photos: 0, videos: 0 })

  // Albums
  const [albums, setAlbums] = useState<TmAlbum[]>([])
  const [photoAlbums, setPhotoAlbums] = useState<TmAlbum[]>([])
  const [videoAlbums, setVideoAlbums] = useState<TmAlbum[]>([])
  const [selectedPhotoAlbumId, setSelectedPhotoAlbumId] = useState<string | null>(null)
  const [selectedVideoAlbumId, setSelectedVideoAlbumId] = useState<string | null>(null)
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [movePicker, setMovePicker] = useState<{ item: MomentPhoto | MomentVideo } | null>(null)
  const [albumCoverData, setAlbumCoverData] = useState<Record<string, { covers: string[]; count: number }>>({})
  const [rootCoverData, setRootCoverData] = useState<{ photos: string[]; videos: string[]; photoCount: number; videoCount: number }>({ photos: [], videos: [], photoCount: 0, videoCount: 0 })

  // Form modal
  const [modalVisible, setModalVisible] = useState(false)
  const [modalForm, setModalForm] = useState<FormState>(EMPTY_FORM)
  const [modalTitle, setModalTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)

  const loadingMoreRef = useRef(false)
  const skipFirst = useRef(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 400)
    return () => clearTimeout(t)
  }, [search])

  const currentData: (MomentPhoto | MomentVideo)[] = mediaTab === 'photos' ? photos : videos
  const currentAlbums = mediaTab === 'photos' ? photoAlbums : videoAlbums
  const selectedAlbumId = mediaTab === 'photos' ? selectedPhotoAlbumId : selectedVideoAlbumId

  // ── Album filter helper ───────────────────────────────────────────────────

  function buildAlbumQuery(q: any, tab: MediaTab, opts?: {
    pAlbs?: TmAlbum[], vAlbs?: TmAlbum[], pId?: string | null, vId?: string | null
  }) {
    const curAlbs = opts?.pAlbs !== undefined && tab === 'photos' ? opts.pAlbs
      : opts?.vAlbs !== undefined && tab === 'videos' ? opts.vAlbs
      : tab === 'photos' ? photoAlbums : videoAlbums

    const albumId = tab === 'photos'
      ? (opts?.pId !== undefined ? opts.pId : selectedPhotoAlbumId)
      : (opts?.vId !== undefined ? opts.vId : selectedVideoAlbumId)

    if (curAlbs.length > 0) {
      if (albumId === null) q = q.is('album_id', null)
      else q = q.eq('album_id', albumId)
    }
    return q
  }

  // ── Fetch functions ───────────────────────────────────────────────────────

  async function fetchPage(tab: MediaTab, sf: StatusFilter, s: string, offset: number, opts?: {
    pAlbs?: TmAlbum[], vAlbs?: TmAlbum[], pId?: string | null, vId?: string | null
  }) {
    const table = tab === 'photos' ? 'timeless_moments' : 'timeless_moment_videos'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from(table).select('*').order('display_order')
    q = buildAlbumQuery(q, tab, opts)
    if (sf === 'active') q = q.eq('is_active', true)
    else if (sf === 'hidden') q = q.eq('is_active', false)
    if (s) q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`)
    const { data } = await q.range(offset, offset + PAGE_SIZE - 1)
    return (data ?? []) as any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  async function fetchCounts() {
    const [{ count: p }, { count: v }] = await Promise.all([
      supabase.from('timeless_moments').select('*', { count: 'exact', head: true }),
      supabase.from('timeless_moment_videos').select('*', { count: 'exact', head: true }),
    ])
    setCounts({ photos: p ?? 0, videos: v ?? 0 })
  }

  async function fetchAlbums() {
    const { data } = await supabase.from('tm_albums').select('id, title, album_type, is_hidden').order('display_order')
    return (data ?? []) as TmAlbum[]
  }

  async function fetchAlbumCoverData(allAlbums: TmAlbum[]) {
    const [{ data: rootP }, { count: rootPCount }, { data: rootV }, { count: rootVCount }] = await Promise.all([
      supabase.from('timeless_moments').select('thumbnail_url, r2_url').is('album_id', null).order('display_order').limit(4),
      supabase.from('timeless_moments').select('*', { count: 'exact', head: true }).is('album_id', null),
      supabase.from('timeless_moment_videos').select('youtube_id').is('album_id', null).eq('is_active', true).order('display_order').limit(4),
      supabase.from('timeless_moment_videos').select('*', { count: 'exact', head: true }).is('album_id', null).eq('is_active', true),
    ])
    setRootCoverData({
      photos: (rootP ?? []).map(p => p.thumbnail_url || p.r2_url).filter(Boolean) as string[],
      videos: (rootV ?? []).map(v => `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`),
      photoCount: rootPCount ?? 0,
      videoCount: rootVCount ?? 0,
    })

    const results: Record<string, { covers: string[]; count: number }> = {}
    await Promise.all(allAlbums.map(async album => {
      if (album.album_type === 'photos') {
        const [{ data: rows }, { count }] = await Promise.all([
          supabase.from('timeless_moments').select('thumbnail_url, r2_url').eq('album_id', album.id).order('display_order').limit(4),
          supabase.from('timeless_moments').select('*', { count: 'exact', head: true }).eq('album_id', album.id),
        ])
        results[album.id] = { covers: (rows ?? []).map(p => p.thumbnail_url || p.r2_url).filter(Boolean) as string[], count: count ?? 0 }
      } else {
        const [{ data: rows }, { count }] = await Promise.all([
          supabase.from('timeless_moment_videos').select('youtube_id').eq('album_id', album.id).eq('is_active', true).order('display_order').limit(4),
          supabase.from('timeless_moment_videos').select('*', { count: 'exact', head: true }).eq('album_id', album.id).eq('is_active', true),
        ])
        results[album.id] = { covers: (rows ?? []).map(v => `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`), count: count ?? 0 }
      }
    }))
    setAlbumCoverData(results)
  }

  // ── Mount: load albums then initial data ──────────────────────────────────

  useEffect(() => {
    async function init() {
      const allAlbums = await fetchAlbums()
      const pAlbs = allAlbums.filter(a => a.album_type === 'photos')
      const vAlbs = allAlbums.filter(a => a.album_type === 'videos')
      setAlbums(allAlbums)
      setPhotoAlbums(pAlbs)
      setVideoAlbums(vAlbs)

      await Promise.all([
        fetchPage('photos', 'all', '', 0, { pAlbs, vAlbs, pId: null, vId: null }).then(rows => {
          setPhotos(rows)
          setHasMore(rows.length === PAGE_SIZE)
        }),
        fetchPage('videos', 'all', '', 0, { pAlbs, vAlbs, pId: null, vId: null }).then(rows => {
          setVideos(rows)
        }),
        fetchCounts(),
        fetchAlbumCoverData(allAlbums),
      ])
    }
    init().finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch on filter / album change ────────────────────────────────────

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return }
    loadingMoreRef.current = true
    if (mediaTab === 'photos') setPhotos([])
    else setVideos([])
    setHasMore(true)
    fetchPage(mediaTab, statusFilter, debouncedSearch, 0).then(rows => {
      if (mediaTab === 'photos') setPhotos(rows)
      else setVideos(rows)
      setHasMore(rows.length === PAGE_SIZE)
    }).finally(() => { loadingMoreRef.current = false })
  }, [mediaTab, statusFilter, debouncedSearch, selectedPhotoAlbumId, selectedVideoAlbumId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    const [rows] = await Promise.all([fetchPage(mediaTab, statusFilter, debouncedSearch, 0), fetchCounts()])
    if (mediaTab === 'photos') setPhotos(rows)
    else setVideos(rows)
    setHasMore(rows.length === PAGE_SIZE)
    setRefreshing(false)
  }, [mediaTab, statusFilter, debouncedSearch, selectedPhotoAlbumId, selectedVideoAlbumId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onLoadMore() {
    if (loadingMoreRef.current || !hasMore) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const rows = await fetchPage(mediaTab, statusFilter, debouncedSearch, currentData.length)
      if (mediaTab === 'photos') {
        setPhotos(prev => { const ids = new Set(prev.map(x => x.id)); return [...prev, ...(rows as MomentPhoto[]).filter(r => !ids.has(r.id))] })
      } else {
        setVideos(prev => { const ids = new Set(prev.map(x => x.id)); return [...prev, ...(rows as MomentVideo[]).filter(r => !ids.has(r.id))] })
      }
      setHasMore(rows.length === PAGE_SIZE)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }

  // ── Album actions ─────────────────────────────────────────────────────────

  async function handleCreateAlbum(title: string) {
    const type = mediaTab
    const { data, error } = await supabase.from('tm_albums').insert({
      title,
      album_type: type,
      display_order: albums.length,
    }).select().single()
    if (error) throw new Error(error.message)
    const newAlb = data as TmAlbum
    const updated = [...albums, newAlb]
    setAlbums(updated)
    setPhotoAlbums(updated.filter(a => a.album_type === 'photos'))
    setVideoAlbums(updated.filter(a => a.album_type === 'videos'))
    setAlbumCoverData(prev => ({ ...prev, [newAlb.id]: { covers: [], count: 0 } }))
    setShowCreateAlbum(false)
    // Switch to new album
    if (type === 'photos') setSelectedPhotoAlbumId(newAlb.id)
    else setSelectedVideoAlbumId(newAlb.id)
  }

  function handleAlbumLongPress(album: TmAlbum) {
    const options = ['Rename', album.is_hidden ? 'Show (unhide)' : 'Hide from members', 'Delete Album', 'Cancel']
    const handle = (i: number) => {
      if (i === 0) {
        Alert.prompt('Rename Album', 'Enter new name:', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Rename', onPress: async (newTitle?: string) => {
              if (!newTitle?.trim()) return
              const { error } = await supabase.from('tm_albums').update({ title: newTitle.trim() }).eq('id', album.id)
              if (error) { Alert.alert('Error', error.message); return }
              const updated = albums.map(a => a.id === album.id ? { ...a, title: newTitle.trim() } : a)
              setAlbums(updated)
              setPhotoAlbums(updated.filter(a => a.album_type === 'photos'))
              setVideoAlbums(updated.filter(a => a.album_type === 'videos'))
            },
          },
        ], 'plain-text', album.title)
      } else if (i === 1) {
        const next = !album.is_hidden
        supabase.from('tm_albums').update({ is_hidden: next }).eq('id', album.id).then(({ error }) => {
          if (error) { Alert.alert('Error', error.message); return }
          const updated = albums.map(a => a.id === album.id ? { ...a, is_hidden: next } : a)
          setAlbums(updated)
          setPhotoAlbums(updated.filter(a => a.album_type === 'photos'))
          setVideoAlbums(updated.filter(a => a.album_type === 'videos'))
        })
      } else if (i === 2) {
        Alert.alert('Delete album?', `"${album.title}" will be deleted. Photos/videos inside will become unassigned.`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive', onPress: async () => {
              // Unassign items
              await Promise.all([
                supabase.from('timeless_moments').update({ album_id: null }).eq('album_id', album.id),
                supabase.from('timeless_moment_videos').update({ album_id: null }).eq('album_id', album.id),
              ])
              await supabase.from('tm_albums').delete().eq('id', album.id)
              const updated = albums.filter(a => a.id !== album.id)
              setAlbums(updated)
              setPhotoAlbums(updated.filter(a => a.album_type === 'photos'))
              setVideoAlbums(updated.filter(a => a.album_type === 'videos'))
              // Switch to root if deleted album was selected
              if (selectedPhotoAlbumId === album.id) setSelectedPhotoAlbumId(null)
              if (selectedVideoAlbumId === album.id) setSelectedVideoAlbumId(null)
            },
          },
        ])
      }
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: album.title, options, cancelButtonIndex: 3, destructiveButtonIndex: 2 }, handle)
    } else {
      Alert.alert(album.title, '', [
        ...options.slice(0, -1).map((label, i) => ({
          text: label, style: (label === 'Delete Album' ? 'destructive' : 'default') as 'destructive' | 'default', onPress: () => handle(i),
        })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => {} },
      ])
    }
  }

  async function handleMoveToAlbum(albumId: string | null) {
    if (!movePicker) return
    const item = movePicker.item
    setMovePicker(null)
    const table = mediaTab === 'photos' ? 'timeless_moments' : 'timeless_moment_videos'
    const { error } = await supabase.from(table).update({ album_id: albumId }).eq('id', item.id)
    if (error) { Alert.alert('Error', error.message); return }
    // Remove from current view (it moved to a different album)
    if (mediaTab === 'photos') setPhotos(prev => prev.filter(x => x.id !== item.id))
    else setVideos(prev => prev.filter(x => x.id !== item.id))
  }

  // ── Content actions ───────────────────────────────────────────────────────

  async function handleSave(form: FormState) {
    const order = parseInt(form.displayOrder) || 0
    setSaving(true)
    setUploadState(null)

    try {
      if (editingId) {
        const update: Record<string, unknown> = {
          title: form.title.trim() || null,
          description: form.description.trim() || null,
          display_order: order,
        }
        if (mediaTab === 'videos' && form.youtubeUrl.trim()) {
          const yid = extractYouTubeId(form.youtubeUrl.trim())
          if (yid) { update.youtube_id = yid; update.youtube_url = `https://www.youtube.com/watch?v=${yid}` }
        }
        const { error } = await supabase.from(mediaTab === 'photos' ? 'timeless_moments' : 'timeless_moment_videos').update(update).eq('id', editingId)
        if (error) throw new Error(error.message)
        if (mediaTab === 'photos') setPhotos(prev => prev.map(x => x.id === editingId ? { ...x, ...update } as MomentPhoto : x))
        else setVideos(prev => prev.map(x => x.id === editingId ? { ...x, ...update } as MomentVideo : x))

      } else if (mediaTab === 'videos') {
        const yid = extractYouTubeId(form.youtubeUrl.trim())
        if (!yid) throw new Error('Could not extract a YouTube video ID from that URL.')
        const { data, error } = await supabase.from('timeless_moment_videos').insert({
          youtube_id: yid,
          youtube_url: `https://www.youtube.com/watch?v=${yid}`,
          title: form.title.trim() || null,
          description: form.description.trim() || null,
          display_order: order,
          is_active: true,
          album_id: selectedVideoAlbumId ?? null,
        }).select().single()
        if (error) throw new Error(error.message)
        setVideos(prev => [data as MomentVideo, ...prev])
        setCounts(c => ({ ...c, videos: c.videos + 1 }))

      } else {
        if (form.images.length === 0) throw new Error('Please choose at least one photo.')
        const inserted: MomentPhoto[] = []
        for (let i = 0; i < form.images.length; i++) {
          const { uri, fileSize } = form.images[i]
          if (fileSize != null && fileSize > MAX_FILE_BYTES) throw new Error(`Photo ${i + 1} is ${formatBytes(fileSize)}, which exceeds the ${formatBytes(MAX_FILE_BYTES)} limit.`)
          const newPhoto = await webApiUpload(
            'https://www.bazidpur.com/api/timeless-moments',
            uri,
            { title: form.title.trim(), description: form.description.trim(), display_order: order + i },
            (pct, label) => setUploadState({ current: i + 1, total: form.images.length, pct, label })
          )
          // Assign to current album if one is selected
          if (selectedPhotoAlbumId && (newPhoto as any).id) {
            await supabase.from('timeless_moments').update({ album_id: selectedPhotoAlbumId }).eq('id', (newPhoto as any).id)
          }
          inserted.push({ ...(newPhoto as unknown as MomentPhoto), album_id: selectedPhotoAlbumId ?? null })
        }
        setPhotos(prev => [...inserted, ...prev])
        setCounts(c => ({ ...c, photos: c.photos + inserted.length }))
      }
      setModalVisible(false)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
      setUploadState(null)
    }
  }

  async function deleteItem(id: string) {
    const table = mediaTab === 'photos' ? 'timeless_moments' : 'timeless_moment_videos'
    Alert.alert('Delete?', 'This will remove the item permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from(table).delete().eq('id', id)
          if (error) { Alert.alert('Error', error.message); return }
          if (mediaTab === 'photos') { setPhotos(prev => prev.filter(x => x.id !== id)); setCounts(c => ({ ...c, photos: c.photos - 1 })) }
          else { setVideos(prev => prev.filter(x => x.id !== id)); setCounts(c => ({ ...c, videos: c.videos - 1 })) }
        },
      },
    ])
  }

  async function toggleActive(id: string, current: boolean) {
    const table = mediaTab === 'photos' ? 'timeless_moments' : 'timeless_moment_videos'
    const { error } = await supabase.from(table).update({ is_active: !current }).eq('id', id)
    if (error) { Alert.alert('Error', error.message); return }
    if (mediaTab === 'videos') setVideos(prev => prev.map(x => x.id === id ? { ...x, is_active: !current } : x))
  }

  async function moveItem(id: string, direction: 'up' | 'down') {
    const list = currentData
    const idx = list.findIndex(x => x.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= list.length) return
    const a = list[idx], b = list[swapIdx]
    const table = mediaTab === 'photos' ? 'timeless_moments' : 'timeless_moment_videos'
    const [ra, rb] = await Promise.all([
      supabase.from(table).update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from(table).update({ display_order: a.display_order }).eq('id', b.id),
    ])
    if (ra.error || rb.error) { Alert.alert('Error', 'Could not reorder.'); return }
    const newList = [...list]
    newList[idx] = { ...a, display_order: b.display_order }
    newList[swapIdx] = { ...b, display_order: a.display_order }
    newList.sort((x, y) => x.display_order - y.display_order)
    if (mediaTab === 'photos') setPhotos(newList as MomentPhoto[])
    else setVideos(newList as MomentVideo[])
  }

  function showActions(item: MomentPhoto | MomentVideo) {
    const isFirst = currentData[0]?.id === item.id
    const isLast = currentData[currentData.length - 1]?.id === item.id
    const active = (item as MomentVideo).is_active
    const options: string[] = ['✏️  Edit', '📁  Move to Album']
    if (mediaTab === 'videos') options.push(active ? '🚫  Hide' : '✅  Make Active')
    if (!isFirst) options.push('⬆️  Move Up')
    if (!isLast) options.push('⬇️  Move Down')
    options.push('🗑️  Delete', 'Cancel')

    const handle = (i: number) => {
      const label = options[i]
      if (label.includes('Edit')) {
        const v = item as any // eslint-disable-line @typescript-eslint/no-explicit-any
        setEditingId(item.id)
        setModalForm({ title: v.title ?? '', description: v.description ?? '', displayOrder: String(item.display_order), youtubeUrl: v.youtube_url ?? '', images: [] })
        setModalTitle('Edit')
        setModalVisible(true)
      } else if (label.includes('Move to Album')) {
        setMovePicker({ item })
      } else if (label.includes('Hide') || label.includes('Active')) {
        toggleActive(item.id, active)
      } else if (label.includes('Move Up')) {
        moveItem(item.id, 'up')
      } else if (label.includes('Move Down')) {
        moveItem(item.id, 'down')
      } else if (label.includes('Delete')) {
        deleteItem(item.id)
      }
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: (item as any).title || (mediaTab === 'photos' ? 'Photo' : 'Video'), options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: options.findIndex(o => o.includes('Delete')) }, // eslint-disable-line @typescript-eslint/no-explicit-any
        handle
      )
    } else {
      Alert.alert('', '', [
        ...options.slice(0, -1).map((label, i) => ({
          text: label.replace(/^[^\s]+\s+/, ''),
          style: (label.includes('Delete') ? 'destructive' : 'default') as 'destructive' | 'default',
          onPress: () => handle(i),
        })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => {} },
      ])
    }
  }

  const MEDIA_TABS = [
    { key: 'photos' as MediaTab, label: `Photos (${counts.photos})` },
    { key: 'videos' as MediaTab, label: `Videos (${counts.videos})` },
  ]
  const STATUS_TABS = [
    { key: 'all' as StatusFilter, label: 'All' },
    { key: 'active' as StatusFilter, label: 'Active' },
    { key: 'hidden' as StatusFilter, label: 'Hidden' },
  ]

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}><ActivityIndicator color="#2d1b69" /></View>

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      {/* Search */}
      <View style={{ backgroundColor: '#f2f2f7', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(118,118,128,0.12)', borderRadius: 10, paddingHorizontal: 10, gap: 6 }}>
          <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)' }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#000', paddingVertical: 9 }}
            placeholder="Search title…" placeholderTextColor="rgba(60,60,67,0.4)"
            value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"
          />
        </View>
      </View>

      <Seg tabs={MEDIA_TABS} selected={mediaTab} onSelect={t => { setMediaTab(t); setStatusFilter('all') }} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Seg tabs={STATUS_TABS} selected={statusFilter} onSelect={setStatusFilter} />
      </View>

      {/* Album rail */}
      <AlbumRail
        albums={currentAlbums}
        selectedId={selectedAlbumId}
        onSelect={id => {
          if (mediaTab === 'photos') setSelectedPhotoAlbumId(id)
          else setSelectedVideoAlbumId(id)
        }}
        onLongPress={handleAlbumLongPress}
        onAdd={() => setShowCreateAlbum(true)}
        coversForAlbum={id => albumCoverData[id]?.covers ?? []}
        countForAlbum={id => albumCoverData[id]?.count ?? 0}
        rootCovers={mediaTab === 'photos' ? rootCoverData.photos : rootCoverData.videos}
        rootCount={mediaTab === 'photos' ? rootCoverData.photoCount : rootCoverData.videoCount}
        mediaType={mediaTab}
      />

      <FlatList
        data={currentData}
        keyExtractor={item => `${mediaTab}-${item.id}`}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.18)', marginLeft: 80 }} />}
        ListHeaderComponent={<View style={{ height: 8 }} />}
        renderItem={({ item }) =>
          mediaTab === 'photos'
            ? <PhotoRow item={item as MomentPhoto} onAction={() => showActions(item)} />
            : <VideoRow item={item as MomentVideo} onAction={() => showActions(item)} />
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color="#2d1b69" style={{ paddingVertical: 20 }} />
            : !hasMore && currentData.length > 0
              ? <Text style={{ textAlign: 'center', color: 'rgba(60,60,67,0.4)', fontSize: 12, paddingVertical: 24 }}>{currentData.length} items</Text>
              : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>{mediaTab === 'photos' ? '✨' : '🎬'}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 }}>Nothing here</Text>
            <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', textAlign: 'center' }}>No {mediaTab} in this album.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => { setEditingId(null); setModalForm(EMPTY_FORM); setModalTitle(`Add ${mediaTab === 'photos' ? 'Photo' : 'Video'}`); setModalVisible(true) }}
        style={{ position: 'absolute', bottom: insets.bottom + 86, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 }}
      >
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
      </TouchableOpacity>

      {/* Modals */}
      <FormModal
        visible={modalVisible}
        title={modalTitle}
        mediaType={mediaTab}
        initial={modalForm}
        saving={saving}
        uploadState={uploadState}
        onSave={handleSave}
        onClose={() => { if (!saving) setModalVisible(false) }}
      />

      {showCreateAlbum && (
        <CreateAlbumModal
          mediaType={mediaTab}
          onClose={() => setShowCreateAlbum(false)}
          onCreate={handleCreateAlbum}
        />
      )}

      {movePicker && (
        <AlbumPickerModal
          albums={albums}
          mediaType={mediaTab}
          onPick={handleMoveToAlbum}
          onClose={() => setMovePicker(null)}
        />
      )}

    </View>
  )
}
