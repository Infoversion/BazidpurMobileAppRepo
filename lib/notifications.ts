/**
 * All notification logic is wrapped in try/catch so a failure in the native
 * module (mis-link, missing entitlement, runtime API change) can never crash
 * app startup. Calls become no-ops; the rest of the app keeps working.
 */
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Lazy-load the native modules so an import-time error doesn't kill startup.
let Notifications: typeof import('expo-notifications') | null = null
let Device: typeof import('expo-device') | null = null

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications')
} catch (e) {
  console.warn('[notifications] expo-notifications not available', e)
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Device = require('expo-device')
} catch (e) {
  console.warn('[notifications] expo-device not available', e)
}

let handlerInstalled = false
function installHandler() {
  if (handlerInstalled || !Notifications) return
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        // Older SDK fields kept as fallbacks in case the cast to the new API
        // shape isn't supported on the bundled runtime.
        shouldShowAlert: true,
      } as any),
    })
    handlerInstalled = true
  } catch (e) {
    console.warn('[notifications] setNotificationHandler failed', e)
  }
}

/**
 * Ask the OS for push permission. Returns the Expo push token if granted,
 * null otherwise (including on simulators).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    installHandler()
    if (!Notifications || !Device) return null
    if (!Device.isDevice) return null

    const { status: existing } = await Notifications.getPermissionsAsync()
    let status = existing
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync()
      status = req.status
    }
    if (status !== 'granted') return null

    const projectId = '214b0ec8-49ed-4d9e-8245-662a0860599c'
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Bazidpur',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2d1b69',
        })
      } catch (e) {
        console.warn('[notifications] setNotificationChannelAsync failed', e)
      }
    }
    return token
  } catch (e) {
    console.warn('[notifications] registerForPushNotifications failed', e)
    return null
  }
}

/** Upsert the push token for the current user. */
export async function saveTokenForCurrentUser(token: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const platform: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' :
      Platform.OS === 'android' ? 'android' : 'web'

    const deviceName = Device?.deviceName || Device?.modelName || null

    await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: session.user.id,
          token,
          platform,
          device_name: deviceName,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      )
  } catch (e) {
    console.warn('[notifications] saveTokenForCurrentUser failed', e)
  }
}

/** Ensure a row exists in notification_preferences for the current user. */
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

/** Register + save token + seed preferences. Fire-and-forget. */
export async function bootstrapNotifications() {
  try {
    const token = await registerForPushNotifications()
    if (token) await saveTokenForCurrentUser(token)
    await ensurePreferencesRow()
  } catch (e) {
    console.warn('[notifications] bootstrap failed', e)
  }
}

/** Mark a single notification as read. */
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

/** Mark all of the current user's notifications as read. */
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
