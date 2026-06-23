import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions, Platform } from 'react-native'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import { WebView } from 'react-native-webview'
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

function buildLeafletHtml(members: Member[]): string {
  const markers = JSON.stringify(members.map(m => [m.location_lat, m.location_lng]))
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}
.dot{width:12px;height:12px;background:#dc2626;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4)}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([28,20],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
var icon=L.divIcon({className:'',html:'<div class="dot"></div>',iconSize:[12,12],iconAnchor:[6,6]});
${markers}.forEach(function(c){L.marker(c,{icon:icon}).addTo(map);});
</script></body></html>`
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

  const countries = [...new Set(members.map(m => m.location_country).filter(Boolean) as string[])].sort()

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
          {/* Country count */}
          {countries.length > 0 && (
            <View style={{ marginTop: 16, marginHorizontal: 16 }}>
              <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center' }}>
                Scattered across{' '}
                <Text style={{ fontWeight: '800', color: '#1c1c1e' }}>{countries.length} {countries.length === 1 ? 'country' : 'countries'}</Text>
              </Text>
            </View>
          )}

          {/* Map */}
          <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e5e5ea' }}>
            {Platform.OS === 'android' ? (
              <WebView
                source={{ html: buildLeafletHtml(members), baseUrl: 'https://bazidpur.com' }}
                style={{ width: '100%', height: mapHeight }}
                scrollEnabled={false}
                originWhitelist={['*']}
              />
            ) : (
              <MapView
                provider={PROVIDER_DEFAULT}
                style={{ width: '100%', height: mapHeight }}
                initialRegion={{ latitude: 28, longitude: 72, latitudeDelta: 45, longitudeDelta: 55 }}
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
            )}
          </View>

          {/* Countries */}
          {countries.length > 0 && (
            <View style={{ marginTop: 12, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#e5e5ea' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#8e8e93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Countries
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {countries.map(country => (
                  <View key={country} style={{
                    paddingHorizontal: 12, paddingVertical: 7,
                    backgroundColor: '#f4f0ff', borderRadius: 20,
                    borderWidth: 0.5, borderColor: '#ddd6fe',
                  }}>
                    <Text style={{ fontSize: 13, color: '#2d1b69', fontWeight: '600' }}>{country}</Text>
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
