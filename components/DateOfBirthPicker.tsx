import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

interface Props {
  value: string
  onChange: (v: string) => void
  label?: string
  defaultDate?: Date
}

export function DateOfBirthPicker({ value, onChange, label = 'Date of Birth', defaultDate }: Props) {
  const [show, setShow] = useState(false)
  const dateObj = value ? (() => {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d) // local time — avoids UTC midnight timezone shift
  })() : null
  const display = dateObj
    ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Select date'
  const fallback = defaultDate ?? new Date(2000, 0, 1)

  function applyDate(date: Date | undefined) {
    if (date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      onChange(`${y}-${m}-${d}`)
    }
  }

  // Legacy Android path still uses onChange
  function handleChange(_: any, date?: Date) {
    setShow(false)
    applyDate(date)
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
          borderRadius: 12, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 15,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 17, color: dateObj ? '#111827' : '#9ca3af' }}>{display}</Text>
        <Text style={{ fontSize: 16, color: '#9ca3af' }}>📅</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} activeOpacity={1} onPress={() => setShow(false)} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1c1e' }}>{label}</Text>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#2d1b69' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={dateObj ?? fallback}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onValueChange={(_, date) => applyDate(date)}
              onDismiss={() => setShow(false)}
            />
          </View>
        </Modal>
      ) : show ? (
        <DateTimePicker
          value={dateObj ?? fallback}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onValueChange={(_, date) => { setShow(false); applyDate(date) }}
          onDismiss={() => setShow(false)}
        />
      ) : null}
    </View>
  )
}
