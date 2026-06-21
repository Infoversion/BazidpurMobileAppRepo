import { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
// Direct subpath imports to avoid pulling in the 7.7MB city.json that the
// barrel re-exports — parsing it blows JSC's stack on iOS.
import Country from 'country-state-city/lib/country'
import State from 'country-state-city/lib/state'

interface Option { code: string; name: string }

function SelectModal({
  visible, options, onSelect, onClose, title,
}: {
  visible: boolean
  options: Option[]
  onSelect: (o: Option) => void
  onClose: () => void
  title: string
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return q ? options.filter(o => o.name.toLowerCase().includes(q)) : options
  }, [query, options])

  function handleClose() {
    setQuery('')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        {/* Header */}
        <View style={{ backgroundColor: '#2d1b69', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={{
                flex: 1, fontSize: 17, color: '#fff',
                paddingTop: 10, paddingBottom: 12, paddingHorizontal: 14,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 10,
              }}
            />
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.code}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { setQuery(''); onSelect(item) }}
              style={{ paddingHorizontal: 16, paddingVertical: 15, backgroundColor: '#fff' }}
            >
              <Text style={{ fontSize: 17, color: '#111827' }}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  )
}

function PickerButton({
  value, placeholder, disabled, onPress,
}: {
  value: string
  placeholder: string
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#f9fafb' : '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingHorizontal: 13,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text style={{ fontSize: 17, color: value ? '#111827' : '#9ca3af', flex: 1 }}>
        {value || placeholder}
      </Text>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>▼</Text>
    </TouchableOpacity>
  )
}

// ── Country Picker ────────────────────────────────────────────────

interface CountryPickerProps {
  value: string        // country display name
  countryCode: string  // ISO code (used to load states)
  onChange: (name: string, code: string) => void
}

export function CountryPicker({ value, countryCode, onChange }: CountryPickerProps) {
  const [open, setOpen] = useState(false)

  const options = useMemo(
    () => Country.getAllCountries().map(c => ({ code: c.isoCode, name: c.name })),
    []
  )

  return (
    <>
      <PickerButton value={value} placeholder="Select country" onPress={() => setOpen(true)} />
      <SelectModal
        visible={open}
        title="Select Country"
        options={options}
        onSelect={opt => { onChange(opt.name, opt.code); setOpen(false) }}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

// ── State Picker ──────────────────────────────────────────────────

interface StatePickerProps {
  value: string
  countryCode: string
  onChange: (name: string, code: string) => void
}

export function StatePicker({ value, countryCode, onChange }: StatePickerProps) {
  const [open, setOpen] = useState(false)

  const options = useMemo(() => {
    if (!countryCode) return []
    return State.getStatesOfCountry(countryCode).map(s => ({ code: s.isoCode, name: s.name }))
  }, [countryCode])

  const disabled = !countryCode
  const placeholder = countryCode
    ? options.length > 0 ? 'Select state / region' : 'No states available'
    : 'Select country first'

  return (
    <>
      <PickerButton
        value={value}
        placeholder={placeholder}
        disabled={disabled || options.length === 0}
        onPress={() => setOpen(true)}
      />
      <SelectModal
        visible={open}
        title="Select State / Region"
        options={options}
        onSelect={opt => { onChange(opt.name, opt.code); setOpen(false) }}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
