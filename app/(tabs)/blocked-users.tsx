import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { Stack } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { PurpleHeader } from '@/components/PurpleHeader'

interface BlockedRow {
  id: string
  blocked_id: string
  created_at: string
  blocked: { first_name: string | null; last_name: string | null } | null
}

export default function BlockedUsersScreen() {
  const { session } = useAuth()
  const [rows, setRows] = useState<BlockedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id, blocked_id, created_at, blocked:blocked_id(first_name, last_name)')
      .eq('blocker_id', session.user.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[blocked-users] load error', error.message)
      setRows([])
      return
    }
    setRows((data ?? []) as unknown as BlockedRow[])
  }, [session])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  async function unblock(row: BlockedRow) {
    const name = `${row.blocked?.first_name ?? ''} ${row.blocked?.last_name ?? ''}`.trim() || 'this user'
    Alert.alert(`Unblock ${name}?`, `You'll start seeing their content again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock', onPress: async () => {
          const { error } = await supabase.from('user_blocks').delete().eq('id', row.id)
          if (error) { Alert.alert('Could not unblock', error.message); return }
          setRows(prev => prev.filter(r => r.id !== row.id))
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <PurpleHeader title="Blocked Members" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <PurpleHeader title="Blocked Members" showBack />

      {rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>🛡️</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 }}>No blocked members</Text>
          <Text style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center', lineHeight: 18 }}>
            Anyone you block from the community will appear here. You can unblock them at any time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d1b69" />}
          renderItem={({ item }) => {
            const name = `${item.blocked?.first_name ?? ''} ${item.blocked?.last_name ?? ''}`.trim() || 'Unknown member'
            return (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e' }}>{name}</Text>
                  <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>
                    Blocked on {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => unblock(item)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#2d1b69' }}>Unblock</Text>
                </TouchableOpacity>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}
