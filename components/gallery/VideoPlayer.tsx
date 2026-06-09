import { useEffect } from 'react'
import { Modal, View, Text, TouchableOpacity, StatusBar, useWindowDimensions } from 'react-native'
import YoutubePlayer from 'react-native-youtube-iframe'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Video } from '@/lib/types'

interface Props {
  video: Video
  onClose: () => void
}

export default function VideoPlayer({ video, onClose }: Props) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  // In landscape width > height, so the player fills the screen properly
  const videoH = Math.round((width * 9) / 16)

  useEffect(() => {
    ScreenOrientation.unlockAsync()
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }
  }, [])

  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>

        {/* Header */}
        <View style={{
          paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 }} numberOfLines={1}>
            {video.title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* YouTube player */}
        <YoutubePlayer
          videoId={video.youtube_id}
          height={videoH}
          width={width}
          play
          webViewProps={{
            allowsFullscreenVideo: true,
          }}
        />

        {/* Description */}
        {video.description ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 }}>
              {video.description}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  )
}
