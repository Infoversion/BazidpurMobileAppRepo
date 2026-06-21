import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
  Alert, ActionSheetIOS, Platform, ScrollView,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '@/lib/supabase'
import { webUpload } from '@/lib/webApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatRecord {
  id: string
  title?: string
  name?: string
  filename?: string
  participants?: string
  message_count?: number
  content?: string
  created_at: string
  [key: string]: unknown
}

const PAGE_SIZE = 25

// ─── Upload function ──────────────────────────────────────────────────────────

async function pickAndUpload(title: string, onSuccess: (record: ChatRecord) => void) {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'application/zip', '*/*'],
      copyToCacheDirectory: true,
    })
    if (result.canceled) return

    const file = result.assets[0]

    const fd = new FormData()
    fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'text/plain' } as unknown as Blob)
    fd.append('title', title.trim())

    const res = await webUpload('/api/admin/whatsapp/archive', fd)

    if (res.ok) {
      const record = await res.json()
      onSuccess(record as ChatRecord)
      Alert.alert('Archived', `"${title}" has been imported successfully.`)
    } else {
      const err = await res.json().catch(() => ({}))
      Alert.alert('Import failed', err.message ?? `Server returned ${res.status}`)
    }
  } catch (e: unknown) {
    Alert.alert('Error', e instanceof Error ? e.message : 'Upload failed')
  }
}

// ─── Chat row ─────────────────────────────────────────────────────────────────

