import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, Linking, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const APP_URL = 'https://bazidpur.com/join'

const DEFAULT_MESSAGE = `You're invited to join the Bazidpur Family app — a private space for our community to connect, share memories, explore our family tree, and preserve our heritage.

Tap the link below to request access:`

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

    // Store in invitations table (best-effort — table may not exist)
    await supabase.from('invitations').insert({
      invited_name: name.trim(),
      invited_email: email.trim(),
      personal_note: personalNote.trim() || null,
      invited_by: user?.id,
    }).then(() => {}).catch(() => {})

    // Open the mail app with a pre-filled invitation
    const senderName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'A family member'
    const greeting = `Hi ${name.trim()},\n\n`
    const body = `${greeting}${DEFAULT_MESSAGE}\n\n${APP_URL}\n\n${personalNote.trim() ? `Personal note from ${senderName}:\n"${personalNote.trim()}"\n\n` : ''}Warm regards,\n${senderName}`

    const mailUrl = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent('You\'re invited to the Bazidpur Family App')}&body=${encodeURIComponent(body)}`

    setSending(false)

    const canOpen = await Linking.canOpenURL(mailUrl)
    if (canOpen) {
      await Linking.openURL(mailUrl)
      setSent(true)
      setName('')
      setEmail('')
      setPersonalNote('')
    } else {
      Alert.alert('No mail app found', 'Please send the invite manually via email or WhatsApp.', [
        { text: 'Copy invite text', onPress: copyInvite },
        { text: 'OK', style: 'cancel' },
      ])
    }
  }

  function copyInvite() {
    Alert.alert('Invite link', `Share this link with ${name || 'them'}:\n\n${APP_URL}`)
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
              Mail app opened with your invitation. Send it from there!
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
            Personal Note <Text style={{ fontWeight: '400' }}>(optional)</Text>
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

        {/* What gets sent preview */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16 }}>
          <Text style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Invitation Preview
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(60,60,67,0.7)', lineHeight: 20 }}>
            {`Hi ${name || '[name]'},\n\n${DEFAULT_MESSAGE}\n\n${APP_URL}`}
          </Text>
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
            : <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Send Invitation via Email</Text>
          }
        </TouchableOpacity>

        {/* Copy link fallback */}
        <TouchableOpacity
          onPress={copyInvite}
          style={{
            backgroundColor: '#fff', borderRadius: 14,
            paddingVertical: 14, alignItems: 'center',
            borderWidth: 1, borderColor: 'rgba(60,60,67,0.15)',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#2d1b69' }}>Copy Invite Link</Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', fontSize: 12, color: 'rgba(60,60,67,0.4)', lineHeight: 18 }}>
          The invitation opens your mail app with a pre-filled message. The recipient must request access and will be reviewed by an admin.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
