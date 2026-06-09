import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  return <Redirect href="/(tabs)" />
}
