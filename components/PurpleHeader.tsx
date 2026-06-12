import { View, Text, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { RoleBadge } from '@/components/RoleBadge'
import Svg, { Path, Line, Polyline, Circle } from 'react-native-svg'

const W = 'white'
const SW = 2

function SignOutIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 17l5-5-5-5" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="21" y1="12" x2="9" y2="12" stroke={W} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  )
}

function MailIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="22,6 12,13 2,6" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function HelpIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={W} strokeWidth={SW} />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={W} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="17" x2="12.01" y2="17" stroke={W} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  )
}

interface Props {
  title: string
  showBack?: boolean
  hideVisitorActions?: boolean
  hideContact?: boolean
}

export function PurpleHeader({ title, showBack, hideVisitorActions, hideContact }: Props) {
  const { session, user, role } = useAuth()
  const isMember = ['member', 'admin', 'superadmin'].includes(role ?? '')
  const insets = useSafeAreaInsets()

  const initials = user
    ? [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase()
      || user.email?.[0]?.toUpperCase()
      || '?'
    : ''

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/(tabs)/home')
  }

  return (
    <View style={{
      paddingTop: insets.top + 6,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: '#2d1b69',
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      {/* Left: back + title */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 6, paddingVertical: 4 }}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
              <Polyline points="15 18 9 12 15 6" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.2 }}>
          {title}
        </Text>
      </View>

      {/* Right: icons + auth */}
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>

        {/* Help */}
        <TouchableOpacity
          onPress={() => router.push('/(public)/help')}
          style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}
        >
          <HelpIcon />
        </TouchableOpacity>

        {/* Contact */}
        {!hideContact && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/contact')}
            style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}
          >
            <MailIcon />
          </TouchableOpacity>
        )}

        {isMember ? (
          <>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/more')}
                style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  overflow: 'hidden',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {user?.photo_url ? (
                  <Image
                    source={{ uri: user.photo_url }}
                    style={{ width: 34, height: 34 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>{initials}</Text>
                )}
              </TouchableOpacity>
              {user?.role && (
                <View style={{ position: 'absolute', bottom: -3, right: -4 }}>
                  <RoleBadge role={user.role} size={14} />
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                width: 34, height: 34, borderRadius: 8,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SignOutIcon />
            </TouchableOpacity>
          </>
        ) : !hideVisitorActions ? (
          <>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={{
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
                borderRadius: 8, paddingHorizontal: 13, paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup')}
              style={{
                backgroundColor: '#fff',
                borderRadius: 8, paddingHorizontal: 13, paddingVertical: 6,
                flexDirection: 'row', alignItems: 'center', gap: 3,
              }}
            >
              <Text style={{ fontSize: 12, color: '#2d1b69', fontWeight: '700' }}>Join</Text>
              <Text style={{ fontSize: 13, color: '#2d1b69', fontWeight: '700' }}>›</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  )
}
