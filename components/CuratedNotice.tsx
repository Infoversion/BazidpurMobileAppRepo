import { View, Text } from 'react-native'

/**
 * Small subtitle banner shown under the header on admin-curated screens
 * (Timeless Moments, Poetry, Memoirs, Media). Makes it clear to members
 * — and to App Store reviewers — that this content is editorial, not
 * user-generated, so the absence of a flag/block control is intentional.
 */
export function CuratedNotice({ message }: { message: string }) {
  return (
    <View style={{
      backgroundColor: '#faf7ff',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#ece5fa',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    }}>
      <Text style={{ fontSize: 12 }}>✨</Text>
      <Text style={{ flex: 1, fontSize: 12, color: '#6b5b95', lineHeight: 17 }}>
        {message}
      </Text>
    </View>
  )
}
