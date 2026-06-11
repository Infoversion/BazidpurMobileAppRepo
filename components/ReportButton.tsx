import { TouchableOpacity, Text, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const REASONS = [
  'Inappropriate content',
  'Harassment or bullying',
  'Spam or misleading',
  'Privacy violation',
  'Other',
]

interface Props {
  contentType: 'thread' | 'reply' | 'poem' | 'memoir'
  contentId: string
}

export function ReportButton({ contentType, contentId }: Props) {
  const { session } = useAuth()

  if (!session) return null

  function onPress() {
    Alert.alert(
      'Report Content',
      'Why are you reporting this?',
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
            Alert.alert('Report submitted', 'Thank you. Our team will review this content.')
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={{ fontSize: 13, color: '#c7c7cc' }}>⚑</Text>
    </TouchableOpacity>
  )
}
