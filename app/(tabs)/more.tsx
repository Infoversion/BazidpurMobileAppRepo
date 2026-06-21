import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { DateOfBirthPicker } from '@/components/DateOfBirthPicker'
import { CountryPicker, StatePicker } from '@/components/CountryStatePicker'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { RoleBadge } from '@/components/RoleBadge'
import { PurpleHeader } from '@/components/PurpleHeader'
import { supabase } from '@/lib/supabase'
import { AppDialog } from '@/components/AppDialog'
import { useDialog } from '@/lib/useDialog'

// Use the www. host explicitly — the apex 308-redirects to www and iOS
// NSURLSession hangs on 308 redirects for POST-with-body.
const API = 'https://www.bazidpur.com/api'
const R2  = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function resolveUri(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${R2}/${url}`
}

function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType, editable = true,
}: {
  label: string
  value: string
  onChangeText?: (v: string) => void
  placeholder?: string
  multiline?: boolean
  keyboardType?: 'default' | 'email-address'
  editable?: boolean
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        style={{
          backgroundColor: editable ? '#fff' : '#f9fafb',
          borderWidth: 1, borderColor: editable ? '#e5e7eb' : '#f3f4f6',
          borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10,
          fontSize: 17, color: editable ? '#111827' : '#6b7280', paddingTop: 10, paddingBottom: 12,
          minHeight: multiline ? 80 : undefined, textAlignVertical: multiline ? 'top' : undefined,
        }}
      />
    </View>
  )
}


export default function ProfileScreen() {
  const { signOut, user, refreshUser } = useAuth()
  const { dialog, show, hide } = useDialog()

  const [firstName, setFirstName]     = useState(user?.first_name ?? '')
  const [lastName, setLastName]       = useState(user?.last_name ?? '')
  const [sex, setSex]                 = useState<'male' | 'female' | 'other'>(user?.sex ?? 'male')
  const [dob, setDob]                 = useState(user?.dob ?? '')
  const [city, setCity]               = useState(user?.location_city ?? '')
  const [state, setState]             = useState(user?.location_state ?? '')
  const [country, setCountry]         = useState(user?.location_country ?? '')
  const [countryCode, setCountryCode] = useState('')
  const [linkToBazidpur, setLink]     = useState(user?.link_to_bazidpur ?? '')
  const [comments, setComments]       = useState(user?.comments ?? '')
  const [saving, setSaving]           = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [localPhotoUri, setLocalPhotoUri]   = useState<string | null>(null)
  const [linkedNodeId, setLinkedNodeId]     = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('family_tree_nodes')
      .select('id')
      .eq('linked_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setLinkedNodeId(data?.id ?? null))
  }, [user?.id])

  const avatarUri = localPhotoUri ?? resolveUri(user?.photo_url)
  const initials  = user ? `${user.first_name?.charAt(0) ?? ''}${user.last_name?.charAt(0) ?? ''}` : '?'

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { show('error', 'Permission needed', 'Allow photo access to change your picture.'); return }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    setLocalPhotoUri(asset.uri)
    setUploadingPhoto(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const form = new FormData()
      form.append('file', { uri: asset.uri, name: 'photo.jpg', type: 'image/jpeg' } as any)

      const res = await fetch(`${API}/profile/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      await refreshUser?.()
    } catch (e: any) {
      show('error', 'Upload failed', e.message)
      setLocalPhotoUri(null)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function saveDetails() {
    if (!firstName.trim() || !lastName.trim()) {
      show('error', 'Required', 'First and last name cannot be empty.')
      return
    }
    if (!country.trim()) {
      show('error', 'Required', 'Please enter your country.')
      return
    }
    if (!state.trim()) {
      show('error', 'Required', 'Please enter your state or region.')
      return
    }
    if (!city.trim()) {
      show('error', 'Required', 'Please enter your city or village.')
      return
    }
    if (!linkToBazidpur.trim()) {
      show('error', 'Required', 'Please describe your connection to Bazidpur.')
      return
    }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const res = await fetch(`${API}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          sex,
          dob: dob.trim() || null,
          location_city: city.trim() || null,
          location_state: state.trim() || null,
          location_country: country.trim() || null,
          link_to_bazidpur: linkToBazidpur.trim() || null,
          comments: comments.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      await refreshUser?.()
      show('success', 'Saved', 'Your profile has been updated.')
    } catch (e: any) {
      show('error', 'Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/(public)')
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="Profile" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
              <View style={{ position: 'relative' }}>
                <View style={{
                  width: 90, height: 90, borderRadius: 45,
                  overflow: 'hidden', backgroundColor: '#2d1b69',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={{ width: 90, height: 90 }} contentFit="cover" />
                  ) : (
                    <Text style={{ fontSize: 30, fontWeight: '700', color: '#fff' }}>{initials}</Text>
                  )}
                  {uploadingPhoto && (
                    <View style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </View>
                {user?.role && (
                  <View style={{ position: 'absolute', bottom: -2, right: -2 }}>
                    <RoleBadge role={user.role} size={20} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Tap to change photo</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginTop: 6 }}>
              {user?.first_name} {user?.last_name}
            </Text>
            {user?.email ? (
              <Text style={{ fontSize: 13, color: '#8e8e93', marginTop: 2 }}>{user.email}</Text>
            ) : null}
          </View>

          {/* Family tree link */}
          {linkedNodeId ? (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/tree' as any)}
              style={{
                backgroundColor: '#2d1b69', borderRadius: 12,
                paddingVertical: 13, paddingHorizontal: 16,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, marginBottom: 16,
                shadowColor: '#2d1b69', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
              }}
            >
              <Text style={{ fontSize: 18 }}>🌳</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>View in Family Tree</Text>
            </TouchableOpacity>
          ) : null}

          {/* Edit form */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 16, padding: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 16,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 14 }}>Personal Details</Text>
            <Field label="First Name"      value={firstName}     onChangeText={setFirstName}  placeholder="First name" />
            <Field label="Last Name"       value={lastName}      onChangeText={setLastName}   placeholder="Last name" />

            {/* Sex */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                Gender
              </Text>
              <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3 }}>
                {(['male', 'female', 'other'] as const).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setSex(opt)}
                    style={{
                      flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                      backgroundColor: sex === opt ? '#fff' : 'transparent',
                      shadowColor: sex === opt ? '#000' : 'transparent',
                      shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
                      elevation: sex === opt ? 1 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: sex === opt ? '#1c1c1e' : '#9ca3af', textTransform: 'capitalize' }}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Date of Birth</Text>
              <DateOfBirthPicker value={dob} onChange={setDob} />
            </View>
            <Field label="Email"           value={user?.email ?? ''} editable={false} />
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Country *</Text>
              <CountryPicker
                value={country}
                countryCode={countryCode}
                onChange={(name, code) => { setCountry(name); setCountryCode(code); setState('') }}
              />
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>State / Province *</Text>
              <StatePicker
                value={state}
                countryCode={countryCode}
                onChange={(name) => setState(name)}
              />
            </View>
            <Field label="City / Village *" value={city} onChangeText={setCity} placeholder="City or village" />
            <Field label="Link to Bazidpur *" value={linkToBazidpur} onChangeText={setLink} placeholder="How are you connected?" />
            <Field label="About / Comments" value={comments} onChangeText={setComments}   placeholder="Anything you'd like to share…" multiline />

            <TouchableOpacity
              onPress={saveDetails}
              disabled={saving}
              style={{
                backgroundColor: saving ? '#9ca3af' : '#2d1b69',
                borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4,
              }}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Community Guidelines */}
          <TouchableOpacity
            onPress={() => router.push('/(public)/community-guidelines')}
            style={{
              backgroundColor: '#fff', borderRadius: 12,
              paddingVertical: 15, alignItems: 'center', marginBottom: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#2d1b69' }}>Community Guidelines</Text>
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            onPress={() => router.push('/(public)/privacy-policy')}
            style={{
              backgroundColor: '#fff', borderRadius: 12,
              paddingVertical: 15, alignItems: 'center', marginBottom: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#2d1b69' }}>Privacy Policy</Text>
          </TouchableOpacity>

          {/* Notifications inbox */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications' as any)}
            style={{
              backgroundColor: '#fff', borderRadius: 12,
              paddingVertical: 15, alignItems: 'center', marginBottom: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#2d1b69' }}>Notifications</Text>
          </TouchableOpacity>

          {/* Notification settings */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notification-settings' as any)}
            style={{
              backgroundColor: '#fff', borderRadius: 12,
              paddingVertical: 15, alignItems: 'center', marginBottom: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#2d1b69' }}>Notification Settings</Text>
          </TouchableOpacity>

          {/* Blocked Members */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/blocked-users' as any)}
            style={{
              backgroundColor: '#fff', borderRadius: 12,
              paddingVertical: 15, alignItems: 'center', marginBottom: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#2d1b69' }}>Blocked Members</Text>
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: '#fff', borderRadius: 12,
              paddingVertical: 15, alignItems: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#ff3b30' }}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
        <AppDialog {...dialog} onClose={hide} />
      </View>
    </KeyboardAvoidingView>
  )
}
