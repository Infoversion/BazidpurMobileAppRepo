import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'

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
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="Reset Password" showBack hideVisitorActions />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 28 }}>✓</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 10 }}>Check your email</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            We sent a password reset link to {email}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: '100%', paddingVertical: 14, backgroundColor: '#2d1b69', borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f2f2f7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PurpleHeader title="Reset Password" showBack hideVisitorActions />

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 8 }}>
          Forgot password?
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 28 }}>
          Enter your account email and we'll send you a reset link.
        </Text>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Email</Text>
          <TextInput
            style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827' }}
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
          onPress={handleReset}
          disabled={loading}
          style={{ paddingVertical: 14, backgroundColor: '#2d1b69', borderRadius: 12, alignItems: 'center', marginBottom: 16 }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Send reset link</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={{ alignSelf: 'center' }} onPress={() => router.back()}>
          <Text style={{ fontSize: 14, color: '#9ca3af' }}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
