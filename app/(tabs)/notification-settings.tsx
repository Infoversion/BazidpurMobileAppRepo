import { useEffect, useState, useCallback } from 'react'
import { View, Text, Switch, ScrollView, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PurpleHeader } from '@/components/PurpleHeader'
import { ensurePreferencesRow } from '@/lib/notifications'
import { AppDialog } from '@/components/AppDialog'
import { useDialog } from '@/lib/useDialog'

type Prefs = {
  enabled: boolean
  forum_reply: boolean
  photo_comment: boolean
  membership_approved: boolean
  report_resolution: boolean
  moderation_action: boolean
  announcement: boolean
}

const DEFAULTS: Prefs = {
  enabled: true,
  forum_reply: true,
  photo_comment: true,
  membership_approved: true,
  report_resolution: true,
  moderation_action: true,
  announcement: true,
}

const CATEGORIES: Array<{ key: keyof Omit<Prefs, 'enabled'>; title: string; desc: string }> = [
  { key: 'forum_reply',         title: 'Forum replies',           desc: 'When someone replies to a thread you started or a reply you wrote.' },
  { key: 'photo_comment',       title: 'Comments on your photos', desc: 'When another member comments on a photo or album you uploaded.' },
  { key: 'membership_approved', title: 'Membership status',       desc: 'When an admin approves your membership application.' },
  { key: 'report_resolution',   title: 'Report outcomes',         desc: 'When an admin acts on a piece of content you reported.' },
  { key: 'moderation_action',   title: 'Moderation actions',      desc: 'When an admin takes an action on your content or account.' },
  { key: 'announcement',        title: 'Community announcements', desc: 'Occasional updates from the Bazidpur admin team.' },
]

export default function NotificationSettingsScreen() {
  const { session } = useAuth()
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const { dialog, show, hide } = useDialog()

  const load = useCallback(async () => {
    if (!session) return
    await ensurePreferencesRow()
    const { data } = await supabase
      .from('notification_preferences')
      .select('enabled, forum_reply, photo_comment, membership_approved, report_resolution, moderation_action, announcement')
      .eq('user_id', session.user.id)
      .single()
    if (data) setPrefs(data as Prefs)
  }, [session])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])

  async function toggle(key: keyof Prefs) {
    if (!session) return
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next) // optimistic
    const { error } = await supabase
      .from('notification_preferences')
      .update({ [key]: next[key], updated_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
    if (error) {
      setPrefs(prefs) // rollback
      show('error', 'Could not save', error.message)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <PurpleHeader title="Notifications" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <PurpleHeader title="Notifications" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Master switch */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
        }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Allow notifications</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 2 }}>
              Master switch. When off, no notifications are sent for any category below.
            </Text>
          </View>
          <Switch
            value={prefs.enabled}
            onValueChange={() => toggle('enabled')}
            trackColor={{ false: '#d1d5db', true: '#2d1b69' }}
            thumbColor="#ffffff"
          />
        </View>

        <Text style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
          Categories
        </Text>

        <View style={{
          backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
          opacity: prefs.enabled ? 1 : 0.5,
        }}>
          {CATEGORIES.map((c, i) => (
            <View
              key={c.key}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 12,
                borderBottomWidth: i === CATEGORIES.length - 1 ? 0 : 1,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{c.title}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 2 }}>{c.desc}</Text>
              </View>
              <Switch
                value={prefs[c.key]}
                onValueChange={() => toggle(c.key)}
                disabled={!prefs.enabled}
                trackColor={{ false: '#d1d5db', true: '#2d1b69' }}
                thumbColor="#ffffff"
              />
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 12, color: '#9ca3af', lineHeight: 18, marginTop: 18, paddingHorizontal: 4 }}>
          Notifications are sent via Apple Push Notification Service (iOS) and Firebase Cloud Messaging (Android). You can revoke the OS-level permission at any time from your device&apos;s Settings &gt; Bazidpur &gt; Notifications.
        </Text>

      </ScrollView>
      <AppDialog {...dialog} onClose={hide} />
    </View>
  )
}
