import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
  Alert, ActionSheetIOS, Platform, Modal, ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { User, UserRole } from '@/lib/types'
import { AppDialog } from '@/components/AppDialog'
import { useDialog } from '@/lib/useDialog'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'member' | 'admin'

const PAGE_SIZE = 25

const ROLE_LABEL: Record<UserRole, string> = {
  visitor:    'Visitor',
  pending:    'Pending',
  member:     'Member',
  admin:      'Admin',
  superadmin: 'Superadmin',
}

const ROLE_COLOR: Record<UserRole, { bg: string; text: string }> = {
  visitor:    { bg: '#f2f2f7', text: '#6b7280' },
  pending:    { bg: '#fff3cd', text: '#92400e' },
  member:     { bg: '#d1fae5', text: '#065f46' },
  admin:      { bg: '#dbeafe', text: '#1e40af' },
  superadmin: { bg: '#ede9fe', text: '#5b21b6' },
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const c = ROLE_COLOR[role]
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.text, letterSpacing: 0.1 }}>
        {ROLE_LABEL[role]}
      </Text>
    </View>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user }: { user: User }) {
  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'
  const bg = user.role === 'pending' ? '#fde68a'
    : user.role === 'admin' || user.role === 'superadmin' ? '#c7d2fe'
    : '#a7f3d0'

  return (
    <View style={{
      width: 44, height: 44, borderRadius: 22,
      overflow: 'hidden', backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {user.photo_url ? (
        <Image source={{ uri: user.photo_url }} style={{ width: 44, height: 44 }} contentFit="cover" />
      ) : (
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1c1e' }}>{initials}</Text>
      )}
    </View>
  )
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ user, isSuperadmin, onAction, onView }: {
  user: User
  isSuperadmin: boolean
  onAction: (user: User) => void
  onView: (user: User) => void
}) {
  const joinDate = new Date(user.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <TouchableOpacity
      onPress={() => onView(user)}
      activeOpacity={0.6}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
      }}
    >
      <Avatar user={user} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }} numberOfLines={1}>
            {user.first_name} {user.last_name}
          </Text>
          {!user.is_active && (
            <View style={{ backgroundColor: '#fee2e2', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#991b1b', letterSpacing: 0.4 }}>INACTIVE</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: '#3c3c43', opacity: 0.6 }} numberOfLines={1}>{user.email}</Text>
        {user.place_of_residence ? (
          <Text style={{ fontSize: 12, color: '#3c3c43', opacity: 0.4, marginTop: 1 }} numberOfLines={1}>
            {user.place_of_residence}
          </Text>
        ) : null}
        <Text style={{ fontSize: 11, color: '#3c3c43', opacity: 0.3, marginTop: 2 }}>Joined {joinDate}</Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <RoleBadge role={user.role} />
        <Text style={{ fontSize: 20, color: '#c7c7cc', marginRight: -2 }}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Segmented control ────────────────────────────────────────────────────────

function SegmentedControl({ tabs, selected, onSelect }: {
  tabs: { key: FilterTab; label: string }[]
  selected: FilterTab
  onSelect: (k: FilterTab) => void
}) {
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: 'rgba(118,118,128,0.12)',
      borderRadius: 9,
      padding: 2,
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 8,
    }}>
      {tabs.map(tab => {
        const active = tab.key === selected
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.8}
            style={[
              {
                flex: 1, paddingVertical: 6,
                alignItems: 'center', borderRadius: 7,
              },
              active && {
                backgroundColor: '#fff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: active ? '600' : '400',
              color: active ? '#000' : 'rgba(60,60,67,0.6)',
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const { user: currentUser } = useAuth()
  const isSuperadmin = currentUser?.role === 'superadmin'
  const { tab } = useLocalSearchParams<{ tab?: string }>()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const { dialog, show, hide } = useDialog()
  const validTabs: FilterTab[] = ['all', 'pending', 'member', 'admin']
  const initialTab: FilterTab = validTabs.includes(tab as FilterTab) ? (tab as FilterTab) : 'all'
  const [filter, setFilter] = useState<FilterTab>(initialTab)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleCounts, setRoleCounts] = useState({ all: 0, pending: 0, member: 0, admin: 0 })
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [approverName, setApproverName] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedUser?.approved_by) { setApproverName(null); return }
    supabase.from('users').select('first_name, last_name').eq('id', selectedUser.approved_by).single()
      .then(({ data }) => setApproverName(data ? `${data.first_name} ${data.last_name}` : null))
  }, [selectedUser?.id])

  // Debounce search — avoids a server call per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 400)
    return () => clearTimeout(t)
  }, [search])

  // ── Query helpers ─────────────────────────────────────────────────────────────

  async function fetchPage(f: FilterTab, s: string, offset: number): Promise<User[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from('users').select('*').order('created_at', { ascending: false })
    if (f === 'pending') q = q.eq('role', 'pending')
    else if (f === 'member') q = q.eq('role', 'member')
    else if (f === 'admin') q = q.in('role', ['admin', 'superadmin'])
    if (s) q = q.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,place_of_residence.ilike.%${s}%`
    )
    const { data } = await q.range(offset, offset + PAGE_SIZE - 1)
    const rows = (data ?? []) as User[]
    const seen = new Set<string>()
    return rows.filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true })
  }

  async function fetchRoleCounts() {
    const { data } = await supabase.from('users').select('role')
    if (!data) return
    setRoleCounts({
      all:     data.length,
      pending: data.filter(u => u.role === 'pending').length,
      member:  data.filter(u => u.role === 'member').length,
      admin:   data.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
    })
  }

  // ── Initial load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetchPage(filter, '', 0).then(rows => { setUsers(rows); setHasMore(rows.length === PAGE_SIZE) }),
      fetchRoleCounts(),
    ]).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reload on filter / search change ─────────────────────────────────────────

  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return }
    setUsers([])
    setHasMore(true)
    fetchPage(filter, debouncedSearch, 0).then(rows => {
      setUsers(rows)
      setHasMore(rows.length === PAGE_SIZE)
    })
  }, [filter, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pull-to-refresh ───────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    const [rows] = await Promise.all([fetchPage(filter, debouncedSearch, 0), fetchRoleCounts()])
    setUsers(rows)
    setHasMore(rows.length === PAGE_SIZE)
    setRefreshing(false)
  }, [filter, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll ───────────────────────────────────────────────────────────

  async function onLoadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const rows = await fetchPage(filter, debouncedSearch, users.length)
    setUsers(prev => {
      const seen = new Set(prev.map(u => u.id))
      return [...prev, ...rows.filter(u => !seen.has(u.id))]
    })
    setHasMore(rows.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  // ── Role / active updates ─────────────────────────────────────────────────────

  async function updateRole(userId: string, newRole: UserRole) {
    const targetUser = users.find(x => x.id === userId)
    const oldRole = targetUser?.role

    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = { role: newRole }
    if (oldRole === 'pending' && newRole === 'member') {
      updateData.approved_by = currentUser?.id
      updateData.approved_at = now
      updateData.member_since = now
      updateData.is_active = true
    }
    const { error } = await supabase.from('users').update(updateData).eq('id', userId)
    if (error) { show('error', 'Error', error.message); return }

    setUsers(prev => {
      const updated = prev.map(x => x.id === userId ? { ...x, role: newRole } : x)
      if (filter === 'all') return updated
      return updated.filter(x => {
        if (filter === 'pending') return x.role === 'pending'
        if (filter === 'member')  return x.role === 'member'
        if (filter === 'admin')   return x.role === 'admin' || x.role === 'superadmin'
        return true
      })
    })
    await fetchRoleCounts()

    // Send email notification matching web behaviour
    if (!targetUser) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    }
    const { first_name: firstName, email } = targetUser

    const sendEmail = async (url: string, body: object) => {
      try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          console.error(`[email] ${url} → ${res.status}`, text)
        }
      } catch (err) {
        console.error(`[email] network error`, err)
      }
    }

    if (oldRole === 'pending' && newRole === 'member') {
      sendEmail('https://www.bazidpur.com/api/member-approved', { firstName, email })
    } else if (oldRole === 'pending' && newRole === 'visitor') {
      sendEmail('https://www.bazidpur.com/api/member-rejected', { firstName, email })
    } else if (newRole === 'admin' || (newRole === 'member' && oldRole === 'admin')) {
      sendEmail('https://www.bazidpur.com/api/role-changed', { firstName, email, newRole })
    }
  }

  async function updateActive(userId: string, is_active: boolean) {
    const { error } = await supabase.from('users').update({ is_active }).eq('id', userId)
    if (error) {
      show('error', 'Error', error.message)
    } else {
      setUsers(u => u.map(x => x.id === userId ? { ...x, is_active } : x))
    }
  }

  // ── Action sheet ──────────────────────────────────────────────────────────────

  function showActions(user: User) {
    const isPending = user.role === 'pending'
    const isMember  = user.role === 'member'
    const isAdmin   = user.role === 'admin'
    const isSA      = user.role === 'superadmin'
    const isMe      = user.id === currentUser?.id

    const options: string[] = []
    const actions: (() => void)[] = []

    if (isPending) {
      options.push('✅  Approve as Member')
      actions.push(() => confirmRole(user, 'member', 'Approve this member?'))
    }
    if (isMember && isSuperadmin) {
      options.push('⬆️  Promote to Admin')
      actions.push(() => confirmRole(user, 'admin', 'Promote to Admin?'))
    }
    if (isAdmin && isSuperadmin) {
      options.push('⬇️  Demote to Member')
      actions.push(() => confirmRole(user, 'member', 'Demote to Member?'))
    }
    if (!isPending && !isMe && !isSA) {
      if (user.is_active) {
        options.push('🚫  Deactivate Account')
        actions.push(() => confirmActive(user, false))
      } else {
        options.push('✅  Reactivate Account')
        actions.push(() => confirmActive(user, true))
      }
    }
    if (isPending) {
      options.push('❌  Reject & Remove')
      actions.push(() => confirmRole(user, 'visitor', 'Reject this applicant?'))
    }

    if (options.length === 0) {
      show('info', `${user.first_name} ${user.last_name}`, 'No actions available for this account.')
      return
    }

    options.push('Cancel')

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `${user.first_name} ${user.last_name}`,
          message: user.email,
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.findIndex(o => o.includes('Deactivate') || o.includes('Reject')),
        },
        index => { if (index < actions.length) actions[index]() }
      )
    } else {
      const buttons = actions.slice(0, 3).map((action, i) => ({
        text: options[i].replace(/^[^\s]+\s+/, ''),
        onPress: action,
      }))
      buttons.push({ text: 'Cancel', onPress: () => {} })
      Alert.alert(`${user.first_name} ${user.last_name}`, user.email, buttons)
    }
  }

  function confirmRole(user: User, role: UserRole, message: string) {
    Alert.alert(message, `${user.first_name} ${user.last_name} will be set to ${ROLE_LABEL[role]}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateRole(user.id, role) },
    ])
  }

  function confirmActive(user: User, active: boolean) {
    const action = active ? 'Reactivate' : 'Deactivate'
    Alert.alert(`${action} account?`, `${user.first_name} ${user.last_name}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: active ? 'default' : 'destructive', onPress: () => updateActive(user.id, active) },
    ])
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',     label: `All (${roleCounts.all})` },
    { key: 'pending', label: `Pending${roleCounts.pending > 0 ? ` (${roleCounts.pending})` : ''}` },
    { key: 'member',  label: 'Members' },
    { key: 'admin',   label: 'Admins' },
  ]

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}>
        <ActivityIndicator color="#2d1b69" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      {/* Search bar */}
      <View style={{ backgroundColor: '#f2f2f7', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: 'rgba(118,118,128,0.12)',
          borderRadius: 10, paddingHorizontal: 10, gap: 6,
        }}>
          <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)' }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#000', paddingVertical: 9 }}
            placeholder="Search name, email, location…"
            placeholderTextColor="rgba(60,60,67,0.4)"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Segmented control */}
      <SegmentedControl tabs={FILTER_TABS} selected={filter} onSelect={setFilter} />

      <FlatList
        data={users}
        keyExtractor={u => u.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        // Inset separator — starts after avatar area (16px padding + 44px avatar + 12px gap = 72)
        ItemSeparatorComponent={() => (
          <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.18)', marginLeft: 72 }} />
        )}
        renderItem={({ item }) => (
          <MemberRow user={item} isSuperadmin={isSuperadmin} onAction={showActions} onView={setSelectedUser} />
        )}
        ListHeaderComponent={
          <View style={{ height: 8, backgroundColor: 'transparent' }} />
        }
        ListFooterComponent={
          loadingMore
            ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color="#2d1b69" />
              </View>
            )
            : !hasMore && users.length > 0
              ? (
                <Text style={{
                  textAlign: 'center', color: 'rgba(60,60,67,0.4)',
                  fontSize: 12, paddingVertical: 24,
                }}>
                  {users.length} member{users.length !== 1 ? 's' : ''} total
                </Text>
              )
              : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>👥</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 }}>
              No members found
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', textAlign: 'center' }}>
              Try a different filter or search term.
            </Text>
          </View>
        }
      />

      {/* ── Applicant detail sheet ────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedUser(null)}
      >
        {selectedUser && (
          <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

            {/* Header */}
            <View style={{
              backgroundColor: '#fff',
              paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
              flexDirection: 'row', alignItems: 'center', gap: 14,
              borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)',
            }}>
              <Avatar user={selectedUser} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 4 }}>
                  {selectedUser.first_name} {selectedUser.last_name}
                </Text>
                <RoleBadge role={selectedUser.role} />
              </View>
              <TouchableOpacity onPress={() => setSelectedUser(null)} style={{ paddingLeft: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 15, color: '#2d1b69', fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

              <DetailSection title="Contact">
                <DetailField label="Email" value={selectedUser.email} />
              </DetailSection>

              <DetailSection title="Personal Details">
                <DetailField
                  label="Sex"
                  value={selectedUser.sex === 'male' ? 'Male' : selectedUser.sex === 'female' ? 'Female' : selectedUser.sex || '—'}
                />
                {selectedUser.dob ? (
                  <DetailField
                    label="Date of birth"
                    value={new Date(selectedUser.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  />
                ) : null}
              </DetailSection>

              <DetailSection title="Location">
                <DetailField label="Place of residence" value={selectedUser.place_of_residence || '—'} />
              </DetailSection>

              <DetailSection title="Bazidpur Connection">
                <DetailField label="Connection" value={selectedUser.link_to_bazidpur || '—'} multiline />
                {selectedUser.comments ? (
                  <DetailField label="Additional comments" value={selectedUser.comments} multiline />
                ) : null}
              </DetailSection>

              <DetailSection title="Membership">
                <DetailField label="Status" value={selectedUser.is_active ? 'Active' : 'Suspended'} />
                {selectedUser.role === 'pending' ? (
                  <DetailField
                    label="Applied on"
                    value={new Date(selectedUser.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  />
                ) : (
                  <DetailField
                    label="Member since"
                    value={new Date(selectedUser.member_since ?? selectedUser.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  />
                )}
                {selectedUser.approved_at ? (
                  <DetailField
                    label="Approved on"
                    value={new Date(selectedUser.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  />
                ) : null}
                {approverName ? (
                  <DetailField label="Approved by" value={approverName} />
                ) : null}
              </DetailSection>

              {/* Actions */}
              {selectedUser.role === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#d1fae5', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
                    onPress={() => {
                      const u = selectedUser
                      Alert.alert('Approve this member?', `${u.first_name} ${u.last_name} will receive a welcome email and get full member access.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Approve', onPress: () => { setSelectedUser(null); updateRole(u.id, 'member') } },
                      ])
                    }}
                  >
                    <Text style={{ fontSize: 15, color: '#065f46', fontWeight: '700' }}>✅  Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#fee2e2', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
                    onPress={() => {
                      const u = selectedUser
                      Alert.alert('Reject this applicant?', `${u.first_name} ${u.last_name} will receive a polite rejection email.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reject', style: 'destructive', onPress: () => { setSelectedUser(null); updateRole(u.id, 'visitor') } },
                      ])
                    }}
                  >
                    <Text style={{ fontSize: 15, color: '#991b1b', fontWeight: '700' }}>✕  Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : (() => {
                const u = selectedUser
                const canAct = u.id !== currentUser?.id && u.role !== 'superadmin'
                const hasAnyAction = (isSuperadmin && (u.role === 'member' || u.role === 'admin')) || canAct
                if (!hasAnyAction) return null
                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
                    {u.role === 'member' && isSuperadmin && (
                      <TouchableOpacity
                        style={{ flex: 1, minWidth: 140, backgroundColor: '#2d1b69', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                        onPress={() => Alert.alert('Promote to Admin?', `${u.first_name} ${u.last_name} will be promoted to admin and will receive a notification email.`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Promote', onPress: () => { setSelectedUser(null); updateRole(u.id, 'admin') } },
                        ])}
                      >
                        <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>⬆️  Promote to Admin</Text>
                      </TouchableOpacity>
                    )}
                    {u.role === 'admin' && isSuperadmin && (
                      <TouchableOpacity
                        style={{ flex: 1, minWidth: 140, backgroundColor: '#2d1b69', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                        onPress={() => Alert.alert('Demote to Member?', `${u.first_name} ${u.last_name} will lose admin access and will receive a notification email.`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Demote', onPress: () => { setSelectedUser(null); updateRole(u.id, 'member') } },
                        ])}
                      >
                        <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>⬇️  Demote to Member</Text>
                      </TouchableOpacity>
                    )}
                    {canAct && (
                      <TouchableOpacity
                        style={{ flex: 1, minWidth: 140, backgroundColor: u.is_active ? '#fee2e2' : '#2d1b69', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                        onPress={() => {
                          const action = u.is_active ? 'Deactivate' : 'Reactivate'
                          Alert.alert(`${action} account?`, `${u.first_name} ${u.last_name}`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: action, style: u.is_active ? 'destructive' : 'default', onPress: () => { setSelectedUser(null); updateActive(u.id, !u.is_active) } },
                          ])
                        }}
                      >
                        <Text style={{ fontSize: 14, color: u.is_active ? '#991b1b' : '#fff', fontWeight: '600' }}>
                          {u.is_active ? '🚫  Deactivate' : '✅  Reactivate'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              })()}

            </ScrollView>
          </View>
        )}
      </Modal>
      <AppDialog {...dialog} onClose={hide} />
    </View>
  )
}

// ─── Detail sheet helpers ─────────────────────────────────────────────────────

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4 }}>
        {children}
      </View>
    </View>
  )
}

function DetailField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  if (multiline) {
    return (
      <View style={{ paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.1)' }}>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{label}</Text>
        <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>{value}</Text>
      </View>
    )
  }
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.1)' }}>
      <Text style={{ fontSize: 14, color: '#9ca3af' }}>{label}</Text>
      <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 16 }} numberOfLines={2}>{value}</Text>
    </View>
  )
}
