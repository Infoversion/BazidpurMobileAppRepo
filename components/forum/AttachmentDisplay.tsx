import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Linking, useWindowDimensions, Modal, ActivityIndicator, Alert, Animated, Easing } from 'react-native'
import { Image } from 'expo-image'
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio'
import { WebView } from 'react-native-webview'
import YoutubePlayer from 'react-native-youtube-iframe'
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

function fmtSec(s: number) {
  const sec = Math.floor(s)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const VIZ_COLORS = ['#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#22c55e']
const VIZ_MULTIPLIERS = [1.0, 1.15, 0.85, 1.05, 0.9]

function AudioVisualizer({ playing, metering }: { playing: boolean; metering: number }) {
  const MAX_H = 22
  const MIN_H = 3
  const anims = useRef(VIZ_COLORS.map(() => new Animated.Value(MIN_H))).current

  useEffect(() => {
    if (!playing) {
      anims.forEach(anim => {
        anim.stopAnimation()
        Animated.timing(anim, { toValue: MIN_H, duration: 250, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start()
      })
      return
    }
    // metering is dB, typically -160 (silence) to 0 (max). Clamp to -60..0 range.
    const norm = Math.max(0, Math.min(1, (metering + 60) / 60))
    anims.forEach((anim, i) => {
      const target = MIN_H + norm * VIZ_MULTIPLIERS[i] * (MAX_H - MIN_H)
      anim.stopAnimation()
      Animated.timing(anim, { toValue: target, duration: 80, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start()
    })
  }, [metering, playing])

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: MAX_H, paddingBottom: 1 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width: 4, height: anim, backgroundColor: VIZ_COLORS[i], borderRadius: 2 }} />
      ))}
    </View>
  )
}

function AudioPlayer({ url }: { url: string }) {
  const player = useAudioPlayer({ uri: url })
  const status = useAudioPlayerStatus(player)
  // Decorative metering: oscillate while playing (expo-audio status has no per-frame dB)
  const [metering, setMetering] = useState(-160)
  const meteringTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {})
  }, [])

  useEffect(() => {
    if (status.playing) {
      meteringTimer.current = setInterval(() => {
        setMetering(-60 + Math.random() * 60)
      }, 80)
    } else {
      if (meteringTimer.current) clearInterval(meteringTimer.current)
      setMetering(-160)
    }
    return () => { if (meteringTimer.current) clearInterval(meteringTimer.current) }
  }, [status.playing])

  // Reset to start when finished
  useEffect(() => {
    if (status.playbackState === 'ended' || (!status.playing && status.currentTime > 0 && status.currentTime >= status.duration && status.duration > 0)) {
      player.seekTo(0).catch(() => {})
    }
  }, [status.playbackState, status.playing])

  useEffect(() => {
    return () => { player.remove() }
  }, [])

  function toggle() {
    try {
      if (status.playing) player.pause()
      else player.play()
    } catch {
      Alert.alert('Cannot play audio', 'This audio format is not supported on this device.')
    }
  }

  const posSec = status.currentTime
  const durSec = status.duration
  const progress = durSec > 0 ? posSec / durSec : 0

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
        <Text style={{ fontSize: 14, color: '#fff' }}>{status.playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <AudioVisualizer playing={status.playing} metering={metering} />
      <View style={{ flex: 1 }}>
        <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: '#2d1b69', borderRadius: 2 }} />
        </View>
        <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
          {fmtSec(posSec)}{durSec > 0 ? ` / ${fmtSec(durSec)}` : ''}
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
    return (
      <View style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden' }}>
        <YoutubePlayer
          videoId={id}
          height={h}
          width={imgW}
          play
          webViewProps={{ allowsFullscreenVideo: true }}
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
