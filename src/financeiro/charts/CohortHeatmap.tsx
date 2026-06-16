import { T } from '@/financeiro/lib/tokens'
import type { CohortRow } from '@/financeiro/data/types'

type Props = { cols: string[]; rows: CohortRow[]; height?: number }

export function CohortHeatmap({ cols, rows, height = 250 }: Props) {
  const W = 520
  const H = height
  const padT = 24
  const padL = 58
  const padR = 14
  const padB = 22
  const cw = (W - padL - padR) / cols.length
  const ch = (H - padT - padB) / rows.length
  const pad = 3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Retenção por coorte (ilustrativo)">
      {cols.map((c, j) => (
        <text key={c} x={padL + cw * j + cw / 2} y={padT - 9} textAnchor="middle" fontFamily="Montserrat" fontSize={10} fill={T.text2} fontWeight={600}>{c}</text>
      ))}
      {rows.map((r, i) => (
        <g key={r.cohort}>
          <text x={padL - 10} y={padT + ch * i + ch / 2 + 4} textAnchor="end" fontFamily="Montserrat" fontSize={10.5} fill={T.text2} fontWeight={500}>{r.cohort}</text>
          {r.values.map((val, j) => {
            const x = padL + cw * j + pad / 2
            const y = padT + ch * i + pad / 2
            const w = cw - pad
            const h = ch - pad
            if (val == null) return <rect key={j} x={x} y={y} width={w} height={h} rx={5} fill="hsl(var(--muted-foreground) / 0.05)" />
            const a = 0.07 + (val / 100) * 0.9
            const dark = val > 55
            return (
              <g key={j}>
                <rect x={x} y={y} width={w} height={h} rx={5} fill={T.goldA(a)} />
                <text x={x + w / 2} y={y + h / 2 + 3.5} textAnchor="middle" fontFamily="Montserrat" fontSize={10.5} fontWeight={600}
                  fill={dark ? 'hsl(var(--card))' : val < 18 ? T.muted : T.text} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {val}%
                </text>
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}
