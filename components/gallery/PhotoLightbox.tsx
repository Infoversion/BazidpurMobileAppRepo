import { useRef, useEffect, useState } from 'react'
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  useWindowDimensions, StatusBar, StyleSheet,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native'
import { Image } from 'expo-image'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming, withDecay,
  cancelAnimation, runOnJS, type SharedValue,
} from 'react-native-reanimated'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Photo } from '@/lib/types'

interface Props {
  photos: Photo[]
  startIndex: number
  onClose: () => void
}

// ── Single image — zoom, pan-when-zoomed, swipe-down-to-dismiss ────────────────
function LightboxImage({
  uri, width, height, active, onZoomChange,
  dismissY, bgOpacity, isZoomedSV, onClose,
}: {
  uri: string
  width: number
  height: number
  active: boolean
  onZoomChange: (z: boolean) => void
  dismissY: SharedValue<number>
  bgOpacity: SharedValue<number>
  isZoomedSV: SharedValue<boolean>
  onClose: () => void
}) {
  const scale      = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const offsetX    = useSharedValue(0)
  const offsetY    = useSharedValue(0)
  const startX     = useSharedValue(0)   // offset captured at pan start
  const startY     = useSharedValue(0)
  const zoomed     = useSharedValue(false)

  function resetZoom() {
    'worklet'
    scale.value      = withSpring(1, { damping: 20 })
    savedScale.value = 1
    offsetX.value    = withSpring(0, { damping: 20 })
    offsetY.value    = withSpring(0, { damping: 20 })
    startX.value     = 0
    startY.value     = 0
    zoomed.value     = false
    isZoomedSV.value = false
  }

  useEffect(() => {
    if (!active) {
      scale.value = 1; savedScale.value = 1
      offsetX.value = 0; offsetY.value = 0
      startX.value = 0; startY.value = 0
      zoomed.value = false
    }
  }, [active])

  // ── Pinch ────────────────────────────────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5))
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        resetZoom()
        runOnJS(onZoomChange)(false)
      } else {
        savedScale.value = scale.value
        zoomed.value     = true
        isZoomedSV.value = true
        runOnJS(onZoomChange)(true)
      }
    })

  // ── Double-tap to reset ──────────────────────────────────────────────────────
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd(() => {
      resetZoom()
      runOnJS(onZoomChange)(false)
    })

  // ── Pan when zoomed — smooth with momentum + edge clamping ───────────────────
  // manualActivation: fail when not zoomed → FlatList scrolls freely.
  // activate when zoomed → all-direction pan with no failOffsetX restriction.
  // withDecay on release gives the iOS-Photos momentum feel.
  const zoomPan = Gesture.Pan()
    .manualActivation(true)
    .averageTouches(true)
    .onTouchesDown(() => {
      // Snapshot position and cancel any running momentum so the next drag
      // starts exactly where the image stopped.
      cancelAnimation(offsetX)
      cancelAnimation(offsetY)
      startX.value = offsetX.value
      startY.value = offsetY.value
    })
    .onTouchesMove((_, stateManager) => {
      if (zoomed.value) {
        stateManager.activate()
      } else {
        stateManager.fail()
      }
    })
    .onUpdate(e => {
      // Clamp to image bounds so the photo never slides fully off screen.
      const maxX = (width  * (savedScale.value - 1)) / 2
      const maxY = (height * (savedScale.value - 1)) / 2
      offsetX.value = Math.max(-maxX, Math.min(maxX, startX.value + e.translationX))
      offsetY.value = Math.max(-maxY, Math.min(maxY, startY.value + e.translationY))
    })
    .onEnd(e => {
      // Momentum coast: deceleration 0.993 ≈ iOS Photos feel.
      // Clamped so it never coasts past the image edge.
      const maxX = (width  * (savedScale.value - 1)) / 2
      const maxY = (height * (savedScale.value - 1)) / 2
      offsetX.value = withDecay({ velocity: e.velocityX, deceleration: 0.993, clamp: [-maxX, maxX] })
      offsetY.value = withDecay({ velocity: e.velocityY, deceleration: 0.993, clamp: [-maxY, maxY] })
    })

  // ── Swipe-down-to-dismiss — only when not zoomed ─────────────────────────────
  // failOffsetX: if user moves horizontally > 20px this gesture fails,
  // which (combined with zoomPan failing too) lets the FlatList scroll.
  const dismissPan = Gesture.Pan()
    .failOffsetX([-20, 20])
    .activeOffsetY(10)
    .onUpdate(e => {
      if (!zoomed.value && e.translationY > 0) {
        dismissY.value  = e.translationY
        bgOpacity.value = Math.max(0.15, 1 - e.translationY / 280)
      }
    })
    .onEnd(e => {
      if (!zoomed.value && (e.translationY > 130 || e.velocityY > 700)) {
        dismissY.value  = withTiming(height + 100, { duration: 220 })
        bgOpacity.value = withTiming(0, { duration: 200 })
        runOnJS(onClose)()
      } else {
        dismissY.value  = withSpring(0, { damping: 20 })
        bgOpacity.value = withSpring(1)
      }
    })

  // Swallow long-press so the native "Save Image" menu never appears
  const longPress = Gesture.LongPress().minDuration(300).onStart(() => {})

  // Race: double-tap wins over everything; otherwise pinch + zoomPan + dismissPan
  // all run simultaneously (each has its own activation condition).
  const gesture = Gesture.Race(
    doubleTap,
    longPress,
    Gesture.Simultaneous(pinch, zoomPan, dismissPan),
  )

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: offsetX.value },
      { translateY: offsetY.value },
    ],
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height, alignItems: 'center', justifyContent: 'center' }, animStyle]}>
        <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  )
}

