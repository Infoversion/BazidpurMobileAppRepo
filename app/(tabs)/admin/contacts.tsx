import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
  Alert, ActionSheetIOS, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '@/lib/supabase'
import { webAPI } from '@/lib/webApi'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'read'

interface ContactRecord {
  id: string
  name: string
  email: string
  subject?: string
  message: string
  is_read: boolean
  created_at: string
}

const PAGE_SIZE = 25

// ─── Segmented control ────────────────────────────────────────────────────────

function SegmentedControl({ tabs, selected, onSelect }: {
  tabs: { key: FilterTab; label: string }[]
  selected: FilterTab
  onSelect: (k: FilterTab) => void
}) {
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: 'rgba(118,118,128,0.12)',
      borderRadius: 9, padding: 2,
      marginHorizontal: 16, marginTop: 10, marginBottom: 8,
    }}>
      {tabs.map(tab => {
        const active = tab.key === selected
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.8}
            style={[
              { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 7 },
              active && {
                backgroundColor: '#fff',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
              },
            ]}
          >
            <Text style={{
              fontSize: 12, fontWeight: active ? '600' : '400',
              color: active ? '#000' : 'rgba(60,60,67,0.6)',
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Contact row ──────────────────────────────────────────────────────────────

function ContactRow({ item, onPress }: { item: ContactRecord; onPress: () => void }) {
  const date = new Date(item.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const preview = item.message.replace(/\n/g, ' ').trim()

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 13 }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0, backgroundColor: item.is_read ? 'transparent' : '#2d1b69' }} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: item.is_read ? '400' : '600', color: '#000' }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 11, color: 'rgba(60,60,67,0.4)', marginLeft: 8, flexShrink: 0 }}>{date}</Text>
        </View>
        {item.subject ? (
          <Text style={{ fontSize: 13, fontWeight: item.is_read ? '400' : '500', color: '#000', marginBottom: 1 }} numberOfLines={1}>
            {item.subject}
          </Text>
        ) : null}
        <Text style={{ fontSize: 13, color: 'rgba(60,60,67,0.55)' }} numberOfLines={1}>{preview}</Text>
      </View>

      <Text style={{ fontSize: 20, color: '#c7c7cc', marginTop: 2 }}>›</Text>
    </TouchableOpacity>
  )
}

// ─── Message detail + reply ───────────────────────────────────────────────────

