import { useRef, useEffect, useState, useMemo } from 'react'
import {
  Modal, View, Text, FlatList, TouchableOpacity, Alert,
  useWindowDimensions, StatusBar, StyleSheet, Animated,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native'
import { Image } from 'expo-image'
import {
  PinchGestureHandler, PanGestureHandler, TapGestureHandler, LongPressGestureHandler,
  State,
  type PinchGestureHandlerStateChangeEvent,
  type PanGestureHandlerStateChangeEvent,
  type TapGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Photo } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { LikesComments } from '@/components/LikesComments'

interface Props {
  photos: Photo[]
  startIndex: number
  onClose: () => void
  /** Optional: if provided, show like/comment/flag toolbar tied to the active
   *  photo. The entityType is the same for every photo in this lightbox. */
  entityType?: 'album_photo' | 'timeless_moment'
}

const SPRING = { useNativeDriver: true, damping: 20, stiffness: 200, mass: 1 } as const

function LightboxImage({
  uri, width, height, active, onZoomChange,
  dismissY, bgOpacity, onClose,
}: {
  uri: string
  width: number
  height: number
  active: boolean
  onZoomChange: (z: boolean) => void
  dismissY: Animated.Value
  bgOpacity: Animated.Value
  onClose: () => void
}) {
  const [zoomed, setZoomed] = useState(false)

  // === Native-driven animated values ===
  // displayScale = baseScale * pinchScale, clamped via interpolate to [1, 5].
  const baseScale = useRef(new Animated.Value(1)).current
  const pinchScale = useRef(new Animated.Value(1)).current
  const displayScale = useMemo(
    () =>
      Animated.multiply(baseScale, pinchScale).interpolate({
        inputRange: [1, 5],
        outputRange: [1, 5],
        extrapolate: 'clamp',
      }),
    [baseScale, pinchScale]
  )

  // displayX = baseX + panX, displayY = baseY + panY
  const baseX = useRef(new Animated.Value(0)).current
  const baseY = useRef(new Animated.Value(0)).current
  const panX = useRef(new Animated.Value(0)).current
  const panY = useRef(new Animated.Value(0)).current
  const displayX = useMemo(() => Animated.add(baseX, panX), [baseX, panX])
  const displayY = useMemo(() => Animated.add(baseY, panY), [baseY, panY])

  const baseScaleVal = useRef(1)
  const baseXVal = useRef(0)
  const baseYVal = useRef(0)

  const pinchRef = useRef(null)
  const zoomPanRef = useRef(null)
  const doubleTapRef = useRef(null)

  // All gesture events use native driver (smooth per-frame transforms run
  // entirely on the native side). Per-frame compute (focal-point math) is not
  // possible on this path — but the result is buttery smooth pinch and pan.
  const onPinchEvent = useMemo(
    () => Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: true }),
    [pinchScale]
  )

  const onZoomPanEvent = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { translationX: panX, translationY: panY } }],
        { useNativeDriver: true }
      ),
    [panX, panY]
  )

  const onDismissPanEvent = useMemo(
    () => Animated.event([{ nativeEvent: { translationY: dismissY } }], { useNativeDriver: true }),
    [dismissY]
  )

  // Warm up the native driver at mount. Without this, the very first pinch
  // release flickers — the Animated.multiply + interpolate chain takes one
  // cycle to fully attach on the native side, and the end-of-gesture
  // setValue race produces one bad frame during that window. Running a
  // zero-duration parallel animation forces the bridge to attach immediately
  // so the user's first interaction is already on a primed connection.
  useEffect(() => {
    Animated.parallel([
      Animated.timing(baseScale, { toValue: 1, duration: 1, useNativeDriver: true }),
      Animated.timing(pinchScale, { toValue: 1, duration: 1, useNativeDriver: true }),
      Animated.timing(baseX, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(baseY, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(panX, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(panY, { toValue: 0, duration: 1, useNativeDriver: true }),
    ]).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset transform when this card is no longer the active one.
  useEffect(() => {
    if (!active) {
      baseScale.setValue(1)
      pinchScale.setValue(1)
      baseX.setValue(0)
      baseY.setValue(0)
      panX.setValue(0)
      panY.setValue(0)
      baseScaleVal.current = 1
      baseXVal.current = 0
      baseYVal.current = 0
      setZoomed(false)
    }
  }, [active, baseScale, pinchScale, baseX, baseY, panX, panY])

  function resetZoom() {
    baseScaleVal.current = 1
    baseXVal.current = 0
    baseYVal.current = 0
    Animated.spring(baseScale, { ...SPRING, toValue: 1 }).start()
    Animated.spring(baseX, { ...SPRING, toValue: 0 }).start()
    Animated.spring(baseY, { ...SPRING, toValue: 0 }).start()
    pinchScale.setValue(1)
    panX.setValue(0)
    panY.setValue(0)
    setZoomed(false)
  }

  function onPinchStateChange(e: PinchGestureHandlerStateChangeEvent) {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const next = Math.max(1, Math.min(5, baseScaleVal.current * e.nativeEvent.scale))
      baseScaleVal.current = next

      if (next <= 1.05) {
        resetZoom()
        onZoomChange(false)
      } else {
        // Commit pinchScale → 1 and baseScale → next as a single atomic
        // parallel animation tick. setValue on two values can render one frame
        // with both partially-applied (= flicker); a zero-duration parallel
        // sends one combined update down the bridge.
        Animated.parallel([
          Animated.timing(pinchScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(baseScale, { toValue: next, duration: 0, useNativeDriver: true }),
        ]).start()
        setZoomed(true)
        onZoomChange(true)
      }
    }
  }

  function onZoomPanStateChange(e: PanGestureHandlerStateChangeEvent) {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, translationY } = e.nativeEvent
      const newX = baseXVal.current + translationX
      const newY = baseYVal.current + translationY
      baseXVal.current = newX
      baseYVal.current = newY
      baseX.setValue(newX)
      baseY.setValue(newY)
      panX.setValue(0)
      panY.setValue(0)

      // Spring back into bounds if pulled past edges (iOS rubber-band feel).
      const maxX = (width * (baseScaleVal.current - 1)) / 2
      const maxY = (height * (baseScaleVal.current - 1)) / 2
      const clampedX = Math.max(-maxX, Math.min(maxX, newX))
      const clampedY = Math.max(-maxY, Math.min(maxY, newY))
      if (clampedX !== newX) {
        baseXVal.current = clampedX
        Animated.spring(baseX, { ...SPRING, toValue: clampedX }).start()
      }
      if (clampedY !== newY) {
        baseYVal.current = clampedY
        Animated.spring(baseY, { ...SPRING, toValue: clampedY }).start()
      }
    }
  }

  function onDismissPanStateChange(e: PanGestureHandlerStateChangeEvent) {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = e.nativeEvent
      if (translationY > 130 || velocityY > 700) {
        Animated.timing(dismissY, { toValue: height + 100, duration: 220, useNativeDriver: true }).start()
        Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onClose)
      } else {
        Animated.spring(dismissY, { ...SPRING, toValue: 0 }).start()
        Animated.spring(bgOpacity, { ...SPRING, toValue: 1 }).start()
      }
    }
  }

  function onDoubleTap(e: TapGestureHandlerStateChangeEvent) {
    if (e.nativeEvent.state === State.ACTIVE) {
      resetZoom()
      onZoomChange(false)
    }
  }

  // ONE event/state-change pair that branches on `zoomed` internally — the
  // PanGestureHandler stays mounted forever (no key changes, no remount).
  // Remounting was the source of the first-pinch flicker because the inner
  // Animated.View with the transform was being unmounted + remounted, losing
  // its native-driver attachment for one frame.
  const onPanEvent = zoomed ? onZoomPanEvent : onDismissPanEvent
  const onPanStateChangeUnified = (e: PanGestureHandlerStateChangeEvent) => {
    if (zoomed) onZoomPanStateChange(e)
    else onDismissPanStateChange(e)
  }

  return (
    <TapGestureHandler
      ref={doubleTapRef}
      numberOfTaps={2}
      maxDelayMs={250}
      onHandlerStateChange={onDoubleTap}
    >
      <Animated.View style={{ width, height }}>
        <LongPressGestureHandler minDurationMs={300} onHandlerStateChange={() => {}}>
          <Animated.View style={{ width, height }}>
            <PinchGestureHandler
              ref={pinchRef}
              onGestureEvent={onPinchEvent}
              onHandlerStateChange={onPinchStateChange}
              simultaneousHandlers={[zoomPanRef]}
            >
              <Animated.View style={{ width, height }}>
                <PanGestureHandler
                  ref={zoomPanRef}
                  minPointers={1}
                  maxPointers={1}
                  simultaneousHandlers={[pinchRef]}
                  failOffsetX={zoomed ? undefined : [-20, 20]}
                  activeOffsetY={zoomed ? undefined : 10}
                  onGestureEvent={onPanEvent}
                  onHandlerStateChange={onPanStateChangeUnified}
                >
                  <Animated.View
                    style={{
                      width, height, alignItems: 'center', justifyContent: 'center',
                      transform: [
                        { scale: displayScale },
                        { translateX: displayX },
                        { translateY: displayY },
                      ],
                    }}
                  >
                    <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
                  </Animated.View>
                </PanGestureHandler>
              </Animated.View>
            </PinchGestureHandler>
          </Animated.View>
        </LongPressGestureHandler>
      </Animated.View>
    </TapGestureHandler>
  )
}

