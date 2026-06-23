import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
  Modal, TextInput, ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PurpleHeader } from '@/components/PurpleHeader'
import { AppDialog } from '@/components/AppDialog'
import { useDialog } from '@/lib/useDialog'

type ReportStatus = 'pending' | 'reviewed_ok' | 'warning_sent' | 'suspended'

interface Report {
  id: string
  content_type: string
  content_id: string
  reason: string
  created_at: string
  status: ReportStatus
  action_notes: string | null
  resolved_at: string | null
  resolved_by: string | null
  reporter?: { first_name: string; last_name: string } | null
  resolver?: { first_name: string; last_name: string } | null
}

const STATUS_LABEL: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  pending:      { label: 'Pending',       color: '#92400e', bg: '#fef3c7' },
  reviewed_ok:  { label: 'No action',     color: '#065f46', bg: '#d1fae5' },
  warning_sent: { label: 'Warning sent',  color: '#9a3412', bg: '#ffedd5' },
  suspended:    { label: 'User suspended', color: '#991b1b', bg: '#fee2e2' },
}

// Each reportable content_type maps to a (section, kind) pair. The section is
// the user-facing area of the app where the content lives ("The Gallery",
// "Timeless Moments", etc.), and the kind disambiguates the specific object
// type within that section.
const TYPE_LABEL: Record<string, { section: string; kind: string; emoji: string }> = {
  thread:                 { section: 'The Forum',          kind: 'Thread',     emoji: '💬' },
  reply:                  { section: 'The Forum',          kind: 'Reply',      emoji: '↩️' },
  poem:                   { section: 'Rhymes & Roots',     kind: 'Poetry',     emoji: '📜' },
  poetry:                 { section: 'Rhymes & Roots',     kind: 'Poetry',     emoji: '📜' },
  memoir:                 { section: 'Memoirs',            kind: 'Memoir',     emoji: '📖' },
  experience:             { section: 'Memoirs',            kind: 'Memoir',     emoji: '📖' },
  photo_album:            { section: 'The Gallery',        kind: 'Photo Album',emoji: '📷' },
  album_photo:            { section: 'The Gallery',        kind: 'Photo',      emoji: '🖼️' },
  video_album:            { section: 'The Gallery',        kind: 'Video Album',emoji: '🎬' },
  video_album_item:       { section: 'The Gallery',        kind: 'Video',      emoji: '🎞️' },
  timeless_moment:        { section: 'Timeless Moments',   kind: 'Photo',      emoji: '✨' },
  timeless_moment_video:  { section: 'Timeless Moments',   kind: 'Video',      emoji: '🎬' },
  comment:                { section: 'Community',          kind: 'Comment',    emoji: '🗨️' },
}

const TYPE_COLOR: Record<string, string> = {
  thread:                 '#dbeafe',
  reply:                  '#ede9fe',
  poem:                   '#fef9c3',
  poetry:                 '#fef9c3',
  memoir:                 '#d1fae5',
  experience:             '#d1fae5',
  photo_album:            '#ffedd5',
  album_photo:            '#fff7ed',
  video_album:            '#fce7f3',
  video_album_item:       '#fbe6f0',
  timeless_moment:        '#fef3c7',
  timeless_moment_video:  '#fde68a',
  comment:                '#f3f4f6',
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

function formatCST(dateStr: string) {
  // Render the reported date/time in Central Time (America/Chicago) so admins
  // anywhere in the world see a consistent reference clock for triage.
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    })
  } catch {
    return dateStr
  }
}

