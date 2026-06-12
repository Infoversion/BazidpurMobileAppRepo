import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native'
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
    return (value: string) => setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSignup() {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.')
      return
    }
    if (!form.country.trim()) {
      Alert.alert('Missing field', 'Please enter your country.')
      return
    }
    if (!form.state.trim()) {
      Alert.alert('Missing field', 'Please enter your state or region.')
      return
    }
    if (!form.city.trim()) {
      Alert.alert('Missing field', 'Please enter your city or village.')
      return
    }
    if (!form.linkToBazidpur.trim()) {
      Alert.alert('Missing field', 'Please describe your connection to Bazidpur.')
      return
    }
    if (!agreedToPolicy) {
      Alert.alert('Privacy Policy', 'Please read and accept the Privacy Policy to continue.')
      return
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          sex,
          dob: dob || null,
          location_country: form.country.trim(),
          location_state: form.state.trim(),
          location_city: form.city.trim(),
          link_to_bazidpur: form.linkToBazidpur.trim(),
          privacy_policy_accepted_at: new Date().toISOString(),
        },
      },
    })
    setLoading(false)

    if (error) {
      Alert.alert('Signup failed', error.message)
    } else {
      Alert.alert(
        'Account created',
        'Your account is pending approval by an admin. You will be notified once approved.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      )
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f2f2f7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PurpleHeader title="Sign Up" showBack hideVisitorActions />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', fontWeight: '500', marginBottom: 6 }}>
          Join the community
        </Text>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.5, marginBottom: 4 }}>
          Create Account
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
                <Text style={{ fontSize: 13, fontWeight: '600', color: sex === opt ? '#1c1c1e' : '#9ca3af', textTransform: 'capitalize' }}>
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
            }}
          />
        </View>

        <View style={{ marginBottom: 14 }}>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">State / Region <Text style={{ color: '#f87171' }}>*</Text></Text>
          <StatePicker
            value={form.state}
            countryCode={countryCode}
            onChange={(name) => setForm(f => ({ ...f, state: name }))}
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
          </Text>
        </TouchableOpacity>

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
