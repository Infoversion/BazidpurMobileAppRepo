import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, RefreshControl, TextInput,
  Alert, ActionSheetIOS, Platform, ScrollView,
  KeyboardAvoidingView, PanResponder, useWindowDimensions,
} from 'react-native'
import { Image } from 'expo-image'
import Svg, { Line } from 'react-native-svg'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import * as FileSystem from 'expo-file-system/legacy'

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaTab = 'photos' | 'videos'
type StatusFilter = 'all' | 'active' | 'hidden'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const PAGE_SIZE = 40

interface PickedImage { uri: string; fileSize?: number }
interface UploadState { current: number; total: number; pct: number; label: string }

interface MediaAlbum {
  id: string
  title: string
  album_type: 'photos' | 'videos'
  is_hidden: boolean
}

interface MediaPhoto {
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

interface MediaVideo {
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

function friendlyError(msg: string): string {
  const l = msg.toLowerCase()
  if (l.includes('row-level security') || l.includes('rls') || l.includes('policy')) {
    return 'Permission denied. Your account does not have access to modify this item. Please contact the administrator.'
  }
  return msg
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

// ─── Icons ────────────────────────────────────────────────────────────────────

// Descending lines — photo/video reorder (purple)
function SortIcon({ size = 16, color = '#2d1b69' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Line x1="2" y1="3.5" x2="14" y2="3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="2" y1="8" x2="10" y2="8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="2" y1="12.5" x2="6" y2="12.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

// Equal-width lines — album reorder (orange)
function AlbumSortIcon({ size = 16, color = '#f97316' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Line x1="2" y1="4" x2="14" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="2" y1="8" x2="14" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="2" y1="12" x2="14" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

// ─── Cover grid ───────────────────────────────────────────────────────────────

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
          {covers[i] && <Image source={{ uri: covers[i] }} style={{ width: half, height: '100%' }} contentFit="cover" />}
        </View>
      ))}
    </View>
  )
}

// ─── Album rail ───────────────────────────────────────────────────────────────

function AlbumRail({
  albums, selectedId, onSelect, onLongPress, onAdd, onLongPressRoot,
  coversForAlbum, countForAlbum, rootCovers, rootCount, mediaType,
}: {
  albums: MediaAlbum[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onLongPress: (album: MediaAlbum) => void
  onAdd: () => void
  onLongPressRoot: () => void
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
        <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', lineHeight: 13, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={2}>{label}</Text>
      </View>
    </>
  )

  return (
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea', paddingTop: 8, paddingBottom: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: '#8e8e93', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 6, textTransform: 'uppercase' }}>
        Albums ({albums.length})
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity onPress={() => onSelect(null)} onLongPress={onLongPressRoot}
          style={{ width: CARD_W, borderRadius: 8, borderWidth: 2, borderColor: selectedId === null ? '#2d1b69' : '#e5e5ea', overflow: 'hidden', backgroundColor: '#f9f9f9' }}
          activeOpacity={0.75}>
          <View style={{ width: CARD_W, height: IMG_H, backgroundColor: '#ede9fe', overflow: 'hidden' }}>
            {rootCovers.length > 0
              ? <CoverGrid covers={rootCovers} size={CARD_W} />
              : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>📂</Text></View>}
            {nameOverlay('Root')}
          </View>
          <View style={{ paddingHorizontal: 5, paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: '#e5e5ea' }}>
            <Text style={{ fontSize: 10, color: '#8e8e93' }}>{rootCount} {itemWord}{rootCount !== 1 ? 's' : ''}</Text>
          </View>
        </TouchableOpacity>

        {albums.map(album => {
          const active = selectedId === album.id
          const covers = coversForAlbum(album.id)
          const count = countForAlbum(album.id)
          return (
            <TouchableOpacity key={album.id} onPress={() => onSelect(album.id)} onLongPress={() => onLongPress(album)}
              style={{ width: CARD_W, borderRadius: 8, borderWidth: 2, borderColor: active ? '#2d1b69' : '#e5e5ea', overflow: 'hidden', backgroundColor: '#f9f9f9', opacity: album.is_hidden ? 0.55 : 1 }}
              activeOpacity={0.75}>
              <View style={{ width: CARD_W, height: IMG_H, backgroundColor: '#ede9fe', overflow: 'hidden' }}>
                {covers.length > 0
                  ? <CoverGrid covers={covers} size={CARD_W} />
                  : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>📁</Text></View>}
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

        <TouchableOpacity onPress={onAdd}
          style={{ width: CARD_W, borderRadius: 8, borderWidth: 2, borderColor: '#e5e5ea', borderStyle: 'dashed', overflow: 'hidden', backgroundColor: '#f9f9f9', alignItems: 'center', justifyContent: 'center', height: IMG_H + 28 }}
          activeOpacity={0.75}>
          <Text style={{ fontSize: 22, color: '#8e8e93' }}>+</Text>
          <Text style={{ fontSize: 9, color: '#8e8e93', marginTop: 2 }}>Album</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Album picker modal ────────────────────────────────────────────────────────

function AlbumPickerModal({
  albums, mediaType, onPick, onClose,
}: {
  albums: MediaAlbum[]
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
            <TextInput autoFocus style={{ fontSize: 16, color: '#000', paddingVertical: 4 }}
              value={title} onChangeText={setTitle} placeholder="Enter album name…"
              returnKeyType="done" onSubmitEditing={save} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Form modal (add / edit) ──────────────────────────────────────────────────

function FormModal({ visible, title: modalTitle, mediaType, initial, saving, uploadState, onSave, onClose, albumName }: {
  visible: boolean; title: string; mediaType: MediaTab
  initial: FormState; saving: boolean; uploadState: UploadState | null
  onSave: (f: FormState) => void; onClose: () => void; albumName?: string
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

        {albumName !== undefined && (
          <View style={{ backgroundColor: '#ede9fe', paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, color: '#5b21b6' }}>
              📁 {mediaType === 'photos' ? 'Photos' : 'Videos'} will be added to{' '}
              <Text style={{ fontWeight: '700' }}>"{albumName}"</Text>
            </Text>
          </View>
        )}

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

// ─── Media tile (4-per-row grid item) ────────────────────────────────────────

function MediaTile({ item, mediaType, size, selected, selectMode, onPress, onLongPress }: {
  item: MediaPhoto | MediaVideo
  mediaType: MediaTab
  size: number
  selected: boolean
  selectMode: boolean
  onPress: () => void
  onLongPress: () => void
}) {
  const thumb = mediaType === 'photos'
    ? ((item as MediaPhoto).thumbnail_url || (item as MediaPhoto).r2_url)
    : ((item as MediaVideo).thumbnail_url || `https://img.youtube.com/vi/${(item as MediaVideo).youtube_id}/mqdefault.jpg`)
  const isActive = (item as MediaVideo).is_active !== false
  const title = (item as any).title as string | undefined // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85}
      style={{ width: size, height: size }}>
      <View style={{ flex: 1, borderRadius: 3, overflow: 'hidden', backgroundColor: '#d1d1d6' }}>
        <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} contentFit="cover" />

        {/* Dim overlay for hidden items */}
        {!isActive && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
        )}

        {/* Video play badge — top-left */}
        {mediaType === 'videos' && (
          <View style={{ position: 'absolute', top: 3, left: 3, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 }}>
            <Text style={{ color: '#fff', fontSize: 7 }}>▶</Text>
          </View>
        )}

        {/* Status dot — top-right (non-select mode) */}
        {!selectMode && (
          <View style={{
            position: 'absolute', top: 3, right: 3,
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: isActive ? '#22c55e' : '#ef4444',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
          }} />
        )}

        {/* Select checkbox — top-right (select mode) */}
        {selectMode && (
          <View style={{
            position: 'absolute', top: 3, right: 3,
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: selected ? '#2d1b69' : 'rgba(255,255,255,0.85)',
            borderWidth: 1.5, borderColor: selected ? '#2d1b69' : 'rgba(0,0,0,0.25)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {selected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
          </View>
        )}

        {/* Title overlay — bottom */}
        {title ? (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 3, paddingVertical: 2,
          }}>
            <Text style={{ fontSize: 8, color: '#fff', fontWeight: '500' }} numberOfLines={1}>{title}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MediaAdminScreen() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const TILE_SIZE = Math.floor((width - 24 - 9) / 4)  // 24 = 2×12 pad, 9 = 3×3 gap

  // Toolbar
  const [mediaTab, setMediaTab] = useState<MediaTab>('photos')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Content
  const [photos, setPhotos] = useState<MediaPhoto[]>([])
  const [videos, setVideos] = useState<MediaVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [counts, setCounts] = useState({ photos: 0, videos: 0 })

  // Albums
  const [albums, setAlbums] = useState<MediaAlbum[]>([])
  const [photoAlbums, setPhotoAlbums] = useState<MediaAlbum[]>([])
  const [videoAlbums, setVideoAlbums] = useState<MediaAlbum[]>([])
  const [selectedPhotoAlbumId, setSelectedPhotoAlbumId] = useState<string | null>(null)
  const [selectedVideoAlbumId, setSelectedVideoAlbumId] = useState<string | null>(null)
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [movePicker, setMovePicker] = useState<{ item: MediaPhoto | MediaVideo } | null>(null)
  const [albumCoverData, setAlbumCoverData] = useState<Record<string, { covers: string[]; count: number }>>({})
  const [rootCoverData, setRootCoverData] = useState<{ photos: string[]; videos: string[]; photoCount: number; videoCount: number }>({ photos: [], videos: [], photoCount: 0, videoCount: 0 })

  // Select mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMovePicker, setBulkMovePicker] = useState(false)

  // Inline reorder
  const [photoReorderMode, setPhotoReorderMode] = useState(false)
  const [albumReorderMode, setAlbumReorderMode] = useState(false)
  const [reorderItems, setReorderItems] = useState<(MediaPhoto | MediaVideo)[]>([])
  const [reorderAlbumsList, setReorderAlbumsList] = useState<MediaAlbum[]>([])
  const [reorderDraggingId, setReorderDraggingId] = useState<string | null>(null)
  const [photoReorderSaving, setPhotoReorderSaving] = useState(false)
  const [albumReorderSaving, setAlbumReorderSaving] = useState(false)

  // Form modal
  const [modalVisible, setModalVisible] = useState(false)
  const [modalForm, setModalForm] = useState<FormState>(EMPTY_FORM)
  const [modalTitle, setModalTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)

  const loadingMoreRef = useRef(false)
  const skipFirst = useRef(true)

  // ── Inline reorder refs ───────────────────────────────────────────────────

  const reorderItemsRef = useRef<(MediaPhoto | MediaVideo)[]>([])
  const reorderAlbumsRef = useRef<MediaAlbum[]>([])
  const rdDraggingIdxRef = useRef(-1)
  const rdAnchorIdxRef = useRef(-1)

  const SLOT_H_ITEM = 66   // row 64 + gap 2
  const SLOT_H_ALBUM = 58  // row 56 + gap 2
  const LIST_TOP_REORDER = 10

  // Single overlay PanResponder for photo/video reorder (plain View, no Modal)
  const itemOverlayPR = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt) => {
      const listY = evt.nativeEvent.locationY - LIST_TOP_REORDER
      const n = reorderItemsRef.current.length
      const idx = Math.max(0, Math.min(n - 1, Math.floor(listY / SLOT_H_ITEM)))
      rdDraggingIdxRef.current = idx
      rdAnchorIdxRef.current = idx
      setReorderDraggingId(reorderItemsRef.current[idx]?.id ?? null)
    },
    onPanResponderMove: (_, gs) => {
      const from = rdDraggingIdxRef.current
      if (from < 0) return
      const n = reorderItemsRef.current.length
      const toIdx = Math.max(0, Math.min(n - 1, Math.round(rdAnchorIdxRef.current + gs.dy / SLOT_H_ITEM)))
      if (toIdx !== from) {
        const next = [...reorderItemsRef.current]
        const [moved] = next.splice(from, 1)
        next.splice(toIdx, 0, moved)
        reorderItemsRef.current = next
        rdDraggingIdxRef.current = toIdx
        setReorderItems([...next])
      }
    },
    onPanResponderRelease: () => { rdDraggingIdxRef.current = -1; rdAnchorIdxRef.current = -1; setReorderDraggingId(null) },
    onPanResponderTerminate: () => { rdDraggingIdxRef.current = -1; rdAnchorIdxRef.current = -1; setReorderDraggingId(null) },
  })).current

  // Single overlay PanResponder for album reorder
  const albumOverlayPR = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt) => {
      const listY = evt.nativeEvent.locationY - LIST_TOP_REORDER
      const n = reorderAlbumsRef.current.length
      const idx = Math.max(0, Math.min(n - 1, Math.floor(listY / SLOT_H_ALBUM)))
      rdDraggingIdxRef.current = idx
      rdAnchorIdxRef.current = idx
      setReorderDraggingId(reorderAlbumsRef.current[idx]?.id ?? null)
    },
    onPanResponderMove: (_, gs) => {
      const from = rdDraggingIdxRef.current
      if (from < 0) return
      const n = reorderAlbumsRef.current.length
      const toIdx = Math.max(0, Math.min(n - 1, Math.round(rdAnchorIdxRef.current + gs.dy / SLOT_H_ALBUM)))
      if (toIdx !== from) {
        const next = [...reorderAlbumsRef.current]
        const [moved] = next.splice(from, 1)
        next.splice(toIdx, 0, moved)
        reorderAlbumsRef.current = next
        rdDraggingIdxRef.current = toIdx
        setReorderAlbumsList([...next])
      }
    },
    onPanResponderRelease: () => { rdDraggingIdxRef.current = -1; rdAnchorIdxRef.current = -1; setReorderDraggingId(null) },
    onPanResponderTerminate: () => { rdDraggingIdxRef.current = -1; rdAnchorIdxRef.current = -1; setReorderDraggingId(null) },
  })).current

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 400)
    return () => clearTimeout(t)
  }, [search])

  const currentData: (MediaPhoto | MediaVideo)[] = mediaTab === 'photos' ? photos : videos
  const currentAlbums = mediaTab === 'photos' ? photoAlbums : videoAlbums
  const selectedAlbumId = mediaTab === 'photos' ? selectedPhotoAlbumId : selectedVideoAlbumId
  const currentAlbumName = !selectedAlbumId ? 'Root' : (currentAlbums.find(a => a.id === selectedAlbumId)?.title ?? 'Root')

  function cancelSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  // ── Album filter ──────────────────────────────────────────────────────────

  function buildAlbumQuery(q: any, tab: MediaTab, opts?: { // eslint-disable-line @typescript-eslint/no-explicit-any
    pAlbs?: MediaAlbum[], vAlbs?: MediaAlbum[], pId?: string | null, vId?: string | null
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

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchPage(tab: MediaTab, sf: StatusFilter, s: string, offset: number, opts?: {
    pAlbs?: MediaAlbum[], vAlbs?: MediaAlbum[], pId?: string | null, vId?: string | null
  }) {
    const table = tab === 'photos' ? 'photos' : 'videos'
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
      supabase.from('photos').select('*', { count: 'exact', head: true }),
      supabase.from('videos').select('*', { count: 'exact', head: true }),
    ])
    setCounts({ photos: p ?? 0, videos: v ?? 0 })
  }

  async function fetchAlbums() {
    const { data } = await supabase.from('media_albums').select('id, title, album_type, is_hidden').order('display_order')
    return (data ?? []) as MediaAlbum[]
  }

  async function fetchAlbumCoverData(allAlbums: MediaAlbum[]) {
    const [{ data: rootP }, { count: rootPCount }, { data: rootV }, { count: rootVCount }] = await Promise.all([
      supabase.from('photos').select('thumbnail_url, r2_url').is('album_id', null).order('display_order').limit(4),
      supabase.from('photos').select('*', { count: 'exact', head: true }).is('album_id', null),
      supabase.from('videos').select('youtube_id').is('album_id', null).eq('is_active', true).order('display_order').limit(4),
      supabase.from('videos').select('*', { count: 'exact', head: true }).is('album_id', null).eq('is_active', true),
    ])
    setRootCoverData({
      photos: (rootP ?? []).map((p: any) => p.thumbnail_url || p.r2_url).filter(Boolean) as string[], // eslint-disable-line @typescript-eslint/no-explicit-any
      videos: (rootV ?? []).map((v: any) => `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`), // eslint-disable-line @typescript-eslint/no-explicit-any
      photoCount: rootPCount ?? 0,
      videoCount: rootVCount ?? 0,
    })
    const results: Record<string, { covers: string[]; count: number }> = {}
    await Promise.all(allAlbums.map(async album => {
      if (album.album_type === 'photos') {
        const [{ data: rows }, { count }] = await Promise.all([
          supabase.from('photos').select('thumbnail_url, r2_url').eq('album_id', album.id).order('display_order').limit(4),
          supabase.from('photos').select('*', { count: 'exact', head: true }).eq('album_id', album.id),
        ])
        results[album.id] = { covers: (rows ?? []).map((p: any) => p.thumbnail_url || p.r2_url).filter(Boolean) as string[], count: count ?? 0 } // eslint-disable-line @typescript-eslint/no-explicit-any
      } else {
        const [{ data: rows }, { count }] = await Promise.all([
          supabase.from('videos').select('youtube_id').eq('album_id', album.id).eq('is_active', true).order('display_order').limit(4),
          supabase.from('videos').select('*', { count: 'exact', head: true }).eq('album_id', album.id).eq('is_active', true),
        ])
        results[album.id] = { covers: (rows ?? []).map((v: any) => `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`), count: count ?? 0 } // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    }))
    setAlbumCoverData(results)
  }

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const allAlbums = await fetchAlbums()
      const pAlbs = allAlbums.filter(a => a.album_type === 'photos')
      const vAlbs = allAlbums.filter(a => a.album_type === 'videos')
      setAlbums(allAlbums); setPhotoAlbums(pAlbs); setVideoAlbums(vAlbs)
      await Promise.all([
        fetchPage('photos', 'all', '', 0, { pAlbs, vAlbs, pId: null, vId: null }).then(rows => { setPhotos(rows); setHasMore(rows.length === PAGE_SIZE) }),
        fetchPage('videos', 'all', '', 0, { pAlbs, vAlbs, pId: null, vId: null }).then(rows => setVideos(rows)),
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
        setPhotos(prev => { const ids = new Set(prev.map(x => x.id)); return [...prev, ...(rows as MediaPhoto[]).filter(r => !ids.has(r.id))] })
      } else {
        setVideos(prev => { const ids = new Set(prev.map(x => x.id)); return [...prev, ...(rows as MediaVideo[]).filter(r => !ids.has(r.id))] })
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
    const { data, error } = await supabase.from('media_albums').insert({
      title, album_type: type, display_order: albums.length, is_hidden: false,
    }).select().single()
    if (error) throw new Error(error.message)
    const newAlb = data as MediaAlbum
    const updated = [...albums, newAlb]
    setAlbums(updated); setPhotoAlbums(updated.filter(a => a.album_type === 'photos')); setVideoAlbums(updated.filter(a => a.album_type === 'videos'))
    setAlbumCoverData(prev => ({ ...prev, [newAlb.id]: { covers: [], count: 0 } }))
    setShowCreateAlbum(false)
    if (type === 'photos') setSelectedPhotoAlbumId(newAlb.id)
    else setSelectedVideoAlbumId(newAlb.id)
  }

  function handleAlbumLongPress(album: MediaAlbum) {
    const addLabel = `Add ${album.album_type === 'photos' ? 'Photos' : 'Videos'} to This Album`
    const options = [addLabel, 'Rename', album.is_hidden ? 'Show (unhide)' : 'Hide from members', 'Delete Album', 'Cancel']
    const handle = (i: number) => {
      if (i === 0) {
        if (album.album_type === 'photos') { setMediaTab('photos'); setSelectedPhotoAlbumId(album.id) }
        else { setMediaTab('videos'); setSelectedVideoAlbumId(album.id) }
        cancelSelectMode()
        setEditingId(null); setModalForm(EMPTY_FORM)
        setModalTitle(`Add ${album.album_type === 'photos' ? 'Photo' : 'Video'}`)
        setModalVisible(true)
      } else if (i === 1) {
        Alert.prompt('Rename Album', 'Enter new name:', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Rename', onPress: async (newTitle?: string) => {
              if (!newTitle?.trim()) return
              const { error } = await supabase.from('media_albums').update({ title: newTitle.trim() }).eq('id', album.id)
              if (error) { Alert.alert('Error', friendlyError(error.message), [{ text: 'OK' }]); return }
              const updated = albums.map(a => a.id === album.id ? { ...a, title: newTitle.trim() } : a)
              setAlbums(updated); setPhotoAlbums(updated.filter(a => a.album_type === 'photos')); setVideoAlbums(updated.filter(a => a.album_type === 'videos'))
            },
          },
        ], 'plain-text', album.title)
      } else if (i === 2) {
        const next = !album.is_hidden
        supabase.from('media_albums').update({ is_hidden: next }).eq('id', album.id).then(({ error }) => {
          if (error) { Alert.alert('Error', friendlyError(error.message), [{ text: 'OK' }]); return }
          const updated = albums.map(a => a.id === album.id ? { ...a, is_hidden: next } : a)
          setAlbums(updated); setPhotoAlbums(updated.filter(a => a.album_type === 'photos')); setVideoAlbums(updated.filter(a => a.album_type === 'videos'))
        })
      } else if (i === 3) {
        Alert.alert('Delete album?', `"${album.title}" will be deleted. Photos/videos inside will become unassigned.`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive', onPress: async () => {
              await Promise.all([
                supabase.from('photos').update({ album_id: null }).eq('album_id', album.id),
                supabase.from('videos').update({ album_id: null }).eq('album_id', album.id),
              ])
              await supabase.from('media_albums').delete().eq('id', album.id)
              const updated = albums.filter(a => a.id !== album.id)
              setAlbums(updated); setPhotoAlbums(updated.filter(a => a.album_type === 'photos')); setVideoAlbums(updated.filter(a => a.album_type === 'videos'))
              if (selectedPhotoAlbumId === album.id) setSelectedPhotoAlbumId(null)
              if (selectedVideoAlbumId === album.id) setSelectedVideoAlbumId(null)
            },
          },
        ])
      }
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: album.title, options, cancelButtonIndex: 4, destructiveButtonIndex: 3 }, handle)
    } else {
      Alert.alert(album.title, '', [
        ...options.slice(0, 4).map((label, i) => ({ text: label, style: (label === 'Delete Album' ? 'destructive' : 'default') as 'destructive' | 'default', onPress: () => handle(i) })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => {} },
      ])
    }
  }

  async function handleMoveToAlbum(albumId: string | null) {
    if (!movePicker) return
    const item = movePicker.item
    setMovePicker(null)
    const table = mediaTab === 'photos' ? 'photos' : 'videos'
    const { error } = await supabase.from(table).update({ album_id: albumId }).eq('id', item.id)
    if (error) { Alert.alert('Error', friendlyError(error.message), [{ text: 'OK' }]); return }
    if (mediaTab === 'photos') setPhotos(prev => prev.filter(x => x.id !== item.id))
    else setVideos(prev => prev.filter(x => x.id !== item.id))
    fetchAlbumCoverData(albums)
  }

  // ── Select mode actions ───────────────────────────────────────────────────

  function handleTilePress(item: MediaPhoto | MediaVideo) {
    if (selectMode) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(item.id)) next.delete(item.id)
        else next.add(item.id)
        return next
      })
    } else {
      showActions(item)
    }
  }

  function handleTileLongPress(item: MediaPhoto | MediaVideo) {
    setSelectMode(true)
    setSelectedIds(new Set([item.id]))
  }

  function selectAll() {
    setSelectedIds(new Set(currentData.map(x => x.id)))
  }

  async function handleBulkMoveToAlbum(albumId: string | null) {
    setBulkMovePicker(false)
    const ids = Array.from(selectedIds)
    const table = mediaTab === 'photos' ? 'photos' : 'videos'
    const { error } = await supabase.from(table).update({ album_id: albumId }).in('id', ids)
    if (error) { Alert.alert('Error', friendlyError(error.message), [{ text: 'OK' }]); return }
    if (mediaTab === 'photos') setPhotos(prev => prev.filter(x => !selectedIds.has(x.id)))
    else setVideos(prev => prev.filter(x => !selectedIds.has(x.id)))
    cancelSelectMode()
    fetchAlbumCoverData(albums)
  }

  async function handleBulkToggle() {
    const ids = Array.from(selectedIds)
    const allActive = ids.every(id => {
      const item = currentData.find(x => x.id === id)
      return item ? (item as MediaVideo).is_active !== false : false
    })
    const newActive = !allActive
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { Alert.alert('Error', 'Not signed in.', [{ text: 'OK' }]); return }
    const table = mediaTab === 'photos' ? 'photos' : 'videos'
    const res = await fetch(
      `https://www.bazidpur.com/api/${table}?_t=${encodeURIComponent(session.access_token)}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, is_active: newActive }) }
    )
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      Alert.alert('Error', j.error || 'Failed to update.', [{ text: 'OK' }])
      return
    }
    if (mediaTab === 'photos') setPhotos(prev => prev.map(x => selectedIds.has(x.id) ? { ...x, is_active: newActive } : x))
    else setVideos(prev => prev.map(x => selectedIds.has(x.id) ? { ...x, is_active: newActive } : x))
    cancelSelectMode()
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    Alert.alert(`Delete ${ids.length} item${ids.length !== 1 ? 's' : ''}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const table = mediaTab === 'photos' ? 'photos' : 'videos'
          const { error } = await supabase.from(table).delete().in('id', ids)
          if (error) { Alert.alert('Error', friendlyError(error.message), [{ text: 'OK' }]); return }
          if (mediaTab === 'photos') { setPhotos(prev => prev.filter(x => !selectedIds.has(x.id))); setCounts(c => ({ ...c, photos: Math.max(0, c.photos - ids.length) })) }
          else { setVideos(prev => prev.filter(x => !selectedIds.has(x.id))); setCounts(c => ({ ...c, videos: Math.max(0, c.videos - ids.length) })) }
          cancelSelectMode()
          fetchAlbumCoverData(albums)
        },
      },
    ])
  }

  // ── Content actions ───────────────────────────────────────────────────────

  async function handleSave(form: FormState) {
    const order = parseInt(form.displayOrder) || 0
    setSaving(true); setUploadState(null)
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
        const { error } = await supabase.from(mediaTab === 'photos' ? 'photos' : 'videos').update(update).eq('id', editingId)
        if (error) throw new Error(friendlyError(error.message))
        if (mediaTab === 'photos') setPhotos(prev => prev.map(x => x.id === editingId ? { ...x, ...update } as MediaPhoto : x))
        else setVideos(prev => prev.map(x => x.id === editingId ? { ...x, ...update } as MediaVideo : x))

      } else if (mediaTab === 'videos') {
        const yid = extractYouTubeId(form.youtubeUrl.trim())
        if (!yid) throw new Error('Could not extract a YouTube video ID from that URL.')
        const { data, error } = await supabase.from('videos').insert({
          youtube_id: yid, youtube_url: `https://www.youtube.com/watch?v=${yid}`,
          title: form.title.trim() || null, description: form.description.trim() || null,
          display_order: order, is_active: true, album_id: selectedVideoAlbumId ?? null,
        }).select().single()
        if (error) throw new Error(friendlyError(error.message))
        setVideos(prev => [data as MediaVideo, ...prev])
        setCounts(c => ({ ...c, videos: c.videos + 1 }))

      } else {
        if (form.images.length === 0) throw new Error('Please choose at least one photo.')
        const inserted: MediaPhoto[] = []
        for (let i = 0; i < form.images.length; i++) {
          const { uri, fileSize } = form.images[i]
          if (fileSize != null && fileSize > MAX_FILE_BYTES) throw new Error(`Photo ${i + 1} is ${formatBytes(fileSize)}, which exceeds the ${formatBytes(MAX_FILE_BYTES)} limit.`)
          const newPhoto = await webApiUpload(
            'https://www.bazidpur.com/api/photos', uri,
            { title: form.title.trim(), description: form.description.trim(), display_order: order + i },
            (pct, label) => setUploadState({ current: i + 1, total: form.images.length, pct, label })
          )
          if (selectedPhotoAlbumId && (newPhoto as any).id) { // eslint-disable-line @typescript-eslint/no-explicit-any
            await supabase.from('photos').update({ album_id: selectedPhotoAlbumId }).eq('id', (newPhoto as any).id) // eslint-disable-line @typescript-eslint/no-explicit-any
          }
          inserted.push({ ...(newPhoto as unknown as MediaPhoto), album_id: selectedPhotoAlbumId ?? null })
        }
        setPhotos(prev => [...inserted, ...prev])
        setCounts(c => ({ ...c, photos: c.photos + inserted.length }))
      }
      setModalVisible(false)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong. Please try again.', [{ text: 'OK' }])
    } finally {
      setSaving(false); setUploadState(null)
    }
  }

  async function deleteItem(id: string) {
    const table = mediaTab === 'photos' ? 'photos' : 'videos'
    Alert.alert('Delete?', 'This will remove the item permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from(table).delete().eq('id', id)
          if (error) { Alert.alert('Error', friendlyError(error.message), [{ text: 'OK' }]); return }
          if (mediaTab === 'photos') { setPhotos(prev => prev.filter(x => x.id !== id)); setCounts(c => ({ ...c, photos: c.photos - 1 })) }
          else { setVideos(prev => prev.filter(x => x.id !== id)); setCounts(c => ({ ...c, videos: c.videos - 1 })) }
        },
      },
    ])
  }

  async function toggleActive(id: string, current: boolean) {
    const newActive = !current
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { Alert.alert('Error', 'Not signed in.', [{ text: 'OK' }]); return }
    const table = mediaTab === 'photos' ? 'photos' : 'videos'
    const res = await fetch(
      `https://www.bazidpur.com/api/${table}?_t=${encodeURIComponent(session.access_token)}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: newActive }) }
    )
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      Alert.alert('Cannot Update', j.error || 'Failed to update. Please try again.', [{ text: 'OK' }])
      return
    }
    if (mediaTab === 'photos') setPhotos(prev => prev.map(x => x.id === id ? { ...x, is_active: newActive } : x))
    else setVideos(prev => prev.map(x => x.id === id ? { ...x, is_active: newActive } : x))
  }

  function showActions(item: MediaPhoto | MediaVideo) {
    const active = (item as MediaVideo).is_active !== false
    const options = ['✏️  Edit', '📁  Move to another Album', active ? '🚫  Hide' : '✅  Make Active', '🗑️  Delete', 'Cancel']
    const handle = (i: number) => {
      const label = options[i]
      if (label.includes('Edit')) {
        const v = item as any // eslint-disable-line @typescript-eslint/no-explicit-any
        setEditingId(item.id)
        setModalForm({ title: v.title ?? '', description: v.description ?? '', displayOrder: String(item.display_order), youtubeUrl: v.youtube_url ?? '', images: [] })
        setModalTitle('Edit')
        setModalVisible(true)
      } else if (label.includes('Move to another Album')) {
        setMovePicker({ item })
      } else if (label.includes('Hide') || label.includes('Active')) {
        toggleActive(item.id, active)
      } else if (label.includes('Delete')) {
        deleteItem(item.id)
      }
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: (item as any).title || (mediaTab === 'photos' ? 'Photo' : 'Video'), options, cancelButtonIndex: 4, destructiveButtonIndex: 3 }, // eslint-disable-line @typescript-eslint/no-explicit-any
        handle
      )
    } else {
      Alert.alert('', '', [
        ...options.slice(0, 4).map((label, i) => ({
          text: label.replace(/^[^\s]+\s+/, ''),
          style: (label.includes('Delete') ? 'destructive' : 'default') as 'destructive' | 'default',
          onPress: () => handle(i),
        })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => {} },
      ])
    }
  }

  // ── Inline reorder ────────────────────────────────────────────────────────

  function enterPhotoReorderMode() {
    const items = [...currentData]
    reorderItemsRef.current = items
    rdDraggingIdxRef.current = -1
    rdAnchorIdxRef.current = -1
    setReorderItems(items)
    setReorderDraggingId(null)
    setPhotoReorderMode(true)
  }

  function enterAlbumReorderMode() {
    const albs = [...currentAlbums]
    reorderAlbumsRef.current = albs
    rdDraggingIdxRef.current = -1
    rdAnchorIdxRef.current = -1
    setReorderAlbumsList(albs)
    setReorderDraggingId(null)
    setAlbumReorderMode(true)
  }

  async function savePhotoReorder() {
    setPhotoReorderSaving(true)
    try {
      const table = mediaTab === 'photos' ? 'photos' : 'videos'
      await Promise.all(reorderItemsRef.current.map((it, i) =>
        supabase.from(table).update({ display_order: i }).eq('id', it.id)
      ))
      const updated = reorderItemsRef.current.map((it, i) => ({ ...it, display_order: i }))
      if (mediaTab === 'photos') setPhotos(updated as MediaPhoto[])
      else setVideos(updated as MediaVideo[])
      setPhotoReorderMode(false)
    } catch {
      Alert.alert('Error', 'Could not save order. Please try again.', [{ text: 'OK' }])
    } finally {
      setPhotoReorderSaving(false)
    }
  }

  async function saveAlbumReorder() {
    setAlbumReorderSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in.')
      const orders = reorderAlbumsRef.current.map((a, i) => ({ id: a.id, display_order: i }))
      const res = await fetch(
        `https://www.bazidpur.com/api/media-albums?_t=${encodeURIComponent(session.access_token)}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orders }) }
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save order.')
      }
      const newOrder = reorderAlbumsRef.current
      const updatedAll = [...albums.filter(a => a.album_type !== mediaTab), ...newOrder]
      setAlbums(updatedAll)
      if (mediaTab === 'photos') setPhotoAlbums(newOrder)
      else setVideoAlbums(newOrder)
      setAlbumReorderMode(false)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save album order.', [{ text: 'OK' }])
    } finally {
      setAlbumReorderSaving(false)
    }
  }

  // ── Pill helpers ──────────────────────────────────────────────────────────

  function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}
        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: active ? '#2d1b69' : 'rgba(118,118,128,0.10)' }}>
        <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? '#fff' : 'rgba(60,60,67,0.65)' }}>{label}</Text>
      </TouchableOpacity>
    )
  }

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}><ActivityIndicator color="#2d1b69" /></View>

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      {/* Combined toolbar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, gap: 5, borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea' }}>
        <Pill label={`📷 ${counts.photos}`} active={mediaTab === 'photos'} onPress={() => { setMediaTab('photos'); setStatusFilter('all'); cancelSelectMode() }} />
        <Pill label={`🎬 ${counts.videos}`} active={mediaTab === 'videos'} onPress={() => { setMediaTab('videos'); setStatusFilter('all'); cancelSelectMode() }} />
        <View style={{ width: 1, height: 18, backgroundColor: '#d1d1d6', marginHorizontal: 2 }} />
        <Pill label="All" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
        <Pill label="● Active" active={statusFilter === 'active'} onPress={() => setStatusFilter('active')} />
        <Pill label="○ Hidden" active={statusFilter === 'hidden'} onPress={() => setStatusFilter('hidden')} />
      </View>

      {/* Search row or select mode header */}
      {selectMode ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea' }}>
          <TouchableOpacity onPress={cancelSelectMode}>
            <Text style={{ fontSize: 15, color: '#2d1b69' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#1c1c1e' }}>
            {selectedIds.size} selected
          </Text>
          <TouchableOpacity onPress={selectAll}>
            <Text style={{ fontSize: 15, color: '#2d1b69' }}>Select All</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#f2f2f7' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(118,118,128,0.12)', borderRadius: 10, paddingHorizontal: 10, gap: 6 }}>
            <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)' }}>🔍</Text>
            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#000', paddingVertical: 9 }}
              placeholder="Search title…" placeholderTextColor="rgba(60,60,67,0.4)"
              value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity
            onPress={enterAlbumReorderMode}
            style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff3e0', alignItems: 'center', justifyContent: 'center' }}>
            <AlbumSortIcon size={16} color="#f97316" />
          </TouchableOpacity>
        </View>
      )}

      {/* Album rail */}
      <AlbumRail
        albums={currentAlbums}
        selectedId={selectedAlbumId}
        onSelect={id => {
          if (mediaTab === 'photos') setSelectedPhotoAlbumId(id)
          else setSelectedVideoAlbumId(id)
          cancelSelectMode()
        }}
        onLongPress={handleAlbumLongPress}
        onAdd={() => setShowCreateAlbum(true)}
        onLongPressRoot={() => {
          if (mediaTab === 'photos') setSelectedPhotoAlbumId(null)
          else setSelectedVideoAlbumId(null)
          cancelSelectMode()
          setEditingId(null); setModalForm(EMPTY_FORM)
          setModalTitle(`Add ${mediaTab === 'photos' ? 'Photo' : 'Video'}`)
          setModalVisible(true)
        }}
        coversForAlbum={id => albumCoverData[id]?.covers ?? []}
        countForAlbum={id => albumCoverData[id]?.count ?? 0}
        rootCovers={mediaTab === 'photos' ? rootCoverData.photos : rootCoverData.videos}
        rootCount={mediaTab === 'photos' ? rootCoverData.photoCount : rootCoverData.videoCount}
        mediaType={mediaTab}
      />

      {/* Album heading + action icons (select mode) or sort icon */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f2f2f7' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e' }}>{currentAlbumName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {selectMode && selectedIds.size > 0 ? (
            <>
              <TouchableOpacity onPress={() => setBulkMovePicker(true)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 22 }}>📁</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkToggle} style={{ padding: 6 }}>
                <Text style={{ fontSize: 22 }}>👁</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete} style={{ padding: 6 }}>
                <Text style={{ fontSize: 22 }}>🗑️</Text>
              </TouchableOpacity>
            </>
          ) : currentData.length > 1 && !debouncedSearch ? (
            <TouchableOpacity onPress={enterPhotoReorderMode}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
              <SortIcon size={16} color="#2d1b69" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 4-per-row tile grid */}
      <FlatList
        data={currentData}
        numColumns={4}
        key={`grid-${mediaTab}`}
        keyExtractor={item => item.id}
        columnWrapperStyle={{ paddingHorizontal: 12, gap: 3 }}
        ItemSeparatorComponent={() => <View style={{ height: 3 }} />}
        contentContainerStyle={{ paddingTop: 3, paddingBottom: insets.bottom + 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <MediaTile
            item={item}
            mediaType={mediaTab}
            size={TILE_SIZE}
            selected={selectedIds.has(item.id)}
            selectMode={selectMode}
            onPress={() => handleTilePress(item)}
            onLongPress={() => handleTileLongPress(item)}
          />
        )}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color="#2d1b69" style={{ paddingVertical: 20 }} />
            : !hasMore && currentData.length > 0
              ? <Text style={{ textAlign: 'center', color: 'rgba(60,60,67,0.4)', fontSize: 12, paddingVertical: 20 }}>{currentData.length} items</Text>
              : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>{mediaTab === 'photos' ? '📸' : '🎬'}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 }}>Nothing here</Text>
            <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', textAlign: 'center' }}>No {mediaTab} in this album.</Text>
          </View>
        }
      />

      {/* Modals */}
      <FormModal
        visible={modalVisible} title={modalTitle} mediaType={mediaTab}
        initial={modalForm} saving={saving} uploadState={uploadState}
        onSave={handleSave} onClose={() => { if (!saving) setModalVisible(false) }}
        albumName={editingId ? undefined : currentAlbumName}
      />

      {showCreateAlbum && (
        <CreateAlbumModal mediaType={mediaTab} onClose={() => setShowCreateAlbum(false)} onCreate={handleCreateAlbum} />
      )}

      {movePicker && (
        <AlbumPickerModal albums={albums} mediaType={mediaTab} onPick={handleMoveToAlbum} onClose={() => setMovePicker(null)} />
      )}

      {bulkMovePicker && (
        <AlbumPickerModal albums={albums} mediaType={mediaTab} onPick={handleBulkMoveToAlbum} onClose={() => setBulkMovePicker(false)} />
      )}

      {/* Photo/video reorder — full-screen overlay, plain View (no Modal, no gesture conflict) */}
      {photoReorderMode && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: '#f2f2f7' }}>
          <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: insets.top + 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)' }}>
            <TouchableOpacity onPress={() => setPhotoReorderMode(false)} disabled={photoReorderSaving}>
              <Text style={{ fontSize: 16, color: photoReorderSaving ? 'rgba(60,60,67,0.3)' : '#2d1b69' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Reorder {mediaTab === 'photos' ? 'Photos' : 'Videos'}</Text>
            <TouchableOpacity onPress={savePhotoReorder} disabled={photoReorderSaving}>
              {photoReorderSaving ? <ActivityIndicator color="#2d1b69" /> : <Text style={{ fontSize: 16, fontWeight: '600', color: '#2d1b69' }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, position: 'relative' }}>
            <View style={{ paddingTop: LIST_TOP_REORDER }}>
              {reorderItems.map(it => {
                const isDragging = reorderDraggingId === it.id
                const thumb = mediaTab === 'photos'
                  ? ((it as MediaPhoto).thumbnail_url || (it as MediaPhoto).r2_url)
                  : `https://img.youtube.com/vi/${(it as MediaVideo).youtube_id}/mqdefault.jpg`
                return (
                  <View key={it.id} style={{
                    height: SLOT_H_ITEM - 2, flexDirection: 'row', alignItems: 'center',
                    backgroundColor: isDragging ? '#ede9fe' : '#fff',
                    marginHorizontal: 12, marginBottom: 2, borderRadius: 10,
                    paddingHorizontal: 12, gap: 12,
                  }}>
                    <Image source={{ uri: thumb }} style={{ width: 44, height: 44, borderRadius: 6 }} contentFit="cover" />
                    <Text style={{ flex: 1, fontSize: 14, color: '#1c1c1e' }} numberOfLines={1}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(it as any).title || '(Untitled)'}
                    </Text>
                    <Text style={{ fontSize: 22, color: isDragging ? '#2d1b69' : '#c7c7cc' }}>≡</Text>
                  </View>
                )
              })}
            </View>
            {/* collapsable=false forces a real native UIView — overlay captures all touches */}
            <View
              collapsable={false}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              {...itemOverlayPR.panHandlers}
            />
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 8, paddingTop: 6 }}>
            <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.45)', textAlign: 'center' }}>
              Drag a row to reorder · tap Save to apply
            </Text>
          </View>
        </View>
      )}

      {/* Album reorder — full-screen overlay, plain View (no Modal) */}
      {albumReorderMode && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: '#f2f2f7' }}>
          <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: insets.top + 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)' }}>
            <TouchableOpacity onPress={() => setAlbumReorderMode(false)} disabled={albumReorderSaving}>
              <Text style={{ fontSize: 16, color: albumReorderSaving ? 'rgba(60,60,67,0.3)' : '#f97316' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Reorder Albums</Text>
            <TouchableOpacity onPress={saveAlbumReorder} disabled={albumReorderSaving}>
              {albumReorderSaving ? <ActivityIndicator color="#f97316" /> : <Text style={{ fontSize: 16, fontWeight: '600', color: '#f97316' }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, position: 'relative' }}>
            <View style={{ paddingTop: LIST_TOP_REORDER }}>
              {reorderAlbumsList.map(a => {
                const isDragging = reorderDraggingId === a.id
                return (
                  <View key={a.id} style={{
                    height: SLOT_H_ALBUM - 2, flexDirection: 'row', alignItems: 'center',
                    backgroundColor: isDragging ? '#fff7ed' : '#fff',
                    marginHorizontal: 12, marginBottom: 2, borderRadius: 10,
                    paddingHorizontal: 12, gap: 12,
                  }}>
                    <Text style={{ fontSize: 20 }}>{a.is_hidden ? '🙈' : '📁'}</Text>
                    <Text style={{ flex: 1, fontSize: 14, color: '#1c1c1e' }} numberOfLines={1}>{a.title}</Text>
                    <Text style={{ fontSize: 22, color: isDragging ? '#f97316' : '#c7c7cc' }}>≡</Text>
                  </View>
                )
              })}
            </View>
            <View
              collapsable={false}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              {...albumOverlayPR.panHandlers}
            />
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 8, paddingTop: 6 }}>
            <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.45)', textAlign: 'center' }}>
              Drag a row to reorder · tap Save to apply
            </Text>
          </View>
        </View>
      )}

    </View>
  )
}
