import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'
const PORTRAIT       = `${R2}/about/fazihat-shah-warsi.jpg`
const GROUP_PHOTO    = `${R2}/about/fazihatshahwarsigroup.jpg`
const SUFI_GATHERING = `${R2}/about/fazihat-sufi-gathering.jpg`

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

export default function FazihatShahWarsiScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f5f5f7]" edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-12">

        {/* Hero */}
        <View className="bg-white border-b border-gray-100 px-6 py-8 items-center">
          <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">The Saint of Bazidpur</Text>
          <Text className="text-3xl font-bold text-gray-900 mb-2 tracking-tight text-center leading-tight">
            Fazihat Shah Warsi
          </Text>
          <Text className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
            Scholar, saint, and servant of humanity — his legacy of love, unity, and brotherhood
            continues to shape the Bazidpur family across generations.
          </Text>
        </View>

        <View className="px-4 pt-6">

          {/* Portrait */}
          <View className="items-center mb-8">
            <View className="relative">
              <View className="w-44 h-44 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm">
                <Image source={{ uri: PORTRAIT }} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" />
              </View>
            </View>
            <Text className="text-sm font-medium text-gray-900 mt-5">Zahoor Ali · Fazihat Shah Warsi</Text>
            <Text className="text-xs text-gray-400 mt-1">c. 1830 — 1905 · Bazidpur, Bihar, India</Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <Text className="text-xs text-gray-400">Warsi Sufi Order</Text>
              <View className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            </View>
          </View>

          {/* Early life */}
          <View className="mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Early Life</Text>
            <Text className="text-xl font-semibold text-gray-900 mb-4 leading-tight">
              Born into privilege, destined for purpose
            </Text>
            <Text className="text-gray-600 leading-relaxed text-sm mb-3">
              Born around 1830 AD in the Gaya district of Bengal (now Bihar), Zahoor Ali was the only son of Noor Ali — the Diwan (Finance Minister) of the Choubiis Pargana region under British India.
            </Text>
            <Text className="text-gray-600 leading-relaxed text-sm mb-3">
              Tall, strong, and perceptive, Zahoor Ali grew up in an environment of abundant resources and high responsibility. His upbringing encompassed religious education, military training, horsemanship, falconry, and wrestling.
            </Text>
            <Text className="text-gray-600 leading-relaxed text-sm">
              In adult life he served as Tehsildar — the district collector — of Bazidpur and surrounding areas.
            </Text>
          </View>

          {/* Pursuits */}
          <View className="mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 text-center">A Life of Learning</Text>
            <Text className="text-xl font-semibold text-gray-900 mb-4 text-center">Master of many sciences</Text>
            <View className="flex-row flex-wrap gap-3">
              {PURSUITS.map(item => (
                <View key={item.title} className="bg-white border border-gray-100 rounded-2xl p-4 items-center" style={{ width: '47%' }}>
                  <Text className="text-3xl mb-2">{item.icon}</Text>
                  <Text className="text-sm font-semibold text-gray-900 mb-1 text-center">{item.title}</Text>
                  <Text className="text-xs text-gray-500 leading-relaxed text-center">{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Spiritual turning point */}
          <View className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 text-center">The Turning Point</Text>
            <Text className="text-xl font-semibold text-gray-900 mb-4 text-center leading-tight">
              Meeting Hazrat Waris Ali Shah
            </Text>
            <Text className="text-gray-600 leading-relaxed text-sm mb-3">
              One night, Zahoor Ali dreamed that his Peer and Murshid, Musafir Shah Sahib, told him that Hazrat Waris Ali Shah — a revered Sufi saint from Dewa, Barabanki — had stopped at Barh, and commanded him to go and meet this extraordinary man.
            </Text>
            <Text className="text-gray-600 leading-relaxed text-sm mb-3">
              He rode to Barh the very next morning. Hazrat Waris Ali Shah embraced him, awarded him the title of{' '}
              <Text className="font-medium text-gray-900">'Fazihat Shah'</Text>, and initiated him into the Warsi Sufi order.
            </Text>
            <Text className="text-gray-600 leading-relaxed text-sm">
              For many years thereafter, Fazihat Shah remained at the feet of Hazrat Waris Ali Shah in Barabanki, absorbing the Warsi teachings — a philosophy centred on unity in diversity, with no distinction of caste or religion, and an unconditional command to love.
            </Text>
          </View>

          {/* Sufi gathering photo */}
          <View className="mb-8 rounded-2xl overflow-hidden border border-gray-100 h-52">
            <Image source={{ uri: SUFI_GATHERING }} style={{ flex: 1 }} contentFit="cover" contentPosition="top" />
          </View>
          <View className="mb-2 px-1">
            <Text className="text-sm font-medium text-gray-800">In the Company of Saints</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Fazihat Shah Warsi among fellow Sufis of the Warsi order · Late 19th century</Text>
            <View className="flex-row items-center gap-1.5 mt-1.5">
              <View className="w-2 h-2 rounded-full bg-amber-400" />
              <Text className="text-xs text-gray-500 flex-1">Fazihat Shah Warsi — standing, tallest figure, second from right</Text>
            </View>
          </View>

          {/* Fellowship */}
          <View className="mt-6 mb-8 gap-3">
            <View className="bg-white border border-gray-100 rounded-2xl p-5">
              <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">A Seeker Among Seekers</Text>
              <Text className="text-gray-600 leading-relaxed text-sm">
                What distinguished Fazihat Shah in these assemblies was not only his depth of knowledge, but his rare gift for listening. He approached every gathering as a student first — absorbing, questioning, and refining — before offering his own light to those around him.
              </Text>
            </View>
            <View className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">A Living Tradition</Text>
              <Text className="text-gray-600 leading-relaxed text-sm">
                The Warsi order to which he belonged was bound together not by geography, but by devotion — a fellowship of souls stretching across the subcontinent, united by love for the Divine and service to humanity.
              </Text>
            </View>
          </View>

          {/* Group photo */}
          <View className="mb-8 rounded-2xl overflow-hidden border border-gray-100 h-52">
            <Image source={{ uri: GROUP_PHOTO }} style={{ flex: 1 }} contentFit="cover" contentPosition="center" />
          </View>
          <View className="mb-8 px-1">
            <Text className="text-sm font-medium text-gray-800">Fazihat Shah Warsi — with companions</Text>
            <Text className="text-xs text-gray-400 mt-0.5">Bazidpur, Bihar · Late 19th century</Text>
          </View>

          {/* Teachings */}
          <View className="mb-8">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Core Teachings</Text>
            <Text className="text-xl font-semibold text-gray-900 mb-4 leading-tight">
              The Warsi way — love without condition
            </Text>
            <View className="gap-3">
              {TEACHINGS.map(item => (
                <View key={item.title} className="flex-row gap-4 p-4 bg-white border border-gray-100 rounded-2xl">
                  <View className="w-1 bg-gray-200 rounded-full flex-shrink-0" />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900 mb-1">{item.title}</Text>
                    <Text className="text-sm text-gray-500 leading-relaxed">{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* In Bazidpur + His Voice */}
          <View className="gap-3 mb-8">
            <View className="bg-white border border-gray-100 rounded-2xl p-5">
              <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">In Bazidpur</Text>
              <Text className="text-gray-600 leading-relaxed text-sm">
                In Bazidpur, the atmosphere of brotherhood flourished. Gatherings were held in the mosque courtyard — physicians healed, scholars taught, and medicines were prepared by hand. Prayers were offered for all who sought them.
              </Text>
            </View>
            <View className="bg-white border border-gray-100 rounded-2xl p-5">
              <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">His Voice</Text>
              <Text className="text-gray-600 leading-relaxed text-sm italic">
                Fazihat Shah expressed himself with great beauty in both Persian and Urdu — his words as much a vessel of teaching as his deeds.
              </Text>
            </View>
          </View>

          {/* Legacy */}
          <View className="mb-8">
            <View className="bg-gray-900 rounded-2xl p-6 mb-3">
              <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Legacy</Text>
              <Text className="text-xl font-semibold text-white mb-3 leading-tight">
                At rest in Bazidpur — remembered every year
              </Text>
              <Text className="text-gray-300 leading-relaxed text-sm mb-3">
                Fazihat Shah Warsi passed away in 1905 and rests peacefully outside the courtyard of the Bazidpur Mosque — the same mosque where his grandfather Shah Mahmood is buried.
              </Text>
              <Text className="text-gray-300 leading-relaxed text-sm">
                Every year on the{' '}
                <Text className="text-white font-medium">28th of Zul-Hijjah</Text>
                {' '}— the date of his passing — Warsi brothers gather at his resting place. The Holy Quran is recited and prayers are offered.
              </Text>
            </View>
            <View className="flex-row gap-3">
              <View className="bg-white border border-gray-100 rounded-2xl p-4 flex-1">
                <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Survived by</Text>
                {SONS.map(son => (
                  <View key={son} className="flex-row items-center gap-2 mb-1">
                    <View className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <Text className="text-sm text-gray-700">{son}</Text>
                  </View>
                ))}
              </View>
              <View className="bg-white border border-gray-100 rounded-2xl p-4 flex-1">
                <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Annual gathering</Text>
                <Text className="text-sm font-semibold text-gray-900">28th Zul-Hijjah</Text>
                <Text className="text-xs text-gray-400 mt-1">Bazidpur Mosque courtyard</Text>
              </View>
            </View>
          </View>

          {/* Closing quote */}
          <View className="border-t border-gray-100 pt-8 items-center">
            <Text className="text-gray-300 text-4xl mb-4">"</Text>
            <Text className="text-gray-600 text-base leading-relaxed italic text-center mb-4">
              His spirit lives on in every member of the Bazidpur family —
              reminding us of our shared roots, our duty to love without condition,
              and the timeless bond that unites us all.
            </Text>
            <Text className="text-xs text-gray-400 uppercase tracking-widest">Bazidpur Family · Est. c. 1500 AD</Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
