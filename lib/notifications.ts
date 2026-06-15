/**
 * Notifications module — TEMPORARILY STUBBED.
 *
 * Removed during a debug session: an iOS 26 + Expo SDK 54 incompatibility in
 * expo-notifications was crashing the app at launch (TurboModule NSException
 * raised during native module registration -> Hermes JSError conversion ->
 * SIGSEGV before any JS code could run).
 *
 * We took the package out of the build entirely so the app launches cleanly,
 * and these stubs keep every existing call site (auth context, inbox screen,
 * settings screen) compiling. All functions are no-ops; they touch only
 * Supabase, never the missing native module.
 *
 * Re-add expo-notifications once a fix is available — see
 * docs/notifications_setup_guide.md.
 */
import { supabase } from './supabase'

export async function registerForPushNotifications(): Promise<string | null> {
  return null
}

export async function saveTokenForCurrentUser(_token: string) {
  /* no-op until expo-notifications is re-enabled */
}

export async function ensurePreferencesRow() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase
      .from('notification_preferences')
      .upsert({ user_id: session.user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
  } catch (e) {
    console.warn('[notifications] ensurePreferencesRow failed', e)
  }
}

export async function bootstrapNotifications() {
  /* no-op until expo-notifications is re-enabled */
}

export async function markNotificationRead(id: string) {
  try {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .is('read_at', null)
  } catch (e) {
    console.warn('[notifications] markNotificationRead failed', e)
  }
}

export async function markAllNotificationsRead() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .is('read_at', null)
  } catch (e) {
    console.warn('[notifications] markAllNotificationsRead failed', e)
  }
}
