import { T } from '@/financeiro/lib/tokens'
import { mil } from '@/financeiro/lib/format'
import type { Channel } from '@/financeiro/data/types'

type Props = { channels: Channel[]; height?: number }

export function DivergingBars({ channels, height = 220 }: Props) {
  const W = 520
  const H = height
  const padT = 8
  const padB = 14
  const labW = 138
  const padL = 12
  const padR = 16
  const plotW = W - padL - labW - padR
  const zero = padL + labW + plotW * 0.32
  const maxPos = Math.max(...channels.map((c) => c.cm2), 1) * 1.05
  const maxNeg = Math.min(...channels.map((c) => c.cm2), -1) * 1.4
  const xPx = (v: number) => (v >= 0 ? zero + (v / maxPos) * (W - padR - zero) : zero + (v / maxNeg) * (zero - (padL + labW)))
  const rowH = (H - padT - padB) / channels.length
  const bh = Math.min(26, rowH * 0.5)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="CM2 por canal (split ilustrativo)">
      <line x1={zero} x2={zero} y1={padT - 2} y2={H - padB} stroke={T.grid} strokeWidth={1} opacity={0.6} />
      <text x={zero} y={H - 1} textAnchor="middle" fontFamily="Montserrat" fontSize={9} fill={T.muted}>0</text>
      {channels.map((c, i) => {
        const cy = padT + rowH * i + rowH / 2
        const x2 = xPx(c.cm2)
        const x = Math.min(zero, x2)
        const w = Math.abs(x2 - zero)
        const col = c.cm2 >= 0 ? T.ok : T.crit
        const fill = c.cm2 >= 0 ? T.okA(0.85) : T.critA(0.85)
        return (
          <g key={c.name}>
            <text x={padL} y={cy + 4} fontFamily="Montserrat" fontSize={12} fill={T.text} fontWeight={500}>{c.name}</text>
            <rect x={x} y={cy - bh / 2} width={Math.max(2, w)} height={bh} rx={5} fill={fill} />
            <text x={c.cm2 >= 0 ? x2 + 8 : x2 - 8} y={cy + 4} textAnchor={c.cm2 >= 0 ? 'start' : 'end'} fontFamily="Montserrat" fontSize={12} fontWeight={600} fill={col} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(c.cm2 >= 0 ? '+' : '−') + 'R$ ' + mil(Math.abs(c.cm2), 1) + ' mil'}
            </text>
            {c.kill && (
              <g transform={`translate(${x2 - 96},${cy - bh / 2 - 3})`}>
                <rect x={0} y={0} width={88} height={18} rx={9} fill={T.critA(0.13)} stroke={T.critA(0.45)} strokeWidth={1} />
                <text x={44} y={12.5} textAnchor="middle" fontFamily="Montserrat" fontSize={9.5} fontWeight={700} fill={T.crit} letterSpacing="0.04em">KILL · CM2&lt;0</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
