import { T } from '@/financeiro/lib/tokens'
import { mil, brlCompact } from '@/financeiro/lib/format'
import type { CashPoint, CashEvent } from '@/financeiro/data/types'

type Props = { points: CashPoint[]; events: CashEvent[]; max?: number; height?: number }

// Projeção de caixa 90d (ILUSTRATIVO) com banda P10–P90. Reskin sóbrio.
export function CashProjection({ points, events, max = 145_000, height = 320 }: Props) {
  const W = 520
  const H = height
  const padT = 16
  const padB = 46
  const padL = 36
  const padR = 12
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const last = points[points.length - 1]
  const xPx = (t: number) => padL + (plotW * t) / 90
  const yPx = (v: number) => padT + (plotH * (max - v)) / max
  const linePath = 'M' + points.map((p) => `${xPx(p.day).toFixed(1)} ${yPx(p.base).toFixed(1)}`).join(' L ')
  const band =
    'M' + points.map((p) => `${xPx(p.day).toFixed(1)} ${yPx(p.p90).toFixed(1)}`).join(' L ') +
    ' L ' + [...points].reverse().map((p) => `${xPx(p.day).toFixed(1)} ${yPx(p.p10).toFixed(1)}`).join(' L ') + ' Z'
  const ticks = [0, Math.round(max / 3), Math.round((2 * max) / 3), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Projeção de caixa 90 dias (ilustrativo)">
      {ticks.map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={yPx(g)} y2={yPx(g)} stroke={T.grid} strokeWidth={1} opacity={g === 0 ? 0.6 : 0.5} />
          <text x={padL - 7} y={yPx(g) + 3} textAnchor="end" fontFamily="Montserrat" fontSize={9.5} fill={T.muted}>{mil(g, 0)}</text>
        </g>
      ))}
      <path d={band} fill={T.goldA(0.13)} />
      <path d={'M' + points.map((p) => `${xPx(p.day).toFixed(1)} ${yPx(p.p90).toFixed(1)}`).join(' L ')} fill="none" stroke={T.goldA(0.3)} strokeWidth={1} strokeDasharray="3 3" />
      <path d={linePath} fill="none" stroke={T.gold} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={xPx(0)} cy={yPx(points[0].base)} r={3} fill={T.gold} />
      <circle cx={xPx(90)} cy={yPx(last.base)} r={3.5} fill={T.gold} stroke="hsl(var(--card))" strokeWidth={1} />
      <text x={xPx(90) - 4} y={yPx(last.base) - 9} textAnchor="end" fontFamily="Montserrat" fontSize={11} fontWeight={600} fill={T.gold} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {brlCompact(last.base)}
      </text>
      {events.map((e) => {
        const x = xPx(e.day)
        const yb = yPx(0)
        const col = e.type === 'in' ? T.ok : T.crit
        const tri = e.type === 'in' ? `${x - 3},${yb + 5} ${x + 3},${yb + 5} ${x},${yb}` : `${x - 3},${yb} ${x + 3},${yb} ${x},${yb + 5}`
        return (
          <g key={e.day}>
            <line x1={x} x2={x} y1={yb} y2={yb + 5} stroke={col} strokeWidth={1.4} />
            <polygon points={tri} fill={col} />
            <text x={x} y={yb + 17} textAnchor="middle" fontFamily="Montserrat" fontSize={8.5} fill={T.text2}>d{e.day}</text>
          </g>
        )
      })}
      {[0, 30, 60, 90].map((t) => (
        <text key={t} x={xPx(t)} y={H - 26} textAnchor={t === 0 ? 'start' : t === 90 ? 'end' : 'middle'} fontFamily="Montserrat" fontSize={9.5} fill={T.text2}>
          {t === 0 ? 'hoje' : '+' + t + 'd'}
        </text>
      ))}
    </svg>
  )
}
