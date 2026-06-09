import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { DEFAULT_NODES } from '@/lib/ancestral-lineage-defaults'
import type { AncestorNode } from '@/lib/types'

// ─── Theme helpers ────────────────────────────────────────────────────────────

type NodeTheme = {
  bg: string; border: string; strip: string
  label: string; year: string; gender: string
}

const MALE_THEMES: Record<number, NodeTheme> = {
  10: { bg: '#f5f3ff', border: '#ddd6fe', strip: '#a78bfa', label: '#7c3aed', year: '#6d28d9', gender: '#8b5cf6' },
  9:  { bg: '#eef2ff', border: '#c7d2fe', strip: '#818cf8', label: '#4338ca', year: '#3730a3', gender: '#4f46e5' },
  8:  { bg: '#f8fafc', border: '#e2e8f0', strip: '#94a3b8', label: '#64748b', year: '#475569', gender: '#64748b' },
  7:  { bg: '#f0fdfa', border: '#99f6e4', strip: '#2dd4bf', label: '#0d9488', year: '#0f766e', gender: '#0d9488' },
  6:  { bg: '#f0f9ff', border: '#bae6fd', strip: '#38bdf8', label: '#0284c7', year: '#0369a1', gender: '#0284c7' },
  5:  { bg: '#fffbeb', border: '#fde68a', strip: '#fbbf24', label: '#d97706', year: '#b45309', gender: '#d97706' },
  2:  { bg: '#eff6ff', border: '#bfdbfe', strip: '#60a5fa', label: '#2563eb', year: '#1d4ed8', gender: '#2563eb' },
  1:  { bg: '#f0fdf4', border: '#bbf7d0', strip: '#34d399', label: '#059669', year: '#047857', gender: '#059669' },
}
const FEMALE_THEME: NodeTheme = {
  bg: '#fff1f2', border: '#fecdd3', strip: '#fb7185', label: '#e11d48', year: '#be123c', gender: '#e11d48',
}
const DEFAULT_THEME: NodeTheme = {
  bg: '#f9fafb', border: '#e5e7eb', strip: '#9ca3af', label: '#6b7280', year: '#4b5563', gender: '#6b7280',
}

function getTheme(position: number, gender: string): NodeTheme {
  if (gender === 'female') return FEMALE_THEME
  return MALE_THEMES[position] ?? DEFAULT_THEME
}

function getEraLabel(year: number) {
  const century = Math.floor(year / 100) + 1
  const last = century % 100
  const suffix = last >= 11 && last <= 13 ? 'th' : last % 10 === 1 ? 'st' : last % 10 === 2 ? 'nd' : last % 10 === 3 ? 'rd' : 'th'
  return `${century}${suffix} century`
}

function getRelationshipLabel(position: number, gender: string) {
  const f = gender === 'female'
  switch (position) {
    case 1:  return 'Foundation'
    case 2:  return f ? 'Mother'               : 'Father'
    case 3:  return f ? 'Grandmother'          : 'Grandfather'
    case 4:  return f ? 'Great-grandmother'    : 'Great-grandfather'
    case 5:  return f ? '2× Great-grandmother' : '2× Great-grandfather'
    case 6:  return f ? '3× Great-grandmother' : '3× Great-grandfather'
    case 7:  return f ? '4× Great-grandmother' : '4× Great-grandfather'
    case 8:  return f ? '5× Great-grandmother' : '5× Great-grandfather'
    case 9:  return f ? '6× Great-grandmother' : '6× Great-grandfather'
    case 10: return 'Progenitor'
    default: return `${position - 1}th Ancestor`
  }
}

function formatTitle(title?: string): string {
  if (!title) return ''
  return title.replace(/^W /, '♥ ').replace(/ W /g, ' ♥ ')
}

// ─── Cards view ───────────────────────────────────────────────────────────────

function CardsView({ nodes }: { nodes: AncestorNode[] }) {
  return (
    <View className="px-4 py-4">
      {nodes.map((node, i) => {
        const theme   = getTheme(node.position, node.gender)
        const isTop   = node.position === 10
        const title   = formatTitle(node.title)

        return (
          <View key={node.position}>
            <View style={{ backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1, borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: theme.strip }} />
              <View className="pl-5 pr-4 py-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text style={{ color: theme.label, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {isTop ? '⚑ Progenitor' : node.position === 1 ? '⬡ Foundation' : getRelationshipLabel(node.position, node.gender)}
                  </Text>
                  <Text style={{ color: theme.year, fontSize: 12, fontWeight: '600' }}>
                    c. {node.bornApprox}
                  </Text>
                </View>
                <Text className="text-base font-bold text-gray-900 leading-tight">{node.name}</Text>
                {title ? <Text className="text-gray-500 text-xs mt-0.5">{title}</Text> : null}
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Text style={{ color: theme.gender, fontSize: 12, fontWeight: '500' }}>
                    {node.gender === 'female' ? '♀ Female' : '♂ Male'}
                  </Text>
                  <View className="w-1 h-1 rounded-full bg-gray-300" />
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>{getEraLabel(node.bornApprox)}</Text>
                </View>
              </View>
            </View>

            {i < nodes.length - 1 && (
              <View className="items-center py-0.5">
                <View className="w-px h-3 bg-gray-300" />
              </View>
            )}
          </View>
        )
      })}

      <Text className="text-center text-xs text-gray-400 mt-5">
        Birth years are approximate (~30-year generation span).
      </Text>
    </View>
  )
}

// ─── Timeline view ────────────────────────────────────────────────────────────

