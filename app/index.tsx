import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  if (session) return <Redirect href="/(tabs)" />
  return <Redirect href="/(public)" />
}
