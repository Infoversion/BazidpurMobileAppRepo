import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { PurpleHeader } from '@/components/PurpleHeader'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset() {
    setError('')
    if (!email.trim()) {
      setError('Please enter the email address on your account.')
      return
    }
    setLoading(true)
    try {
      // Use the bazidpur.com endpoint so the reset email comes from
      // support@bazidpur.com (not the bare Supabase Auth template) and the
      // reset link lands on the web reset-password page in the user's browser.
      // Explicit https://www. host avoids the iOS 308-redirect POST hang.
      const res = await fetch('https://www.bazidpur.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Web API returns specific reasons: no_account / unverified / suspended.
        // body.error is human-readable copy ready to show in the banner.
        setError(body?.error ?? 'Could not send the reset email. Please try again in a moment.')
      } else {
        setSent(true)
      }
    } catch (e: any) {
      setError(e?.message ? `Network error: ${e.message}` : 'Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
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
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 12 }}>
            We&apos;ve sent a password reset link to {email}.
          </Text>
          <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
            Tap the link in the email to open the reset page in your browser. The link is valid for one hour. Once your password is updated, return here and sign in.
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

        {error ? (
          <View style={{
            backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
            borderRadius: 12, padding: 14, marginBottom: 16,
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          }}>
            <Text style={{ fontSize: 16, marginTop: 1 }}>⚠️</Text>
            <Text style={{ flex: 1, fontSize: 13, color: '#b91c1c', lineHeight: 20 }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Email</Text>
          <TextInput
            style={{
              backgroundColor: '#fff',
              borderWidth: 1, borderColor: error ? '#fca5a5' : '#e5e7eb',
              borderRadius: 12, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 15,
              fontSize: 17, color: '#111827',
            }}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={(v) => { setEmail(v); if (error) setError('') }}
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
