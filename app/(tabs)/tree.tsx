import { useEffect, useState, useRef, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Modal, StyleSheet, ScrollView, Image,
  Animated,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  getAncestors, computeRelationTerm, levelColor,
  type FamilyNode,
} from '@/lib/family-tree-layout'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function countDescendants(nodeId: string, allNodes: FamilyNode[]): number {
  const children = allNodes.filter(n => n.parent_id === nodeId)
  return children.reduce((sum, c) => sum + 1 + countDescendants(c.id, allNodes), 0)
}

interface FlatItem {
  node: FamilyNode
  depth: number
}

const ROW_H = 64
const AVATAR = 36

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ node }: { node: FamilyNode }) {
  const [failed, setFailed] = useState(false)
  const color   = levelColor(node.tree_level)
  const initial = node.name.trim().charAt(0).toUpperCase()

  const uri = node.photo_url
    ? (node.photo_url.startsWith('http') ? node.photo_url : `${R2}/${node.photo_url}`)
    : null

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={s.avatar}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <View style={[s.avatar, s.avatarFallback, { backgroundColor: color }]}>
      <Text style={s.avatarInitial}>{initial}</Text>
    </View>
  )
}

// ─── Detail sheet ─────────────────────────────────────────────────────────────
function NodeSheet({ node, allNodes, currentUserId, onClose, onTraceNode }: {
  node: FamilyNode
  allNodes: FamilyNode[]
  currentUserId: string | null
  onClose: () => void
  onTraceNode: (nodeId: string) => void
}) {
  const ancestors    = getAncestors(node.id, allNodes)
  const myNode       = currentUserId ? allNodes.find(n => n.linked_user_id === currentUserId) : null
  const relation     = myNode && myNode.id !== node.id
    ? computeRelationTerm(node, myNode, allNodes) : null
  const dob          = node.dob ? node.dob.slice(0, 10) : null
  const dod          = node.dod ? node.dod.slice(0, 10) : null
  const descendants  = countDescendants(node.id, allNodes)

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={s.sheet}>
        <View style={s.handle} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          {!node.is_alive ? (
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#ef4444', marginRight: 8, marginTop: 2 }} />
          ) : null}
          <Text style={s.sheetName}>{node.name}</Text>
        </View>

        <Text style={s.sheetMeta}>
          <Text style={{ color: node.sex === 'male' ? '#3b82f6' : '#ec4899', fontWeight: '700' }}>
            {node.sex === 'female' ? '♀' : '♂'}
          </Text>
          {node.sex === 'female' ? ' Female' : ' Male'}
          {dob ? `  ·  b. ${dob}` : ''}
          {dod ? `  ·  d. ${dod}` : ''}
        </Text>

        {descendants > 0 ? (
          <Text style={s.sheetMeta}>
            👨‍👩‍👧‍👦 {descendants} descendant{descendants !== 1 ? 's' : ''}
          </Text>
        ) : null}

        {node.married_to ? (
          <Text style={s.sheetMeta}>♥ {node.married_to}</Text>
        ) : null}

        {relation ? (
          <View style={s.relationBox}>
            <Text style={s.relationText}>Your {relation}</Text>
          </View>
        ) : null}

        {ancestors.length > 1 ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={s.sectionLabel}>Lineage  •  tap a name to trace</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 4 }}>
                {ancestors.map((a, i) => (
                  <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => onTraceNode(a.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <Text style={{
                        fontSize: 13,
                        color: '#2d1b69',
                        fontWeight: a.id === node.id ? '700' : '500',
                        textDecorationLine: 'underline',
                        textDecorationColor: '#c4b5fd',
                      }}>
                        {a.name}
                      </Text>
                    </TouchableOpacity>
                    {i < ancestors.length - 1 ? (
                      <Text style={{ color: '#c4b5fd', fontSize: 14, fontWeight: '600' }}>›</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {node.description ? (
          <Text style={s.sheetDesc}>{node.description}</Text>
        ) : null}

        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

// ─── Single tree row ──────────────────────────────────────────────────────────
function TreeRow({ node, depth, childCount, isExpanded, isMatch, isTraced, onToggle, onSelect }: {
  node: FamilyNode
  depth: number
  childCount: number
  isExpanded: boolean
  isMatch: boolean
  isTraced: boolean
  onToggle: () => void
  onSelect: () => void
}) {
  const hasKids = childCount > 0
  const nameClr = node.is_alive
    ? (node.sex === 'female' ? '#be185d' : '#1e40af')
    : '#64748b'

  const yearPart = node.dob ? node.dob.slice(0, 4) : ''
  const dodPart  = !node.is_alive && node.dod ? `†${node.dod.slice(0, 4)}` : ''
  const datePart = [yearPart, dodPart].filter(Boolean).join('  ')
  const sexColor = node.sex === 'male' ? '#3b82f6' : '#ec4899'

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onSelect}
      style={[s.row, {
        paddingLeft: 12 + depth * 18,
        backgroundColor: isMatch ? '#fef9c3' : isTraced ? '#ede9fe' : '#fff',
      }]}
    >
      {/* Trace path indicator */}
      {isTraced ? <View style={s.traceBar} /> : null}

      {/* Expand / collapse toggle */}
      <TouchableOpacity
        onPress={hasKids ? onToggle : undefined}
        style={s.toggle}
        hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
      >
        {hasKids ? (
          <Text style={[s.chevron, { color: levelColor(node.tree_level) }]}>{isExpanded ? '▼' : '▶'}</Text>
        ) : (
          <View style={s.leaf} />
        )}
      </TouchableOpacity>

      {/* Avatar */}
      <Avatar node={node} />

      {/* Name + sub-info */}
      <View style={{ flex: 1, marginLeft: 11 }}>
        <Text style={[s.rowName, { color: nameClr }]} numberOfLines={1}>
          {node.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: sexColor }}>
            {node.sex === 'male' ? '♂' : '♀'}
          </Text>
          {datePart ? <Text style={s.rowSub}>{datePart}</Text> : null}
        </View>
      </View>

      {/* Deceased indicator */}
      {!node.is_alive ? <View style={s.deceasedDot} /> : null}

      {/* Child count badge when collapsed */}
      {hasKids && !isExpanded ? (
        <View style={s.countBadge}>
          <Text style={s.countText}>{childCount}</Text>
        </View>
      ) : null}

      <Text style={s.rowChevron}>›</Text>
    </TouchableOpacity>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FamilyTreeScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const [nodes,        setNodes]        = useState<FamilyNode[]>([])
  const [loading,      setLoading]      = useState(true)
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<FamilyNode | null>(null)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [showInfo,     setShowInfo]     = useState(false)
  const [traceIds,     setTraceIds]     = useState<Set<string> | null>(null)
  const [findMeMsg,    setFindMeMsg]    = useState(false)
  const [findMeHit,    setFindMeHit]    = useState<string | null>(null)
  const [headerOpen,   setHeaderOpen]   = useState(true)
  const focusAnim   = useRef(new Animated.Value(0)).current
  const headerAnim  = useRef(new Animated.Value(1)).current

  const listRef      = useRef<FlatList<FlatItem>>(null)
  const scrollTarget = useRef<string | null>(null)

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('family_tree_nodes')
        .select('*')
        .order('tree_level')
        .order('display_order')
      const rows = (data ?? []) as FamilyNode[]
      setNodes(rows)
      // Auto-expand root and first generation
      const init = new Set<string>()
      rows.forEach(n => { if (n.tree_level <= 1) init.add(n.id) })
      setExpanded(init)
      setLoading(false)
    }
    load()
  }, [])

  // ── Parent → children map ───────────────────────────────────────────────────
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, FamilyNode[]>()
    nodes.forEach(n => {
      const pid = n.parent_id ?? null
      const arr = map.get(pid) ?? []
      arr.push(n)
      map.set(pid, arr)
    })
    for (const arr of map.values()) arr.sort((a, b) => a.display_order - b.display_order)
    return map
  }, [nodes])

  // ── Search ──────────────────────────────────────────────────────────────────
  const matchIds = searchQuery.trim().length > 1
    ? new Set(nodes
        .filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(n => n.id))
    : null

  // When searching, treat every node as expanded so matches surface
  const effectiveExpanded = useMemo(() => {
    if (!matchIds) return expanded
    return new Set(nodes.map(n => n.id))
  }, [matchIds, expanded, nodes])

  // ── Flatten tree into ordered list ─────────────────────────────────────────
  const flatItems = useMemo<FlatItem[]>(() => {
    const result: FlatItem[] = []
    function walk(parentId: string | null, depth: number) {
      for (const node of (childrenOf.get(parentId) ?? [])) {
        result.push({ node, depth })
        if (effectiveExpanded.has(node.id)) walk(node.id, depth + 1)
      }
    }
    walk(null, 0)
    return result
  }, [childrenOf, effectiveExpanded])

  // Filter to matches only when searching
  const displayItems = matchIds
    ? flatItems.filter(item => matchIds.has(item.node.id))
    : flatItems

  // ── Scroll to target after flatItems updates (used by Find Me) ─────────────
  useEffect(() => {
    const target = scrollTarget.current
    if (!target) return
    scrollTarget.current = null
    const idx = flatItems.findIndex(item => item.node.id === target)
    if (idx >= 0) {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 })
    }
  }, [flatItems])

  // ── Toggle expand ───────────────────────────────────────────────────────────
  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Find me ─────────────────────────────────────────────────────────────────
  function findMe() {
    if (!user) return
    const myNode = nodes.find(n => n.linked_user_id === user.id)
    if (!myNode) {
      setFindMeMsg(true)
      setTimeout(() => setFindMeMsg(false), 3500)
      return
    }

    // Expand every ancestor so the node appears in the list
    const toExpand = new Set(expanded)
    let cur = nodes.find(n => n.id === myNode.parent_id)
    while (cur) {
      toExpand.add(cur.id)
      cur = nodes.find(n => n.id === cur!.parent_id)
    }

    scrollTarget.current = myNode.id
    setFindMeHit(myNode.id)
    setTimeout(() => setFindMeHit(null), 2500)
    setExpanded(toExpand)     // → flatItems updates → effect scrolls
  }

  // ── Trace lineage path ─────────────────────────────────────────────────────
  function traceNode(nodeId: string) {
    const path = getAncestors(nodeId, nodes)   // root → nodeId
    const pathIds = new Set(path.map(n => n.id))
    setTraceIds(pathIds)

    // Expand every ancestor so the node is visible
    const toExpand = new Set(expanded)
    path.forEach(n => toExpand.add(n.id))
    scrollTarget.current = nodeId
    setExpanded(toExpand)
    setSelectedNode(null)
  }

  // ── Toolbar actions ────────────────────────────────────────────────────────
  function collapseAll() {
    // Show only root level expanded → levels 0 and 1 visible, 2+ hidden
    setExpanded(new Set(nodes.filter(n => n.tree_level === 0).map(n => n.id)))
  }

  function expandAll() {
    setExpanded(new Set(nodes.map(n => n.id)))
  }

  function scrollToTop() {
    listRef.current?.scrollToOffset({ offset: 0, animated: true })
  }

  function toggleHeader() {
    const next = !headerOpen
    setHeaderOpen(next)
    Animated.spring(headerAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      bounciness: 0,
      speed: 14,
    }).start()
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const alive    = nodes.filter(n => n.is_alive).length
  const deceased = nodes.length - alive
  const male     = nodes.filter(n => n.sex === 'male').length
  const female   = nodes.filter(n => n.sex === 'female').length
  const maxLevel = nodes.reduce((m, n) => Math.max(m, n.tree_level), 0)

  // ── Loading / empty ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2d1b69" size="large" />
        <Text style={{ fontSize: 14, color: '#8e8e93', marginTop: 12 }}>Loading family tree…</Text>
      </SafeAreaView>
    )
  }

  if (!nodes.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🌳</Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 }}>No tree data yet</Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
          The family tree hasn't been populated yet.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Animated.View style={{ overflow: 'hidden', maxHeight: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }) }}>
          {/* Row 1: search + find me */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Animated.View style={[s.searchWrap, {
              borderColor: focusAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', '#2d1b69'] }),
              backgroundColor: focusAnim.interpolate({ inputRange: [0, 1], outputRange: ['#f3f4f6', '#ffffff'] }),
            }]}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search by name…"
                placeholderTextColor="#c4c9d4"
                value={searchQuery}
                onChangeText={q => { setSearchQuery(q); if (q) setTraceIds(null) }}
                onFocus={() => Animated.timing(focusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start()}
                onBlur={() => Animated.timing(focusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start()}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={s.clearBtn}>
                    <Text style={s.clearBtnText}>✕</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </Animated.View>
            <TouchableOpacity onPress={findMe} style={s.findBtn}>
              <Text style={s.toolIcon}>◎</Text>
              <Text style={s.toolLabel}>Find Me</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: tree controls */}
          <View style={s.controlsRow}>
            <ToolBtn icon="ℹ" label="Stats"   onPress={() => setShowInfo(true)} />
            <ToolBtn icon="⊟" label="Compact" onPress={collapseAll} />
            <ToolBtn icon="⊞" label="Expand"  onPress={expandAll} />
            <ToolBtn icon="↑" label="Top"     onPress={scrollToTop} />
          </View>
        </Animated.View>

        {/* Collapse / expand grip */}
        <TouchableOpacity
          onPress={toggleHeader}
          hitSlop={{ top: 6, bottom: 6, left: 60, right: 60 }}
          style={s.headerGrip}
        >
          <View style={s.headerGripPill} />
          <Text style={s.headerGripIcon}>{headerOpen ? '⌃' : '⌄'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Find Me — not linked banner ── */}
      {findMeMsg ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: '#fefce8', paddingHorizontal: 14, paddingVertical: 8,
          borderBottomWidth: 1, borderBottomColor: '#fef08a',
        }}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <Text style={{ flex: 1, fontSize: 12, color: '#713f12', lineHeight: 17 }}>
            Your profile isn't linked to the family tree yet. Contact an admin to get connected.
          </Text>
        </View>
      ) : null}

      {/* ── Trace banner ── */}
      {traceIds ? (
        <View style={s.traceBanner}>
          <View style={s.traceDot} />
          <Text style={s.traceBannerText} numberOfLines={1}>
            Tracing {nodes.find(n => n.id === [...traceIds].at(-1))?.name ?? ''}
          </Text>
          <TouchableOpacity
            onPress={() => setTraceIds(null)}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={s.traceClear}>✕  Clear</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Tree list ── */}
      <FlatList<FlatItem>
        ref={listRef}
        data={displayItems}
        keyExtractor={item => item.node.id}
        renderItem={({ item }) => (
          <TreeRow
            node={item.node}
            depth={item.depth}
            childCount={(childrenOf.get(item.node.id) ?? []).length}
            isExpanded={expanded.has(item.node.id)}
            isMatch={!!matchIds?.has(item.node.id) || item.node.id === findMeHit}
            isTraced={!!traceIds?.has(item.node.id)}
            onToggle={() => toggleExpand(item.node.id)}
            onSelect={() => setSelectedNode(item.node)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({ offset: index * ROW_H, animated: true })
        }}
        ListEmptyComponent={
          searchQuery.length > 1 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 14, color: '#9ca3af' }}>No results for "{searchQuery}"</Text>
            </View>
          ) : null
        }
      />

      {showInfo ? (
        <InfoSheet
          nodes={nodes}
          alive={alive}
          deceased={deceased}
          male={male}
          female={female}
          maxLevel={maxLevel}
          onClose={() => setShowInfo(false)}
        />
      ) : null}

      {selectedNode ? (
        <NodeSheet
          node={selectedNode}
          allNodes={nodes}
          currentUserId={user?.id ?? null}
          onClose={() => setSelectedNode(null)}
          onTraceNode={traceNode}
        />
      ) : null}
    </View>
  )
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function ToolBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.toolBtn}>
      <Text style={s.toolIcon}>{icon}</Text>
      <Text style={s.toolLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Stats sheet ──────────────────────────────────────────────────────────────
function InfoSheet({ nodes, alive, deceased, male, female, maxLevel, onClose }: {
  nodes: FamilyNode[]
  alive: number; deceased: number; male: number; female: number; maxLevel: number
  onClose: () => void
}) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 18 }}>
          Family Tree Stats
        </Text>

        {/* Summary cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <StatCard label="Total"    value={nodes.length} color="#2d1b69" />
          <StatCard label="Alive"    value={alive}        color="#15803d" />
          <StatCard label="Deceased" value={deceased}     color="#64748b" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <StatCard label="Male"   value={male}   color="#1d4ed8" />
          <StatCard label="Female" value={female} color="#be185d" />
        </View>

        {/* Per-generation breakdown */}
        <Text style={s.sectionLabel}>By Generation</Text>
        {Array.from({ length: maxLevel + 1 }, (_, i) => {
          const count = nodes.filter(n => n.tree_level === i).length
          if (!count) return null
          const pct = Math.round((count / nodes.length) * 100)
          return (
            <View key={i} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: '#374151' }}>Generation {i + 1}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{count}</Text>
              </View>
              <View style={{ height: 5, backgroundColor: '#f3f4f6', borderRadius: 3 }}>
                <View style={{
                  height: 5,
                  width: `${pct}%` as any,
                  backgroundColor: levelColor(i),
                  borderRadius: 3,
                }} />
              </View>
            </View>
          )
        })}

        <TouchableOpacity style={[s.closeBtn, { marginTop: 16 }]} onPress={onClose}>
          <Text style={s.closeBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{label}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
    paddingTop: 2,
    paddingBottom: 4,
  },
  headerGrip: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  headerGripPill: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginBottom: 2,
  },
  headerGripIcon: {
    fontSize: 10,
    color: '#d1d5db',
    lineHeight: 11,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  searchIcon: { fontSize: 15, marginRight: 7, color: '#9ca3af' },
  searchInput: { flex: 1, fontSize: 16, color: '#111827', padding: 0 },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearBtnText: { fontSize: 10, color: '#fff', fontWeight: '700', lineHeight: 13 },
  findBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  // Row
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  toggle: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  chevron: { fontSize: 14, color: '#2d1b69' },
  leaf: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#e5e7eb' },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  deceasedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444', marginLeft: 8 },
  traceBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#2d1b69' },
  traceBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ede9fe', paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#ddd6fe', gap: 8,
  },
  traceDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2d1b69' },
  traceBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#2d1b69' },
  traceClear: { fontSize: 12, color: '#7c3aed', fontWeight: '600' },
  countBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginHorizontal: 6,
  },
  countText: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  rowChevron: { fontSize: 22, color: '#2d1b69', marginLeft: 2 },

  toolBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  toolIcon: { fontSize: 20, color: '#2d1b69', marginBottom: 3 },
  toolLabel: { fontSize: 10, color: '#6b7280', fontWeight: '500' },

  // Bottom sheet
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetName: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  sheetMeta: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  relationBox: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  relationText: { fontSize: 12, color: '#0284c7', fontWeight: '500' },
  sectionLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sheetDesc: { fontSize: 13, color: '#4b5563', lineHeight: 20, marginBottom: 12 },
  closeBtn: {
    width: '100%',
    paddingVertical: 13,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
})
