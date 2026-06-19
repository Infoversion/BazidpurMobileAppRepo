import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { PurpleHeader } from '@/components/PurpleHeader'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'
const PORTRAIT       = `${R2}/about/fazihat-shah-warsi.jpg`
const GROUP_PHOTO    = `${R2}/about/fazihatshahwarsigroup.jpg`
const SUFI_GATHERING = `${R2}/about/fazihat-sufi-gathering.jpg`
const SHRINE_NIGHT   = `${R2}/urs/urs-shrine-night2.png`

const PURSUITS = [
  { icon: '🐎', title: 'Horsemanship', desc: 'Mastered riding at full speed — including the skill of picking up a peg from the ground on horseback.' },
  { icon: '🤼', title: 'Wrestling',    desc: 'Pursued as a noble tradition and source of pride — discipline and character, not merely combat.' },
  { icon: '⚗️', title: 'Alchemy',     desc: 'Studied under expert teachers, mastering the science with the trust that its secrets remain guarded.' },
  { icon: '📖', title: 'Scripture',   desc: 'Studied the Bhagavad Gita to understand Hindu beliefs — a rare breadth of spiritual curiosity for his era.' },
]

const TEACHINGS = [
  { title: 'Unity in Diversity',   desc: 'No distinction based on caste, religion, or background — all are equal in the eyes of the Divine.' },
  { title: 'Unconditional Love',   desc: 'The command to spread love freely, without condition or expectation, as the path to divine closeness.' },
  { title: 'Service to All',       desc: 'Physicians healed, prayers were offered, medicines prepared — the community served with no distinction.' },
  { title: 'Knowledge & Etiquette', desc: 'Training in manners, literature, and reverence — building character as much as faith.' },
]

const SONS = ['Abul Hasan', 'Ali Kareem', 'Mehdi Hasan']