// Maps each reportable content_type to the table + column we look up to find
// the offending user's id. Used when an admin chooses "Suspend user".
const OFFENDER_LOOKUP: Record<string, { table: string; column: string } | null> = {
  thread:           { table: 'threads',            column: 'author_id' },
  reply:            { table: 'thread_replies',     column: 'user_id' },
  poem:             null, // admin-curated
  memoir:           null, // admin-curated
  photo_album:      { table: 'photo_albums',       column: 'user_id' },
  album_photo:      { table: 'album_photos',       column: 'uploaded_by' },
  video_album:      { table: 'video_albums',       column: 'user_id' },
  video_album_item: { table: 'video_album_items',  column: 'uploaded_by' },
  comment:          { table: 'comments',           column: 'user_id' },
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending')
  const [actionTarget, setActionTarget] = useState<Report | null>(null)
  const [locations, setLocations] = useState<Record<string, string>>({})
  const { dialog, show, hide } = useDialog()

  async function load() {
    const { data } = await supabase
      .from('reports')
      .select('id, content_type, content_id, reason, created_at, status, action_notes, resolved_at, resolved_by, reporter:reporter_id(first_name, last_name), resolver:resolved_by(first_name, last_name)')
      .order('created_at', { ascending: false })
    const reps = (data ?? []) as unknown as Report[]
    setReports(reps)
    return reps
  }

  async function resolveLocation(report: Report): Promise<string> {
    const { content_type: t, content_id: id } = report
    try {
      if (t === 'thread') {
        const { data } = await supabase.from('threads').select('title').eq('id', id).single()
        return `Community → The Forum → "${data?.title ?? 'Thread'}"`
      }
      if (t === 'reply') {
        const { data } = await supabase.from('thread_replies').select('thread_id').eq('id', id).single()
        if (data?.thread_id) {
          const { data: th } = await supabase.from('threads').select('title').eq('id', data.thread_id).single()
          return `Community → The Forum → "${th?.title ?? 'Thread'}" → Reply`
        }
        return 'Community → The Forum → Reply'
      }
      if (t === 'poem' || t === 'poetry') {
        return 'Community → Rhymes & Roots → Poetry'
      }
      if (t === 'memoir' || t === 'experience') {
        const { data } = await supabase.from('experiences').select('title').eq('id', id).single()
        return `Community → Memoirs → "${data?.title ?? 'Memoir'}"`
      }
      if (t === 'photo_album') {
        const { data } = await supabase.from('photo_albums').select('name').eq('id', id).single()
        return `Community → Gallery → Photo Albums → "${data?.name ?? 'Album'}"`
      }
      if (t === 'album_photo') {
        const { data } = await supabase.from('album_photos').select('album_id').eq('id', id).single()
        if (data?.album_id) {
          const { data: album } = await supabase.from('photo_albums').select('name').eq('id', data.album_id).single()
          return `Community → Gallery → "${album?.name ?? 'Album'}" → Photo`
        }
        return 'Community → Gallery → Photo'
      }
      if (t === 'video_album') {
        const { data } = await supabase.from('video_albums').select('name').eq('id', id).single()
        return `Community → Gallery → Video Albums → "${data?.name ?? 'Album'}"`
      }
      if (t === 'video_album_item') {
        const { data } = await supabase.from('video_album_items').select('album_id').eq('id', id).single()
        if (data?.album_id) {
          const { data: album } = await supabase.from('video_albums').select('name').eq('id', data.album_id).single()
          return `Community → Gallery → "${album?.name ?? 'Album'}" → Video`
        }
        return 'Community → Gallery → Video'
      }
      if (t === 'timeless_moment') {
        const { data } = await supabase.from('timeless_moments').select('title').eq('id', id).single()
        return `Community → Timeless Moments → Photos → "${data?.title ?? 'Photo'}"`
      }
      if (t === 'timeless_moment_video') {
        const { data } = await supabase.from('timeless_moment_videos').select('title').eq('id', id).single()
        return `Community → Timeless Moments → Videos → "${data?.title ?? 'Video'}"`
      }
      if (t === 'comment') {
        const { data } = await supabase.from('comments').select('entity_type, entity_id').eq('id', id).single()
        if (!data) return 'Community → Comment (deleted)'
        const { entity_type: et, entity_id: eid } = data as { entity_type: string; entity_id: string }
        if (et === 'photo_album') {
          const { data: album } = await supabase.from('photo_albums').select('name').eq('id', eid).single()
          return `Community → Gallery → Photo Albums → "${album?.name ?? 'Album'}" → Comments`
        }
        if (et === 'album_photo') {
          const { data: photo } = await supabase.from('album_photos').select('album_id').eq('id', eid).single()
          if (photo?.album_id) {
            const { data: album } = await supabase.from('photo_albums').select('name').eq('id', photo.album_id).single()
            return `Community → Gallery → "${album?.name ?? 'Album'}" → Photo → Comments`
          }
          return 'Community → Gallery → Photo → Comments'
        }
        if (et === 'video_album') {
          const { data: album } = await supabase.from('video_albums').select('name').eq('id', eid).single()
          return `Community → Gallery → Video Albums → "${album?.name ?? 'Album'}" → Comments`
        }
        if (et === 'experience') {
          const { data: exp } = await supabase.from('experiences').select('title').eq('id', eid).single()
          return `Community → Memoirs → "${exp?.title ?? 'Memoir'}" → Comments`
        }
        if (et === 'timeless_moment') {
          const { data: moment } = await supabase.from('timeless_moments').select('title').eq('id', eid).single()
          return `Community → Timeless Moments → Photos → "${moment?.title ?? 'Photo'}" → Comments`
        }
        if (et === 'timeless_moment_video') {
          const { data: vid } = await supabase.from('timeless_moment_videos').select('title').eq('id', eid).single()
          return `Community → Timeless Moments → Videos → "${vid?.title ?? 'Video'}" → Comments`
        }
        return `Community → Comment (on: ${et})`
      }
    } catch {
      // fall through to generic label
    }
    return t
  }

  async function loadWithLocations() {
    const reps = await load()
    const entries = await Promise.all(reps.map(async r => [r.id, await resolveLocation(r)] as const))
    setLocations(Object.fromEntries(entries))
  }

  useEffect(() => { loadWithLocations().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadWithLocations()
    setRefreshing(false)
  }, [])

  /**
   * Apply an admin action to a report. Updates the report row with the
   * chosen status, notes, resolver, and timestamp. If the action is
   * "suspended", also looks up the offending user via the content_type
   * mapping and flips their role + suspended_at + suspension_reason.
   * Finally fires (and forgets) the reporter notification email.
   */
  async function applyAction(report: Report, status: ReportStatus, notes: string) {
    if (!session) return

    // For "suspended", find the offender and lock them out
    if (status === 'suspended') {
      const lookup = OFFENDER_LOOKUP[report.content_type]
      if (!lookup) {
        show('error', 'Cannot suspend', `The "${report.content_type}" type is admin-curated and has no offender to suspend.`)
        return
      }
      const { data: contentRow, error: lookupError } = await supabase
        .from(lookup.table).select(lookup.column).eq('id', report.content_id).single()
      if (lookupError || !contentRow) {
        show('error', 'Cannot suspend', 'The reported content may have been deleted, so the offender could not be identified.')
        return
      }
      const offenderId = (contentRow as Record<string, string | null>)[lookup.column]
      if (!offenderId) {
        show('error', 'Cannot suspend', 'No author is associated with the reported content.')
        return
      }
      const { error: suspendError } = await supabase
        .from('users')
        .update({
          role: 'suspended',
          suspended_at: new Date().toISOString(),
          suspension_reason: notes.trim() || `Reported as "${report.reason}"`,
        })
        .eq('id', offenderId)
      if (suspendError) {
        show('error', 'Could not suspend user', suspendError.message)
        return
      }
    }

    const { error } = await supabase
      .from('reports')
      .update({
        status,
        action_notes: notes.trim() || null,
        resolved_at: new Date().toISOString(),
        resolved_by: session.user.id,
      })
      .eq('id', report.id)

    if (error) {
      show('error', 'Could not save action', error.message)
      return
    }

    setReports(prev => prev.map(r => r.id === report.id ? {
      ...r,
      status, action_notes: notes.trim() || null,
      resolved_at: new Date().toISOString(),
      resolved_by: session.user.id,
    } : r))
    setActionTarget(null)

    // Notify the reporter — fire and forget.
    // Note the explicit https://www. host: the apex domain 308-redirects to
    // www, and iOS NSURLSession does not follow 308 on POST-with-body, which
    // would hang the request forever. The token is also passed as ?_t= in
    // case the Authorization header is dropped by NSURLSession on dev builds.
    const url = `https://www.bazidpur.com/api/report-resolution-notification?_t=${encodeURIComponent(session.access_token)}`
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ reportId: report.id }),
    }).catch(() => { /* silent — the action is already saved in the DB */ })
  }

  async function navigateToContent(report: Report) {
    const { content_type: t, content_id: id } = report

    // Helper to look up a parent id when the reported content is a child row
    async function lookupParent(table: string, column: string): Promise<string | null> {
      const { data, error } = await supabase.from(table).select(column).eq('id', id).single()
      if (error || !data) return null
      return (data as Record<string, string | null>)[column] ?? null
    }

    if (t === 'thread') {
      router.push({ pathname: '/(tabs)/community/forum/[id]' as any, params: { id } })
      return
    }
    if (t === 'reply') {
      const threadId = await lookupParent('thread_replies', 'thread_id')
      if (!threadId) { show('info', 'Not found', 'This reply may have been deleted.'); return }
      router.push({ pathname: '/(tabs)/community/forum/[id]' as any, params: { id: threadId } })
      return
    }
    if (t === 'poem') {
      router.push('/(tabs)/community/poetry' as any)
      return
    }
    if (t === 'memoir') {
      router.push('/(tabs)/community/memoirs' as any)
      return
    }
    if (t === 'photo_album') {
      router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id } })
      return
    }
    if (t === 'album_photo') {
      const albumId = await lookupParent('album_photos', 'album_id')
      if (!albumId) { show('info', 'Not found', 'This photo may have been deleted.'); return }
      router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id: albumId } })
      return
    }
    if (t === 'video_album') {
      router.push({ pathname: '/(tabs)/community/video-album/[id]' as any, params: { id } })
      return
    }
    if (t === 'video_album_item') {
      const albumId = await lookupParent('video_album_items', 'album_id')
      if (!albumId) { show('info', 'Not found', 'This video may have been deleted.'); return }
      router.push({ pathname: '/(tabs)/community/video-album/[id]' as any, params: { id: albumId } })
      return
    }
    if (t === 'timeless_moment' || t === 'timeless_moment_video') {
      router.push('/(tabs)/community/moments' as any)
      return
    }
    if (t === 'comment') {
      const { data, error } = await supabase.from('comments').select('entity_type, entity_id').eq('id', id).single()
      if (error || !data) { show('info', 'Not found', 'This comment may have been deleted.'); return }
      const et = (data as { entity_type: string; entity_id: string }).entity_type
      const eid = (data as { entity_type: string; entity_id: string }).entity_id
      if (et === 'photo_album') {
        router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id: eid } })
      } else if (et === 'album_photo') {
        const { data: photoRow } = await supabase.from('album_photos').select('album_id').eq('id', eid).single()
        if (!photoRow?.album_id) { show('info', 'Not found', 'This photo may have been deleted.'); return }
        router.push({ pathname: '/(tabs)/community/album/[id]' as any, params: { id: photoRow.album_id } })
      } else if (et === 'video_album') {
        router.push({ pathname: '/(tabs)/community/video-album/[id]' as any, params: { id: eid } })
      } else if (et === 'experience') {
        router.push({ pathname: '/(tabs)/community/memoir/[id]' as any, params: { id: eid } })
      } else if (et === 'timeless_moment' || et === 'timeless_moment_video') {
        router.push('/(tabs)/community/moments' as any)
      } else {
        show('info', 'Unsupported', `No viewer for comment on: ${et}`)
      }
      return
    }
    show('info', 'Unsupported', `No viewer is wired up for content type: ${t}`)
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

  const visible = reports.filter(r => filter === 'pending' ? r.status === 'pending' : r.status !== 'pending')
  const pendingCount = reports.filter(r => r.status === 'pending').length
  const resolvedCount = reports.length - pendingCount

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Flagged Content" showBack />

      {/* Pending / Resolved toggle */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 10, padding: 3, gap: 3 }}>
          {(['pending', 'resolved'] as const).map(opt => {
            const count = opt === 'pending' ? pendingCount : resolvedCount
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => setFilter(opt)}
                style={{
                  flex: 1, paddingVertical: 9, borderRadius: 7, alignItems: 'center',
                  backgroundColor: filter === opt ? '#2d1b69' : '#ffffff',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: filter === opt ? '#ffffff' : '#374151' }}>
                  {opt === 'pending' ? '🕒  Pending' : '✅  Resolved'}{count ? `  (${count})` : ''}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {visible.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>{filter === 'pending' ? '🏳️' : '🗂️'}</Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>
            {filter === 'pending' ? 'No pending reports' : 'No resolved reports yet'}
          </Text>
          <Text style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center' }}>
            {filter === 'pending'
              ? 'All clear — no content is awaiting review.'
              : 'Reports you act on will appear here as an audit trail.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          renderItem={({ item }) => {
            const meta = TYPE_LABEL[item.content_type] ?? { section: 'Unknown', kind: item.content_type, emoji: '⚑' }
            const bgColor = TYPE_COLOR[item.content_type] ?? '#f3f4f6'
            const reporter = item.reporter
              ? `${item.reporter.first_name} ${item.reporter.last_name}`
              : 'Unknown member'
            const statusMeta = STATUS_LABEL[item.status]
            const resolver = item.resolver ? `${item.resolver.first_name} ${item.resolver.last_name}` : 'an admin'

            return (
              <View style={{
                backgroundColor: '#fff', borderRadius: 14,
                overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
              }}>
                {/* Type banner — shows the section name + object kind, plus
                    status badge and the reported timestamp in CST. */}
                <View style={{ backgroundColor: bgColor, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }}>{meta.section}</Text>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>•</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>{meta.kind}</Text>
                  <View style={{ marginLeft: 'auto' }}>
                    <View style={{ backgroundColor: statusMeta.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: statusMeta.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{statusMeta.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>Reported {formatCST(item.created_at)}</Text>
                </View>

                <View style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280', width: 84, flexShrink: 0 }}>Reason</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#ef4444' }}>{item.reason}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280', width: 84, flexShrink: 0 }}>Reported by</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>{reporter}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: item.status === 'pending' ? 14 : 8 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280', width: 84, flexShrink: 0 }}>Location</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 17 }}>
                      {locations[item.id] ?? '…'}
                    </Text>
                  </View>

                  {/* Resolution details (resolved tab only) */}
                  {item.status !== 'pending' && item.resolved_at ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, color: '#6b7280', width: 84, flexShrink: 0 }}>Resolved by</Text>
                        <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>{resolver} · {timeAgo(item.resolved_at)}</Text>
                      </View>
                      {item.action_notes ? (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
                          <Text style={{ fontSize: 13, color: '#6b7280', width: 84, flexShrink: 0 }}>Notes</Text>
                          <Text style={{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 }}>{item.action_notes}</Text>
                        </View>
                      ) : <View style={{ height: 14 }} />}
                    </>
                  ) : null}

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
                    {item.status === 'pending' ? (
                      <TouchableOpacity
                        onPress={() => setActionTarget(item)}
                        style={{
                          flex: 1, backgroundColor: '#ef4444', borderRadius: 10,
                          paddingVertical: 10, alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Take Action</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setActionTarget(item)}
                        style={{
                          flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10,
                          paddingVertical: 10, alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280' }}>Update Action</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}

      {actionTarget && (
        <ActionModal
          report={actionTarget}
          onClose={() => setActionTarget(null)}
          onApply={applyAction}
        />
      )}
      <AppDialog {...dialog} onClose={hide} />
    </View>
  )
}

// ── Action modal ─────────────────────────────────────────────────────────────
function ActionModal({
  report, onClose, onApply,
}: {
  report: Report
  onClose: () => void
  onApply: (report: Report, status: ReportStatus, notes: string) => Promise<void>
}) {
  const insets = useSafeAreaInsets()
  const [choice, setChoice] = useState<ReportStatus | null>(
    report.status !== 'pending' ? report.status : null
  )
  const [notes, setNotes] = useState(report.action_notes ?? '')
  const [saving, setSaving] = useState(false)
  const { dialog: aDialog, show: aShow, hide: aHide } = useDialog()

  const options: Array<{ key: ReportStatus; title: string; desc: string; tint: string }> = [
    {
      key: 'reviewed_ok',
      title: '✅  Reviewed — no action needed',
      desc: 'The content complies with the Bazidpur Community Guidelines. The reporter is emailed to let them know no action was taken.',
      tint: '#065f46',
    },
    {
      key: 'warning_sent',
      title: '⚠️  Send a warning to the member',
      desc: 'The content breaches our guidelines but does not warrant suspension. The reporter is emailed that we agreed and issued a warning.',
      tint: '#9a3412',
    },
    {
      key: 'suspended',
      title: '🚫  Suspend the member',
      desc: 'The member is suspended and signed out. Use for repeat or severe breaches. The reporter is emailed that we agreed and suspended the member.',
      tint: '#991b1b',
    },
  ]

  async function submit() {
    if (!choice) { aShow('info', 'Choose an action', 'Pick one of the three options to record what you did.'); return }
    setSaving(true)
    try { await onApply(report, choice, notes) }
    finally { setSaving(false) }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 20,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 15, color: '#6b7280' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Record Action</Text>
          <TouchableOpacity onPress={submit} disabled={saving || !choice}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !choice ? '#9ca3af' : '#2d1b69' }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 4 }}>
            Choose the action you took on this report. Your name and the timestamp are saved as an audit trail.
          </Text>

          {options.map(opt => {
            const selected = choice === opt.key
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setChoice(opt.key)}
                style={{
                  borderWidth: 2, borderRadius: 12, padding: 14,
                  borderColor: selected ? opt.tint : '#e5e7eb',
                  backgroundColor: selected ? `${opt.tint}10` : '#ffffff',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? opt.tint : '#1c1c1e', marginBottom: 4 }}>
                  {opt.title}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18 }}>{opt.desc}</Text>
              </TouchableOpacity>
            )
          })}

          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Member already given a verbal reminder last month. Sent follow-up email today."
              placeholderTextColor="#9ca3af"
              style={{
                fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: 'top',
              }}
              multiline
              maxLength={2000}
            />
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
              Visible to admins only. Used for follow-up if this member is reported again.
            </Text>
          </View>
        </ScrollView>
        <AppDialog {...aDialog} onClose={aHide} />
      </View>
    </Modal>
  )
}
