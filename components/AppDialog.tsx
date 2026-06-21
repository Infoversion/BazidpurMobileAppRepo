import { Modal, View, Text, TouchableOpacity } from 'react-native'
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg'

type DialogType = 'error' | 'success' | 'info'

const ACCENT: Record<DialogType, string> = {
  error:   '#2d1b69',
  success: '#16a34a',
  info:    '#2563eb',
}

function DialogIcon({ type }: { type: DialogType }) {
  const color = ACCENT[type]
  return (
    <Svg width={52} height={52} viewBox="0 0 52 52" fill="none">
      <Circle cx="26" cy="26" r="26" fill={color} opacity={0.08} />
      <Circle cx="26" cy="26" r="20" fill={color} opacity={0.13} />

      {type === 'error' && (
        <>
          <Line x1="26" y1="17" x2="26" y2="30" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <Circle cx="26" cy="36" r="1.8" fill={color} />
        </>
      )}

      {type === 'success' && (
        <Polyline points="18,27 24,33 34,21" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}

      {type === 'info' && (
        <>
          <Circle cx="26" cy="19" r="1.8" fill={color} />
          <Line x1="26" y1="25" x2="26" y2="36" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </Svg>
  )
}

interface Props {
  visible: boolean
  type?: DialogType
  title: string
  detail?: string
  onClose: () => void
  closeLabel?: string
}

export function AppDialog({ visible, type = 'info', title, detail, onClose, closeLabel = 'OK' }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          paddingTop: 28,
          paddingBottom: 20,
          paddingHorizontal: 24,
          width: '100%',
          maxWidth: 340,
          alignItems: 'center',
        }}>
          <DialogIcon type={type} />

          <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 16, textAlign: 'center', lineHeight: 24 }}>
            {title}
          </Text>

          {detail ? (
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
              {detail}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 22,
              backgroundColor: '#1d4ed8',
              borderRadius: 12,
              paddingVertical: 13,
              alignSelf: 'stretch',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{closeLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ErrorDialog now delegates to AppDialog — existing callers unchanged
export function ErrorDialog(props: Omit<Props, 'type'>) {
  return <AppDialog {...props} type="error" />
}
