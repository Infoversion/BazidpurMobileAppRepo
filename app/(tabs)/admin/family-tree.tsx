import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, ScrollView, Switch, Image,
  Alert, Platform, ActionSheetIOS, KeyboardAvoidingView,
  RefreshControl, Pressable, StyleSheet,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Swipeable } from 'react-native-gesture-handler'
import * as ImagePicker from 'expo-image-picker'
import { DateOfBirthPicker } from '@/components/DateOfBirthPicker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { webUpload } from '@/lib/webApi'
import { levelColor, type FamilyNode } from '@/lib/family-tree-layout'
import { AppDialog } from '@/components/AppDialog'
import { useDialog } from '@/lib/useDialog'

const R2 = 'https://pub-7e314f102b4e417bab40fb584bfb85bf.r2.dev'
const ROW_H = 64

function resolvePhoto(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${R2}/${url}`
}
function sexColor(sex: string) {
  if (sex === 'male') return '#3b82f6'
  if (sex === 'female') return '#ec4899'
  return '#9ca3af'
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
  visible, mode, initial, parentOptions,
  onClose, onSave, onDelete,
}: {
  visible: boolean
  mode: 'add' | 'edit'
  initial: Partial<FamilyNode>
  parentOptions: FamilyNode[]
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
  const { dialog: nmDialog, show: nmShow, hide: nmHide } = useDialog()

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
      else nmShow('error', 'Upload failed', data.error || 'Please try again.')
    } catch {
      nmShow('error', 'Upload failed', 'Please check your connection.')
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!form.name.trim()) { nmShow('error', 'Name required'); return }
    setSaving(true)
    await onSave({ ...form, name: form.name.trim() })
    setSaving(false)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
          {/* Header */}
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
                  : <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{form.photo_url ? 'Change photo' : 'Add photo'}</Text>
                }
              </Pressable>
            </View>

            <Field label="Full Name *">
              <TextInput value={form.name} onChangeText={v => set('name', v)} placeholder="Enter full name"
                style={inp} autoCapitalize="words" returnKeyType="next" />
            </Field>

            <Field label="Sex">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['male', 'female', 'other'] as const).map(s => (
                  <TouchableOpacity key={s} onPress={() => set('sex', s)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: form.sex === s ? sexColor(s) : '#f3f4f6' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: form.sex === s ? '#fff' : '#6b7280', textTransform: 'capitalize' }}>
                      {s === 'male' ? '♂ Male' : s === 'female' ? '♀ Female' : '⚬ Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#374151' }}>Alive?</Text>
              <Switch value={form.is_alive} onValueChange={v => { set('is_alive', v); if (v) set('dod', '') }} trackColor={{ true: '#2d1b69' }} />
            </View>

            <Field label="Date of Birth">
              <DateOfBirthPicker value={form.dob ?? ''} onChange={v => set('dob', v)} defaultDate={new Date(1950, 0, 1)} />
            </Field>

            {!form.is_alive && (
              <Field label="Date of Death">
                <DateOfBirthPicker value={form.dod ?? ''} onChange={v => set('dod', v)} defaultDate={new Date(1950, 0, 1)} />
              </Field>
            )}

            <Field label="Married To">
              <TextInput value={form.married_to ?? ''} onChangeText={v => set('married_to', v)}
                placeholder="Spouse name" style={inp} />
            </Field>

            <Field label="Description / Note">
              <TextInput value={form.description ?? ''} onChangeText={v => set('description', v)}
                placeholder="Brief biography or notes…" style={[inp, { height: 80, textAlignVertical: 'top' }]} multiline />
            </Field>

            {mode === 'add' && (
              <Field label="Parent Node">
                <TouchableOpacity onPress={() => setShowParentPicker(true)}
                  style={[inp, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 14, color: selectedParent ? '#111827' : '#9ca3af' }}>
                    {selectedParent ? `${selectedParent.name} (L${selectedParent.tree_level})` : 'Select parent…'}
                  </Text>
                  <Text style={{ color: '#9ca3af' }}>›</Text>
                </TouchableOpacity>
              </Field>
            )}

            {mode === 'edit' && onDelete && (
              <TouchableOpacity onPress={onDelete}
                style={{ backgroundColor: '#fff1f2', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 }}>
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
            <TextInput value={parentSearch} onChangeText={setParentSearch} placeholder="Search…"
              style={inp} autoFocus clearButtonMode="while-editing" />
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
      <AppDialog {...nmDialog} onClose={nmHide} />
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      {children}
    </View>
  )
}

const inp = {
  backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#f3f4f6',
} as const

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FamilyTreeAdminScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const isSuperadmin = user?.role === 'superadmin'

  const [nodes,    setNodes]    = useState<FamilyNode[]>([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search,   setSearch]   = useState('')
  const { dialog, show, hide } = useDialog()

  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode,    setModalMode]    = useState<'add' | 'edit'>('add')
  const [modalInitial, setModalInitial] = useState<Partial<FamilyNode>>({})

  const swipeRefs = useRef<Map<string, Swipeable>>(new Map())

  // ── Exact same load pattern as tree.tsx ─────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('family_tree_nodes')
        .select('*')
        .order('tree_level')
        .order('display_order')
      const rows = (data ?? []) as FamilyNode[]
      setNodes(rows)
      const init = new Set<string>()
      rows.forEach(n => { if (n.tree_level <= 1) init.add(n.id) })
      setExpanded(init)
      setLoading(false)
    }
    load()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    const { data } = await supabase
      .from('family_tree_nodes')
      .select('*')
      .order('tree_level')
      .order('display_order')
    const rows = (data ?? []) as FamilyNode[]
    setNodes(rows)
    setRefreshing(false)
  }, [])

  // ── Exact same useMemo chain as tree.tsx ────────────────────────────────────
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
    ? new Set(nodes.filter(n => n.name.toLowerCase().includes(search.toLowerCase())).map(n => n.id))
    : null

  const effectiveExpanded = useMemo(() => {
    if (!matchIds) return expanded
    return new Set(nodes.map(n => n.id))
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

  const displayItems = matchIds
    ? flatItems.filter(item => matchIds.has(item.node.id))
    : flatItems

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
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

      if (error) { show('error', 'Error', error.message); return }
      setNodes(prev => [...prev, created as FamilyNode])
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
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select().single()

      if (error) { show('error', 'Error', error.message); return }
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
            if (error) { show('error', 'Error', error.message); return }
            setNodes(prev => prev.filter(n => !toDelete.includes(n.id)))
            setModalVisible(false)
          },
        },
      ]
    )
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

  // ── Row — identical layout to tree.tsx TreeRow + Swipeable wrapper ──────────
  function renderItem({ item }: { item: FlatItem }) {
    const { node, depth } = item
    const hasKids = (childrenOf.get(node.id) ?? []).length > 0
    const childCount = (childrenOf.get(node.id) ?? []).length
    const isExpanded = expanded.has(node.id)
    const canDelete = isSuperadmin || node.tree_level > 2
    const nameClr = node.is_alive ? (node.sex === 'female' ? '#be185d' : '#1e40af') : '#64748b'
    const yearPart = node.dob ? node.dob.slice(0, 4) : ''
    const dodPart  = !node.is_alive && node.dod ? `†${node.dod.slice(0, 4)}` : ''
    const datePart = [yearPart, dodPart].filter(Boolean).join('  ')
    const sexClr   = node.sex === 'male' ? '#3b82f6' : '#ec4899'

    function closeOthers() {
      swipeRefs.current.forEach((ref, key) => { if (key !== node.id) ref.close() })
    }

    return (
      <Swipeable
        ref={ref => { if (ref) swipeRefs.current.set(node.id, ref); else swipeRefs.current.delete(node.id) }}
        onSwipeableOpen={closeOthers}
        friction={2}
        leftThreshold={60}
        rightThreshold={60}
        renderLeftActions={() => (
          <TouchableOpacity
            onPress={() => { swipeRefs.current.get(node.id)?.close(); openAdd(node) }}
            style={{ backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', width: 80 }}
          >
            <Text style={{ fontSize: 20 }}>👶</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 }}>Add Child</Text>
          </TouchableOpacity>
        )}
        renderRightActions={canDelete ? () => (
          <TouchableOpacity
            onPress={() => { swipeRefs.current.get(node.id)?.close(); handleDelete(node) }}
            style={{ backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', width: 80 }}
          >
            <Text style={{ fontSize: 20 }}>🗑</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 }}>Delete</Text>
          </TouchableOpacity>
        ) : undefined}
      >
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => openEdit(node)}
          onLongPress={() => showActions(item)}
          delayLongPress={400}
          style={[s.row, { paddingLeft: 12 + depth * 18 }]}
        >
          {/* Expand / collapse toggle — identical to tree.tsx */}
          <TouchableOpacity
            onPress={hasKids ? () => toggleExpand(node.id) : undefined}
            style={s.toggle}
            hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
          >
            {hasKids ? (
              <Text style={[s.chevron, { color: levelColor(node.tree_level) }]}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            ) : (
              <View style={s.leaf} />
            )}
          </TouchableOpacity>

          {/* Avatar */}
          <NodeAvatar node={node} />

          {/* Name + sub-info */}
          <View style={{ flex: 1, marginLeft: 11 }}>
            <Text style={[s.rowName, { color: nameClr }]} numberOfLines={1}>{node.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: sexClr }}>
                {node.sex === 'male' ? '♂' : node.sex === 'female' ? '♀' : '⚬'}
              </Text>
              {datePart ? <Text style={s.rowSub}>{datePart}</Text> : null}
            </View>
          </View>

          {!node.is_alive ? <View style={s.deceasedDot} /> : null}

          {hasKids && !isExpanded ? (
            <View style={s.countBadge}>
              <Text style={s.countText}>{childCount}</Text>
            </View>
          ) : null}

          <Text style={s.rowChevron}>›</Text>
        </TouchableOpacity>
      </Swipeable>
    )
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const alive    = nodes.filter(n => n.is_alive).length
  const males    = nodes.filter(n => n.sex === 'male').length
  const females  = nodes.filter(n => n.sex === 'female').length
  const maxLevel = nodes.reduce((m, n) => Math.max(m, n.tree_level), 0)

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2d1b69" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Search + Add button */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12 }}>
          <Text style={{ fontSize: 15, color: '#9ca3af', marginRight: 7 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search members…"
            style={{ flex: 1, fontSize: 16, color: '#111827', paddingVertical: 10 }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          onPress={() => openAdd(nodes.find(n => !n.parent_id))}
          activeOpacity={0.8}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 24, color: '#fff', lineHeight: 28, marginTop: -1 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        {[
          { label: 'Total',  value: nodes.length, color: '#2d1b69' },
          { label: 'Alive',  value: alive,         color: '#10b981' },
          { label: '♂',      value: males,         color: '#3b82f6' },
          { label: '♀',      value: females,       color: '#ec4899' },
          { label: 'Levels', value: maxLevel + 1,  color: '#6b7280' },
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
            tap edit · swipe → add child · swipe ← delete · long press for more
          </Text>
        </View>
      )}

      {/* Tree list — identical FlatList config to tree.tsx */}
      <FlatList<FlatItem>
        data={displayItems}
        keyExtractor={item => item.node.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
        onScrollToIndexFailed={() => {}}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🌳</Text>
            <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center' }}>
              {search ? `No results for "${search}"` : 'No family members yet'}
            </Text>
          </View>
        }
      />

      <NodeModal
        visible={modalVisible}
        mode={modalMode}
        initial={modalInitial}
        parentOptions={nodes}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={modalMode === 'edit' ? () => handleDelete(modalInitial as FamilyNode) : undefined}
      />
      <AppDialog {...dialog} onClose={hide} />
    </View>
  )
}

// ─── Styles (same names/values as tree.tsx) ───────────────────────────────────
const s = StyleSheet.create({
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  toggle:      { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  chevron:     { fontSize: 14 },
  leaf:        { width: 5, height: 5, borderRadius: 3, backgroundColor: '#e5e7eb' },
  rowName:     { fontSize: 15, fontWeight: '600' },
  rowSub:      { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  deceasedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444', marginLeft: 8 },
  countBadge:  { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginHorizontal: 6 },
  countText:   { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  rowChevron:  { fontSize: 22, color: '#2d1b69', marginLeft: 2 },
})