type Attachment = DocumentPicker.DocumentPickerAsset

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MessageDetail({ item, onClose, onMarkRead, onDelete }: {
  item: ContactRecord
  onClose: () => void
  onMarkRead: () => void
  onDelete: () => void
}) {
  const [replyText, setReplyText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const date = new Date(item.created_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  async function pickAttachment() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      })
      if (!result.canceled) {
        setAttachments(prev => {
          const existing = new Set(prev.map(a => a.name))
          const fresh = result.assets.filter(a => !existing.has(a.name))
          return [...prev, ...fresh]
        })
      }
    } catch {
      Alert.alert('Error', 'Could not open the file picker.')
    }
  }

  function removeAttachment(name: string) {
    setAttachments(prev => prev.filter(a => a.name !== name))
  }

  async function sendReply() {
    if (!replyText.trim()) {
      Alert.alert('Empty reply', 'Please type a reply before sending.')
      return
    }

    setSending(true)
    try {
      const res = await webAPI('/api/admin/contacts', 'PUT', {
        id: item.id,
        reply_content: replyText.trim(),
        send_email: true,
        is_read: true,
      })

      if (res.ok) {
        setSent(true)
        setReplyText('')
        setAttachments([])
        onMarkRead()
      } else {
        const err = await res.json().catch(() => ({}))
        Alert.alert('Failed to send', err.message ?? `Server returned ${res.status}. Check the endpoint.`)
      }
    } catch (e: unknown) {
      Alert.alert('Network error', e instanceof Error ? e.message : 'Could not reach bazidpur.com')
    } finally {
      setSending(false)
    }
  }

  function showOptions() {
    const options = ['Mark as Read', 'Delete Message', 'Cancel']
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2, destructiveButtonIndex: 1 },
        i => { if (i === 0) onMarkRead(); else if (i === 1) onDelete() }
      )
    } else {
      Alert.alert('Options', '', [
        { text: 'Mark as Read', onPress: onMarkRead },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  const canSend = replyText.trim().length > 0

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f2f2f7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16, color: '#2d1b69' }}>‹ Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showOptions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 22, color: '#2d1b69' }}>⋯</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#000', marginTop: 12 }}>
          {item.subject ?? '(No subject)'}
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(60,60,67,0.6)', marginTop: 2 }}>
          From: {item.name} · {item.email}
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.4)', marginTop: 1 }}>{date}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Message body */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 15, color: '#000', lineHeight: 24 }}>{item.message}</Text>
        </View>

        {/* Sent confirmation */}
        {sent && (
          <View style={{ backgroundColor: '#d1fae5', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 18 }}>✅</Text>
            <Text style={{ flex: 1, fontSize: 14, color: '#065f46', fontWeight: '500' }}>
              Reply sent from support@bazidpur.com
            </Text>
          </View>
        )}

        {/* Reply composer */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>

          {/* To / from label */}
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(60,60,67,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Reply from support@bazidpur.com → {item.email}
            </Text>
          </View>

          {/* Reply body */}
          <TextInput
            style={{
              fontSize: 15, color: '#000', paddingHorizontal: 14,
              paddingVertical: 10, minHeight: 120, textAlignVertical: 'top',
            }}
            placeholder="Type your reply…"
            placeholderTextColor="rgba(60,60,67,0.35)"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            autoCorrect
          />

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 8, gap: 6 }}>
              <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.1)', marginBottom: 8 }} />
              {attachments.map(a => (
                <View key={a.name} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: '#f2f2f7', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 7,
                }}>
                  <Text style={{ fontSize: 16 }}>📎</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#000' }} numberOfLines={1}>{a.name}</Text>
                    {a.size ? (
                      <Text style={{ fontSize: 11, color: 'rgba(60,60,67,0.5)' }}>{formatBytes(a.size)}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeAttachment(a.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 16, color: 'rgba(60,60,67,0.4)', fontWeight: '300' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Toolbar: attach + send */}
          <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.12)', marginHorizontal: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
            {/* Attach button */}
            <TouchableOpacity
              onPress={pickAttachment}
              disabled={sending}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: '#f2f2f7', borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>📎</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#2d1b69' }}>
                Attach{attachments.length > 0 ? ` (${attachments.length})` : ''}
              </Text>
            </TouchableOpacity>

            {/* Send button */}
            <TouchableOpacity
              onPress={sendReply}
              disabled={sending || !canSend}
              style={{
                flex: 1, borderRadius: 8, paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: canSend ? '#2d1b69' : 'rgba(60,60,67,0.1)',
              }}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ fontSize: 14, fontWeight: '600', color: canSend ? '#fff' : 'rgba(60,60,67,0.35)' }}>
                    Send Reply
                  </Text>
              }
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ContactsScreen() {
  const [items, setItems] = useState<ContactRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [counts, setCounts] = useState({ all: 0, unread: 0 })
  const [selected, setSelected] = useState<ContactRecord | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 400)
    return () => clearTimeout(t)
  }, [search])

  async function fetchPage(f: FilterTab, s: string, offset: number): Promise<ContactRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from('contact_submissions').select('*').order('created_at', { ascending: false })
    if (f === 'unread') q = q.eq('is_read', false)
    else if (f === 'read') q = q.eq('is_read', true)
    if (s) q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%,message.ilike.%${s}%`)
    const { data } = await q.range(offset, offset + PAGE_SIZE - 1)
    return (data ?? []) as ContactRecord[]
  }

  async function fetchCounts() {
    const [{ count: all }, { count: unread }] = await Promise.all([
      supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
      supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('is_read', false),
    ])
    setCounts({ all: all ?? 0, unread: unread ?? 0 })
  }

  useEffect(() => {
    Promise.all([
      fetchPage('all', '', 0).then(rows => { setItems(rows); setHasMore(rows.length === PAGE_SIZE) }),
      fetchCounts(),
    ]).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return }
    setItems([])
    setHasMore(true)
    fetchPage(filter, debouncedSearch, 0).then(rows => {
      setItems(rows)
      setHasMore(rows.length === PAGE_SIZE)
    })
  }, [filter, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    const [rows] = await Promise.all([fetchPage(filter, debouncedSearch, 0), fetchCounts()])
    setItems(rows)
    setHasMore(rows.length === PAGE_SIZE)
    setRefreshing(false)
  }, [filter, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onLoadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const rows = await fetchPage(filter, debouncedSearch, items.length)
    setItems(prev => [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  async function markRead(id: string) {
    await supabase.from('contact_submissions').update({ is_read: true }).eq('id', id)
    setItems(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x))
    setCounts(c => ({ ...c, unread: Math.max(0, c.unread - 1) }))
    if (selected?.id === id) setSelected(s => s ? { ...s, is_read: true } : s)
  }

  async function deleteItem(id: string) {
    Alert.alert('Delete message?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('contact_submissions').delete().eq('id', id)
          setItems(prev => prev.filter(x => x.id !== id))
          setCounts(c => ({ ...c, all: c.all - 1 }))
          setSelected(null)
        },
      },
    ])
  }

  function openItem(item: ContactRecord) {
    setSelected(item)
    if (!item.is_read) markRead(item.id)
  }

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',    label: `All (${counts.all})` },
    { key: 'unread', label: `Unread${counts.unread > 0 ? ` (${counts.unread})` : ''}` },
    { key: 'read',   label: 'Read' },
  ]

  if (selected) {
    return (
      <MessageDetail
        item={selected}
        onClose={() => setSelected(null)}
        onMarkRead={() => markRead(selected.id)}
        onDelete={() => deleteItem(selected.id)}
      />
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      <View style={{ backgroundColor: '#f2f2f7', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: 'rgba(118,118,128,0.12)',
          borderRadius: 10, paddingHorizontal: 10, gap: 6,
        }}>
          <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)' }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#000', paddingVertical: 9 }}
            placeholder="Search name, email, message…"
            placeholderTextColor="rgba(60,60,67,0.4)"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <SegmentedControl tabs={FILTER_TABS} selected={filter} onSelect={setFilter} />

      <FlatList
        data={items}
        keyExtractor={u => u.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ItemSeparatorComponent={() => (
          <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.18)', marginLeft: 36 }} />
        )}
        ListHeaderComponent={<View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <ContactRow item={item} onPress={() => openItem(item)} />
        )}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color="#2d1b69" style={{ paddingVertical: 20 }} />
            : !hasMore && items.length > 0
              ? <Text style={{ textAlign: 'center', color: 'rgba(60,60,67,0.4)', fontSize: 12, paddingVertical: 24 }}>
                  {items.length} message{items.length !== 1 ? 's' : ''} total
                </Text>
              : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>✉️</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 }}>No messages</Text>
            <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', textAlign: 'center' }}>
              Contact submissions will appear here.
            </Text>
          </View>
        }
      />
    </View>
  )
}
