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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 38 }}>✓</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#1c1c1e', textAlign: 'center', letterSpacing: -0.5, marginBottom: 10 }}>Message Sent!</Text>
          <Text style={{ fontSize: 15, color: '#8e8e93', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            Jazakallah Khair, <Text style={{ fontWeight: '700', color: '#1c1c1e' }}>{form.name}</Text>!{'\n'}
            Your message has reached us. Someone will be in touch very soon, in sha Allah.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#2d1b69', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' }}
            onPress={() => {
              setSuccess(false)
              setForm({ name: '', email: '', subject: '', message: '' })
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Send another message</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* Header */}
          <View style={{ paddingHorizontal: 4, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#8e8e93', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
              Get in Touch
            </Text>
            <Text style={{ fontSize: 34, fontWeight: '700', color: '#1c1c1e', letterSpacing: -0.5, marginBottom: 6 }}>
              Contact Us
            </Text>
            <Text style={{ fontSize: 14, color: '#8e8e93', lineHeight: 20 }}>
              A question, a thought, or just want to say salaam — we'd love to hear from you.
            </Text>
          </View>

          {/* Form card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>

            {error ? (
              <View style={{ marginBottom: 14, padding: 12, backgroundColor: '#fef2f2', borderRadius: 10 }}>
                <Text style={{ fontSize: 13, color: '#dc2626' }}>{error}</Text>
              </View>
            ) : null}

            {/* Name + Email row */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Name <Text style={{ color: '#ff3b30' }}>*</Text>
                </Text>
                <TextInput
                  style={{ backgroundColor: '#f2f2f7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1c1c1e' }}
                  placeholder="Your name"
                  placeholderTextColor="#aeaeb2"
                  value={form.name}
                  onChangeText={set('name')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Email <Text style={{ color: '#ff3b30' }}>*</Text>
                </Text>
                <TextInput
                  style={{ backgroundColor: '#f2f2f7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1c1c1e' }}
                  placeholder="you@email.com"
                  placeholderTextColor="#aeaeb2"
                  value={form.email}
                  onChangeText={set('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Subject */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Subject</Text>
              <TextInput
                style={{ backgroundColor: '#f2f2f7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1c1c1e' }}
                placeholder="What is this about?"
                placeholderTextColor="#aeaeb2"
                value={form.subject}
                onChangeText={set('subject')}
              />
            </View>

            {/* Message */}
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Message <Text style={{ color: '#ff3b30' }}>*</Text>
              </Text>
              <TextInput
                style={{ backgroundColor: '#f2f2f7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1c1c1e', minHeight: 110, textAlignVertical: 'top' }}
                placeholder="Your message…"
                placeholderTextColor="#aeaeb2"
                value={form.message}
                onChangeText={set('message')}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#2d1b69', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Send message</Text>
              }
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
