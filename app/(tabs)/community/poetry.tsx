import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
  ScrollView, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
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
      <View style={{ flex: 1, backgroundColor: '#fff' }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 20,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
              {poem.title_english}
            </Text>
            {poem.title_urdu ? (
              <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 2, textAlign: 'right', writingDirection: 'rtl' }}>
                {poem.title_urdu}
              </Text>
            ) : poem.title_persian ? (
              <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 2, textAlign: 'right', writingDirection: 'rtl' }}>
                {poem.title_persian}
              </Text>
            ) : null}
            {poem.author ? (
              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>by {poem.author}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={{ marginLeft: 16, padding: 6 }}>
            <Text style={{ fontSize: 22, color: '#6b7280' }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Language label row */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280' }}>{langLabel}</Text>
            </View>
            {sortedVerses.length > 0 ? (
              <View style={{ backgroundColor: '#f5f3ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#7c3aed' }}>
                  {sortedVerses.length} verse{sortedVerses.length !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Verses */}
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          {sortedVerses.length === 0 ? (
            <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 }}>
              Content not available
            </Text>
          ) : (
            sortedVerses.map((verse, i) => {
              const original = stripHtml(verse.content_original)
              const translation = verse.content_english ? stripHtml(verse.content_english) : ''
              const isLast = i === sortedVerses.length - 1

              return (
                <View key={verse.id}>
                  {/* Original verse — Urdu / Persian, RTL */}
                  <Text style={{
                    fontSize: 21,
                    color: '#111827',
                    lineHeight: 40,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}>
                    {original}
                  </Text>

                  {/* English translation */}
                  {translation ? (
                    <Text style={{
                      fontSize: 14,
                      color: '#6b7280',
                      lineHeight: 22,
                      textAlign: 'left',
                      fontStyle: 'italic',
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: '#f3f4f6',
                    }}>
                      {translation}
                    </Text>
                  ) : null}

                  {/* Verse divider */}
                  {!isLast ? (
                    <View style={{
                      marginVertical: 20,
                      borderTopWidth: 1,
                      borderTopColor: '#e5e7eb',
                    }} />
                  ) : null}
                </View>
              )
            })
          )}
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
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#2d1b69" /></View>
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8 }}>
        {(['poetry', 'ghazal'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
              backgroundColor: tab === t ? '#2d1b69' : '#f3f4f6',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: tab === t ? '#fff' : '#374151', textTransform: 'capitalize' }}>
              {t === 'poetry' ? 'Poetry' : 'Ghazal'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const isUrduItem = !!(item.title_urdu || item.content_urdu)
          const langLabel = isUrduItem ? 'Urdu' : 'Persian'
          const verseCount = item.verses?.length ?? 0

          return (
            <Pressable
              onPress={() => setSelected(item)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#f9fafb' : '#fff',
                borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: '#f3f4f6',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
              })}
            >
              {/* Title row */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
                    {item.title_english}
                  </Text>
                  {item.title_urdu ? (
                    <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'right', writingDirection: 'rtl' }}>
                      {item.title_urdu}
                    </Text>
                  ) : item.title_persian ? (
                    <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'right', writingDirection: 'rtl' }}>
                      {item.title_persian}
                    </Text>
                  ) : null}
                  {item.author ? (
                    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>by {item.author}</Text>
                  ) : null}
                </View>
                <View style={{ backgroundColor: '#f5f3ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#7c3aed', textTransform: 'capitalize' }}>{item.type}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#f3f4f6', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600' }}>{langLabel}</Text>
                  </View>
                  {verseCount > 0 ? (
                    <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                      {verseCount} verse{verseCount !== 1 ? 's' : ''}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 12, color: '#7c3aed', fontWeight: '600' }}>Read ›</Text>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✍️</Text>
            <Text style={{ fontSize: 14, color: '#9ca3af' }}>No {tab === 'ghazal' ? 'ghazals' : 'poems'} yet</Text>
          </View>
        }
      />

      {selected ? <PoemSheet poem={selected} onClose={() => setSelected(null)} /> : null}
    </View>
  )
}
