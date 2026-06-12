import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      router.replace('/(tabs)/home')
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f2f2f7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PurpleHeader title="Sign In" showBack hideVisitorActions />

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', fontWeight: '500', marginBottom: 6 }}>
          Welcome back
        </Text>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.5, marginBottom: 4 }}>
          Sign In
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32 }}>
          Use your Bazidpur account
        </Text>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
          <TextInput
            className="w-full px-4 rounded-xl border border-gray-200 text-base text-gray-900" style={{ paddingVertical: 13, lineHeight: 20 }}
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
            className="w-full px-4 rounded-xl border border-gray-200 text-base text-gray-900" style={{ paddingVertical: 13, lineHeight: 20 }}
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

        <TouchableOpacity
          onPress={() => router.push('/(public)/privacy-policy')}
          style={{ alignSelf: 'center', marginTop: 16 }}
        >
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
