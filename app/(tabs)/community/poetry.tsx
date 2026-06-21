import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
  ScrollView, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'
import { CuratedNotice } from '@/components/CuratedNotice'
import { LikesComments } from '@/components/LikesComments'
import type { Poetry, PoetryVerse } from '@/lib/types'

type Tab = 'poetry' | 'ghazal'

// ── HTML stripping ─────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── Poem detail sheet ──────────────────────────────────────────────────────────
function PoemSheet({ poem, onClose }: { poem: Poetry; onClose: () => void }) {
  const insets = useSafeAreaInsets()

  const isUrdu = !!(poem.title_urdu || poem.content_urdu)
  const langLabel = isUrdu ? 'اردو' : 'فارسی'

  const sortedVerses: PoetryVerse[] = [...(poem.verses ?? [])].sort(
    (a, b) => a.verse_order - b.verse_order
  )

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 20,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1, borderBottomColor: '#e5e5ea',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1c1c1e' }} numberOfLines={1}>
              {poem.title_english}
            </Text>
            {poem.title_urdu ? (
              <Text style={{ fontSize: 15, color: '#8e8e93', marginTop: 2, textAlign: 'right', writingDirection: 'rtl' }}>
                {poem.title_urdu}
              </Text>
            ) : poem.title_persian ? (
              <Text style={{ fontSize: 15, color: '#8e8e93', marginTop: 2, textAlign: 'right', writingDirection: 'rtl' }}>
                {poem.title_persian}
              </Text>
            ) : null}
            {poem.author ? (
              <Text style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>by {poem.author}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 16 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: '#e5e5ea', alignItems: 'center', justifyContent: 'center',
              }}
            >
            <Text style={{ fontSize: 14, color: '#8e8e93', fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language badges row */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', gap: 8 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#8e8e93' }}>{langLabel}</Text>
          </View>
          {sortedVerses.length > 0 ? (
            <View style={{ backgroundColor: '#f0effe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#7c3aed' }}>
                {sortedVerses.length} verse{sortedVerses.length !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Verses */}
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            {sortedVerses.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#aeaeb2', textAlign: 'center', marginVertical: 24 }}>
                Content not available
              </Text>
            ) : (
              sortedVerses.map((verse, i) => {
                const original = stripHtml(verse.content_original)
                const translation = verse.content_english ? stripHtml(verse.content_english) : ''
                const isLast = i === sortedVerses.length - 1

                return (
                  <View key={verse.id}>
                    <Text style={{
                      fontSize: 21, color: '#1c1c1e', lineHeight: 40,
                      textAlign: 'right', writingDirection: 'rtl',
                    }}>
                      {original}
                    </Text>
                    {translation ? (
                      <Text style={{
                        fontSize: 14, color: '#8e8e93', lineHeight: 22,
                        textAlign: 'left', fontStyle: 'italic',
                        marginTop: 8, paddingTop: 8,
                        borderTopWidth: 1, borderTopColor: '#f2f2f7',
                      }}>
                        {translation}
                      </Text>
                    ) : null}
                    {!isLast ? (
                      <View style={{ marginVertical: 20, borderTopWidth: 1, borderTopColor: '#e5e5ea' }} />
                    ) : null}
                  </View>
                )
              })
            )}
          </View>

          {/* Likes + comments + report (flag each comment) */}
          <View style={{ marginTop: 20, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            <LikesComments entityType="poetry" entityId={poem.id} noTopBorder />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── List screen ────────────────────────────────────────────────────────────────
export default function PoetryScreen() {
  const [tab, setTab] = useState<Tab>('poetry')
  const [poems, setPoems] = useState<Poetry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<Poetry | null>(null)

  async function load() {
    const { data } = await supabase
      .from('poetry')
      .select('id, type, title_english, title_urdu, title_persian, content_urdu, content_persian, author, display_order, is_active, created_at, verses:poetry_verses(id, poetry_id, verse_order, content_original, content_english)')
      .eq('is_active', true)
      .order('display_order')
    setPoems((data ?? []) as unknown as Poetry[])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  const filtered = poems.filter(p => p.type === tab)

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="Rhymes & Roots" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      <PurpleHeader title="Rhymes & Roots" showBack />

      <CuratedNotice message="Verses and ghazals curated and published by the Bazidpur admin team." />

      {/* iOS Segmented Control */}
      <View style={{ backgroundColor: '#f2f2f7', paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 9, padding: 2 }}>
          {(['poetry', 'ghazal'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center',
                backgroundColor: tab === t ? '#ffffff' : 'transparent',
                shadowColor: tab === t ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12, shadowRadius: 2, elevation: tab === t ? 1 : 0,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: tab === t ? '#1c1c1e' : '#8e8e93' }}>
                {t === 'poetry' ? '✍️  Poetry' : '🌙  Ghazal'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90, gap: 10 }}
        renderItem={({ item, index }) => {
          const isUrduItem = !!(item.title_urdu || item.content_urdu)
          const langLabel = isUrduItem ? 'Urdu' : 'Persian'
          const verseCount = item.verses?.length ?? 0
          const isEven = index % 2 === 0

          return (
            <Pressable
              onPress={() => setSelected(item)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#ddd6fe' : isEven ? '#ffffff' : '#ede9fe',
                borderRadius: 14, padding: 16,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
              })}
            >
              {/* Title row */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e', marginBottom: 2 }}>
                    {item.title_english}
                  </Text>
                  {item.title_urdu ? (
                    <Text style={{ fontSize: 15, color: '#8e8e93', textAlign: 'right', writingDirection: 'rtl' }}>
                      {item.title_urdu}
                    </Text>
                  ) : item.title_persian ? (
                    <Text style={{ fontSize: 15, color: '#8e8e93', textAlign: 'right', writingDirection: 'rtl' }}>
                      {item.title_persian}
                    </Text>
                  ) : null}
                  {item.author ? (
                    <Text style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>by {item.author}</Text>
                  ) : null}
                </View>
                <View style={{ backgroundColor: '#f0effe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#7c3aed', textTransform: 'capitalize' }}>{item.type}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#f2f2f7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, color: '#8e8e93', fontWeight: '600' }}>{langLabel}</Text>
                  </View>
                  {verseCount > 0 ? (
                    <Text style={{ fontSize: 11, color: '#aeaeb2' }}>
                      {verseCount} verse{verseCount !== 1 ? 's' : ''}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 13, color: '#2d1b69', fontWeight: '600' }}>Read ›</Text>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>✍️</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>
              No {tab === 'ghazal' ? 'ghazals' : 'poems'} yet
            </Text>
            <Text style={{ fontSize: 13, color: '#8e8e93' }}>Check back soon.</Text>
          </View>
        }
      />

      {selected ? <PoemSheet poem={selected} onClose={() => setSelected(null)} /> : null}
    </View>
  )
}
