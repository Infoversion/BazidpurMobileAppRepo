import { TouchableOpacity, Text } from 'react-native'
import { router, useNavigation } from 'expo-router'

export function BackButton() {
  const navigation = useNavigation()
  if (!navigation.canGoBack()) return null
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: 48, fontWeight: '800', color: '#2d1b69', lineHeight: 44, textAlign: 'center', includeFontPadding: false, marginTop: -4 }}>‹</Text>
    </TouchableOpacity>
  )
}
