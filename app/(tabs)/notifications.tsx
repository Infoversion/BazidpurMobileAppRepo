import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, ActivityIndicator, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PurpleHeader } from '@/components/PurpleHeader'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/notifications'

interface NotificationRow {
  id: string
  type: 'forum_reply' | 'photo_comment' | 'membership_approved' | 'report_resolution' | 'moderation_action' | 'announcement'
  title: string
  body: string
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

const TYPE_META: Record<NotificationRow['type'], { emoji: string; tint: string; bg: string }> = {
  forum_reply:         { emoji: '💬', tint: '#1d4ed8', bg: '#dbeafe' },
  photo_comment:       { emoji: '🖼️', tint: '#9a3412', bg: '#ffedd5' },
  membership_approved: { emoji: '✅', tint: '#065f46', bg: '#d1fae5' },
  report_resolution:   { emoji: '⚑', tint: '#92400e', bg: '#fef3c7' },
  moderation_action:   { emoji: '🚫', tint: '#991b1b', bg: '#fee2e2' },
  announcement:        { emoji: '📣', tint: '#5b21b6', bg: '#ede9fe' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotificationsScreen() {
  const { session } = useAuth()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, data, read_at, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setItems((data ?? []) as NotificationRow[])
  }, [session])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  async function handleTap(item: NotificationRow) {
    if (!item.read_at) {
      await markNotificationRead(item.id)
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
    }
    // Deep-link the notification's destination if we have one
    const d = item.data ?? {}
    if (item.type === 'forum_reply' && typeof d.thread_id === 'string') {
      router.push({ pathname: '/(tabs)/community/forum/[id]' as any, params: { id: d.thread_id } })
    } else if (item.type === 'photo_comment' && typeof d.album_id === 'string') {
      router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id: d.album_id } })
    } else if (item.type === 'membership_approved') {
      router.push('/(tabs)/home')
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    setItems(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete notification?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('notifications').delete().eq('id', id)
          setItems(prev => prev.filter(n => n.id !== id))
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <PurpleHeader title="Notifications" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  const unreadCount = items.filter(n => !n.read_at).length

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <PurpleHeader title="Notifications" showBack />

      {items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>🔔</Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No notifications yet</Text>
          <Text style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center', lineHeight: 19 }}>
            When something happens that we should let you know about, it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          ListHeaderComponent={
            unreadCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  {unreadCount} unread
                </Text>
                <TouchableOpacity onPress={handleMarkAllRead}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#2d1b69' }}>Mark all read</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type] ?? { emoji: '🔔', tint: '#374151', bg: '#f3f4f6' }
            const unread = !item.read_at
            return (
              <TouchableOpacity
                onPress={() => handleTap(item)}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: unread ? '#faf7ff' : '#ffffff',
                  borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: unread ? '#e6dcf5' : '#f3f4f6',
                  flexDirection: 'row', gap: 12,
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {unread ? (
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#2d1b69' }} />
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 19 }} numberOfLines={3}>
                    {item.body}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{timeAgo(item.created_at)}</Text>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}
