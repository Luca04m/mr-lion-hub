import { T } from '@/financeiro/lib/tokens'

type Props = { pct: number; centerTop: string; centerSub?: string; size?: number }

// Gauge radial — arco 270°, traço dourado sóbrio (sem glow).
export function RadialGauge({ pct, centerTop, centerSub, size = 168 }: Props) {
  const r = size / 2 - 14
  const cx = size / 2
  const cy = size / 2
  const start = 135 // graus
  const sweep = 270
  const clamped = Math.max(0, Math.min(100, pct))
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const
  }
  const arc = (fromDeg: number, toDeg: number) => {
    const [x1, y1] = toXY(fromDeg)
    const [x2, y2] = toXY(toDeg)
    const large = toDeg - fromDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  const valDeg = start + (sweep * clamped) / 100
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <path d={arc(start, start + sweep)} fill="none" stroke={T.goldA(0.14)} strokeWidth="11" strokeLinecap="round" />
      <path d={arc(start, valDeg)} fill="none" stroke={T.gold} strokeWidth="11" strokeLinecap="round" />
      <circle cx={toXY(valDeg)[0]} cy={toXY(valDeg)[1]} r="4.5" fill={T.gold} />
      <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="Montserrat" fontSize="30" fontWeight="600" fill={T.text} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {centerTop}
      </text>
      {centerSub && (
        <text x={cx} y={cy + 20} textAnchor="middle" fontFamily="Montserrat" fontSize="11.5" fill={T.text2}>
          {centerSub}
        </text>
      )}
    </svg>
  )
}
