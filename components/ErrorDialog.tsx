import { Modal, View, Text, TouchableOpacity } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'

function AlertIcon() {
  return (
    <Svg width={52} height={52} viewBox="0 0 52 52" fill="none">
      <Circle cx="26" cy="26" r="26" fill="#2d1b69" opacity={0.1} />
      <Circle cx="26" cy="26" r="20" fill="#2d1b69" opacity={0.15} />
      <Line x1="26" y1="17" x2="26" y2="30" stroke="#2d1b69" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="26" cy="36" r="1.8" fill="#2d1b69" />
    </Svg>
  )
}

interface Props {
  visible: boolean
  title: string
  detail?: string
  onClose: () => void
  closeLabel?: string
}

export function ErrorDialog({ visible, title, detail, onClose, closeLabel = 'OK' }: Props) {
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
          <AlertIcon />

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
              backgroundColor: '#2d1b69',
              borderRadius: 12,
              paddingVertical: 13,
              paddingHorizontal: 40,
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
