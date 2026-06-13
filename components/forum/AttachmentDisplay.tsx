import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Linking, useWindowDimensions, Modal, ActivityIndicator, Alert } from 'react-native'
import { Image } from 'expo-image'
import { Audio } from 'expo-av'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/shorts\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function AudioPlayer({ url }: { url: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [playing, setPlaying] = useState(false)
  const [posMs, setPosMs] = useState(0)
  const [durMs, setDurMs] = useState(0)

  useEffect(() => {
    return () => { sound?.unloadAsync() }
  }, [sound])

  async function toggle() {
    if (!sound) {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          status => {
            if (!status.isLoaded) return
            setPosMs(status.positionMillis)
            setDurMs(status.durationMillis ?? 0)
            if (status.didJustFinish) { setPlaying(false); setPosMs(0) }
          }
        )
        setSound(s)
        setPlaying(true)
      } catch {
        Alert.alert('Cannot play audio', 'This audio format is not supported on this device. Try opening it on a desktop browser.')
      }
    } else if (playing) {
      await sound.pauseAsync()
      setPlaying(false)
    } else {
      await sound.playAsync()
      setPlaying(true)
    }
  }

  const progress = durMs > 0 ? posMs / durMs : 0

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: '#f3f4f6', borderRadius: 12, padding: 10, marginTop: 10,
    }}>
      <TouchableOpacity
        onPress={toggle}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 14, color: '#fff' }}>{playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: '#2d1b69', borderRadius: 2 }} />
        </View>
        <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
          {fmtMs(posMs)}{durMs > 0 ? ` / ${fmtMs(durMs)}` : ''}
        </Text>
      </View>
    </View>
  )
}

function YouTubeInline({ url, imgW }: { url: string; imgW: number }) {
  const [playing, setPlaying] = useState(false)
  const id = extractYouTubeId(url)
  const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
  const h = imgW * 0.56

  if (playing && id) {
    const html = `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>*{margin:0;padding:0;background:#000}iframe{width:100%;height:100vh;border:none}</style>
    </head><body>
      <iframe src="https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1"
        allow="autoplay;fullscreen" allowfullscreen></iframe>
    </body></html>`
    return (
      <View style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', height: h }}>
        <WebView
          source={{ html }}
          style={{ width: imgW, height: h }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          allowsFullscreenVideo
          originWhitelist={['*']}
        />
      </View>
    )
  }

  return (
    <TouchableOpacity
      onPress={() => setPlaying(true)}
      style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden' }}
      activeOpacity={0.85}
    >
      {thumb ? (
        <View>
          <Image
            source={{ uri: thumb }}
            style={{ width: imgW, height: h, borderRadius: 10 }}
            contentFit="cover"
          />
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: 'rgba(0,0,0,0.7)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 22, color: '#fff', marginLeft: 4 }}>▶</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={{
          width: imgW, height: 56, backgroundColor: '#f3f4f6', borderRadius: 10,
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10,
        }}>
          <Text style={{ fontSize: 22 }}>▶️</Text>
          <Text style={{ fontSize: 13, color: '#2563eb', flex: 1 }} numberOfLines={1}>{url}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

interface Props {
  type: string
  url: string
}

export function AttachmentDisplay({ type, url }: Props) {
  const { width } = useWindowDimensions()
  const imgW = width - 80

  if (type === 'photo') {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: imgW, height: imgW * 0.65, borderRadius: 10, marginTop: 10 }}
        contentFit="cover"
      />
    )
  }

  if (type === 'audio') {
    return <AudioPlayer url={url} />
  }

  if (type === 'youtube') {
    return <YouTubeInline url={url} imgW={imgW} />
  }

  if (type === 'pdf') {
    return <PdfAttachment url={url} />
  }

  return null
}

function PdfAttachment({ url }: { url: string }) {
  const [show, setShow] = useState(false)
  const insets = useSafeAreaInsets()
  const filename = url.split('/').pop()?.replace(/^\d+-[a-f0-9]+-/, '') ?? 'Document.pdf'
  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginTop: 10,
          borderWidth: 1, borderColor: '#fde68a',
        }}
      >
        <Text style={{ fontSize: 28 }}>📄</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }} numberOfLines={1}>{filename}</Text>
          <Text style={{ fontSize: 11, color: '#b45309' }}>Tap to open PDF</Text>
        </View>
        <Text style={{ fontSize: 16, color: '#d97706' }}>›</Text>
      </TouchableOpacity>

      <Modal visible={show} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShow(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16,
            backgroundColor: '#2d1b69',
          }}>
            <TouchableOpacity onPress={() => setShow(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 20, color: '#fff' }}>‹</Text>
              <Text style={{ fontSize: 15, color: '#fff', fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#fff' }} numberOfLines={1}>{filename}</Text>
          </View>
          <WebView
            source={{ uri: url }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  )
}
