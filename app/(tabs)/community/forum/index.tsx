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
import type { ForumThread } from '@/lib/types'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

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
    <View style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {uri
        ? <Image source={{ uri }} style={{ width: 34, height: 34 }} contentFit="cover" />
        : <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{initials}</Text>
      }
    </View>
  )
}

function NewThreadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user, session } = useAuth()
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!title.trim()) { setError('Title is required.'); return }
    if (!session?.user?.id) return
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase.from('threads').insert({
      title: title.trim(),
      body: body.trim() || null,
      content: body.trim() || null,
      room: 'general',
      author_id: session.user.id,
      user_id: session.user.id,
      is_pinned: false,
      is_deleted: false,
    })
    if (err) { setError(err.message); setSubmitting(false); return }
    setSubmitting(false)
    onCreated()
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>New Thread</Text>
            <TouchableOpacity onPress={submit} disabled={submitting}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: submitting ? '#9ca3af' : '#2d1b69' }}>
                {submitting ? 'Posting…' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20, gap: 14 }}>
            {error ? <Text style={{ fontSize: 13, color: '#ef4444' }}>{error}</Text> : null}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Thread title…"
              placeholderTextColor="#9ca3af"
              style={{
                fontSize: 17, fontWeight: '600', color: '#111827',
                borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12,
              }}
              maxLength={200}
              returnKeyType="next"
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="What's on your mind? (optional)"
              placeholderTextColor="#9ca3af"
              style={{ fontSize: 15, color: '#374151', lineHeight: 22, minHeight: 120 }}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function ForumScreen() {
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('threads')
      .select('id, title, body, room, is_pinned, is_deleted, created_at, author_id, author:author_id(first_name, last_name, photo_url), replies:thread_replies(count)')
      .eq('room', 'general')
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setThreads((data ?? []) as unknown as ForumThread[])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#2d1b69" /></View>
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={threads}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        contentContainerStyle={{ paddingVertical: 8 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6', marginLeft: 68 }} />}
        renderItem={({ item }) => {
          const replyCount = item.replies?.[0]?.count ?? 0
          const authorName = item.author ? `${item.author.first_name} ${item.author.last_name}` : 'Member'
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/community/forum/[id]' as any, params: { id: item.id } })}
              style={({ pressed }) => ({ backgroundColor: pressed ? '#f9fafb' : '#fff', paddingHorizontal: 16, paddingVertical: 14 })}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <ThreadAvatar author={item.author} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {item.is_pinned ? (
                      <View style={{ backgroundColor: '#fef3c7', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>📌 Pinned</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 22, marginBottom: 2 }}>
                    {item.title}
                  </Text>
                  {item.body ? (
                    <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 6 }} numberOfLines={2}>
                      {item.body}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>{authorName}</Text>
                    <Text style={{ fontSize: 11, color: '#d1d5db' }}>·</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(item.created_at)}</Text>
                    {replyCount > 0 ? (
                      <>
                        <Text style={{ fontSize: 11, color: '#d1d5db' }}>·</Text>
                        <Text style={{ fontSize: 11, color: '#6b7280' }}>💬 {replyCount}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
                <Text style={{ fontSize: 18, color: '#d1d5db', alignSelf: 'center' }}>›</Text>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
            <Text style={{ fontSize: 14, color: '#9ca3af' }}>No threads yet. Start the conversation!</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowCreate(true)}
        style={{
          position: 'absolute', bottom: 24, right: 20,
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center',
          shadowColor: '#2d1b69', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
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
