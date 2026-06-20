import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { webAPI } from '@/lib/webApi'

export default function InviteScreen() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendInvite() {
    if (!name.trim()) { Alert.alert('Missing name', 'Please enter the recipient\'s name.'); return }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Invalid email', 'Please enter a valid email address.'); return }

    setSending(true)

    // Store in invitations table (best-effort)
    await supabase.from('invitations').insert({
      invited_name: name.trim(),
      invited_email: email.trim(),
      personal_note: personalNote.trim() || null,
      invited_by: user?.id,
    }).then(() => {}).catch(() => {})

    try {
      const res = await webAPI('/api/admin/invitations', 'POST', {
        emails: [email.trim()],
      })

      if (res.ok) {
        setSent(true)
        setName('')
        setEmail('')
        setPersonalNote('')
      } else {
        const err = await res.json().catch(() => ({}))
        Alert.alert('Failed to send', err.error ?? `Error ${res.status}`)
      }
    } catch (e: unknown) {
      Alert.alert('Network error', e instanceof Error ? e.message : 'Could not reach bazidpur.com')
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f2f2f7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }} keyboardShouldPersistTaps="handled">

        {sent && (
          <View style={{
            backgroundColor: '#d1fae5', borderRadius: 12, padding: 14,
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <Text style={{ fontSize: 20 }}>✅</Text>
            <Text style={{ flex: 1, fontSize: 14, color: '#065f46', fontWeight: '500' }}>
              Invitation sent from support@bazidpur.com!
            </Text>
          </View>
        )}

        {/* Form card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' }}>

          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(60,60,67,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Recipient
            </Text>
          </View>

          {/* Name */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.12)' }}>
            <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 4 }}>Full Name</Text>
            <TextInput
              style={{ fontSize: 16, color: '#000' }}
              placeholder="e.g. Ali Hassan"
              placeholderTextColor="rgba(60,60,67,0.3)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Email */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 4 }}>Email Address</Text>
            <TextInput
              style={{ fontSize: 16, color: '#000' }}
              placeholder="e.g. ali@example.com"
              placeholderTextColor="rgba(60,60,67,0.3)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Personal note */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 6 }}>
            Personal Note <Text style={{ fontWeight: '400' }}>(optional — shown in the email)</Text>
          </Text>
          <TextInput
            style={{ fontSize: 15, color: '#000', minHeight: 90, textAlignVertical: 'top' }}
            placeholder="Add a personal message to your invitation…"
            placeholderTextColor="rgba(60,60,67,0.3)"
            value={personalNote}
            onChangeText={setPersonalNote}
            multiline
            autoCorrect
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={sendInvite}
          disabled={sending}
          style={{
            backgroundColor: '#2d1b69', borderRadius: 14,
            paddingVertical: 16, alignItems: 'center',
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Send Invitation</Text>
          }
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', fontSize: 12, color: 'rgba(60,60,67,0.4)', lineHeight: 18 }}>
          The invitation email is sent from support@bazidpur.com with full formatting. The recipient must request access and will be reviewed by an admin.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
