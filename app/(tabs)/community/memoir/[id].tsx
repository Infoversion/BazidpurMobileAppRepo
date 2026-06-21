import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, FlatList,
} from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { LikesComments } from '@/components/LikesComments'
import { supabase } from '@/lib/supabase'
import type { Experience, ExperienceChapter } from '@/lib/types'

import { resolveUri as imgUri, stripHtml } from '@/lib/constants'

function ChapterNav({
  chapterIndex,
  total,
  onPrev,
  onNext,
  style,
}: {
  chapterIndex: number
  total: number
  onPrev: () => void
  onNext: () => void
  style?: object
}) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 }, style]}>
      <TouchableOpacity onPress={onPrev} disabled={chapterIndex === 0} style={{ opacity: chapterIndex === 0 ? 0.3 : 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#2d1b69' }}>‹ Previous</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: '#9ca3af' }}>{chapterIndex + 1} / {total}</Text>
      <TouchableOpacity onPress={onNext} disabled={chapterIndex === total - 1} style={{ opacity: chapterIndex === total - 1 ? 0.3 : 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#2d1b69' }}>Next ›</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function MemoirScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  const [experience, setExperience] = useState<Experience | null>(null)
  const [chapters, setChapters] = useState<ExperienceChapter[]>([])
  const [chapterIndex, setChapterIndex] = useState(0)
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const chipListRef = useRef<FlatList<ExperienceChapter>>(null)

  async function load() {
    const { data } = await supabase
      .from('experiences')
      .select('*, chapters:experience_chapters(*)')
      .eq('id', id)
      .single()

    if (data) {
      const exp = data as Experience
      setExperience(exp)

      const sorted = ((data.chapters ?? []) as ExperienceChapter[]).sort(
        (a, b) => a.chapter_number - b.chapter_number
      )
      setChapters(sorted)

      // Resolve avatar: author_photo_url → linked user photo_url
      if (exp.author_photo_url) {
        setResolvedAvatar(exp.author_photo_url)
      } else if (exp.author_user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('photo_url')
          .eq('id', exp.author_user_id)
          .single()
        setResolvedAvatar((user as { photo_url?: string } | null)?.photo_url ?? null)
      }
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [id])

  // Auto-scroll chapter chip to centre when index changes
  useEffect(() => {
    if (chapters.length > 1) {
      chipListRef.current?.scrollToIndex({
        index: chapterIndex,
        animated: true,
        viewPosition: 0.5,
      })
    }
  }, [chapterIndex, chapters.length])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [id])

  const coverUri = imgUri(experience?.cover_photo_url)
  const avatarUri = imgUri(resolvedAvatar)
  const chapter = chapters[chapterIndex]

  const goPrev = () => setChapterIndex(i => Math.max(0, i - 1))
  const goNext = () => setChapterIndex(i => Math.min(chapters.length - 1, i + 1))

  // Horizontal swipe to navigate chapters (doesn't conflict with vertical ScrollView)
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-25, 25])
    .failOffsetY([-15, 15])
    .onEnd(e => {
      if (e.translationX < -60 || e.velocityX < -400) goNext()
      else if (e.translationX > 60 || e.velocityX > 400) goPrev()
    })

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: experience?.title || 'Memoir' }} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        >
          {/* Cover */}
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={{ width: '100%', height: 220 }} contentFit="cover" />
          ) : null}

          {/* Header */}
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', lineHeight: 32, marginBottom: 12 }}>
              {experience?.title}
            </Text>

            {/* Author */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
              ) : (
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                    {experience?.author_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>{experience?.author_name}</Text>
                {experience?.author_bio ? (
                  <Text style={{ fontSize: 12, color: '#9ca3af' }} numberOfLines={1}>{experience.author_bio}</Text>
                ) : null}
              </View>
            </View>

            {experience?.summary ? (
              <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 8 }}>
                {experience.summary}
              </Text>
            ) : null}
          </View>

          {/* Chapter selector */}
          {chapters.length > 1 ? (
            <FlatList
              ref={chipListRef}
              data={chapters}
              keyExtractor={ch => ch.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
              onScrollToIndexFailed={() => {}}
              renderItem={({ item: ch, index: idx }) => (
                <TouchableOpacity
                  onPress={() => setChapterIndex(idx)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: chapterIndex === idx ? '#2d1b69' : '#f3f4f6',
                    borderWidth: 1, borderColor: chapterIndex === idx ? '#2d1b69' : '#e5e7eb',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: chapterIndex === idx ? '#fff' : '#374151' }}>
                    Ch.{ch.chapter_number} · {ch.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
          ) : null}

          {/* Chapter nav — top */}
          {chapters.length > 1 ? (
            <ChapterNav
              chapterIndex={chapterIndex}
              total={chapters.length}
              onPrev={goPrev}
              onNext={goNext}
              style={{ paddingTop: 12, paddingBottom: 4 }}
            />
          ) : null}

          {/* Chapter content — wrapped in swipe gesture */}
          <GestureDetector gesture={swipe}>
            {chapter ? (
              <View style={{ padding: 20 }}>
                {chapters.length > 1 ? (
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 }}>
                    {chapter.title}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 15, color: '#374151', lineHeight: 26 }}>
                  {stripHtml(chapter.content)}
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>No chapters yet</Text>
              </View>
            )}
          </GestureDetector>

          {/* Chapter nav — bottom */}
          {chapters.length > 1 ? (
            <ChapterNav
              chapterIndex={chapterIndex}
              total={chapters.length}
              onPrev={goPrev}
              onNext={goNext}
              style={{ paddingTop: 8 }}
            />
          ) : null}

          {/* Likes + comments + flag */}
          {experience ? (
            <View style={{ marginTop: 16, paddingHorizontal: 20, paddingBottom: 24 }}>
              <LikesComments entityType="experience" entityId={experience.id} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}
