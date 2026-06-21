import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { Image } from 'expo-image'
import { PurpleHeader } from '@/components/PurpleHeader'
import { R2 } from '@/lib/constants'
const MOSQUE_PHOTO  = `${R2}/about/mosque-entrance2.png`
const FIELDS_PHOTO  = `${R2}/about/village-fields.jpg`
const AERIAL_PHOTO  = `${R2}/about/bazidpur-aerial-landmarks.png`

const STATS = [
  { label: 'Founded',      value: 'c. 1500 AD',      sub: 'by Shah Mahmood' },
  { label: 'Named after',  value: 'Bayazid Bastami',  sub: 'Persian Sufi, c. 850 AD' },
  { label: 'Location',     value: 'Bihar, India',     sub: '85 miles SW of Patna' },
  { label: 'Surroundings', value: 'Rajgir & Nalanda', sub: 'Historic heartland' },
]

const SURROUNDINGS = [
  { icon: '🏔️', title: 'Hills of Rajgir',       desc: 'Forested hills with ancient hot springs — a landscape of timeless beauty to the west of the village.' },
  { icon: '🏛️', title: 'Nalanda University',     desc: 'Ruins of one of the world\'s earliest universities, founded during the era of Gautama Buddha.' },
  { icon: '🕌', title: 'Bihar Sharif',           desc: 'Ten miles from Rajgir — the mausoleum of Makhdoom Sharfuddin Yahya Maneri draws visitors from across the region.' },
]

const DIRECTIONS = [
  { step: '01', icon: '✈️', title: 'Fly to Patna',          desc: 'Direct flights from Delhi, Mumbai, and Kolkata connect to Patna — your gateway to the region.' },
  { step: '02', icon: '🚂', title: 'Or take the train',     desc: 'High-speed trains run frequently from all major Indian cities to Patna Junction.' },
  { step: '03', icon: '🚗', title: 'Hire a car to Bazidpur', desc: 'From Patna, the village is about 85 miles south-west. A hired car typically costs $50–80.' },
]

export default function AboutScreen() {
  function openMaps() {
    Linking.openURL('https://maps.google.com/?q=25.10198,85.66204')
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="About Bazidpur" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* Hero */}
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
          <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontWeight: '600' }}>Bihar, India</Text>
          <Text style={{ fontSize: 14, color: '#8e8e93', textAlign: 'center', lineHeight: 21, maxWidth: 300 }}>
            A village of faith, learning, and enduring heritage — rooted in the legacy of a Persian Sufi saint.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>

          {/* Mosque photo */}
          <View style={{ marginBottom: 8, borderRadius: 16, overflow: 'hidden', height: 200 }}>
            <Image source={{ uri: MOSQUE_PHOTO }} style={{ flex: 1 }} contentFit="cover" />
          </View>
          <View style={{ marginBottom: 24, paddingHorizontal: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1c1c1e' }}>The Mosque of Bazidpur</Text>
            <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>Resting place of Shah Mahmood and his descendants</Text>
          </View>

          {/* Origin */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: '600' }}>Origin</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginBottom: 12, lineHeight: 26 }}>
              Founded in honour of a Persian Sufi
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 10 }}>
              Bazidpur was founded by Shah Mahmood to honour Bayazid Bastami — a revered Persian Sufi from north-central Iran who lived around 850 AD. The very name of the village carries this spiritual legacy.
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22 }}>
              Shah Mahmood is buried within the village mosque, alongside his descendants Diwan Noor Ali and Zahoor Ali — known to all as Fazihat Shah Warsi.
            </Text>
          </View>

          {/* Stats grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            {STATS.map(s => (
              <View key={s.label} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, width: '47.5%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                <Text style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: '600' }}>{s.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1c1e', lineHeight: 18 }}>{s.value}</Text>
                <Text style={{ fontSize: 11, color: '#aeaeb2', marginTop: 2 }}>{s.sub}</Text>
              </View>
            ))}
          </View>

          {/* Surroundings */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14, fontWeight: '600', textAlign: 'center' }}>Surroundings</Text>
            <View style={{ gap: 10 }}>
              {SURROUNDINGS.map(item => (
                <View key={item.title} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 }}>{item.title}</Text>
                  <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 20 }}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Fields photo */}
          <View style={{ marginBottom: 24, borderRadius: 16, overflow: 'hidden', height: 176 }}>
            <Image source={{ uri: FIELDS_PHOTO }} style={{ flex: 1 }} contentFit="cover" />
          </View>

          {/* Land & Livelihood */}
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: '600' }}>Land & Livelihood</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 10, lineHeight: 24 }}>Fertile soil, rooted community</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 10 }}>
              Bazidpur sits on exceptionally fertile land yielding wheat, rice, corn, pulses, and a variety of cash crops. Farming, dairy, and poultry form the backbone of local livelihoods.
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#f2f2f7', paddingTop: 12, marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: '600' }}>Heritage</Text>
              <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22 }}>
                For generations, Bazidpur families pursued both religious and worldly education — a balance that shaped the community's character and sustained its influence across the wider region.
              </Text>
            </View>
          </View>

          {/* Getting here */}
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, fontWeight: '600' }}>Getting here</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 16, lineHeight: 24 }}>How to reach Bazidpur</Text>
            <View style={{ gap: 16 }}>
              {DIRECTIONS.map(item => (
                <View key={item.step} style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0effe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: '#aeaeb2', marginBottom: 2 }}>{item.step}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 }}>{item.title}</Text>
                    <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 19 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Aerial photo */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, fontWeight: '600' }}>Village at a Glance</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 10 }}>Landmarks of Bazidpur</Text>
            <View style={{ borderRadius: 16, overflow: 'hidden' }}>
              <Image source={{ uri: AERIAL_PHOTO }} style={{ width: '100%', height: 220 }} contentFit="cover" />
            </View>
          </View>

          {/* Map */}
          <View>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, fontWeight: '600' }}>Location</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 }}>Where is Bazidpur?</Text>
            <Text style={{ fontSize: 13, color: '#8e8e93', marginBottom: 12 }}>Bazidpur village, Nawada district, Bihar, India.</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
              onPress={openMaps}
            >
              <Text style={{ fontSize: 18 }}>📍</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e' }}>Open in Maps</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center', marginTop: 8 }}>
              25.10198° N, 85.66204° E
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  )
}
