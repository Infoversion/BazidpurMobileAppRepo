import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput, ScrollView, Switch,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppDialog } from '@/components/AppDialog'
import { useDialog } from '@/lib/useDialog'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '@/lib/supabase'

// Use the www. host explicitly — the apex 308-redirects to www and iOS
// NSURLSession hangs on 308 redirects for POST-with-body.
const WEB = 'https://www.bazidpur.com'
const R2  = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

interface Book {
  id: string
  title: string
  author?: string | null
  description?: string | null
  cover_url?: string | null
  pdf_url?: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

function coverUri(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${R2}/${url}`
}

// ── Upload progress bar ───────────────────────────────────────────────────────
function UploadBar({ label, pct }: { label: string; pct: number }) {
  return (
    <View style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>{label}</Text>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>{pct}%</Text>
      </View>
      <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 }}>
        <View style={{ width: `${pct}%`, height: 4, backgroundColor: '#2d1b69', borderRadius: 2 }} />
      </View>
    </View>
  )
}

// ── Book form modal ───────────────────────────────────────────────────────────
function BookModal({
  book,
  token,
  onClose,
  onSaved,
}: {
  book: Book | null
  token: string
  onClose: () => void
  onSaved: (b: Book) => void
}) {
  const insets = useSafeAreaInsets()
  const isEdit = !!book
  const { dialog, show, hide } = useDialog()

  const [title,       setTitle]       = useState(book?.title ?? '')
  const [author,      setAuthor]      = useState(book?.author ?? '')
  const [desc,        setDesc]        = useState(book?.description ?? '')
  const [isActive,    setIsActive]    = useState(book?.is_active ?? true)
  const [coverUrl,    setCoverUrl]    = useState(book?.cover_url ?? '')
  const [pdfUrl,      setPdfUrl]      = useState(book?.pdf_url ?? '')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [pdfName,     setPdfName]    = useState<string | null>(null)

  const [saving,      setSaving]      = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadPct,   setUploadPct]   = useState(0)

  async function getPresign(type: 'cover' | 'pdf', filename: string, contentType: string) {
    const url = new URL(`${WEB}/api/admin/library/presign`)
    url.searchParams.set('type', type)
    url.searchParams.set('filename', filename)
    url.searchParams.set('contentType', contentType)
    url.searchParams.set('_t', token)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('Could not get upload URL')
    return res.json() as Promise<{ uploadUrl: string; publicUrl: string }>
  }

  async function uploadFile(
    localUri: string,
    presignedUrl: string,
    contentType: string,
    label: string,
  ): Promise<void> {
    setUploadLabel(label)
    setUploadPct(0)
    const task = FileSystem.createUploadTask(
      presignedUrl, localUri,
      {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
      },
      ({ totalBytesSent, totalBytesExpectedToSend }) => {
        if (totalBytesExpectedToSend > 0) {
          setUploadPct(Math.round((totalBytesSent / totalBytesExpectedToSend) * 100))
        }
      }
    )
    const result = await task.uploadAsync()
    if (!result || result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed (${result?.status ?? 'no response'})`)
    }
  }

  async function pickCover() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { show('error', 'Permission needed', 'Please allow access to your photo library.'); return }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    })
    if (result.canceled || !result.assets.length) return

    const asset = result.assets[0]
    const ext = (asset.uri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase()
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
    const filename = `cover.${ext}`

    try {
      const { uploadUrl, publicUrl } = await getPresign('cover', filename, mimeType)
      await uploadFile(asset.uri, uploadUrl, mimeType, 'Uploading cover…')
      setCoverUrl(publicUrl)
      setCoverPreview(asset.uri)
      setUploadLabel('')
    } catch (e: any) {
      show('error', 'Upload error', e.message)
      setUploadLabel('')
    }
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets?.length) return

    const asset = result.assets[0]
    const filename = (asset.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')

    try {
      const { uploadUrl, publicUrl } = await getPresign('pdf', filename, 'application/pdf')
      await uploadFile(asset.uri, uploadUrl, 'application/pdf', 'Uploading PDF…')
      setPdfUrl(publicUrl)
      setPdfName(asset.name || 'document.pdf')
      setUploadLabel('')
    } catch (e: any) {
      show('error', 'Upload error', e.message)
      setUploadLabel('')
    }
  }

  async function save() {
    if (!title.trim()) { show('error', 'Title is required'); return }
    setSaving(true)

    const body = {
      title: title.trim(),
      author: author.trim() || null,
      description: desc.trim() || null,
      cover_url: coverUrl || null,
      pdf_url: pdfUrl || null,
      is_active: isActive,
      ...(isEdit ? { id: book!.id } : { display_order: 0 }),
    }

    const url = `${WEB}/api/admin/library?_t=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { show('error', 'Error', json.error ?? 'Save failed'); return }
    onSaved(json.book as Book)
  }

  const previewUri = coverPreview ?? coverUri(coverUrl)

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 20,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 15, color: '#6b7280' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
            {isEdit ? 'Edit Book' : 'Add Book'}
          </Text>
          <TouchableOpacity onPress={save} disabled={saving || !title.trim() || !!uploadLabel}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !title.trim() || !!uploadLabel ? '#9ca3af' : '#2d1b69' }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 40 }}>
          {/* Cover preview */}
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={{ width: 110, height: 154, borderRadius: 10 }}
                contentFit="cover"
              />
            ) : (
              <View style={{
                width: 110, height: 154, borderRadius: 10,
                backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 36 }}>📚</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={pickCover}
              disabled={!!uploadLabel}
              style={{ marginTop: 10, backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                {previewUri ? 'Change Cover' : 'Add Cover Image'}
              </Text>
            </TouchableOpacity>
          </View>

          {uploadLabel ? <UploadBar label={uploadLabel} pct={uploadPct} /> : null}

          {/* Title */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Book title…"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 16, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}
              maxLength={300}
            />
          </View>

          {/* Author */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Author</Text>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              placeholder="Author name…"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}
              maxLength={200}
            />
          </View>

          {/* Description */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Short description…"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 14, color: '#374151', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, minHeight: 90, textAlignVertical: 'top' }}
              multiline
              maxLength={2000}
            />
          </View>

          {/* PDF */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>PDF File</Text>
            <TouchableOpacity
              onPress={pickPdf}
              disabled={!!uploadLabel}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12,
                backgroundColor: '#fafafa',
              }}
            >
              <Text style={{ fontSize: 20 }}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                  {pdfName || (pdfUrl ? 'PDF uploaded' : 'Select PDF…')}
                </Text>
                {pdfUrl && !pdfName ? (
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }} numberOfLines={1}>
                    {pdfUrl.split('/').pop()}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2d1b69' }}>
                {pdfUrl ? 'Change' : 'Upload'}
              </Text>
            </TouchableOpacity>
            {pdfUrl ? (
              <TouchableOpacity
                onPress={() => { setPdfUrl(''); setPdfName(null) }}
                style={{ marginTop: 6 }}
              >
                <Text style={{ fontSize: 12, color: '#dc2626', textAlign: 'right' }}>Remove PDF</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Visibility */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#f9fafb', borderRadius: 12, padding: 14,
          }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Visible to members</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Show this book in the Reading Room</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#e5e7eb', true: '#2d1b69' }}
              thumbColor="#fff"
            />
          </View>
        </ScrollView>
        <AppDialog {...dialog} onClose={hide} />
      </View>
    </Modal>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AdminLibraryScreen() {
  const insets = useSafeAreaInsets()
  const [books,      setBooks]      = useState<Book[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalBook,  setModalBook]  = useState<Book | null | 'new'>('new' as never)
  const [showModal,  setShowModal]  = useState(false)
  const [token,      setToken]      = useState('')

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) setToken(session.access_token)
    return session?.access_token ?? ''
  }

  async function load() {
    const tok = await getToken()
    if (!tok) return
    const url = `${WEB}/api/admin/library?_t=${encodeURIComponent(tok)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) {
      const json = await res.json()
      setBooks(json.books ?? [])
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  async function toggleActive(book: Book) {
    const newVal = !book.is_active
    setBooks(prev => prev.map(b => b.id === book.id ? { ...b, is_active: newVal } : b))
    const tok = token || await getToken()
    await fetch(`${WEB}/api/admin/library?_t=${encodeURIComponent(tok)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ id: book.id, is_active: newVal }),
    })
  }

  async function deleteBook(book: Book) {
    Alert.alert('Delete book', `Delete "${book.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setBooks(prev => prev.filter(b => b.id !== book.id))
          const tok = token || await getToken()
          await fetch(`${WEB}/api/admin/library?_t=${encodeURIComponent(tok)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ id: book.id }),
          })
        },
      },
    ])
  }

  function openAdd() {
    setModalBook(null)
    setShowModal(true)
  }

  function openEdit(book: Book) {
    setModalBook(book)
    setShowModal(true)
  }

  function handleSaved(saved: Book) {
    setBooks(prev => {
      const exists = prev.find(b => b.id === saved.id)
      return exists
        ? prev.map(b => b.id === saved.id ? saved : b)
        : [saved, ...prev]
    })
    setShowModal(false)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <FlatList
        data={books}
        keyExtractor={b => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📚</Text>
            <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>No books yet</Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
              Tap + to add the first book to the Reading Room.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const uri = coverUri(item.cover_url)
          return (
            <View style={{
              backgroundColor: '#fff', borderRadius: 14, padding: 12,
              flexDirection: 'row', gap: 12, alignItems: 'flex-start',
              borderWidth: 1, borderColor: item.is_active ? '#f3f4f6' : '#fde68a',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
            }}>
              {/* Cover thumbnail */}
              {uri ? (
                <Image source={{ uri }} style={{ width: 52, height: 72, borderRadius: 6 }} contentFit="cover" />
              ) : (
                <View style={{ width: 52, height: 72, borderRadius: 6, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>📚</Text>
                </View>
              )}

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                {item.author ? (
                  <Text style={{ fontSize: 12, color: '#6b7280' }} numberOfLines={1}>{item.author}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {!item.is_active ? (
                    <View style={{ backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400e' }}>Hidden</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>Visible</Text>
                    </View>
                  )}
                  {item.pdf_url ? (
                    <View style={{ backgroundColor: '#ede9fe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#5b21b6' }}>PDF</Text>
                    </View>
                  ) : null}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    onPress={() => openEdit(item)}
                    style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleActive(item)}
                    style={{ backgroundColor: item.is_active ? '#fef3c7' : '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: item.is_active ? '#92400e' : '#166534' }}>
                      {item.is_active ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteBook(item)}
                    style={{ backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#dc2626' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={openAdd}
        style={{
          position: 'absolute', bottom: insets.bottom + 74, right: 20,
          width: 54, height: 54, borderRadius: 27,
          backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center',
          shadowColor: '#2d1b69', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
        }}
      >
        <Text style={{ fontSize: 28, color: '#fff', lineHeight: 32, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      {showModal && (
        <BookModal
          book={modalBook as Book | null}
          token={token}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </View>
  )
}
