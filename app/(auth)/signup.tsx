import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

export default function SignupScreen() {
  const insets = useSafeAreaInsets()
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    country: '', state: '', city: '', linkToBazidpur: '',
  })
  const [loading, setLoading] = useState(false)

  function set(key: keyof typeof form) {
    return (value: string) => setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSignup() {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.')
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
          location_country: form.country.trim(),
          location_state: form.state.trim(),
          location_city: form.city.trim(),
          link_to_bazidpur: form.linkToBazidpur.trim(),
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

      <ScrollView className="flex-1" contentContainerClassName="px-6 py-10">
        <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 text-center font-medium">
          Join the community
        </Text>
        <Text className="text-4xl font-bold text-gray-900 mb-1 text-center tracking-tight">
          Sign Up
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-8">
          Create your Bazidpur account
        </Text>

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">First name <Text className="text-red-400">*</Text></Text>
            <TextInput
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
              placeholder="First"
              placeholderTextColor="#9ca3af"
              value={form.firstName}
              onChangeText={set('firstName')}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Last name <Text className="text-red-400">*</Text></Text>
            <TextInput
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
              placeholder="Last"
              placeholderTextColor="#9ca3af"
              value={form.lastName}
              onChangeText={set('lastName')}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Email <Text className="text-red-400">*</Text></Text>
          <TextInput
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
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
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
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
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
            placeholder="Repeat password"
            placeholderTextColor="#9ca3af"
            value={form.confirmPassword}
            onChangeText={set('confirmPassword')}
            secureTextEntry
          />
        </View>

        <Text className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">Location</Text>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Country</Text>
          <TextInput
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
            placeholder="e.g. United Kingdom"
            placeholderTextColor="#9ca3af"
            value={form.country}
            onChangeText={set('country')}
          />
        </View>

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">State / Region</Text>
            <TextInput
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
              placeholder="State"
              placeholderTextColor="#9ca3af"
              value={form.state}
              onChangeText={set('state')}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">City</Text>
            <TextInput
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
              placeholder="City"
              placeholderTextColor="#9ca3af"
              value={form.city}
              onChangeText={set('city')}
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Link to Bazidpur</Text>
          <TextInput
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900"
            placeholder="e.g. Grandson of Mehdi Hasan"
            placeholderTextColor="#9ca3af"
            value={form.linkToBazidpur}
            onChangeText={set('linkToBazidpur')}
          />
        </View>

        <TouchableOpacity
          className="w-full py-3.5 bg-primary rounded-xl items-center mb-4"
          onPress={handleSignup}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white text-base font-semibold">Create Account</Text>
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
