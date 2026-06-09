// Ported from web FamilyHybridView.tsx — same constants and algorithm

export interface FamilyNode {
  id: string
  parent_id?: string | null
  name: string
  sex: 'male' | 'female' | 'other'
  is_alive: boolean
  married_to?: string | null
  photo_url?: string | null
  dob?: string | null
  dod?: string | null
  description?: string | null
  display_order: number
  tree_level: number
  linked_user_id?: string | null
}

export interface PlacedNode {
  id: string
  x: number
  y: number
  node: FamilyNode
}

// ─── Layout constants (match web exactly) ─────────────────────────────────────
export const NW     = 162
export const NH     = 44
export const H_GAP  = 32
export const V_GAP  = 76
export const V_STEP = 54
export const INDENT = 20
export const THRESH = 3

// ─── Build layout ─────────────────────────────────────────────────────────────
export function buildLayout(nodes: FamilyNode[]): { placed: PlacedNode[]; w: number; h: number } {
  if (!nodes.length) return { placed: [], w: 0, h: 0 }

  const childrenOf = new Map<string | null, FamilyNode[]>()
  for (const n of nodes) {
    const pid = n.parent_id || null
    if (!childrenOf.has(pid)) childrenOf.set(pid, [])
    childrenOf.get(pid)!.push(n)
  }
  for (const arr of childrenOf.values()) arr.sort((a, b) => a.display_order - b.display_order)

  const root = nodes.find(n => !n.parent_id)
  if (!root) return { placed: [], w: 0, h: 0 }

  const maxRelDepth = (nid: string, d: number): number => {
    const ch = childrenOf.get(nid) || []
    return ch.length ? Math.max(...ch.map(c => maxRelDepth(c.id, d + 1))) : d
  }
  const colW = (nid: string) => NW + (maxRelDepth(nid, 0) + 1) * INDENT + H_GAP
  const subtreeW = (nid: string, level: number): number => {
    if (level >= THRESH - 1) return colW(nid)
    const ch = childrenOf.get(nid) || []
    return ch.length ? ch.reduce((s, c) => s + subtreeW(c.id, level + 1), 0) : colW(nid)
  }

  const placed: PlacedNode[] = []

  const placeH = (nid: string, level: number, leftX: number) => {
    const sw = subtreeW(nid, level)
    placed.push({
      id: nid,
      x: leftX + sw / 2 - NW / 2,
      y: level * (NH + V_GAP),
      node: nodes.find(n => n.id === nid)!,
    })
    if (level < THRESH - 1) {
      let cx = leftX
      for (const child of (childrenOf.get(nid) || [])) {
        placeH(child.id, level + 1, cx)
        cx += subtreeW(child.id, level + 1)
      }
    }
  }
  placeH(root.id, 0, 0)

  const placeV = (parentId: string, baseX: number, relDepth: number, ctr: { y: number }) => {
    for (const child of (childrenOf.get(parentId) || [])) {
      placed.push({ id: child.id, x: baseX + relDepth * INDENT, y: ctr.y, node: child })
      ctr.y += V_STEP
      placeV(child.id, baseX, relDepth + 1, ctr)
    }
  }
  const processV = (nid: string, level: number) => {
    if (level === THRESH - 1) {
      const p = placed.find(pp => pp.id === nid)
      if (p) {
        const ctr = { y: p.y + NH + Math.round(V_GAP * 0.55) }
        placeV(nid, p.x, 1, ctr)
      }
      return
    }
    for (const child of (childrenOf.get(nid) || [])) processV(child.id, level + 1)
  }
  processV(root.id, 0)

  let w = 0, h = 0
  for (const p of placed) { w = Math.max(w, p.x + NW); h = Math.max(h, p.y + NH) }
  return { placed, w: w + 40, h: h + 60 }
}

// ─── Connector path (SVG d attribute) ─────────────────────────────────────────
export function connPath(parent: PlacedNode, child: PlacedNode): string {
  if (parent.node.tree_level < THRESH - 1) {
    const px = parent.x + NW / 2, py = parent.y + NH
    const cx = child.x + NW / 2,  cy = child.y
    const my = py + V_GAP / 3
    return `M ${px} ${py} L ${px} ${my} L ${cx} ${my} L ${cx} ${cy}`
  }
  const gx = parent.x + 9, py = parent.y + NH
  const cy = child.y + NH / 2,    cx = child.x
  return `M ${gx} ${py} L ${gx} ${cy} L ${cx} ${cy}`
}

