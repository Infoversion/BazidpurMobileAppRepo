import { useState } from 'react'
import { TouchableOpacity, Text, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { AppDialog } from '@/components/AppDialog'

const REASONS = [
  'Inappropriate content',
  'Harassment or bullying',
  'Spam or misleading',
  'Privacy violation',
  'Other',
]

interface Props {
  contentType:
    | 'thread'
    | 'reply'
    | 'poem'
    | 'memoir'
    | 'photo_album'
    | 'album_photo'
    | 'video_album'
    | 'video_album_item'
    | 'comment'
  contentId: string
  /** If provided, hides the flag button when the current user owns this content. */
  ownerId?: string
  /** Optional size tweak — useful for compact spots like grid overlays. */
  size?: 'sm' | 'md'
}

export function ReportButton({ contentType, contentId, ownerId, size = 'md' }: Props) {
  const { session } = useAuth()
  const [confirmed, setConfirmed] = useState(false)

  if (!session) return null
  if (ownerId && session.user.id === ownerId) return null

  function onPress() {
    Alert.alert(
      'Report Content',
      'Why are you reporting this? Our team reviews reports within 48 hours.',
      [
        ...REASONS.map(reason => ({
          text: reason,
          onPress: async () => {
            await supabase.from('reports').insert({
              reporter_id: session!.user.id,
              content_type: contentType,
              content_id: contentId,
              reason,
            })
            setConfirmed(true)
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  return (
    <>
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={{ fontSize: size === 'sm' ? 20 : 26, color: '#ef4444' }}>⚑</Text>
      </TouchableOpacity>

      <AppDialog
        visible={confirmed}
        type="success"
        title="Report submitted"
        detail="Thank you. Our team will review this content within 48 hours."
        onClose={() => setConfirmed(false)}
      />
    </>
  )
}
