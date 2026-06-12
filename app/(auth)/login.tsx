import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'

const ALLOWED_ROLES = ['member', 'admin', 'superadmin']

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !data.user) {
      setLoading(false)
      setError('Incorrect email or password. Please try again.')
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    setLoading(false)

    if (!profile) {
      await supabase.auth.signOut()
      setError('Your account setup is incomplete. Please contact us and we\'ll sort it out.')
      return
    }

    if (profile.role === 'pending') {
      await supabase.auth.signOut()
      setError('Your membership request is still under review. You\'ll receive an email once it\'s been approved — usually within a day or two. Jazakallah for your patience! 🤲')
      return
    }

    if (!ALLOWED_ROLES.includes(profile.role)) {
      await supabase.auth.signOut()
      setError('Your account does not have access. Please contact us if you think this is a mistake.')
      return
    }

    router.replace('/(tabs)/home')
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
            className="w-full px-4 rounded-xl border border-gray-200 text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={v => { setEmail(v); setError('') }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View className="mb-2">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Password</Text>
          <TextInput
            className="w-full px-4 rounded-xl border border-gray-200 text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
            placeholder="Your password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={v => { setPassword(v); setError('') }}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          className="self-end mb-6"
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text className="text-sm text-accent">Forgot password?</Text>
        </TouchableOpacity>

        {error ? (
          <View style={{
            backgroundColor: '#fff1f2', borderRadius: 12, padding: 14,
            marginBottom: 16, borderWidth: 1, borderColor: '#fecdd3',
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          }}>
            <Text style={{ fontSize: 16, marginTop: 1 }}>⚠️</Text>
            <Text style={{ flex: 1, fontSize: 13, color: '#be123c', lineHeight: 20 }}>{error}</Text>
          </View>
        ) : null}

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
