import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

type FormState = { name: string; email: string; subject: string; message: string }

export default function ContactScreen() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function set(key: keyof FormState) {
    return (value: string) => {
      setForm(f => ({ ...f, [key]: value }))
      setError('')
    }
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email, and message.')
      return
    }

    setLoading(true)
    setError('')

    const { error: dbError } = await supabase.from('contacts').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim() || null,
      message: form.message.trim(),
    })

    setLoading(false)

    if (dbError) {
      setError('Something went wrong. Please try again.')
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-6">
            <Text className="text-4xl">✓</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-3 text-center tracking-tight">Message Sent!</Text>
          <Text className="text-base text-gray-600 leading-relaxed text-center mb-8">
            Jazakallah Khair, <Text className="font-semibold text-gray-900">{form.name}</Text>! 🌿{'\n'}
            Your message has reached us. Someone will be in touch very soon, in sha Allah.
          </Text>
          <TouchableOpacity
            className="w-full py-3.5 bg-primary rounded-xl items-center"
            onPress={() => {
              setSuccess(false)
              setForm({ name: '', email: '', subject: '', message: '' })
            }}
          >
            <Text className="text-white text-base font-semibold">Send another message</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f5f5f7]" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 pb-10" keyboardShouldPersistTaps="handled">

          <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 text-center font-medium">
            Get in Touch
          </Text>
          <Text className="text-3xl font-bold text-gray-900 mb-1 text-center tracking-tight">Contact Us</Text>
          <Text className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
            A question, a thought, or just want to say salaam — we'd love to hear from you.
          </Text>

          <View className="bg-white border border-gray-100 rounded-2xl p-5">

            {error ? (
              <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <Text className="text-sm text-red-600">{error}</Text>
              </View>
            ) : null}

            {/* Name + Email row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1.5">
                  Name <Text className="text-red-400">*</Text>
                </Text>
                <TextInput
                  className="w-full px-4 rounded-xl border border-gray-200 text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
                  placeholder="Your name"
                  placeholderTextColor="#9ca3af"
                  value={form.name}
                  onChangeText={set('name')}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1.5">
                  Email <Text className="text-red-400">*</Text>
                </Text>
                <TextInput
                  className="w-full px-4 rounded-xl border border-gray-200 text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  value={form.email}
                  onChangeText={set('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Subject */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Subject</Text>
              <TextInput
                className="w-full px-4 rounded-xl border border-gray-200 text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
                placeholder="What is this about?"
                placeholderTextColor="#9ca3af"
                value={form.subject}
                onChangeText={set('subject')}
              />
            </View>

            {/* Message */}
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Message <Text className="text-red-400">*</Text>
              </Text>
              <TextInput
                className="w-full px-4 rounded-xl border border-gray-200 text-gray-900" style={{ paddingTop: 13, paddingBottom: 15, fontSize: 17 }}
                placeholder="Your message..."
                placeholderTextColor="#9ca3af"
                value={form.message}
                onChangeText={set('message')}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 100 }}
              />
            </View>

            <TouchableOpacity
              className="w-full py-3.5 bg-primary rounded-xl items-center"
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white text-base font-semibold">Send message</Text>
              }
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
