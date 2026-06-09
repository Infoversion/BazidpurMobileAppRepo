import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const insets = useSafeAreaInsets()

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      Alert.alert('Login failed', error.message)
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute', top: insets.top + 8, left: 16, zIndex: 10,
          flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4,
        }}
      >
        <Text style={{ fontSize: 20, color: '#2d1b69' }}>‹</Text>
        <Text style={{ fontSize: 14, color: '#2d1b69', fontWeight: '500' }}>Home</Text>
      </TouchableOpacity>

      <View className="flex-1 justify-center px-6">
        <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 text-center font-medium">
          Welcome back
        </Text>
        <Text className="text-4xl font-bold text-gray-900 mb-1 text-center tracking-tight">
          Sign In
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-10">
          Use your Bazidpur account
        </Text>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
          <TextInput
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View className="mb-2">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Password</Text>
          <TextInput
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
            placeholder="Your password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          className="self-end mb-8"
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text className="text-sm text-accent">Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full py-3.5 bg-primary rounded-xl items-center mb-4"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white text-base font-semibold">Sign In</Text>
          }
        </TouchableOpacity>

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-gray-500">Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text className="text-sm text-accent font-medium">Sign Up</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="mt-8 self-center" onPress={() => router.push('/(public)')}>
          <Text className="text-sm text-gray-400">Browse as guest</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