export default function ZahoorAliScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Zahoor Ali" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* Hero */}
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e5ea' }}>
          <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, fontWeight: '600' }}>The Saint of Bazidpur</Text>
          <Text style={{ fontSize: 14, color: '#8e8e93', textAlign: 'center', lineHeight: 21, maxWidth: 300 }}>
            Scholar, saint, and servant of humanity — his legacy of love, unity, and brotherhood continues to shape the Bazidpur family across generations.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>

          {/* Portrait */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 160, height: 160, borderRadius: 80, overflow: 'hidden', borderWidth: 3, borderColor: '#e5e5ea' }}>
              <Image source={{ uri: PORTRAIT }} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1c1e', marginTop: 16 }}>Zahoor Ali · Fazihat Shah Warsi</Text>
            <Text style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>c. 1830 — 1905 · Bazidpur, Bihar, India</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#d1d1d6' }} />
              <Text style={{ fontSize: 12, color: '#8e8e93' }}>Warsi Sufi Order</Text>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#d1d1d6' }} />
            </View>
          </View>

          {/* Early life */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: '600' }}>Early Life</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 10, lineHeight: 24 }}>
              Born into privilege, destined for purpose
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 8 }}>
              Born around 1830 AD in the Gaya district of Bengal (now Bihar), Zahoor Ali was the only son of Noor Ali — the Diwan (Finance Minister) of the Choubiis Pargana region under British India.
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 8 }}>
              Tall, strong, and perceptive, Zahoor Ali grew up in an environment of abundant resources and high responsibility. His upbringing encompassed religious education, military training, horsemanship, falconry, and wrestling.
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22 }}>
              In adult life he served as Tehsildar — the district collector — of Bazidpur and surrounding areas.
            </Text>
          </View>

          {/* Pursuits */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14, fontWeight: '600', textAlign: 'center' }}>A Life of Learning</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {PURSUITS.map(item => (
                <View key={item.title} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', width: '47.5%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1c1e', marginBottom: 4, textAlign: 'center' }}>{item.title}</Text>
                  <Text style={{ fontSize: 11, color: '#8e8e93', lineHeight: 16, textAlign: 'center' }}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Spiritual turning point */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: '600', textAlign: 'center' }}>The Turning Point</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 12, lineHeight: 24, textAlign: 'center' }}>
              Meeting Hazrat Waris Ali Shah
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 8 }}>
              One night, Zahoor Ali dreamed that his Peer and Murshid, Musafir Shah Sahib, told him that Hazrat Waris Ali Shah — a revered Sufi saint from Dewa, Barabanki — had stopped at Barh, and commanded him to go and meet this extraordinary man.
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 8 }}>
              He rode to Barh the very next morning. Hazrat Waris Ali Shah embraced him, awarded him the title of{' '}
              <Text style={{ fontWeight: '700', color: '#1c1c1e' }}>'Fazihat Shah'</Text>, and initiated him into the Warsi Sufi order.
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22 }}>
              For many years thereafter, Fazihat Shah remained at the feet of Hazrat Waris Ali Shah in Barabanki, absorbing the Warsi teachings — a philosophy centred on unity in diversity, with no distinction of caste or religion.
            </Text>
          </View>

          {/* Sufi gathering photo */}
          <View style={{ borderRadius: 16, overflow: 'hidden', height: 200, marginBottom: 10 }}>
            <Image source={{ uri: SUFI_GATHERING }} style={{ flex: 1 }} contentFit="cover" contentPosition="top" />
          </View>
          <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1c1c1e' }}>In the Company of Saints</Text>
            <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 3 }}>Fazihat Shah Warsi among fellow Sufis · Late 19th century</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
              <Text style={{ fontSize: 11, color: '#8e8e93', flex: 1 }}>Standing, tallest figure, second from right</Text>
            </View>
          </View>

          {/* Core Teachings */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: '600' }}>Core Teachings</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 14, lineHeight: 24 }}>
              The Warsi way — love without condition
            </Text>
            <View style={{ gap: 10 }}>
              {TEACHINGS.map(item => (
                <View key={item.title} style={{ flexDirection: 'row', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                  <View style={{ width: 3, backgroundColor: '#e5e5ea', borderRadius: 2, flexShrink: 0 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 }}>{item.title}</Text>
                    <Text style={{ fontSize: 13, color: '#8e8e93', lineHeight: 19 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Group photo */}
          <View style={{ borderRadius: 16, overflow: 'hidden', height: 200, marginBottom: 10 }}>
            <Image source={{ uri: GROUP_PHOTO }} style={{ flex: 1 }} contentFit="cover" contentPosition="center" />
          </View>
          <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1c1c1e' }}>Fazihat Shah Warsi — with companions</Text>
            <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 3 }}>Bazidpur, Bihar · Late 19th century</Text>
          </View>

          {/* Legacy */}
          <View style={{ backgroundColor: '#1c1c1e', borderRadius: 16, padding: 18, marginBottom: 14 }}>
            <Text style={{ fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: '600' }}>Legacy</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 12, lineHeight: 24 }}>
              At rest in Bazidpur — remembered every year
            </Text>
            <Text style={{ fontSize: 14, color: '#aeaeb2', lineHeight: 22, marginBottom: 8 }}>
              Fazihat Shah Warsi passed away in 1905 and rests peacefully outside the courtyard of the Bazidpur Mosque — the same mosque where his grandfather Shah Mahmood is buried.
            </Text>
            <Text style={{ fontSize: 14, color: '#aeaeb2', lineHeight: 22 }}>
              Every year on the{' '}
              <Text style={{ color: '#ffffff', fontWeight: '600' }}>28th of Zul-Hijjah</Text>
              {' '}— the date of his passing — Warsi brothers gather at his resting place. The Holy Quran is recited and prayers are offered.
            </Text>
          </View>

          {/* Urs banner — prominent link */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/zahoor-ali/urs')}
            activeOpacity={0.88}
            style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 14, height: 140 }}
          >
            <Image source={{ uri: SHRINE_NIGHT }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.52)' }} />
            <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }}>Annual Gathering · 28th Zul-Hijjah</Text>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 }}>Urs of Fazihat Shah Warsi</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>About the Urs</Text>
                  <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>›</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, flex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
              <Text style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: '600' }}>Survived by</Text>
              {SONS.map(son => (
                <View key={son} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#d1d1d6' }} />
                  <Text style={{ fontSize: 13, color: '#374151' }}>{son}</Text>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, flex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
              <Text style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: '600' }}>Annual gathering</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1c1e' }}>28th Zul-Hijjah</Text>
              <Text style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>Bazidpur Mosque courtyard</Text>
            </View>
          </View>

          {/* Closing quote */}
          <View style={{ alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e5ea', paddingTop: 24 }}>
            <Text style={{ fontSize: 40, color: '#d1d1d6', marginBottom: 12 }}>"</Text>
            <Text style={{ fontSize: 15, color: '#6b7280', lineHeight: 24, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 }}>
              His spirit lives on in every member of the Bazidpur family — reminding us of our shared roots, our duty to love without condition, and the timeless bond that unites us all.
            </Text>
            <Text style={{ fontSize: 10, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }}>Bazidpur Family · Est. c. 1500 AD</Text>
          </View>

        </View>
      </ScrollView>
    </View>
  )
}