function TimelineView({ nodes }: { nodes: AncestorNode[] }) {
  return (
    <View className="px-4 py-4">
      <View className="relative">
        {/* Centre line */}
        <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: '#e5e7eb', marginLeft: -0.5 }} />

        <View style={{ gap: 8 }}>
          {nodes.map((node, i) => {
            const theme  = getTheme(node.position, node.gender)
            const isLeft = i % 2 === 0
            const title  = formatTitle(node.title)
            const isTop  = node.position === 10

            const card = (
              <View style={{ backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1, borderRadius: 10, padding: 8, flex: 1 }}>
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text style={{ color: theme.label, fontSize: 8, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', flex: 1 }}>
                    {isTop ? '⚑ Progenitor' : node.position === 1 ? '⬡ Foundation' : getRelationshipLabel(node.position, node.gender)}
                  </Text>
                  <Text style={{ color: theme.year, fontSize: 9, fontWeight: '600' }}>c. {node.bornApprox}</Text>
                </View>
                <Text style={{ color: node.gender === 'female' ? '#db2777' : '#1d4ed8', fontSize: 11, fontWeight: '700', lineHeight: 14 }}>
                  {node.name}
                </Text>
                {title ? <Text style={{ color: '#9ca3af', fontSize: 8, marginTop: 1 }} numberOfLines={1}>{title}</Text> : null}
              </View>
            )

            return (
              <View key={node.position} className="flex-row items-center">
                {/* Left side */}
                <View className="flex-1 flex-row justify-end items-center">
                  {isLeft ? (
                    <>
                      {card}
                      <View style={{ width: 16, height: 1, backgroundColor: '#d1d5db', flexShrink: 0 }} />
                    </>
                  ) : (
                    <Text style={{ color: theme.label, fontSize: 8, fontWeight: '500', paddingRight: 8 }}>
                      {getEraLabel(node.bornApprox)}
                    </Text>
                  )}
                </View>

                {/* Centre dot */}
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.strip, borderWidth: 2, borderColor: '#fff', flexShrink: 0, zIndex: 1 }} />

                {/* Right side */}
                <View className="flex-1 flex-row justify-start items-center">
                  {!isLeft ? (
                    <>
                      <View style={{ width: 16, height: 1, backgroundColor: '#d1d5db', flexShrink: 0 }} />
                      {card}
                    </>
                  ) : (
                    <Text style={{ color: theme.label, fontSize: 8, fontWeight: '500', paddingLeft: 8 }}>
                      {getEraLabel(node.bornApprox)}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </View>

      <Text className="text-center text-xs text-gray-400 mt-4">
        Birth years are approximate (~30-year generation span).
      </Text>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AncestralLineageScreen() {
  const [tab, setTab] = useState<'cards' | 'timeline'>('cards')
  const [nodes, setNodes] = useState<AncestorNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('site_content')
        .select('content')
        .eq('section', 'extended_family_tree')
        .single()

      let resolved = DEFAULT_NODES
      if (data?.content) {
        try {
          const parsed = JSON.parse(data.content)
          if (Array.isArray(parsed.nodes) && parsed.nodes.length === 10) resolved = parsed.nodes
        } catch { /* use defaults */ }
      }

      // Display oldest (position 10) at top → youngest (position 1) at bottom
      setNodes([...resolved].sort((a, b) => b.position - a.position))
      setLoading(false)
    }
    load()
  }, [])

  const sorted    = nodes
  const spanYears = sorted.length === 10
    ? (sorted[sorted.length - 1]?.bornApprox ?? 1830) - (sorted[0]?.bornApprox ?? 1560)
    : 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f2f7' }}>

      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-6 pt-5 pb-4">
        <Text className="text-xs text-gray-400 uppercase tracking-widest mb-1 text-center font-medium">
          Community · Ancestry
        </Text>
        <Text className="text-2xl font-bold text-gray-900 text-center tracking-tight mb-1">
          Ancestral Lineage
        </Text>
        <Text className="text-xs text-gray-500 text-center leading-relaxed" numberOfLines={2}>
          Tracing the direct ancestral line of the Bazidpur family across ten generations.
        </Text>
        {!loading && sorted.length > 0 && (
          <View className="flex-row justify-center gap-4 mt-2">
            <Text className="text-xs text-gray-400">
              c. {sorted[0]?.bornApprox} – {sorted[sorted.length - 1]?.bornApprox}
            </Text>
            <Text className="text-xs text-gray-300">|</Text>
            <Text className="text-xs text-gray-400">10 generations</Text>
            <Text className="text-xs text-gray-300">|</Text>
            <Text className="text-xs text-gray-400">~{spanYears} years</Text>
          </View>
        )}
      </View>

      {/* Tab switcher */}
      <View className="bg-white border-b border-gray-100 px-4">
        <View className="flex-row">
          {(['cards', 'timeline'] as const).map(t => (
            <TouchableOpacity
              key={t}
              className="flex-row items-center gap-1.5 px-5 py-2.5"
              style={{ borderBottomWidth: 2, borderBottomColor: tab === t ? '#111827' : 'transparent' }}
              onPress={() => setTab(t)}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: tab === t ? '#111827' : '#9ca3af' }}>
                {t === 'cards' ? '☰  Cards' : '◎  Timeline'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2d1b69" />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 90 }}>
          {tab === 'cards'
            ? <CardsView nodes={sorted} />
            : <TimelineView nodes={sorted} />
          }
        </ScrollView>
      )}

    </SafeAreaView>
  )
}
