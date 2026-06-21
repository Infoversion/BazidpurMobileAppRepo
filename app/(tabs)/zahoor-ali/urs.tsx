import { View, Text, ScrollView, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PurpleHeader } from '@/components/PurpleHeader'

import { R2 } from '@/lib/constants'
const SHRINE_NIGHT      = `${R2}/urs/urs-shrine-night2.png`
const MOSQUE_GATHERING  = `${R2}/urs/urs-mosque-gathering2.png`
const QAWWALI           = `${R2}/urs/urs-qawwali.jpg`
const CHADAR            = `${R2}/urs/urs-chadar.jpg`

const ACTIVITIES = [
  {
    icon: '🌸',
    title: 'Flowers & Chadar',
    desc: 'Devotees pay their respects by offering flowers and a chadar — a decorated ceremonial cloth — placed over the grave of Hazrat Fazihat Shah Warsi.',
  },
  {
    icon: '🎵',
    title: 'Qawwali',
    desc: 'Reputable Qawwals of the region perform devotional music through the night, filling the courtyard with songs of love and spiritual longing.',
  },
  {
    icon: '📖',
    title: 'Quran Recitation',
    desc: "The Holy Quran is recited and prayers are offered for the salvation of the saint's soul and the wellbeing of all who gather.",
  },
  {
    icon: '🍽️',
    title: 'Food & Hospitality',
    desc: 'A tent is raised in the courtyard to welcome all visitors. Snacks and dinner are served freely — no one leaves hungry.',
  },
]

const TEACHINGS = [
  { title: 'Unity in Diversity', desc: 'No barrier of faith or background — all are welcome and equal.' },
  { title: 'Unconditional Love', desc: 'Love given freely, without condition or expectation.' },
  { title: 'Brotherhood',        desc: 'A bond that transcends family, community, and nation.' },
]

export default function UrsScreen() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const heroH = Math.round(width * 0.55)
  const halfW = (width - 48) / 2

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="The Urs" showBack />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero image */}
        <View style={{ height: heroH, backgroundColor: '#1c1c1e' }}>
          <Image source={{ uri: SHRINE_NIGHT }} style={{ flex: 1 }} contentFit="cover" />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 }}>Annual Gathering · 28th Zul-Hijjah</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Urs of Hazrat Fazihat Shah Warsi</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>

          {/* Intro */}
          <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 20, textAlign: 'center' }}>
            Every year, people of all backgrounds gather at the Bazidpur Mosque to honour the memory of Hazrat Fazihat Shah Warsi — a night of devotion, music, and unity.
          </Text>

          {/* What is Urs */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: '600' }}>What is Urs?</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 12, lineHeight: 24 }}>A celebration of divine union</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 8 }}>
              The word <Text style={{ fontWeight: '700', color: '#1c1c1e' }}>Urs</Text> — meaning "wedding" in Arabic — marks the death anniversary of a Sufi saint. In Sufi tradition, death is not mourning but a union with the Divine: the soul's ultimate wedding with the Beloved.
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22 }}>
              Observed across Sufi orders worldwide, Urs is a time of remembrance, devotion, and communal gathering at the saint's dargah. The celebration fills the night with prayers, poetry, and music.
            </Text>
          </View>

          {/* When / Where / Who */}
          <View style={{ gap: 10, marginBottom: 20 }}>
            <View style={{ backgroundColor: '#1c1c1e', borderRadius: 14, padding: 16 }}>
              <Text style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: '600' }}>When</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 }}>28th Zul-Hijjah</Text>
              <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 18 }}>The date of Hazrat Fazihat Shah Warsi's passing — observed annually</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#e5e5ea' }}>
                <Text style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: '600' }}>Where</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1c1e', marginBottom: 3 }}>Bazidpur Mosque Courtyard</Text>
                <Text style={{ fontSize: 12, color: '#8e8e93' }}>Bazidpur, Nalanda District, Bihar, India</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#e5e5ea' }}>
                <Text style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: '600' }}>Who attends</Text>
                <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>Rich and poor, from different faiths and backgrounds — all are welcome.</Text>
              </View>
            </View>
          </View>

          {/* Mosque gathering photo */}
          <View style={{ borderRadius: 16, overflow: 'hidden', height: 180, marginBottom: 6 }}>
            <Image source={{ uri: MOSQUE_GATHERING }} style={{ flex: 1 }} contentFit="cover" contentPosition="top" />
          </View>
          <Text style={{ fontSize: 11, color: '#8e8e93', textAlign: 'center', marginBottom: 20 }}>
            Devotees gather at the Bazidpur Mosque on the night of Urs
          </Text>

          {/* How the night unfolds */}
          <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, fontWeight: '600', textAlign: 'center' }}>The Celebration</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 14, textAlign: 'center' }}>How the night unfolds</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {ACTIVITIES.map(item => (
              <View key={item.title} style={{ width: halfW, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1c1e', marginBottom: 6 }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: '#8e8e93', lineHeight: 17 }}>{item.desc}</Text>
              </View>
            ))}
          </View>

          {/* Qawwali + Chadar photos */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            <View style={{ flex: 1, borderRadius: 14, overflow: 'hidden', height: 140 }}>
              <Image source={{ uri: QAWWALI }} style={{ flex: 1 }} contentFit="cover" />
            </View>
            <View style={{ flex: 1, borderRadius: 14, overflow: 'hidden', height: 140 }}>
              <Image source={{ uri: CHADAR }} style={{ flex: 1 }} contentFit="cover" contentPosition="top" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <Text style={{ flex: 1, fontSize: 10, color: '#8e8e93', textAlign: 'center' }}>Qawwali under the ceremonial tent</Text>
            <Text style={{ flex: 1, fontSize: 10, color: '#8e8e93', textAlign: 'center' }}>The chadar procession to the shrine</Text>
          </View>

          {/* Warsi teachings */}
          <View style={{ backgroundColor: '#f4f0ff', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 0.5, borderColor: '#ddd6fe' }}>
            <Text style={{ fontSize: 11, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, fontWeight: '600', textAlign: 'center' }}>The Message</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1c1c1e', marginBottom: 10, textAlign: 'center', lineHeight: 24 }}>
              Warsi teachings at the heart of Urs
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 14, textAlign: 'center' }}>
              The Urs is not only a commemoration — it is a living classroom. Gatherings centre on the Warsi teachings: that there is no distinction of caste or religion in the eyes of the Divine, and that love and brotherhood are the path to spiritual closeness.
            </Text>
            <View style={{ gap: 10 }}>
              {TEACHINGS.map(item => (
                <View key={item.title} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: '#ede9fe' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 }}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: '#8e8e93', lineHeight: 17 }}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Closing quote */}
          <View style={{ alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e5ea', paddingTop: 24 }}>
            <Text style={{ fontSize: 40, color: '#d1d1d6', marginBottom: 10 }}>"</Text>
            <Text style={{ fontSize: 15, color: '#6b7280', lineHeight: 24, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 }}>
              Every year, without fail, the courtyard fills again — a reminder that love outlasts lifetimes, and that the bonds of Bazidpur stretch across time and distance.
            </Text>
            <Text style={{ fontSize: 10, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }}>Bazidpur · 28th Zul-Hijjah · Every Year</Text>
          </View>

        </View>
      </ScrollView>
    </View>
  )
}