export default function PhotoLightbox({ photos, startIndex, onClose, entityType }: Props) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const listRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [scrollEnabled, setScrollEnabled] = useState(true)

  const dismissY = useRef(new Animated.Value(0)).current
  const bgOpacity = useRef(new Animated.Value(1)).current

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

        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: dismissY }] }]}>
          <Animated.View style={{ flex: 1, backgroundColor: '#000', opacity: bgOpacity }}>
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
                    onClose={onClose}
                  />
                </View>
              )}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}
        >
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

          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', bottom: insets.bottom + 16, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}
          >
            {caption ? (
              <View pointerEvents="none" style={{
                backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 24, marginBottom: 10,
              }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                  {caption}
                </Text>
              </View>
            ) : null}

            {photos.length > 1 && photos.length <= 20 ? (
              <View pointerEvents="none" style={{ flexDirection: 'row', gap: 5, alignItems: 'center', marginBottom: 10 }}>
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

            {entityType && photos[currentIndex] ? (
              <LightboxToolbar
                entityType={entityType}
                entityId={photos[currentIndex].id}
              />
            ) : null}
          </View>
        </Animated.View>

      </View>
    </Modal>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Bottom toolbar inside the lightbox: like / comment / flag for the active photo.
// Comment count is a button that opens the full LikesComments modal at the
// bottom of the screen.
// ───────────────────────────────────────────────────────────────────────────────

const REPORT_REASONS_PHOTO = [
  'Inappropriate content',
  'Harassment or bullying',
  'Spam or misleading',
  'Privacy violation',
  'Other',
]

function LightboxToolbar({
  entityType,
  entityId,
}: {
  entityType: 'album_photo' | 'timeless_moment'
  entityId: string
}) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [liking, setLiking] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [countRes, commentsRes, likedRes] = await Promise.all([
        supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('entity_type', entityType)
          .eq('entity_id', entityId),
        supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('is_deleted', false),
        userId
          ? supabase
              .from('likes')
              .select('id')
              .eq('entity_type', entityType)
              .eq('entity_id', entityId)
              .eq('user_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (cancelled) return
      setLikeCount(countRes.count ?? 0)
      setCommentCount(commentsRes.count ?? 0)
      setLiked(!!likedRes.data)
    })()
    return () => { cancelled = true }
  }, [entityType, entityId, userId])

  async function handleLike() {
    if (!userId || liking) return
    setLiking(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => (wasLiked ? c - 1 : c + 1))
    if (wasLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
      if (error) {
        setLiked(true)
        setLikeCount(c => c + 1)
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: userId, entity_type: entityType, entity_id: entityId })
      if (error) {
        setLiked(false)
        setLikeCount(c => c - 1)
      }
    }
    setLiking(false)
  }

  function handleFlagPhoto() {
    if (!userId) return
    Alert.alert(
      'Report photo',
      'Why are you reporting this photo? Our team reviews reports within 24 hours.',
      [
        ...REPORT_REASONS_PHOTO.map(reason => ({
          text: reason,
          onPress: async () => {
            await supabase.from('reports').insert({
              reporter_id: userId,
              content_type: entityType,
              content_id: entityId,
              reason,
            })
            Alert.alert('Report submitted', 'Thank you. Our team will review this photo within 24 hours.')
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 22,
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <TouchableOpacity
          onPress={handleLike}
          disabled={!userId || liking}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ fontSize: 22, color: liked ? '#ef4444' : '#fff' }}>{liked ? '♥' : '♡'}</Text>
          <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCommentsOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ fontSize: 18, color: '#fff' }}>💬</Text>
          <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>{commentCount}</Text>
        </TouchableOpacity>

        {userId ? (
          <TouchableOpacity
            onPress={handleFlagPhoto}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Text style={{ fontSize: 18, color: '#ef4444' }}>⚑</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {commentsOpen ? (
        <CommentsSheet
          entityType={entityType}
          entityId={entityId}
          onClose={() => setCommentsOpen(false)}
          onCountChange={setCommentCount}
        />
      ) : null}
    </>
  )
}

function CommentsSheet({
  entityType,
  entityId,
  onClose,
  onCountChange,
}: {
  entityType: 'album_photo' | 'timeless_moment'
  entityId: string
  onClose: () => void
  onCountChange?: (count: number) => void
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 12,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
          }}
        >
          <View style={{ width: 60 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Comments</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16, color: '#2d1b69', fontWeight: '600' }}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, padding: 16 }}>
          <LikesComments
            entityType={entityType}
            entityId={entityId}
            initiallyExpanded
            noTopBorder
            onCommentCountChange={onCountChange}
          />
        </View>
      </View>
    </Modal>
  )
}
