import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform,
  Pressable,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PurpleHeader } from '@/components/PurpleHeader'
import { ReportButton } from '@/components/ReportButton'
import { useBlockedUsers, confirmBlockUser } from '@/components/BlockUserButton'
import { AttachmentPicker, type Attachment } from '@/components/forum/AttachmentPicker'
import { AttachmentDisplay } from '@/components/forum/AttachmentDisplay'
import type { ForumThread } from '@/lib/types'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function mobileTypeToMediaType(type: string): 'image' | 'audio' | 'document' | 'youtube' {
  if (type === 'photo') return 'image'
  if (type === 'audio') return 'audio'
  if (type === 'pdf') return 'document'
  if (type === 'youtube') return 'youtube'
  return 'image'
}

function avatarUri(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${R2}/${url}`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function ThreadAvatar({ author }: { author?: ForumThread['author'] }) {
  const uri = avatarUri(author?.photo_url)
  const initials = author ? `${author.first_name[0]}${author.last_name[0]}` : '?'
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, overflow: 'hidden', backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {uri
        ? <Image source={{ uri }} style={{ width: 38, height: 38 }} contentFit="cover" />
        : <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{initials}</Text>
      }
    </View>
  )
}

function NewThreadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { session } = useAuth()
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!title.trim()) { setError('Title is required.'); return }
    if (!session?.user?.id) return
    setSubmitting(true)
    setError('')
    const { data: thread, error: err } = await supabase.from('threads').insert({
      title: title.trim(),
      body: body.trim() || null,
      content: body.trim() || null,
      room: 'general',
      author_id: session.user.id,
      user_id: session.user.id,
      is_pinned: false,
      is_deleted: false,
    }).select('id').single()
    if (err || !thread) { setError(err?.message || 'Failed to post.'); setSubmitting(false); return }
    if (attachment) {
      await supabase.from('thread_media').insert({
        thread_id: thread.id,
        reply_id: null,
        uploader_id: session.user.id,
        url: attachment.url,
        filename: attachment.filename ?? null,
        media_type: mobileTypeToMediaType(attachment.type),
        file_size: 0,
      })
    }
    setSubmitting(false)
    onCreated()
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 20,
            backgroundColor: '#ffffff',
            borderBottomWidth: 1, borderBottomColor: '#e5e5ea',
          }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 15, color: '#8e8e93' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e' }}>New Thread</Text>
            <TouchableOpacity onPress={submit} disabled={submitting}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: submitting ? '#aeaeb2' : '#2d1b69' }}>
                {submitting ? 'Posting…' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ margin: 16, backgroundColor: '#ffffff', borderRadius: 14, padding: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
            {error ? <Text style={{ fontSize: 13, color: '#ff3b30' }}>{error}</Text> : null}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Thread title…"
              placeholderTextColor="#aeaeb2"
              style={{
                fontSize: 17, fontWeight: '600', color: '#1c1c1e',
                borderBottomWidth: 1, borderBottomColor: '#e5e5ea', paddingBottom: 12,
              }}
              maxLength={200}
              returnKeyType="next"
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="What's on your mind? (optional)"
              placeholderTextColor="#aeaeb2"
              style={{ fontSize: 15, color: '#374151', lineHeight: 22, minHeight: 120 }}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Attach
              </Text>
              <AttachmentPicker value={attachment} onChange={setAttachment} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ForumGuide() {
  const [open, setOpen] = useState(false)
  const rows = [
    { icon: '✏️', title: 'Start a thread', desc: 'Tap the + button (bottom right) to post a new topic.' },
    { icon: '💬', title: 'Reply', desc: 'Open any thread and type in the reply box at the bottom.' },
    { icon: '📎', title: 'Attach media', desc: 'Tap 📎 in the reply bar to add a photo, audio clip, PDF, or YouTube link.' },
    { icon: '🚩', title: 'Flag content', desc: 'Tap the red 🚩 on any post to report it. Admins review all reports privately — the poster is not notified.' },
  ]
  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      style={{
        marginBottom: 8, backgroundColor: '#ede9ff', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1, borderColor: '#c4b5fd',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#4c1d95' }}>💡 How The Forum works</Text>
        <Text style={{ fontSize: 13, color: '#7c3aed' }}>{open ? '▲' : '▼'}</Text>
      </View>
      {open ? (
        <View style={{ marginTop: 10, gap: 10 }}>
          {rows.map(r => (
            <View key={r.title} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={{ fontSize: 16, width: 22 }}>{r.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#3b0764' }}>{r.title}</Text>
                <Text style={{ fontSize: 12, color: '#6d28d9', lineHeight: 17, marginTop: 1 }}>{r.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  )
}

export default function ForumScreen() {
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const { isBlocked, refresh: refreshBlocks } = useBlockedUsers()

  async function load() {
    const { data: threads } = await supabase
      .from('threads')
      .select('id, title, body, room, is_pinned, is_deleted, created_at, author_id, author:author_id(first_name, last_name, photo_url), replies:thread_replies(count)')
      .eq('room', 'general')
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    const threadIds = (threads ?? []).map(t => t.id)
    const { data: mediaRows } = threadIds.length > 0
      ? await supabase.from('thread_media').select('thread_id, media_type').in('thread_id', threadIds).is('reply_id', null)
      : { data: [] }

    const mediaMap: Record<string, string> = {}
    ;(mediaRows ?? []).forEach((m: any) => { if (!mediaMap[m.thread_id]) mediaMap[m.thread_id] = m.media_type })

    setThreads((threads ?? []).map(t => ({ ...t, media: mediaMap[t.id] ? [{ media_type: mediaMap[t.id] }] : [] })) as unknown as ForumThread[])
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
        <PurpleHeader title="The Forum" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="The Forum" showBack />
      <FlatList
        data={threads.filter(t => !isBlocked(t.author_id))}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 90 }}
        ListHeaderComponent={<ForumGuide />}
        renderItem={({ item }) => {
          const replyCount = item.replies?.[0]?.count ?? 0
          const authorName = item.author ? `${item.author.first_name} ${item.author.last_name}` : 'Member'
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/community/forum/[id]' as any, params: { id: item.id } })}
              onLongPress={() => {
                if (!session || item.author_id === session.user.id) return
                confirmBlockUser({
                  blockerId: session.user.id,
                  userId: item.author_id,
                  userName: authorName,
                  onBlocked: refreshBlocks,
                })
              }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#f5f5f5' : '#ffffff',
                borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
              })}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <ThreadAvatar author={item.author} />
                <View style={{ flex: 1 }}>
                  {item.is_pinned ? (
                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <View style={{ backgroundColor: '#fffbeb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>📌 Pinned</Text>
                      </View>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', lineHeight: 21, marginBottom: 4 }}>
                    {item.title}
                  </Text>
                  {item.body ? (
                    <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 18, marginBottom: 6 }} numberOfLines={2}>
                      {item.body}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 11, color: '#aeaeb2' }}>{authorName}</Text>
                    <Text style={{ fontSize: 11, color: '#d1d1d6' }}>·</Text>
                    <Text style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(item.created_at)}</Text>
                    {replyCount > 0 ? (
                      <>
                        <Text style={{ fontSize: 11, color: '#d1d1d6' }}>·</Text>
                        <Text style={{ fontSize: 11, color: '#8e8e93' }}>💬 {replyCount}</Text>
                      </>
                    ) : null}
                    {item.media?.[0]?.media_type === 'image'    && <Text style={{ fontSize: 11 }}>📷</Text>}
                    {item.media?.[0]?.media_type === 'audio'    && <Text style={{ fontSize: 11 }}>🎵</Text>}
                    {item.media?.[0]?.media_type === 'youtube'  && <Text style={{ fontSize: 11 }}>▶️</Text>}
                    {item.media?.[0]?.media_type === 'document' && <Text style={{ fontSize: 11 }}>📄</Text>}
                    <ReportButton contentType="thread" contentId={item.id} />
                  </View>
                </View>
                <Text style={{ fontSize: 18, color: '#c7c7cc', alignSelf: 'center' }}>›</Text>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>💬</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No threads yet</Text>
            <Text style={{ fontSize: 13, color: '#8e8e93' }}>Start the conversation!</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowCreate(true)}
        style={{
          position: 'absolute', bottom: insets.bottom + 90, right: 20,
          width: 54, height: 54, borderRadius: 27,
          backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center',
          shadowColor: '#2d1b69', shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
        }}
      >
        <Text style={{ fontSize: 26, color: '#fff', lineHeight: 30 }}>+</Text>
      </TouchableOpacity>

      {showCreate ? (
        <NewThreadModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      ) : null}
    </View>
  )
}
