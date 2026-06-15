import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'
import { DateOfBirthPicker } from '@/components/DateOfBirthPicker'
import { CountryPicker, StatePicker } from '@/components/CountryStatePicker'

export default function SignupScreen() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    country: '', state: '', city: '', linkToBazidpur: '',
  })
  const [countryCode, setCountryCode] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('male')
  const [agreedToPolicy, setAgreedToPolicy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const canSubmit =
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.email.trim() !== '' &&
    form.password !== '' &&
    form.confirmPassword !== '' &&
    form.country !== '' &&
    form.state !== '' &&
    form.city.trim() !== '' &&
    form.linkToBazidpur.trim() !== '' &&
    agreedToPolicy

  function set(key: keyof typeof form) {
    return (value: string) => {
      setForm(f => ({ ...f, [key]: value }))
      setError('')
    }
  }

  async function handleSignup() {
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match — please check and try again.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    })

    if (authError || !authData.user) {
      setLoading(false)
      const msg = authError?.message ?? ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        setError('An account with this email already exists. Please sign in, or use a different email address.')
      } else {
        setError('We couldn\'t create your account right now. Please check your connection and try again.')
      }
      return
    }

    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: form.email.trim(),
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      sex,
      dob: dob || null,
      place_of_residence: [form.city.trim(), form.state.trim(), form.country.trim()].filter(Boolean).join(', '),
      location_country: form.country.trim(),
      location_state: form.state.trim(),
      location_city: form.city.trim(),
      link_to_bazidpur: form.linkToBazidpur.trim(),
      role: 'pending',
      privacy_policy_accepted_at: new Date().toISOString(),
      community_guidelines_accepted_at: new Date().toISOString(),
    })

    setLoading(false)

    if (profileError) {
      await supabase.auth.signOut()
      setError('Your account was created but we couldn\'t save your profile. Please contact us and we\'ll sort it out straight away.')
    } else {
      // Send welcome + admin notification emails (non-blocking).
      // Explicit www. host — the apex 308-redirects to www and iOS
      // NSURLSession does not follow 308 on POST with body (it hangs).
      fetch('https://www.bazidpur.com/api/signup-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
        }),
      }).catch(() => {})
      setSuccess(true)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (success) {
    const submittedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="Request Membership" hideVisitorActions />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 36, paddingBottom: 60 }}>

          {/* Celebration header */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
              shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15, shadowRadius: 12,
            }}>
              <Text style={{ fontSize: 42 }}>✓</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
              Request received
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.5, marginBottom: 12, lineHeight: 34 }}>
              Welcome to the family,{'\n'}{form.firstName}! 🎉
            </Text>
            <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, maxWidth: 300 }}>
              We are <Text style={{ fontWeight: '700', color: '#111827' }}>genuinely thrilled</Text> to have received your membership request. The Bazidpur family grows stronger with every new member — and we can't wait to welcome you in!
            </Text>
          </View>

          {/* Request summary */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
              Your request summary
            </Text>
            {[
              { label: 'Name', value: `${form.firstName} ${form.lastName}` },
              { label: 'Email', value: form.email.trim() },
              { label: 'Location', value: [form.city, form.state, form.country].filter(Boolean).join(', ') },
              { label: 'Connection', value: form.linkToBazidpur.trim() },
              { label: 'Submitted', value: submittedAt },
            ].map(row => (
              <View key={row.label} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#9ca3af', width: 80, flexShrink: 0 }}>{row.label}</Text>
                <Text style={{ fontSize: 13, color: '#111827', fontWeight: '500', flex: 1 }} numberOfLines={2}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* What happens next */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
              What happens next
            </Text>
            {[
              {
                n: '1', bg: '#dcfce7', fg: '#16a34a',
                title: 'Confirmation email on its way',
                body: `A confirmation has been sent to ${form.email.trim()}. Please check your inbox — and your spam folder, just in case.`,
              },
              {
                n: '2', bg: '#dbeafe', fg: '#2563eb',
                title: 'Admin reviews your request',
                body: 'Our admins personally review every membership request. You\'ll hear back by email very soon — usually within a day or two.',
              },
              {
                n: '3', bg: '#ede9fe', fg: '#7c3aed',
                title: 'Full access unlocked',
                body: 'Once approved, you\'ll have full access to the family tree, poetry, photo albums, Timeless Moments, community forum, and much more.',
              },
            ].map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: i < 2 ? 16 : 0 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: step.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: step.fg }}>{step.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 }}>{step.title}</Text>
                  <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20 }}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Warm closing note */}
          <View style={{ backgroundColor: '#faf5ff', borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#ede9fe' }}>
            <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 21, textAlign: 'center' }}>
              <Text style={{ fontSize: 18 }}>🤝{'\n'}</Text>
              If you have any questions in the meantime, feel free to reach out via the{' '}
              <Text style={{ fontWeight: '700', color: '#2d1b69' }}>Contact</Text>
              {' '}page. We're always happy to help!
            </Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={{ backgroundColor: '#2d1b69', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Back to Sign In</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: '#c4c4c6', textAlign: 'center' }}>
            You'll receive an email once your request is reviewed
          </Text>

        </ScrollView>
      </View>
    )
  }

  // ── Signup form ─────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f2f2f7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PurpleHeader title="Request Membership" showBack hideVisitorActions />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', fontWeight: '500', marginBottom: 6 }}>
          Join the community
        </Text>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.5, marginBottom: 4 }}>
          Request Membership
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
          Join the Bazidpur family
        </Text>

        <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>
          Fields marked <Text style={{ color: '#f87171', fontWeight: '700' }}>*</Text> are mandatory
        </Text>

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">First name <Text className="text-red-400">*</Text></Text>
            <TextInput
              className="w-full px-4 rounded-xl border border-gray-200 bg-white text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
              placeholder="First"
              placeholderTextColor="#9ca3af"
              value={form.firstName}
              onChangeText={set('firstName')}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Last name <Text className="text-red-400">*</Text></Text>
            <TextInput
              className="w-full px-4 rounded-xl border border-gray-200 bg-white text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
              placeholder="Last"
              placeholderTextColor="#9ca3af"
              value={form.lastName}
              onChangeText={set('lastName')}
            />
          </View>
        </View>

        {/* Gender */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Gender <Text style={{ color: '#f87171' }}>*</Text></Text>
          <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 3 }}>
            {(['male', 'female', 'other'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSex(opt)}
                style={{
                  flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center',
                  backgroundColor: sex === opt ? '#fff' : 'transparent',
                  shadowColor: sex === opt ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
                  elevation: sex === opt ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: sex === opt ? '#1c1c1e' : '#9ca3af', textTransform: 'capitalize' }}>
                  {opt === 'male' ? '♂ Male' : opt === 'female' ? '♀ Female' : '⚬ Other'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date of Birth */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Date of Birth</Text>
          <DateOfBirthPicker value={dob} onChange={setDob} />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Email <Text className="text-red-400">*</Text></Text>
          <TextInput
            className="w-full px-4 rounded-xl border border-gray-200 bg-white text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Password <Text className="text-red-400">*</Text></Text>
          <TextInput
            className="w-full px-4 rounded-xl border border-gray-200 bg-white text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
            placeholder="Min. 8 characters"
            placeholderTextColor="#9ca3af"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Confirm password <Text className="text-red-400">*</Text></Text>
          <TextInput
            className="w-full px-4 rounded-xl border border-gray-200 bg-white text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
            placeholder="Repeat password"
            placeholderTextColor="#9ca3af"
            value={form.confirmPassword}
            onChangeText={set('confirmPassword')}
            secureTextEntry
          />
        </View>

        <Text className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">Location</Text>

        <View style={{ marginBottom: 14 }}>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Country <Text style={{ color: '#f87171' }}>*</Text></Text>
          <CountryPicker
            value={form.country}
            countryCode={countryCode}
            onChange={(name, code) => {
              setForm(f => ({ ...f, country: name, state: '' }))
              setCountryCode(code)
              setError('')
            }}
          />
        </View>

        <View style={{ marginBottom: 14 }}>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">State / Region <Text style={{ color: '#f87171' }}>*</Text></Text>
          <StatePicker
            value={form.state}
            countryCode={countryCode}
            onChange={(name) => { setForm(f => ({ ...f, state: name })); setError('') }}
          />
        </View>

        <View style={{ marginBottom: 14 }}>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">City / Village <Text style={{ color: '#f87171' }}>*</Text></Text>
          <TextInput
            className="w-full px-4 rounded-xl border border-gray-200 bg-white text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
            placeholder="e.g. Bazidpur"
            placeholderTextColor="#9ca3af"
            value={form.city}
            onChangeText={set('city')}
          />
        </View>

        <View className="mb-8">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Link to Bazidpur <Text style={{ color: '#f87171' }}>*</Text></Text>
          <TextInput
            className="w-full px-4 rounded-xl border border-gray-200 bg-white text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
            placeholder="e.g. Grandson of Mehdi Hasan"
            placeholderTextColor="#9ca3af"
            value={form.linkToBazidpur}
            onChangeText={set('linkToBazidpur')}
          />
        </View>

        {/* Privacy Policy acceptance */}
        <TouchableOpacity
          onPress={() => setAgreedToPolicy(v => !v)}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}
          activeOpacity={0.7}
        >
          <View style={{
            width: 22, height: 22, borderRadius: 6, marginTop: 1,
            borderWidth: 2, borderColor: agreedToPolicy ? '#2d1b69' : '#d1d5db',
            backgroundColor: agreedToPolicy ? '#2d1b69' : '#fff',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {agreedToPolicy && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 16 }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 20 }}>
            I have read and agree to the{' '}
            <Text
              style={{ color: '#2d1b69', fontWeight: '600' }}
              onPress={() => router.push('/(public)/privacy-policy')}
            >
              Privacy Policy
            </Text>
            {' '}and{' '}
            <Text
              style={{ color: '#2d1b69', fontWeight: '600' }}
              onPress={() => router.push('/(public)/community-guidelines')}
            >
              Community Guidelines
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Inline error */}
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
          onPress={handleSignup}
          disabled={!canSubmit || loading}
          style={{
            width: '100%', paddingVertical: 14, borderRadius: 12,
            alignItems: 'center', marginBottom: 16,
            backgroundColor: canSubmit ? '#2d1b69' : '#d1d5db',
          }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Request Membership</Text>
          }
        </TouchableOpacity>

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-gray-500">Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-sm text-accent font-medium">Sign In</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