// ─── Ancestor chain ────────────────────────────────────────────────────────────
export function getAncestors(nodeId: string, allNodes: FamilyNode[]): FamilyNode[] {
  const path: FamilyNode[] = []
  let cur = allNodes.find(n => n.id === nodeId)
  while (cur) {
    path.unshift(cur)
    if (!cur.parent_id) break
    cur = allNodes.find(n => n.id === cur!.parent_id)
  }
  return path
}

// ─── Relationship engine ───────────────────────────────────────────────────────
function ancestorPath(nodeId: string, allNodes: FamilyNode[]): string[] {
  const path: string[] = []
  let cur = allNodes.find(n => n.id === nodeId)
  while (cur) {
    path.push(cur.id)
    if (!cur.parent_id) break
    cur = allNodes.find(n => n.id === cur!.parent_id)
  }
  return path
}

export function computeRelationTerm(nodeA: FamilyNode, nodeB: FamilyNode, allNodes: FamilyNode[]): string {
  if (nodeA.id === nodeB.id) return 'the same person'
  const pathA = ancestorPath(nodeA.id, allNodes)
  const pathB = ancestorPath(nodeB.id, allNodes)
  const setA = new Set(pathA)
  let lcaId: string | null = null
  let genB = 0
  for (const id of pathB) {
    if (setA.has(id)) { lcaId = id; break }
    genB++
  }
  if (!lcaId) return 'not related'
  const genA = pathA.indexOf(lcaId)
  const f = nodeA.sex === 'female'
  const bParentId = pathB[1] || null
  const bParent = bParentId ? allNodes.find(n => n.id === bParentId) : null
  const side = bParent?.sex === 'female' ? 'maternal' : 'paternal'

  if (genA === 0 && genB === 0) return 'the same person'
  if (genA === 0) {
    if (genB === 1) return f ? 'mother' : 'father'
    if (genB === 2) return f ? `${side} grandmother` : `${side} grandfather`
    if (genB === 3) return f ? 'great-grandmother' : 'great-grandfather'
    return f ? `${genB - 2}× great-grandmother` : `${genB - 2}× great-grandfather`
  }
  if (genB === 0) {
    if (genA === 1) return f ? 'daughter' : 'son'
    if (genA === 2) return f ? 'granddaughter' : 'grandson'
    if (genA === 3) return f ? 'great-granddaughter' : 'great-grandson'
    return f ? `${genA - 2}× great-granddaughter` : `${genA - 2}× great-grandson`
  }
  if (genA === 1 && genB === 1) return f ? 'sister' : 'brother'
  if (genA === 1 && genB === 2) return f ? 'aunt' : 'uncle'
  if (genA === 1 && genB === 3) return f ? 'great-aunt' : 'great-uncle'
  if (genA === 1 && genB >= 4) return f ? `${genB - 2}× great-aunt` : `${genB - 2}× great-uncle`
  if (genA === 2 && genB === 1) return f ? 'niece' : 'nephew'
  if (genA === 3 && genB === 1) return f ? 'great-niece' : 'great-nephew'
  if (genA >= 4 && genB === 1) return f ? `${genA - 2}× great-niece` : `${genA - 2}× great-nephew`
  if (genA >= 2 && genB >= 2) {
    const degree = Math.min(genA, genB) - 1
    const removal = Math.abs(genA - genB)
    const ordinals = ['', 'first', 'second', 'third', 'fourth', 'fifth']
    const ord = degree < ordinals.length ? ordinals[degree] : `${degree}th`
    return removal === 0 ? `${ord} cousin` : `${ord} cousin ${removal}× removed`
  }
  return 'distant relative'
}

// ─── Level colours ─────────────────────────────────────────────────────────────
export const LEVEL_COLORS = [
  '#334155', '#D97706', '#059669', '#2563EB',
  '#7C3AED', '#DB2777', '#0284C7', '#4B5563',
]
export function levelColor(level: number): string {
  return LEVEL_COLORS[level % LEVEL_COLORS.length]
}
