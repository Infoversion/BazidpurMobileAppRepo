import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, ScrollView, Switch, Image,
  RefreshControl, Pressable, Platform, ActionSheetIOS,
  KeyboardAvoidingView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Swipeable } from 'react-native-gesture-handler'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { webUpload } from '@/lib/webApi'
import type { FamilyNode } from '@/lib/family-tree-layout'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'

function resolvePhoto(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${R2}/${url}`
}
function sexColor(sex: string) {
  if (sex === 'male') return '#3b82f6'
  if (sex === 'female') return '#ec4899'
  return '#9ca3af'
}
function yearStr(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).getFullYear().toString()
}
function countDescendants(id: string, all: FamilyNode[]): number {
  return all.filter(n => n.parent_id === id)
    .reduce((s, c) => s + 1 + countDescendants(c.id, all), 0)
}

interface FlatItem { node: FamilyNode; depth: number }

// ─── Avatar ───────────────────────────────────────────────────────────────────
function NodeAvatar({ node, size = 36 }: { node: FamilyNode; size?: number }) {
  const [failed, setFailed] = useState(false)
  const uri = resolvePhoto(node.photo_url)
  const color = sexColor(node.sex)
  const initial = node.name.trim().charAt(0).toUpperCase()
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: node.is_alive ? color : `${color}66` }}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: node.sex === 'male' ? '#eff6ff' : node.sex === 'female' ? '#fdf2f8' : '#f9fafb',
      borderWidth: 2, borderColor: node.is_alive ? color : `${color}66`,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color }}>{initial}</Text>
    </View>
  )
}

// ─── Node form modal ──────────────────────────────────────────────────────────
const EMPTY: Omit<FamilyNode, 'id' | 'tree_level' | 'display_order'> = {
  name: '', sex: 'male', is_alive: true,
  dob: '', dod: '', married_to: '', description: '', photo_url: '', parent_id: null,
}

function NodeModal({
  visible, mode, initial, parentOptions, isSuperadmin,
  onClose, onSave, onDelete,
}: {
  visible: boolean
  mode: 'add' | 'edit'
  initial: Partial<FamilyNode> & { parent_id?: string | null }
  parentOptions: FamilyNode[]
  isSuperadmin: boolean
  onClose: () => void
  onSave: (data: Partial<FamilyNode>) => Promise<void>
  onDelete?: () => void
}) {
  const insets = useSafeAreaInsets()
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parentSearch, setParentSearch] = useState('')
  const [showParentPicker, setShowParentPicker] = useState(false)

  useEffect(() => { setForm({ ...EMPTY, ...initial }) }, [visible])

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  const selectedParent = parentOptions.find(n => n.id === form.parent_id)
  const filteredParents = parentSearch.trim()
    ? parentOptions.filter(n => n.name.toLowerCase().includes(parentSearch.toLowerCase()))
    : parentOptions

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (res.canceled || !res.assets[0]) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', { uri: res.assets[0].uri, name: 'photo.jpg', type: 'image/jpeg' } as any)
      const r = await webUpload('/api/family-tree/photo', fd)
      const data = await r.json()
      if (r.ok) set('photo_url', data.url)
      else Alert.alert('Upload failed', data.error || 'Please try again.')
    } catch {
      Alert.alert('Upload failed', 'Please check your connection.')
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!form.name.trim()) { Alert.alert('Name required'); return }
    setSaving(true)
    await onSave({ ...form, name: form.name.trim() })
    setSaving(false)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 14,
            backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
          }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: '#2d1b69' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
              {mode === 'add' ? 'Add Member' : 'Edit Member'}
            </Text>
            <TouchableOpacity onPress={submit} disabled={saving || uploading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {saving ? <ActivityIndicator size="small" color="#2d1b69" /> : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2d1b69' }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }} keyboardShouldPersistTaps="handled">
            {/* Photo */}
            <View style={{ alignItems: 'center', marginBottom: 4 }}>
              <Pressable onPress={pickPhoto} style={{ alignItems: 'center' }}>
                {form.photo_url ? (
                  <Image source={{ uri: resolvePhoto(form.photo_url) ?? '' }} style={{ width: 72, height: 72, borderRadius: 36 }} />
                ) : (
                  <View style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: form.sex === 'male' ? '#eff6ff' : form.sex === 'female' ? '#fdf2f8' : '#f9fafb',
                    borderWidth: 2, borderColor: sexColor(form.sex), borderStyle: 'dashed',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 24 }}>📷</Text>
                  </View>
                )}
                {uploading
                  ? <ActivityIndicator size="small" color="#2d1b69" style={{ marginTop: 6 }} />
                  : <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                      {form.photo_url ? 'Change photo' : 'Add photo'}
                    </Text>
                }
              </Pressable>
            </View>

            <Field label="Full Name *">
              <TextInput value={form.name} onChangeText={v => set('name', v)} placeholder="Enter full name" style={inputStyle} autoCapitalize="words" returnKeyType="next" />
            </Field>

            <Field label="Sex">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['male', 'female', 'other'] as const).map(s => (
                  <TouchableOpacity key={s} onPress={() => set('sex', s)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: form.sex === s ? sexColor(s) : '#f3f4f6' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: form.sex === s ? '#fff' : '#6b7280', textTransform: 'capitalize' }}>
                      {s === 'male' ? '♂ Male' : s === 'female' ? '♀ Female' : '⚬ Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#374151' }}>Still alive</Text>
              <Switch value={form.is_alive} onValueChange={v => { set('is_alive', v); if (v) set('dod', '') }} trackColor={{ true: '#2d1b69' }} />
            </View>

            <Field label="Date of Birth">
              <TextInput value={form.dob ?? ''} onChangeText={v => set('dob', v)} placeholder="YYYY-MM-DD" style={inputStyle} keyboardType="numbers-and-punctuation" />
            </Field>

            {!form.is_alive && (
              <Field label="Date of Death">
                <TextInput value={form.dod ?? ''} onChangeText={v => set('dod', v)} placeholder="YYYY-MM-DD" style={inputStyle} keyboardType="numbers-and-punctuation" />
              </Field>
            )}

            <Field label="Married To">
              <TextInput value={form.married_to ?? ''} onChangeText={v => set('married_to', v)} placeholder="Spouse name" style={inputStyle} />
            </Field>

            <Field label="Description / Note">
              <TextInput value={form.description ?? ''} onChangeText={v => set('description', v)} placeholder="Brief biography or notes…" style={[inputStyle, { height: 80, textAlignVertical: 'top' }]} multiline />
            </Field>

            {mode === 'add' && (
              <Field label="Parent Node">
                <TouchableOpacity onPress={() => setShowParentPicker(true)} style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 14, color: selectedParent ? '#111827' : '#9ca3af' }}>
                    {selectedParent ? `${selectedParent.name} (L${selectedParent.tree_level})` : 'Select parent…'}
                  </Text>
                  <Text style={{ color: '#9ca3af' }}>›</Text>
                </TouchableOpacity>
              </Field>
            )}

            {mode === 'edit' && onDelete && (
              <TouchableOpacity onPress={onDelete} style={{ backgroundColor: '#fff1f2', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#dc2626' }}>Delete Member & Descendants</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Parent picker */}
      <Modal visible={showParentPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowParentPicker(false)}>
        <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 14,
            backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
          }}>
            <TouchableOpacity onPress={() => setShowParentPicker(false)}>
              <Text style={{ fontSize: 16, color: '#2d1b69' }}>Done</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Select Parent</Text>
            <View style={{ width: 50 }} />
          </View>
          <View style={{ padding: 12 }}>
            <TextInput value={parentSearch} onChangeText={setParentSearch} placeholder="Search…" style={inputStyle} autoFocus clearButtonMode="while-editing" />
          </View>
          <FlatList
            data={filteredParents}
            keyExtractor={n => n.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { set('parent_id', item.id); setShowParentPicker(false); setParentSearch('') }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: form.parent_id === item.id ? '#f5f3ff' : '#fff' }}
              >
                <NodeAvatar node={item} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>Level {item.tree_level} · {item.sex}</Text>
                </View>
                {form.parent_id === item.id && <Text style={{ color: '#2d1b69', fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </Modal>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      {children}
    </View>
  )
}

const inputStyle = {
  backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#f3f4f6',
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FamilyTreeAdminScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const isSuperadmin = user?.role === 'superadmin'

  const [nodes, setNodes] = useState<FamilyNode[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [modalInitial, setModalInitial] = useState<Partial<FamilyNode>>({})

  const swipeRefs = useRef<Map<string, Swipeable>>(new Map())

  async function load() {
    const { data } = await supabase
      .from('family_tree_nodes')
      .select('*')
      .order('tree_level')
      .order('display_order')
    const rows = (data as FamilyNode[]) ?? []
    setNodes(rows)
    // Auto-expand root + first generation on first load
    setExpanded(prev => {
      if (prev.size > 0) return prev
      const init = new Set<string>()
      rows.forEach(n => { if (n.tree_level <= 1) init.add(n.id) })
      return init
    })
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Build DFS flat list (same pattern as tree.tsx) ───────────────────────────
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

  const matchIds = search.trim().length > 1
    ? new Set(nodes.filter(n =>
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.married_to?.toLowerCase().includes(search.toLowerCase())
      ).map(n => n.id))
    : null

  const effectiveExpanded = useMemo(() => {
    if (!matchIds) return expanded
    return new Set(nodes.map(n => n.id)) // expand all when searching
  }, [matchIds, expanded, nodes])

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

  const displayed = matchIds
    ? flatItems.filter(item => matchIds.has(item.node.id))
    : flatItems

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function handleSave(data: Partial<FamilyNode>) {
    if (modalMode === 'add') {
      const parent = nodes.find(n => n.id === data.parent_id)
      const tree_level = parent ? parent.tree_level + 1 : 0
      const siblings = nodes.filter(n => n.parent_id === (data.parent_id ?? null))
      const display_order = siblings.length ? Math.max(...siblings.map(s => s.display_order)) + 1 : 0

      const { data: created, error } = await supabase
        .from('family_tree_nodes')
        .insert({
          parent_id: data.parent_id || null,
          name: data.name, sex: data.sex,
          dob: data.dob || null, dod: data.dod || null,
          description: data.description || null,
          married_to: data.married_to || null,
          photo_url: data.photo_url || null,
          is_alive: data.is_alive ?? true,
          tree_level, display_order,
          created_by: user?.id, updated_by: user?.id,
        })
        .select().single()

      if (error) { Alert.alert('Error', error.message); return }
      setNodes(prev => [...prev, created as FamilyNode])
      // Auto-expand parent so new child is immediately visible
      if (data.parent_id) setExpanded(prev => { const n = new Set(prev); n.add(data.parent_id!); return n })
    } else {
      const id = modalInitial.id
      const { data: updated, error } = await supabase
        .from('family_tree_nodes')
        .update({
          name: data.name, sex: data.sex,
          dob: data.dob || null, dod: data.dod || null,
          description: data.description || null,
          married_to: data.married_to || null,
          photo_url: data.photo_url || null,
          is_alive: data.is_alive ?? true,
          display_order: (data as any).display_order ?? modalInitial.display_order ?? 0,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select().single()

      if (error) { Alert.alert('Error', error.message); return }
      setNodes(prev => prev.map(n => n.id === id ? (updated as FamilyNode) : n))
    }
    setModalVisible(false)
  }

  async function handleDelete(node: FamilyNode) {
    const descCount = countDescendants(node.id, nodes)
    Alert.alert(
      'Delete Member',
      descCount > 0
        ? `Delete "${node.name}" and ${descCount} descendant${descCount !== 1 ? 's' : ''}? This cannot be undone.`
        : `Delete "${node.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const toDelete: string[] = []
            function collect(id: string) {
              toDelete.push(id)
              nodes.filter(n => n.parent_id === id).forEach(n => collect(n.id))
            }
            collect(node.id)
            const { error } = await supabase.from('family_tree_nodes').delete().in('id', toDelete)
            if (error) { Alert.alert('Error', error.message); return }
            setNodes(prev => prev.filter(n => !toDelete.includes(n.id)))
            setModalVisible(false)
          },
        },
      ]
    )
  }

  function openAdd(parentNode?: FamilyNode) {
    setModalMode('add')
    setModalInitial({ parent_id: parentNode?.id ?? null, sex: 'male', is_alive: true })
    setModalVisible(true)
  }

  function openEdit(node: FamilyNode) {
    setModalMode('edit')
    setModalInitial(node)
    setModalVisible(true)
  }

  function showActions(item: FlatItem) {
    const { node } = item
    const childCount = countDescendants(node.id, nodes)
    const hasKids = (childrenOf.get(node.id) ?? []).length > 0
    const isExpanded = expanded.has(node.id)
    const canDelete = isSuperadmin || node.tree_level > 2
    const opts: string[] = ['Edit', 'Add Child']
    if (hasKids) opts.push(isExpanded ? 'Collapse' : 'Expand')
    if (canDelete) opts.push('Delete')
    opts.push('Cancel')

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: node.name,
          message: `Level ${node.tree_level} · ${childCount} descendant${childCount !== 1 ? 's' : ''}`,
          options: opts,
          destructiveButtonIndex: canDelete ? opts.indexOf('Delete') : undefined,
          cancelButtonIndex: opts.indexOf('Cancel'),
        },
        idx => {
          const chosen = opts[idx]
          if (chosen === 'Edit') openEdit(node)
          else if (chosen === 'Add Child') openAdd(node)
          else if (chosen === 'Collapse' || chosen === 'Expand') toggleExpand(node.id)
          else if (chosen === 'Delete') handleDelete(node)
        },
      )
    } else {
      Alert.alert(node.name, `Level ${node.tree_level}`, [
        { text: 'Edit', onPress: () => openEdit(node) },
        { text: 'Add Child', onPress: () => openAdd(node) },
        ...(hasKids ? [{ text: isExpanded ? 'Collapse' : 'Expand', onPress: () => toggleExpand(node.id) }] : []),
        ...(canDelete ? [{ text: 'Delete', style: 'destructive' as const, onPress: () => handleDelete(node) }] : []),
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  // ── Row ─────────────────────────────────────────────────────────────────────
  function renderItem({ item }: { item: FlatItem }) {
    const { node, depth } = item
    const hasKids = (childrenOf.get(node.id) ?? []).length > 0
    const childCount = nodes.filter(n => n.parent_id === node.id).length
    const isExpanded = expanded.has(node.id)
    const canDelete = isSuperadmin || node.tree_level > 2
    const dobY = yearStr(node.dob)
    const dodY = yearStr(node.dod)
    const nameColor = node.is_alive
      ? (node.sex === 'female' ? '#be185d' : '#1e40af')
      : '#64748b'

    function closeAllExcept(id: string) {
      swipeRefs.current.forEach((ref, key) => { if (key !== id) ref.close() })
    }

    const leftActions = () => (
      <TouchableOpacity
        onPress={() => { swipeRefs.current.get(node.id)?.close(); openAdd(node) }}
        style={{ backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', width: 80 }}
      >
        <Text style={{ fontSize: 20 }}>👶</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 }}>Add Child</Text>
      </TouchableOpacity>
    )

    const rightActions = canDelete ? () => (
      <TouchableOpacity
        onPress={() => { swipeRefs.current.get(node.id)?.close(); handleDelete(node) }}
        style={{ backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', width: 80 }}
      >
        <Text style={{ fontSize: 20 }}>🗑</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 }}>Delete</Text>
      </TouchableOpacity>
    ) : undefined

    return (
      <Swipeable
        ref={ref => { if (ref) swipeRefs.current.set(node.id, ref); else swipeRefs.current.delete(node.id) }}
        renderLeftActions={leftActions}
        renderRightActions={rightActions}
        onSwipeableOpen={() => closeAllExcept(node.id)}
        friction={2}
        leftThreshold={60}
        rightThreshold={60}
      >
        <Pressable
          onPress={() => openEdit(node)}
          onLongPress={() => showActions(item)}
          delayLongPress={400}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: pressed ? '#f5f3ff' : '#fff',
            paddingLeft: 12 + depth * 18,
            paddingRight: 16, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
          })}
        >
          {/* Expand / collapse toggle — same as tree.tsx */}
          <TouchableOpacity
            onPress={hasKids ? () => toggleExpand(node.id) : undefined}
            style={{ width: 22, alignItems: 'center', marginRight: 4 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {hasKids ? (
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#a78bfa' }}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            ) : (
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#e5e7eb' }} />
            )}
          </TouchableOpacity>

          <NodeAvatar node={node} />

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: nameColor }} numberOfLines={1}>
                {node.name}
              </Text>
              {!node.is_alive && <Text style={{ fontSize: 11, color: '#94a3b8' }}>†</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: sexColor(node.sex) }}>
                {node.sex === 'male' ? '♂' : node.sex === 'female' ? '♀' : '⚬'}
              </Text>
              {(dobY || dodY) && (
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                  {dobY}{!node.is_alive && dodY ? `  †${dodY}` : ''}
                </Text>
              )}
            </View>
          </View>

          {/* Collapsed child count badge */}
          {hasKids && !isExpanded && (
            <View style={{ backgroundColor: '#e0e7ff', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#4338ca' }}>{childCount}</Text>
            </View>
          )}

          <Text style={{ fontSize: 16, color: '#d1d5db' }}>›</Text>
        </Pressable>
      </Swipeable>
    )
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const males = nodes.filter(n => n.sex === 'male').length
  const females = nodes.filter(n => n.sex === 'female').length
  const alive = nodes.filter(n => n.is_alive).length
  const maxLevel = nodes.length ? Math.max(...nodes.map(n => n.tree_level)) : 0

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      {/* Search */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, gap: 8 }}>
          <Text style={{ fontSize: 15, color: '#9ca3af' }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search members, spouses…"
            style={{ flex: 1, fontSize: 14, color: '#111827', paddingVertical: 10 }}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Stats strip */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        {[
          { label: 'Total', value: nodes.length, color: '#2d1b69' },
          { label: 'Alive', value: alive, color: '#10b981' },
          { label: '♂', value: males, color: '#3b82f6' },
          { label: '♀', value: females, color: '#ec4899' },
          { label: 'Levels', value: maxLevel + 1, color: '#6b7280' },
        ].map(s => (
          <View key={s.label} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: '600', letterSpacing: 0.3 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Gesture hint */}
      {nodes.length > 0 && (
        <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 16, paddingVertical: 5 }}>
          <Text style={{ fontSize: 11, color: '#7c3aed', textAlign: 'center' }}>
            ▶/▼ expand · swipe → add child · swipe ← delete · long press for more
          </Text>
        </View>
      )}

      {/* Tree list */}
      <FlatList
        data={displayed}
        keyExtractor={(item: FlatItem) => item.node.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🌳</Text>
            <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center' }}>
              {search ? `No members matching "${search}"` : 'No family members yet'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => openAdd(nodes.find(n => !n.parent_id))}
        style={{
          position: 'absolute', bottom: insets.bottom + 74, right: 20,
          width: 54, height: 54, borderRadius: 27, backgroundColor: '#2d1b69',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#2d1b69', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
        }}
      >
        <Text style={{ fontSize: 28, color: '#fff', lineHeight: 32, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      <NodeModal
        visible={modalVisible}
        mode={modalMode}
        initial={modalInitial}
        parentOptions={nodes}
        isSuperadmin={isSuperadmin}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={modalMode === 'edit' ? () => handleDelete(modalInitial as FamilyNode) : undefined}
      />
    </View>
  )
}
