import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'

interface Report {
  id: string
  content_type: string
  content_id: string
  reason: string
  created_at: string
  reporter?: { first_name: string; last_name: string } | null
}

const TYPE_LABEL: Record<string, { label: string; emoji: string }> = {
  thread:  { label: 'Forum Thread',  emoji: '💬' },
  reply:   { label: 'Forum Reply',   emoji: '↩️' },
  poem:    { label: 'Poetry',        emoji: '📜' },
  memoir:  { label: 'Memoir',        emoji: '📖' },
}

const TYPE_COLOR: Record<string, string> = {
  thread: '#dbeafe',
  reply:  '#ede9fe',
  poem:   '#fef9c3',
  memoir: '#d1fae5',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('reports')
      .select('id, content_type, content_id, reason, created_at, reporter:reporter_id(first_name, last_name)')
      .order('created_at', { ascending: false })
    setReports((data ?? []) as Report[])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  function dismiss(id: string) {
    Alert.alert(
      'Dismiss report',
      'Mark this report as reviewed and remove it from the list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss', style: 'destructive',
          onPress: async () => {
            await supabase.from('reports').delete().eq('id', id)
            setReports(prev => prev.filter(r => r.id !== id))
          },
        },
      ]
    )
  }

  function navigateToContent(report: Report) {
    if (report.content_type === 'thread' || report.content_type === 'reply') {
      const threadId = report.content_type === 'thread' ? report.content_id : null
      if (threadId) {
        router.push({ pathname: '/(tabs)/community/forum/[id]' as any, params: { id: threadId } })
      } else {
        Alert.alert('View Content', 'Navigate to The Forum to find and review this reply.')
      }
    } else if (report.content_type === 'poem') {
      router.push('/(tabs)/community/poetry' as any)
    } else if (report.content_type === 'memoir') {
      router.push('/(tabs)/community/memoirs' as any)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="Flagged Content" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Flagged Content" showBack />

      {reports.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🏳️</Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No reports</Text>
          <Text style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center' }}>
            All clear — no content has been flagged by members.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          ListHeaderComponent={
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>
                {reports.length} report{reports.length !== 1 ? 's' : ''} awaiting review
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = TYPE_LABEL[item.content_type] ?? { label: item.content_type, emoji: '⚑' }
            const bgColor = TYPE_COLOR[item.content_type] ?? '#f3f4f6'
            const reporter = item.reporter
              ? `${item.reporter.first_name} ${item.reporter.last_name}`
              : 'Unknown member'

            return (
              <View style={{
                backgroundColor: '#fff', borderRadius: 14,
                overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
              }}>
                {/* Type banner */}
                <View style={{ backgroundColor: bgColor, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }}>{meta.label}</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{timeAgo(item.created_at)}</Text>
                </View>

                <View style={{ padding: 14 }}>
                  {/* Reason */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280', width: 64, flexShrink: 0 }}>Reason</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#ef4444' }}>{item.reason}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280', width: 64, flexShrink: 0 }}>Reported by</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>{reporter}</Text>
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => navigateToContent(item)}
                      style={{
                        flex: 1, backgroundColor: '#2d1b69', borderRadius: 10,
                        paddingVertical: 10, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>View Content</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => dismiss(item.id)}
                      style={{
                        flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10,
                        paddingVertical: 10, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280' }}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}
