import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { PurpleHeader } from '@/components/PurpleHeader'

interface Member {
  id: string
  location_lat: number
  location_lng: number
  location_city?: string
  location_state?: string
  location_country?: string
}

export default function ScatteredRootsScreen() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    supabase
      .from('users')
      .select('id, location_lat, location_lng, location_city, location_state, location_country')
      .in('role', ['member', 'admin', 'superadmin'])
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .then(({ data }) => {
        setMembers((data ?? []) as Member[])
        setLoading(false)
      })
  }, [])

  const countryCounts = members.reduce<Record<string, number>>((acc, m) => {
    if (m.location_country) acc[m.location_country] = (acc[m.location_country] || 0) + 1
    return acc
  }, {})

  const countries = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)

  const mapHeight = Math.round(width * 0.65)

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      <PurpleHeader title="Scattered Roots" showBack />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2d1b69" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stat bar */}
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', marginTop: 16, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e5e5ea' }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 0.5, borderRightColor: '#e5e5ea' }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#2d1b69' }}>{members.length}</Text>
              <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>Members located</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#2d1b69' }}>{countries.length}</Text>
              <Text style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>{countries.length === 1 ? 'Country' : 'Countries'}</Text>
            </View>
          </View>

          {/* Map */}
          <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e5e5ea' }}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={{ width: '100%', height: mapHeight }}
              initialRegion={{
                latitude: 25,
                longitude: 20,
                latitudeDelta: 130,
                longitudeDelta: 200,
              }}
              mapType="standard"
              scrollEnabled
              zoomEnabled
              rotateEnabled={false}
              pitchEnabled={false}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={false}
              showsScale={false}
              toolbarEnabled={false}
            >
              {members.map(m => (
                <Marker
                  key={m.id}
                  coordinate={{ latitude: m.location_lat, longitude: m.location_lng }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <View style={{
                    width: 12, height: 12, borderRadius: 6,
                    backgroundColor: '#dc2626',
                    borderWidth: 2, borderColor: '#fff',
                    shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2,
                  }} />
                </Marker>
              ))}
            </MapView>
          </View>

          {/* Countries */}
          {countries.length > 0 && (
            <View style={{ marginTop: 12, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#e5e5ea' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#8e8e93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Countries
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {countries.map(([country, count]) => (
                  <View key={country} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 12, paddingVertical: 7,
                    backgroundColor: '#f4f0ff', borderRadius: 20,
                    borderWidth: 0.5, borderColor: '#ddd6fe',
                  }}>
                    <Text style={{ fontSize: 13, color: '#2d1b69', fontWeight: '600' }}>{country}</Text>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Empty */}
          {members.length === 0 && (
            <View style={{ margin: 16, padding: 32, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5ea', borderStyle: 'dashed' }}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>🌍</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 6 }}>No locations yet</Text>
              <Text style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center', lineHeight: 18 }}>
                Members need to set their location in their profile to appear on the map.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