// ── Main lightbox ──────────────────────────────────────────────────────────────
export default function PhotoLightbox({ photos, startIndex, onClose }: Props) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const listRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [scrollEnabled, setScrollEnabled] = useState(true)

  const dismissY   = useSharedValue(0)
  const bgOpacity  = useSharedValue(1)
  const isZoomedSV = useSharedValue(false)

  useEffect(() => {
    ScreenOrientation.unlockAsync()
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }
  }, [])

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width)
    setCurrentIndex(idx)
    setScrollEnabled(true)
  }

  function handleZoomChange(zoomed: boolean) {
    setScrollEnabled(!zoomed)
  }

  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dismissY.value }],
  }))

  const overlayOpacityStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }))

  const bgColorStyle = useAnimatedStyle(() => ({
    flex: 1,
    backgroundColor: '#000',
    opacity: bgOpacity.value,
  }))

  const caption = photos[currentIndex]?.title || photos[currentIndex]?.description || ''

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={{ flex: 1, backgroundColor: '#000' }}>

        {/* Image area — no GestureDetector here; FlatList scrolls natively */}
        <Animated.View style={[StyleSheet.absoluteFill, dismissStyle]}>
          <Animated.View style={bgColorStyle}>
            <FlatList
              key={`lightbox-${width}`}
              ref={listRef}
              data={photos}
              keyExtractor={p => p.id}
              horizontal
              pagingEnabled
              scrollEnabled={scrollEnabled}
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={startIndex}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={handleScrollEnd}
              renderItem={({ item, index }) => (
                <View style={{ width, height, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <LightboxImage
                    uri={item.r2_url}
                    width={width}
                    height={height}
                    active={index === currentIndex}
                    onZoomChange={handleZoomChange}
                    dismissY={dismissY}
                    bgOpacity={bgOpacity}
                    isZoomedSV={isZoomedSV}
                    onClose={onClose}
                  />
                </View>
              )}
            />
          </Animated.View>
        </Animated.View>

        {/* Controls overlay — outside image gesture area */}
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, overlayOpacityStyle]}
        >
          {/* Close — bigger circle, bolder X */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: 'absolute', top: insets.top + 12, right: 16, zIndex: 20,
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: 'rgba(0,0,0,0.7)',
              alignItems: 'center', justifyContent: 'center',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 24 }}>✕</Text>
          </TouchableOpacity>

          {/* Counter */}
          {photos.length > 1 ? (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: insets.top + 18, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}
            >
              <View style={{ backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
                  {currentIndex + 1} / {photos.length}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Caption + dot indicators */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', bottom: insets.bottom + 16, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}
          >
            {caption ? (
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 24, marginBottom: 10,
              }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                  {caption}
                </Text>
              </View>
            ) : null}

            {photos.length > 1 && photos.length <= 20 ? (
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                {photos.map((_, i) => (
                  <View key={i} style={{
                    width: i === currentIndex ? 8 : 5,
                    height: i === currentIndex ? 8 : 5,
                    borderRadius: 4,
                    backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                  }} />
                ))}
              </View>
            ) : null}
          </View>
        </Animated.View>

      </View>
    </Modal>
  )
}
