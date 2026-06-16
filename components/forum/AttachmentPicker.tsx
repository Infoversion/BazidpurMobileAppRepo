import React, { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  ActivityIndicator, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import { supabase } from '@/lib/supabase'

const API = 'https://www.bazidpur.com/api'

export type AttachmentType = 'photo' | 'audio' | 'pdf' | 'youtube'

export interface Attachment {
  type: AttachmentType
  url: string
  filename?: string
}

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

async function presign(token: string, type: string, filename: string, contentType: string) {
  const params = new URLSearchParams({ type, filename, contentType })
  const res = await fetch(`${API}/forum/presign?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not get upload URL')
  return res.json() as Promise<{ uploadUrl: string; publicUrl: string }>
}

async function uploadFile(localUri: string, uploadUrl: string, contentType: string) {
  await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  })
}

function audioMimeFromFilename(filename: string | null | undefined, fallback: string | null | undefined): string {
  const ext = (filename || '').toLowerCase().split('.').pop() || ''
  switch (ext) {
    case 'mp3':  return 'audio/mpeg'
    case 'wav':  return 'audio/wav'
    case 'ogg':  return 'audio/ogg'
    case 'webm': return 'audio/webm'
    case 'm4a':
    case 'aac':
    case 'mp4':  return 'audio/mp4'
    default:     return fallback || 'audio/mp4'
  }
}

interface Props {
  value: Attachment | null
  onChange: (a: Attachment | null) => void
}

export function AttachmentPicker({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  // expo-audio uses a hook-based recorder. The boolean flag tells the rest of
  // the component when a recording session is active (replaces the old
  // Audio.Recording state object).
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [isRecording, setIsRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [ytModal, setYtModal] = useState(false)
  const [ytInput, setYtInput] = useState('')

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not signed in')
    return session.access_token
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      // Force JPEG conversion — handles HEIC/HEIF from iPhone camera roll
      const jpeg = await ImageManipulator.manipulateAsync(
        asset.uri, [], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      )
      const token = await getToken()
      const filename = `photo_${Date.now()}.jpg`
      const { uploadUrl, publicUrl } = await presign(token, 'photo', filename, 'image/jpeg')
      await uploadFile(jpeg.uri, uploadUrl, 'image/jpeg')
      onChange({ type: 'photo', url: publicUrl })
    } catch (e: any) {
      Alert.alert('Upload failed', e.message)
    } finally {
      setUploading(false)
    }
  }

  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      const token = await getToken()
      const filename = (asset.name || `audio_${Date.now()}.m4a`).replace(/[^a-zA-Z0-9._-]/g, '_')
      const ct = audioMimeFromFilename(filename, asset.mimeType)
      const { uploadUrl, publicUrl } = await presign(token, 'audio', filename, ct)
      await uploadFile(asset.uri, uploadUrl, ct)
      onChange({ type: 'audio', url: publicUrl, filename: asset.name })
    } catch (e: any) {
      Alert.alert('Upload failed', e.message)
    } finally {
      setUploading(false)
    }
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      const token = await getToken()
      const filename = (asset.name || `doc_${Date.now()}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_')
      const { uploadUrl, publicUrl } = await presign(token, 'pdf', filename, 'application/pdf')
      await uploadFile(asset.uri, uploadUrl, 'application/pdf')
      onChange({ type: 'pdf', url: publicUrl, filename: asset.name })
    } catch (e: any) {
      Alert.alert('Upload failed', e.message)
    } finally {
      setUploading(false)
    }
  }

  async function startRecording() {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync()
      if (!granted) { Alert.alert('Permission needed', 'Allow microphone access to record audio.'); return }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      setIsRecording(true)
      setRecordSecs(0)
      timerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000)
    } catch (e: any) {
      Alert.alert('Recording failed', e.message)
    }
  }

  async function stopRecording() {
    if (!isRecording) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false })
      const uri = recorder.uri
      setIsRecording(false)
      if (!uri) return
      setUploading(true)
      const token = await getToken()
      const filename = `recording_${Date.now()}.m4a`
      const { uploadUrl, publicUrl } = await presign(token, 'audio', filename, 'audio/mp4')
      await uploadFile(uri, uploadUrl, 'audio/mp4')
      onChange({ type: 'audio', url: publicUrl, filename: 'Voice recording' })
    } catch (e: any) {
      Alert.alert('Upload failed', e.message)
    } finally {
      setUploading(false)
    }
  }

  function submitYoutube() {
    const id = extractYouTubeId(ytInput.trim())
    if (!id) { Alert.alert('Invalid URL', 'Please enter a valid YouTube link.'); return }
    onChange({ type: 'youtube', url: ytInput.trim() })
    setYtModal(false)
    setYtInput('')
  }

  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (uploading) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <ActivityIndicator size="small" color="#2d1b69" />
        <Text style={{ fontSize: 13, color: '#6b7280' }}>Uploading…</Text>
      </View>
    )
  }

  if (isRecording) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
        <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '600' }}>Recording {fmtSecs(recordSecs)}</Text>
        <TouchableOpacity
          onPress={stopRecording}
          style={{ marginLeft: 'auto', backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Stop</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (value) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
        <Text style={{ fontSize: 13, color: '#2d1b69', flex: 1 }}>
          {value.type === 'photo' && '📷 Photo attached'}
          {value.type === 'audio' && `🎵 ${value.filename ?? 'Audio attached'}`}
          {value.type === 'pdf'   && `📄 ${value.filename ?? 'PDF attached'}`}
          {value.type === 'youtube' && '▶️ YouTube video linked'}
        </Text>
        <TouchableOpacity onPress={() => onChange(null)}>
          <Text style={{ fontSize: 18, color: '#9ca3af' }}>✕</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
        {[
          { label: '📷', tip: 'Photo',   onPress: pickPhoto },
          { label: '🎙', tip: 'Record',  onPress: startRecording },
          { label: '🎵', tip: 'Audio',   onPress: pickAudio },
          { label: '📄', tip: 'PDF',     onPress: pickPdf },
          { label: '▶️', tip: 'YouTube', onPress: () => setYtModal(true) },
        ].map(btn => (
          <TouchableOpacity
            key={btn.tip}
            onPress={btn.onPress}
            style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: '#f3f4f6',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: 18 }}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
        🎵 Audio files: MP3, M4A, WAV · 🎙 Recordings saved as M4A
      </Text>

      <Modal visible={ytModal} transparent animationType="fade" onRequestClose={() => setYtModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e', marginBottom: 12 }}>YouTube Link</Text>
            <TextInput
              value={ytInput}
              onChangeText={setYtInput}
              placeholder="https://youtube.com/watch?v=…"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10,
                fontSize: 14, color: '#1c1c1e', marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setYtModal(false); setYtInput('') }}
                style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitYoutube}
                style={{ flex: 1, backgroundColor: '#2d1b69', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Attach</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}
