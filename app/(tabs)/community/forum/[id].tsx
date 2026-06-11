import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, Pressable, Alert,
} from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ReportButton } from '@/components/ReportButton'
import type { ForumThread, ForumReply } from '@/lib/types'

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

function Avatar({ author }: { author?: { first_name: string; last_name: string; photo_url?: string } }) {
  const uri = avatarUri(author?.photo_url)
  const initials = author ? `${author.first_name[0]}${author.last_name[0]}` : '?'
  return (
    <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {uri
        ? <Image source={{ uri }} style={{ width: 36, height: 36 }} contentFit="cover" />
        : <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{initials}</Text>
      }
    </View>
  )
}

type ReplyWithAuthor = ForumReply & { author?: { first_name: string; last_name: string; photo_url?: string } }

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, session } = useAuth()
  const insets = useSafeAreaInsets()
  const listRef = useRef<FlatList>(null)

  const [thread, setThread] = useState<ForumThread | null>(null)
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase
        .from('threads')
        .select('id, title, body, room, is_pinned, is_deleted, created_at, author_id, author:author_id(first_name, last_name, photo_url)')
        .eq('id', id)
        .single(),
      supabase
        .from('thread_replies')
        .select('id, thread_id, body, is_deleted, created_at, author_id, author:author_id(first_name, last_name, photo_url)')
        .eq('thread_id', id)
        .eq('is_deleted', false)
        .order('created_at'),
    ])
    setThread(t as unknown as ForumThread)
    setReplies((r ?? []) as unknown as ReplyWithAuthor[])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [id])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [id])

  async function submitReply() {
    if (!replyText.trim() || !session?.user?.id) return
    setSubmitting(true)
    const { data, error } = await supabase.from('thread_replies').insert({
      thread_id: id,
      body: replyText.trim(),
      content: replyText.trim(),
      author_id: session.user.id,
      user_id: session.user.id,
      is_deleted: false,
    }).select('id, thread_id, body, is_deleted, created_at, author_id, author:author_id(first_name, last_name, photo_url)').single()
    if (!error && data) {
      setReplies(prev => [...prev, data as unknown as ReplyWithAuthor])
      setReplyText('')
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
    setSubmitting(false)
  }

  async function deleteReply(replyId: string) {
    Alert.alert('Remove reply', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await supabase.from('thread_replies').update({ is_deleted: true }).eq('id', replyId)
          setReplies(prev => prev.filter(r => r.id !== replyId))
        }
      },
    ])
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const threadHeader = thread ? (
    <View style={{ margin: 12, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
      {thread.is_pinned ? (
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <View style={{ backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#d97706' }}>📌 Pinned</Text>
          </View>
        </View>
      ) : null}
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', lineHeight: 28, marginBottom: 12 }}>
        {thread.title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Avatar author={thread.author} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
            {thread.author ? `${thread.author.first_name} ${thread.author.last_name}` : 'Member'}
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(thread.created_at)}</Text>
        </View>
        <ReportButton contentType="thread" contentId={thread.id} />
      </View>
      {thread.body ? (
        <Text style={{ fontSize: 15, color: '#374151', lineHeight: 24 }}>{thread.body}</Text>
      ) : null}
    </View>
  ) : null

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <Stack.Screen options={{
        headerShown: true,
        title: 'Thread',
        headerTintColor: '#2d1b69',
        headerBackTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f2f2f7' },
        headerTitleStyle: { fontWeight: '700', color: '#1c1c1e' },
      }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        <FlatList
          ref={listRef}
          data={replies}
          keyExtractor={r => r.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={threadHeader}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => {
            const isOwn = item.author_id === session?.user?.id
            return (
              <View style={{
                flexDirection: 'row', gap: 10,
                marginHorizontal: 12, marginBottom: 8,
                backgroundColor: '#ffffff', borderRadius: 14,
                paddingHorizontal: 14, paddingVertical: 12,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
              }}>
                <Avatar author={item.author} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1c1c1e' }}>
                      {item.author ? `${item.author.first_name} ${item.author.last_name}` : 'Member'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#aeaeb2' }}>{timeAgo(item.created_at)}</Text>
                    <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {!isOwn && <ReportButton contentType="reply" contentId={item.id} />}
                      {(isOwn || isAdmin) && (
                        <Pressable onPress={() => deleteReply(item.id)}>
                          <Text style={{ fontSize: 12, color: '#c7c7cc' }}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, color: '#374151', lineHeight: 21 }}>{item.body}</Text>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 14, color: '#aeaeb2' }}>No replies yet. Be the first!</Text>
            </View>
          }
        />

        {/* Reply input */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', gap: 10,
          paddingHorizontal: 14, paddingTop: 10, paddingBottom: insets.bottom + 10,
          borderTopWidth: 1, borderTopColor: '#e5e5ea', backgroundColor: '#ffffff',
        }}>
          <Avatar author={user ? { first_name: user.first_name, last_name: user.last_name, photo_url: user.photo_url } : undefined} />
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a reply…"
            placeholderTextColor="#9ca3af"
            style={{
              flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20,
              paddingHorizontal: 14, paddingVertical: 9,
              fontSize: 14, color: '#111827', maxHeight: 100,
            }}
            multiline
            textAlignVertical="top"
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={submitReply}
            disabled={!replyText.trim() || submitting}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: replyText.trim() ? '#2d1b69' : '#e5e7eb',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ fontSize: 16, color: replyText.trim() ? '#fff' : '#9ca3af' }}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
