import { useState, useEffect, useCallback } from 'react'
import { TouchableOpacity, Text, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

/**
 * Imperative confirm-and-block helper. Use from any long-press or context-menu
 * handler when you don't want to render a button. Returns a Promise that
 * resolves true when the block was inserted (or already existed).
 */
export function confirmBlockUser({
  blockerId, userId, userName, onBlocked,
}: {
  blockerId: string
  userId: string
  userName?: string
  onBlocked?: () => void
}) {
  if (blockerId === userId) return
  const display = userName?.trim() ? userName.trim() : 'this user'
  Alert.alert(
    `Block ${display}?`,
    `You won't see their posts, photos, videos, poems or memoirs anymore. They won't be notified. You can unblock them later from your profile.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('user_blocks').insert({
            blocker_id: blockerId, blocked_id: userId,
          })
          if (error && !/duplicate|unique/i.test(error.message)) {
            Alert.alert('Could not block', error.message)
            return
          }
          Alert.alert('User blocked', `You won't see content from ${display} anymore.`)
          onBlocked?.()
        },
      },
    ]
  )
}

/**
 * Hook that returns the IDs the current user has blocked, plus a `blocked(id)`
 * helper. Use to filter content lists so blocked users disappear from the UI.
 *
 *   const { isBlocked, refresh } = useBlockedUsers()
 *   const visible = items.filter(it => !isBlocked(it.user_id))
 */
export function useBlockedUsers() {
  const { session } = useAuth()
  const [ids, setIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!session) { setIds(new Set()); return }
    const { data } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', session.user.id)
    setIds(new Set((data ?? []).map((r: { blocked_id: string }) => r.blocked_id)))
  }, [session])

  useEffect(() => { refresh() }, [refresh])

  return {
    blockedIds: ids,
    isBlocked: (userId?: string | null) => !!userId && ids.has(userId),
    refresh,
  }
}

interface Props {
  /** The user being blocked. */
  userId: string
  /** Display name shown in the confirmation dialog. */
  userName?: string
  /** Called after a successful block so the parent can refresh feeds. */
  onBlocked?: () => void
  /** Render style — defaults to a small inline link. */
  variant?: 'link' | 'menu-item'
}

export function BlockUserButton({ userId, userName, onBlocked, variant = 'link' }: Props) {
  const { session } = useAuth()
  if (!session || session.user.id === userId) return null

  function confirmBlock() {
    const display = userName?.trim() ? userName.trim() : 'this user'
    Alert.alert(
      `Block ${display}?`,
      `You won't see their posts, photos, videos, poems or memoirs anymore. They won't be notified. You can unblock them later from your profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block', style: 'destructive', onPress: async () => {
            const { error } = await supabase.from('user_blocks').insert({
              blocker_id: session!.user.id,
              blocked_id: userId,
            })
            if (error && !/duplicate|unique/i.test(error.message)) {
              Alert.alert('Could not block', error.message)
              return
            }
            Alert.alert('User blocked', `You won't see content from ${display} anymore.`)
            onBlocked?.()
          },
        },
      ]
    )
  }

  if (variant === 'menu-item') {
    return (
      <TouchableOpacity onPress={confirmBlock} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: '#dc2626' }}>Block this user</Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity onPress={confirmBlock} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
      <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '600' }}>Block</Text>
    </TouchableOpacity>
  )
}
