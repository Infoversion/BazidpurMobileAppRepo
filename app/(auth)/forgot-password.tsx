import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleReset() {
    if (!email) {
      Alert.alert('Enter your email', 'Please enter the email address on your account.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'bazidpur://reset-password',
    })
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <View className="flex-1 bg-white justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mx-auto mb-6">
          <Text className="text-3xl">✓</Text>
        </View>
        <Text className="text-2xl font-bold text-gray-900 text-center mb-3">Check your email</Text>
        <Text className="text-sm text-gray-500 text-center leading-relaxed mb-8">
          We sent a password reset link to {email}
        </Text>
        <TouchableOpacity
          className="w-full py-3.5 bg-primary rounded-xl items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white text-base font-semibold">Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Reset password</Text>
        <Text className="text-sm text-gray-500 mb-8 leading-relaxed">
          Enter your account email and we'll send you a reset link.
        </Text>

        <View className="mb-6">
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

        <TouchableOpacity
          className="w-full py-3.5 bg-primary rounded-xl items-center mb-4"
          onPress={handleReset}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white text-base font-semibold">Send reset link</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity className="self-center" onPress={() => router.back()}>
          <Text className="text-sm text-gray-400">Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
