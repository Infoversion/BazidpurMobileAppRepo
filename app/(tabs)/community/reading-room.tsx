import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, useWindowDimensions, RefreshControl,
  Modal, ScrollView,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'

import { resolveUri } from '@/lib/constants'

interface Book {
  id: string
  title: string
  author?: string | null
  description?: string | null
  cover_url?: string | null
  pdf_url?: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

const coverUri = (url?: string | null) => url ? resolveUri(url) : null

// Deterministic gradient colour from book id
const GRAD_PAIRS = [
  ['#ddd6fe', '#7c3aed'], ['#fed7aa', '#c2410c'], ['#bbf7d0', '#065f46'],
  ['#bae6fd', '#0369a1'], ['#fde68a', '#92400e'], ['#fce7f3', '#9d174d'],
  ['#e0e7ff', '#3730a3'], ['#d1fae5', '#047857'],
]
function gradPair(id: string) {
  const idx = id.charCodeAt(0) % GRAD_PAIRS.length
  return GRAD_PAIRS[idx]
}

function BookCover({ book, size }: { book: Book; size: number }) {
  const uri = coverUri(book.cover_url)
  const [imgFailed, setImgFailed] = useState(false)
  const [bg, accent] = gradPair(book.id)

  if (uri && !imgFailed) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size * 1.35, borderRadius: 10 }}
        contentFit="cover"
        onError={() => setImgFailed(true)}
      />
    )
  }
  return (
    <View style={{
      width: size, height: size * 1.35, borderRadius: 10,
      backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
      borderLeftWidth: 6, borderLeftColor: accent,
    }}>
      <Text style={{ fontSize: 36 }}>📚</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: accent, marginTop: 6, textAlign: 'center', paddingHorizontal: 6 }} numberOfLines={3}>
        {book.title}
      </Text>
    </View>
  )
}

function BookModal({ book, onClose }: { book: Book; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const uri = coverUri(book.cover_url)
  const [bg, accent] = gradPair(book.id)
  const [showPdf, setShowPdf] = useState(false)
  const [modalImgFailed, setModalImgFailed] = useState(false)

  const pdfUrl = book.pdf_url
    ? resolveUri(book.pdf_url)
    : null

  if (showPdf && pdfUrl) {
    return (
      <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowPdf(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16,
            backgroundColor: '#2d1b69', gap: 12,
          }}>
            <TouchableOpacity
              onPress={() => setShowPdf(false)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>‹</Text>
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>Back</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
              {book.title}
            </Text>
          </View>
          <WebView
            source={{ uri: pdfUrl }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}>
                <ActivityIndicator color="#2d1b69" size="large" />
                <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>Loading PDF…</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 20,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 15, color: '#6b7280' }}>Close</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Book Details</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
          {/* Cover */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            {uri && !modalImgFailed ? (
              <Image
                source={{ uri }}
                style={{ width: 140, height: 196, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 }}
                contentFit="cover"
                onError={() => setModalImgFailed(true)}
              />
            ) : (
              <View style={{
                width: 140, height: 196, borderRadius: 12,
                backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
                borderLeftWidth: 8, borderLeftColor: accent,
                shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16,
              }}>
                <Text style={{ fontSize: 48 }}>📚</Text>
              </View>
            )}
          </View>

          {/* Title & author */}
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', lineHeight: 28 }}>
            {book.title}
          </Text>
          {book.author ? (
            <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center', marginTop: 6 }}>
              by {book.author}
            </Text>
          ) : null}

          {/* Description */}
          {book.description ? (
            <View style={{ marginTop: 20, backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 14, color: '#374151', lineHeight: 22 }}>{book.description}</Text>
            </View>
          ) : null}

          {/* Open PDF button */}
          {pdfUrl ? (
            <TouchableOpacity
              onPress={() => setShowPdf(true)}
              style={{
                marginTop: 28, backgroundColor: '#2d1b69', borderRadius: 14,
                paddingVertical: 15, alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>📄</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Read PDF</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 28, backgroundColor: '#f3f4f6', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#9ca3af' }}>PDF not available</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

export default function ReadingRoomScreen() {
  const { width } = useWindowDimensions()
  const colW = (width - 48) / 2
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  async function load() {
    const { data } = await supabase
      .from('library_books')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
    setBooks((data ?? []) as Book[])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="Reading Room" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  if (!books.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <PurpleHeader title="Reading Room" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📚</Text>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No books yet</Text>
          <Text style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center' }}>
            Books and writings from the Bazidpur family heritage will appear here.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Reading Room" showBack />
      <FlatList
        data={books}
        keyExtractor={b => b.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 16 }}
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 90, backgroundColor: '#f2f2f7' }}
        style={{ backgroundColor: '#f2f2f7' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        ListHeaderComponent={
          <View style={{ backgroundColor: '#2d1b69', borderRadius: 16, padding: 20, marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
              Bazidpur Heritage
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28 }}>The Reading Room</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4, lineHeight: 18 }}>
              Books, journals & writings from the family archive
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedBook(item)}
            style={{ width: colW }}
            activeOpacity={0.85}
          >
            <BookCover book={item} size={colW} />
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1c1c1e', lineHeight: 17 }} numberOfLines={2}>
                {item.title}
              </Text>
              {item.author ? (
                <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }} numberOfLines={1}>
                  {item.author}
                </Text>
              ) : null}
              {item.pdf_url ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <View style={{ backgroundColor: '#ede9fe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#5b21b6' }}>PDF</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />

      {selectedBook && (
        <BookModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </View>
  )
}
