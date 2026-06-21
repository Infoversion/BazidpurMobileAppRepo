import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert,
  Modal, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ErrorDialog } from '@/components/ErrorDialog'

export type LikeCommentEntityType =
  | 'album_photo'
  | 'photo_album'
  | 'video_album'
  | 'timeless_moment'
  | 'timeless_moment_video'
  | 'experience'
  | 'poetry'

interface CommentRow {
  id: string
  content: string
  created_at: string
  user_id: string
  user: {
    first_name: string | null
    last_name: string | null
    photo_url: string | null
  } | null
}

interface LikerRow {
  user_id: string
  user: {
    first_name: string | null
    last_name: string | null
    photo_url: string | null
  } | null
}

interface Props {
  entityType: LikeCommentEntityType
  entityId: string
  initiallyExpanded?: boolean
  noTopBorder?: boolean
  /** Fired when the authoritative comment count changes — useful when this
   *  component is rendered inside a modal whose parent needs to mirror the
   *  count (e.g. LightboxToolbar). */
  onCommentCountChange?: (count: number) => void
}

const REPORT_REASONS = [
  'Inappropriate content',
  'Harassment or bullying',
  'Spam or misleading',
  'Privacy violation',
  'Other',
]

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`
  return new Date(iso).toLocaleDateString()
}

function fullName(user: { first_name?: string | null; last_name?: string | null } | null | undefined) {
  if (!user) return 'Member'
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Member'
}

function initials(user: { first_name?: string | null; last_name?: string | null } | null | undefined) {
  const f = user?.first_name?.[0] ?? ''
  const l = user?.last_name?.[0] ?? ''
  return (f + l).toUpperCase() || 'B'
}

function Avatar({ uri, name, size = 30 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    )
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#2d1b69',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700' }}>{name}</Text>
    </View>
  )
}

export function LikesComments({
  entityType,
  entityId,
  initiallyExpanded = false,
  noTopBorder = false,
  onCommentCountChange,
}: Props) {
  const { session } = useAuth()
  const userId = session?.user.id

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [totalCommentCount, setTotalCommentCount] = useState(0)
  const [showComments, setShowComments] = useState(initiallyExpanded)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [liking, setLiking] = useState(false)

  const [composerOpen, setComposerOpen] = useState(false)
  const [likersOpen, setLikersOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<{ title: string; detail?: string } | null>(null)

  const PAGE_SIZE = 10

  async function fetchCommentsPage(offset: number) {
    // Most recent first; we slice in PAGE_SIZE chunks. The newest 10 show up,
    // then "Load more" appends older ones.
    return supabase
      .from('comments')
      .select('id, content, created_at, user_id, user:users!comments_user_id_fkey(first_name, last_name, photo_url)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
  }

  async function refresh() {
    const [countRes, totalCommentsRes, firstPageRes, likedRes] = await Promise.all([
      supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId),
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('is_deleted', false),
      fetchCommentsPage(0),
      userId
        ? supabase
            .from('likes')
            .select('id')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    setLikeCount(countRes.count ?? 0)
    setTotalCommentCount(totalCommentsRes.count ?? 0)
    setComments((firstPageRes.data ?? []) as unknown as CommentRow[])
    setLiked(!!likedRes.data)
    setLoading(false)
  }

  async function loadMoreComments() {
    if (loadingMore || comments.length >= totalCommentCount) return
    setLoadingMore(true)
    const { data } = await fetchCommentsPage(comments.length)
    setComments(prev => [...prev, ...((data ?? []) as unknown as CommentRow[])])
    setLoadingMore(false)
  }

  useEffect(() => {
    setLoading(true)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, userId])

  useEffect(() => {
    onCommentCountChange?.(totalCommentCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCommentCount])

  async function handleLike() {
    if (!userId || liking) return
    setLiking(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => (wasLiked ? c - 1 : c + 1))
    if (wasLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
      if (error) {
        setLiked(true)
        setLikeCount(c => c + 1)
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: userId, entity_type: entityType, entity_id: entityId })
      if (error) {
        setLiked(false)
        setLikeCount(c => c - 1)
      }
    }
    setLiking(false)
  }

  async function handleSubmitComment(content: string) {
    if (!userId || !content.trim()) return false
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        content: content.trim(),
      })
      .select('id, content, created_at, user_id, user:users!comments_user_id_fkey(first_name, last_name, photo_url)')
      .single()
    if (error || !data) {
      setErrorMsg({ title: 'Could not post comment', detail: error?.message })
      return false
    }
    // Prepend to the list (newest-first ordering matches the paginated fetch)
    // and bump the authoritative count so the counter visibly increments.
    setComments(prev => [data as unknown as CommentRow, ...prev])
    setTotalCommentCount(c => c + 1)
    return true
  }

  async function handleDeleteComment(commentId: string) {
    Alert.alert('Delete comment?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Hard delete via direct Supabase. The web endpoint uses cookie auth
          // which mobile (Bearer auth) can't access; and the soft-delete UPDATE
          // approach was blocked by RLS WITH CHECK. RLS DELETE policy permits
          // `auth.uid() = user_id` which we match via the .eq filter.
          const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId)
            .eq('user_id', userId!)
          if (error) {
            setErrorMsg({ title: 'Could not delete comment', detail: error.message })
            return
          }
          setComments(prev => prev.filter(c => c.id !== commentId))
          setTotalCommentCount(c => Math.max(0, c - 1))
        },
      },
    ])
  }

  function handleFlagComment(commentId: string) {
    if (!userId) return
    Alert.alert(
      'Report comment',
      'Why are you reporting this comment? Our team reviews reports within 48 hours.',
      [
        ...REPORT_REASONS.map(reason => ({
          text: reason,
          onPress: async () => {
            await supabase.from('reports').insert({
              reporter_id: userId,
              content_type: 'comment',
              content_id: commentId,
              reason,
            })
            Alert.alert('Report submitted', 'Thank you. Our team will review this comment within 48 hours.')
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  return (
    <View
      style={{
        marginTop: 12,
        borderTopWidth: noTopBorder ? 0 : 1,
        borderTopColor: '#f3f4f6',
        paddingTop: noTopBorder ? 0 : 12,
      }}
    >
      {/* Action row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <TouchableOpacity
          onPress={handleLike}
          disabled={!userId || liking || loading}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={{ fontSize: 20, color: liked ? '#ef4444' : '#9ca3af' }}>
            {liked ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => likeCount > 0 && setLikersOpen(true)}
          disabled={likeCount === 0}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text
            style={{
              fontSize: 13,
              color: liked ? '#ef4444' : '#9ca3af',
              fontWeight: '600',
              textDecorationLine: likeCount > 0 ? 'underline' : 'none',
            }}
          >
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </Text>
        </TouchableOpacity>

        <View style={{ width: 1, height: 14, backgroundColor: '#e5e7eb' }} />

        <TouchableOpacity
          onPress={() => setShowComments(s => !s)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ fontSize: 16, color: '#9ca3af' }}>💬</Text>
          <Text style={{ fontSize: 13, color: '#9ca3af', fontWeight: '500' }}>
            {totalCommentCount > 0 ? `${totalCommentCount}` : 'Comment'}
          </Text>
        </TouchableOpacity>

        {loading ? <ActivityIndicator size="small" color="#9ca3af" /> : null}
      </View>

      {/* Comment list */}
      {showComments ? (
        <View style={{ gap: 10 }}>
          {comments.map(comment => {
            const author = comment.user
            const isOwn = comment.user_id === userId
            return (
              <View key={comment.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Avatar uri={author?.photo_url} name={initials(author)} />
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>{fullName(author)}</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(comment.created_at)}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#374151', marginTop: 2, lineHeight: 18 }}>
                    {comment.content}
                  </Text>
                </View>
                {isOwn ? (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={{ fontSize: 14, color: '#9ca3af' }}>🗑</Text>
                  </TouchableOpacity>
                ) : userId ? (
                  <TouchableOpacity
                    onPress={() => handleFlagComment(comment.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={{ fontSize: 14, color: '#ef4444' }}>⚑</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          })}

          {/* Load more older comments */}
          {comments.length < totalCommentCount ? (
            <TouchableOpacity
              onPress={loadMoreComments}
              disabled={loadingMore}
              style={{ alignSelf: 'center', paddingVertical: 8 }}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#2d1b69" />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#2d1b69' }}>
                  Load {Math.min(PAGE_SIZE, totalCommentCount - comments.length)} more
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          {/* "Add a comment" button — opens a focused modal composer */}
          {userId ? (
            <TouchableOpacity
              onPress={() => setComposerOpen(true)}
              style={{
                marginTop: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: '#fff',
              }}
            >
              <Text style={{ fontSize: 14, color: '#9ca3af', flex: 1 }}>Write a comment…</Text>
              <Text style={{ fontSize: 18, color: '#2d1b69' }}>✍</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 4 }}>
              Sign in to like and comment
            </Text>
          )}
        </View>
      ) : null}

      {composerOpen ? (
        <CommentComposerModal
          onClose={() => setComposerOpen(false)}
          onSubmit={handleSubmitComment}
        />
      ) : null}

      {likersOpen ? (
        <LikersModal
          entityType={entityType}
          entityId={entityId}
          onClose={() => setLikersOpen(false)}
        />
      ) : null}

      <ErrorDialog
        visible={!!errorMsg}
        title={errorMsg?.title ?? ''}
        detail={errorMsg?.detail}
        onClose={() => setErrorMsg(null)}
      />
    </View>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Comment composer modal — full-screen with keyboard-friendly layout.
// ───────────────────────────────────────────────────────────────────────────────

function CommentComposerModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (content: string) => Promise<boolean>
}) {
  const insets = useSafeAreaInsets()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  async function submit() {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    const ok = await onSubmit(text)
    setSubmitting(false)
    if (ok) {
      setText('')
      onClose()
    }
  }

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 12,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
          }}
        >
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16, color: '#6b7280' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>New comment</Text>
          <TouchableOpacity
            onPress={submit}
            disabled={!text.trim() || submitting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#2d1b69" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: text.trim() ? '#2d1b69' : '#d1d5db',
                }}
              >
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Input */}
        <View style={{ flex: 1, padding: 16 }}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="What would you like to say?"
            placeholderTextColor="#9ca3af"
            multiline
            autoFocus
            style={{
              flex: 1,
              fontSize: 16,
              color: '#111827',
              textAlignVertical: 'top',
            }}
            maxLength={5000}
          />
          <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 8 }}>
            {text.length} / 5000
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Likers list modal — tap the like count to see who liked.
// ───────────────────────────────────────────────────────────────────────────────

function LikersModal({
  entityType,
  entityId,
  onClose,
}: {
  entityType: LikeCommentEntityType
  entityId: string
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const [likers, setLikers] = useState<LikerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('likes')
        .select('user_id, user:users!likes_user_id_fkey(first_name, last_name, photo_url)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(500)
      if (!cancelled) {
        setLikers((data ?? []) as unknown as LikerRow[])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [entityType, entityId])

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 12,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
          }}
        >
          <View style={{ width: 60 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Liked by</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16, color: '#2d1b69', fontWeight: '600' }}>Done</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#2d1b69" />
          </View>
        ) : likers.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ fontSize: 14, color: '#9ca3af' }}>No likes yet.</Text>
          </View>
        ) : (
          <FlatList
            data={likers}
            keyExtractor={l => l.user_id}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            renderItem={({ item }) => {
              const author = item.user
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar uri={author?.photo_url} name={initials(author)} size={40} />
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#111827' }}>
                    {fullName(author)}
                  </Text>
                </View>
              )
            }}
          />
        )}
      </View>
    </Modal>
  )
}
