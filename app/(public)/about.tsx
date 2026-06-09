import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'
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
    <SafeAreaView className="flex-1 bg-[#f5f5f7]" edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-12">

        {/* Hero */}
        <View className="bg-white border-b border-gray-100 px-6 py-8 items-center">
          <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">Bihar, India</Text>
          <Text className="text-3xl font-bold text-gray-900 mb-2 tracking-tight text-center">About Bazidpur</Text>
          <Text className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
            A village of faith, learning, and enduring heritage — rooted in the legacy of a Persian Sufi saint.
          </Text>
        </View>

        <View className="px-4 pt-6">

          {/* Mosque photo */}
          <View className="mb-8 rounded-2xl overflow-hidden h-52 border border-gray-100">
            <Image source={{ uri: MOSQUE_PHOTO }} style={{ flex: 1 }} contentFit="cover" />
            <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
              <Text className="text-white text-sm font-medium">The Mosque of Bazidpur</Text>
              <Text className="text-white/70 text-xs mt-0.5">Resting place of Shah Mahmood and his descendants</Text>
            </View>
          </View>

          {/* Origin */}
          <View className="mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Origin</Text>
            <Text className="text-2xl font-semibold text-gray-900 mb-4 leading-tight">
              Founded in honour of a Persian Sufi
            </Text>
            <Text className="text-gray-600 leading-relaxed text-sm mb-3">
              Bazidpur was founded by Shah Mahmood to honour Bayazid Bastami — a revered Persian Sufi from north-central Iran who lived around 850 AD. The very name of the village carries this spiritual legacy.
            </Text>
            <Text className="text-gray-600 leading-relaxed text-sm">
              Shah Mahmood is buried within the village mosque, alongside his descendants Diwan Noor Ali and Zahoor Ali — known to all as Fazihat Shah Warsi.
            </Text>
          </View>

          {/* Stats grid */}
          <View className="flex-row flex-wrap gap-3 mb-8">
            {STATS.map(s => (
              <View key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4" style={{ width: '47%' }}>
                <Text className="text-xs text-gray-400 uppercase tracking-widest mb-1">{s.label}</Text>
                <Text className="text-sm font-semibold text-gray-900 leading-snug">{s.value}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{s.sub}</Text>
              </View>
            ))}
          </View>

          {/* Surroundings */}
          <View className="mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-4 text-center">Surroundings</Text>
            <View className="gap-3">
              {SURROUNDINGS.map(item => (
                <View key={item.title} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <Text className="text-2xl mb-3">{item.icon}</Text>
                  <Text className="text-sm font-semibold text-gray-900 mb-1">{item.title}</Text>
                  <Text className="text-sm text-gray-500 leading-relaxed">{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Fields photo + Heritage */}
          <View className="mb-8 rounded-2xl overflow-hidden h-44 border border-gray-100">
            <Image source={{ uri: FIELDS_PHOTO }} style={{ flex: 1 }} contentFit="cover" />
          </View>
          <View className="mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Land & Livelihood</Text>
            <Text className="text-xl font-semibold text-gray-900 mb-3 leading-tight">Fertile soil, rooted community</Text>
            <Text className="text-gray-600 leading-relaxed text-sm mb-3">
              Bazidpur sits on exceptionally fertile land yielding wheat, rice, corn, pulses, and a variety of cash crops. Farming, dairy, and poultry form the backbone of local livelihoods.
            </Text>
            <View className="border-t border-gray-100 pt-4 mt-2">
              <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Heritage</Text>
              <Text className="text-gray-600 leading-relaxed text-sm">
                For generations, Bazidpur families pursued both religious and worldly education — a balance that shaped the community's character and sustained its influence across the wider region.
              </Text>
            </View>
          </View>

          {/* Getting here */}
          <View className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Getting here</Text>
            <Text className="text-xl font-semibold text-gray-900 mb-5">How to reach Bazidpur</Text>
            <View className="gap-5">
              {DIRECTIONS.map(item => (
                <View key={item.step} className="flex-row gap-4">
                  <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center flex-shrink-0">
                    <Text className="text-lg">{item.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-400 mb-0.5">{item.step}</Text>
                    <Text className="text-sm font-semibold text-gray-900 mb-1">{item.title}</Text>
                    <Text className="text-sm text-gray-500 leading-relaxed">{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Aerial photo */}
          <View className="mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-1">Village at a Glance</Text>
            <Text className="text-xl font-semibold text-gray-900 mb-1">Landmarks of Bazidpur</Text>
            <Text className="text-gray-500 text-sm mb-4 leading-relaxed">
              Aerial view with key landmarks — mosques, havelis, ponds, and open spaces.
            </Text>
            <View className="rounded-2xl overflow-hidden border border-gray-100">
              <Image source={{ uri: AERIAL_PHOTO }} style={{ width: '100%', height: 220 }} contentFit="cover" />
            </View>
          </View>

          {/* Map */}
          <View className="mb-4">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-1">Location</Text>
            <Text className="text-xl font-semibold text-gray-900 mb-1">Where is Bazidpur?</Text>
            <Text className="text-gray-500 text-sm mb-4">Bazidpur village, Nawada district, Bihar, India.</Text>
            <TouchableOpacity
              className="w-full py-3.5 bg-white border border-gray-200 rounded-xl items-center flex-row justify-center gap-2"
              onPress={openMaps}
            >
              <Text className="text-lg">📍</Text>
              <Text className="text-sm font-semibold text-gray-800">Open in Maps</Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-400 text-center mt-2">
              25.10198° N, 85.66204° E
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
