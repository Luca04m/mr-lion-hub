import { useState } from 'react'
import { T } from '@/financeiro/lib/tokens'
import { brlCompact, mil } from '@/financeiro/lib/format'

type M = { month: string; total: number; lucro: number }
type Props = { months: M[]; height?: number; activeMonth?: string }

// Barras mensais com tooltip sóbrio. Mês com prejuízo = barra vermelha dessaturada.
export function MonthlyBars({ months, height = 240, activeMonth }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = height
  const padT = 22
  const padB = 30
  const padL = 30
  const padR = 8
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const max = Math.max(...months.map((m) => m.total)) * 1.12
  const slot = plotW / months.length
  const bw = Math.min(34, slot * 0.56)
  const yPx = (v: number) => padT + (plotH * (max - v)) / max
  const ticks = [0, Math.round(max / 2), Math.round(max)]
  const activeIdx = activeMonth ? months.findIndex((m) => m.month === activeMonth) : months.length - 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Receita mensal">
      {ticks.map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={yPx(g)} y2={yPx(g)} stroke={T.grid} strokeWidth={1} opacity={g === 0 ? 0.5 : 0.5} />
          <text x={padL - 6} y={yPx(g) + 3} textAnchor="end" fontFamily="Montserrat" fontSize={9} fill={T.muted}>{mil(g, 0)}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const cx = padL + slot * i + slot / 2
        const x = cx - bw / 2
        const y = yPx(m.total)
        const h = yPx(0) - y
        const isActive = i === activeIdx
        const loss = m.lucro < 0
        const active = hover === i || (hover === null && isActive)
        return (
          <g key={m.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
            <rect x={cx - slot / 2} y={padT} width={slot} height={plotH} fill="transparent" />
            <rect x={x} y={y} width={bw} height={Math.max(2, h)} rx={5}
              fill={loss ? T.critA(0.55) : active ? T.gold : T.goldA(0.42)} />
            {active && (
              <text x={cx} y={y - 7} textAnchor="middle" fontFamily="Montserrat" fontSize={10.5} fontWeight={600} fill={loss ? T.crit : T.gold} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {brlCompact(m.total)}
              </text>
            )}
            <text x={cx} y={H - 16} textAnchor="middle" fontFamily="Montserrat" fontSize={9} fill={active ? T.text2 : T.muted}>{m.month}</text>
          </g>
        )
      })}
    </svg>
  )
}
