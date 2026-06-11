import { useRef } from 'react'
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'

export function RoleBadge({ role, size = 17 }: { role: string; size?: number }) {
  if (role === 'member')     return <MemberBadge size={size} />
  if (role === 'admin')      return <AdminBadge size={size} />
  if (role === 'superadmin') return <SuperadminBadge size={size} />
  return null
}

let _id = 0
function uid() { return `rbg-${++_id}` }

const SHIELD = 'M10,1 C6,1 3,3 3,6 L3,13 Q3,18 10,20.5 Q17,18 17,13 L17,6 C17,3 14,1 10,1Z'
const STAR_L  = 'M10,5.5 L11.23,8.80 L14.76,8.96 L12.00,11.15 L12.94,14.55 L10,12.6 L7.06,14.55 L8.00,11.15 L5.24,8.96 L8.77,8.80Z'
const STAR_S  = 'M10,6.5 L11.06,9.04 L13.80,9.26 L11.71,11.06 L12.35,13.74 L10,12.3 L7.65,13.74 L8.29,11.06 L6.20,9.26 L8.94,9.04Z'

function MemberBadge({ size }: { size: number }) {
  const id = useRef(uid()).current
  return (
    <Svg width={size} height={size} viewBox="0 0 20 21">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"    stopColor="#bfdbfe" />
          <Stop offset="0.42" stopColor="#2563eb" />
          <Stop offset="1"    stopColor="#1e3a8a" />
        </LinearGradient>
      </Defs>
      <Path d={SHIELD} fill="white" />
      <Path d={SHIELD} fill={`url(#${id})`} />
      <Path d={STAR_L} fill="white" />
    </Svg>
  )
}

function AdminBadge({ size }: { size: number }) {
  const id = useRef(uid()).current
  return (
    <Svg width={size} height={size} viewBox="0 0 20 21">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor="#fef3c7" />
          <Stop offset="0.4" stopColor="#f59e0b" />
          <Stop offset="1"   stopColor="#92400e" />
        </LinearGradient>
      </Defs>
      <Path d={SHIELD} fill="white" />
      <Path d={SHIELD} fill={`url(#${id})`} />
      <Circle cx="10" cy="11" r="5.3" fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={0.85} />
      <Path d={STAR_S} fill="white" />
    </Svg>
  )
}

function SuperadminBadge({ size }: { size: number }) {
  const id = useRef(uid()).current
  return (
    <Svg width={size} height={size} viewBox="0 0 20 21">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor="#fecaca" />
          <Stop offset="0.4" stopColor="#dc2626" />
          <Stop offset="1"   stopColor="#7f1d1d" />
        </LinearGradient>
      </Defs>
      <Path d={SHIELD} fill="white" />
      <Path d={SHIELD} fill={`url(#${id})`} />
      <Circle cx="10" cy="11" r="5.3" fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={0.85} />
      <Path d={STAR_S} fill="white" />
    </Svg>
  )
}