function ChatRow({
  item, uploading, onPress, onUpload,
}: {
  item: ChatRecord
  uploading: boolean
  onPress: () => void
  onUpload: () => void
}) {
  const label = item.title || item.name || item.filename || 'Chat'
  const date = new Date(item.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Text style={{ fontSize: 22 }}>💬</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 }} numberOfLines={1}>{label}</Text>
        {item.participants ? (
          <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.55)' }} numberOfLines={1}>{item.participants}</Text>
        ) : null}
        <Text style={{ fontSize: 11, color: 'rgba(60,60,67,0.4)', marginTop: 1 }}>
          {date}{item.message_count != null ? ` · ${item.message_count} messages` : ''}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onUpload}
        disabled={uploading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          backgroundColor: uploading ? '#e5e7eb' : '#ede9fe',
          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
        }}
      >
        {uploading
          ? <ActivityIndicator size="small" color="#2d1b69" />
          : <Text style={{ fontSize: 12, fontWeight: '600', color: '#2d1b69' }}>Upload</Text>
        }
      </TouchableOpacity>
      <Text style={{ fontSize: 20, color: '#c7c7cc' }}>›</Text>
    </TouchableOpacity>
  )
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function ChatDetail({ item, onClose, onDelete }: {
  item: ChatRecord
  onClose: () => void
  onDelete: () => void
}) {
  const label = item.title || item.name || item.filename || 'Chat'
  const date = new Date(item.created_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16, color: '#2d1b69' }}>‹ Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            if (Platform.OS === 'ios') {
              ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Delete Chat Archive', 'Cancel'], cancelButtonIndex: 1, destructiveButtonIndex: 0 },
                i => { if (i === 0) onDelete() }
              )
            } else {
              Alert.alert('Delete?', 'Remove this archive?', [
                { text: 'Delete', style: 'destructive', onPress: onDelete },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 22, color: '#2d1b69' }}>⋯</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#000', marginTop: 12 }}>{label}</Text>
        {item.participants ? <Text style={{ fontSize: 13, color: 'rgba(60,60,67,0.6)', marginTop: 2 }}>Participants: {item.participants}</Text> : null}
        <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.4)', marginTop: 1 }}>{date}</Text>
        {item.message_count != null ? <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.4)' }}>{item.message_count} messages</Text> : null}
      </View>

      {item.content ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 13, color: '#000', lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
              {String(item.content).slice(0, 5000)}
              {String(item.content).length > 5000 ? '\n\n[Truncated — view full archive on web]' : ''}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 14 }}>💬</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 }}>Chat archived</Text>
          <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', textAlign: 'center' }}>
            Full content is accessible on the web admin panel.
          </Text>
        </View>
      )}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WhatsAppAdminScreen() {
  const [chats, setChats] = useState<ChatRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<ChatRecord | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 400)
    return () => clearTimeout(t)
  }, [search])

  async function fetchPage(s: string, offset: number): Promise<ChatRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from('whatsapp_chats').select('*').order('created_at', { ascending: false })
    if (s) q = q.or(`title.ilike.%${s}%,name.ilike.%${s}%,filename.ilike.%${s}%,participants.ilike.%${s}%`)
    const { data } = await q.range(offset, offset + PAGE_SIZE - 1)
    return (data ?? []) as ChatRecord[]
  }

  async function fetchCount() {
    const { count } = await supabase.from('whatsapp_chats').select('*', { count: 'exact', head: true })
    setTotalCount(count ?? 0)
  }

  useEffect(() => {
    Promise.all([
      fetchPage('', 0).then(rows => { setChats(rows); setHasMore(rows.length === PAGE_SIZE) }),
      fetchCount(),
    ]).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return }
    setChats([])
    setHasMore(true)
    fetchPage(debouncedSearch, 0).then(rows => { setChats(rows); setHasMore(rows.length === PAGE_SIZE) })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    const [rows] = await Promise.all([fetchPage(debouncedSearch, 0), fetchCount()])
    setChats(rows)
    setHasMore(rows.length === PAGE_SIZE)
    setRefreshing(false)
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onLoadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const rows = await fetchPage(debouncedSearch, chats.length)
    setChats(prev => [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  async function deleteChat(id: string) {
    Alert.alert('Delete chat archive?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('whatsapp_chats').delete().eq('id', id)
          setChats(prev => prev.filter(x => x.id !== id))
          setTotalCount(c => Math.max(0, c - 1))
          setSelected(null)
        },
      },
    ])
  }

  function handleUploadForChat(item: ChatRecord) {
    const title = item.title || item.name || item.filename || 'Chat'
    setUploadingId(item.id)
    pickAndUpload(title, record => {
      setChats(prev => [record, ...prev])
      setTotalCount(c => c + 1)
    }).finally(() => setUploadingId(null))
  }

  function handleAddNew() {
    Alert.prompt(
      'New Chat Group',
      'Enter a name for this chat group:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: (name?: string) => {
            if (!name?.trim()) return
            setAddingNew(true)
            pickAndUpload(name.trim(), record => {
              setChats(prev => [record, ...prev])
              setTotalCount(c => c + 1)
            }).finally(() => setAddingNew(false))
          },
        },
      ],
      'plain-text'
    )
  }

  if (selected) {
    return <ChatDetail item={selected} onClose={() => setSelected(null)} onDelete={() => deleteChat(selected.id)} />
  }

  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}><ActivityIndicator color="#2d1b69" /></View>
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      {/* Search bar + new group button */}
      <View style={{ backgroundColor: '#f2f2f7', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(118,118,128,0.12)', borderRadius: 10, paddingHorizontal: 10, gap: 6 }}>
          <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)' }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#000', paddingVertical: 9 }}
            placeholder="Search chats…" placeholderTextColor="rgba(60,60,67,0.4)"
            value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          onPress={handleAddNew}
          disabled={addingNew}
          style={{
            backgroundColor: '#2d1b69', borderRadius: 10,
            paddingHorizontal: 14, paddingVertical: 9,
            opacity: addingNew ? 0.7 : 1,
          }}
        >
          {addingNew
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>+ New</Text>
          }
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.18)', marginLeft: 72 }} />}
        ListHeaderComponent={<View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <ChatRow
            item={item}
            uploading={uploadingId === item.id}
            onPress={() => setSelected(item)}
            onUpload={() => handleUploadForChat(item)}
          />
        )}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color="#2d1b69" style={{ paddingVertical: 20 }} />
            : !hasMore && chats.length > 0
              ? <Text style={{ textAlign: 'center', color: 'rgba(60,60,67,0.4)', fontSize: 12, paddingVertical: 24 }}>
                  {totalCount} archive{totalCount !== 1 ? 's' : ''} total
                </Text>
              : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>💬</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 }}>No chat archives</Text>
            <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', textAlign: 'center' }}>
              Tap "+ New" to archive a WhatsApp chat export.
            </Text>
          </View>
        }
      />
    </View>
  )
}
