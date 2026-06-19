import { T } from '@/financeiro/lib/tokens'
import { mil } from '@/financeiro/lib/format'
import type { WaterfallStep } from '@/financeiro/data/types'

type Props = { steps: WaterfallStep[]; height?: number }

// Reskin sóbrio: fills/strokes via tokens canônicos do Hub. Sem glow.
const FILL: Record<string, string> = {
  rev: 'hsl(var(--foreground) / 0.14)',
  cost: 'hsl(var(--muted-foreground) / 0.26)',
  sub: 'hsl(var(--gold) / 0.85)',
  anom: 'hsl(var(--danger) / 0.40)',
  loss: 'hsl(var(--danger) / 0.78)',
}
const STROKE: Record<string, string> = {
  rev: 'hsl(var(--foreground) / 0.45)',
  cost: 'hsl(var(--muted-foreground) / 0.5)',
  sub: T.gold,
  anom: T.crit,
  loss: T.crit,
}

export function WaterfallChart({ steps, height = 300 }: Props) {
  const W = 760
  const H = height
  const padT = 30
  const padB = 78
  const padX = 14
  const plotH = H - padT - padB
  const plotW = W - padX * 2

  // cumulative geometry
  let run = 0
  const bars = steps.map((s) => {
    let y0: number, y1: number
    if (s.kind === 'rev') { y0 = 0; y1 = s.value; run = s.value }
    else if (s.kind === 'sub') { y0 = 0; y1 = s.value }
    else if (s.kind === 'loss') { y0 = Math.min(0, s.value); y1 = Math.max(0, s.value); run = s.value }
    else { y1 = run; run = run + s.value; y0 = run }
    return { ...s, y0, y1 }
  })

  const allV = bars.flatMap((b) => [b.y0, b.y1, 0])
  const dataMax = Math.max(...allV)
  const dataMin = Math.min(...allV)
  let yMax = dataMax * 1.08
  let yMin = dataMin < 0 ? dataMin * 1.6 - 1000 : 0
  // Mês ainda em aberto (tudo 0) → escala degenerada faria yPx dividir por 0 (NaN).
  if (yMax - yMin < 1) { yMax = 1; yMin = 0 }
  const yPx = (v: number) => padT + (plotH * (yMax - v)) / (yMax - yMin)
  const slot = plotW / steps.length
  const bw = Math.min(42, slot * 0.6)

  const ticks = niceTicks(yMin, yMax, 4)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Cascata da DRE">
      {ticks.map((g) => (
        <g key={g}>
          <line x1={padX} x2={W - padX} y1={yPx(g)} y2={yPx(g)} stroke={T.grid} strokeWidth={1} opacity={g === 0 ? 0.5 : 0.5} />
          <text x={padX} y={yPx(g) - 4} fill={T.muted} fontSize={9.5} fontFamily="Montserrat">{mil(g, 0)}</text>
        </g>
      ))}
      {bars.map((b, i) => {
        const cx = padX + slot * i + slot / 2
        const x = cx - bw / 2
        const top = yPx(Math.max(b.y0, b.y1))
        const bot = yPx(Math.min(b.y0, b.y1))
        const h = Math.max(2, bot - top)
        const lblColor = b.kind === 'loss' || b.kind === 'anom' ? T.crit : b.kind === 'sub' ? T.gold : b.kind === 'rev' ? T.text : T.text2
        return (
          <g key={b.label}>
            <rect x={x} y={top} width={bw} height={h} rx={3} fill={FILL[b.kind]} stroke={STROKE[b.kind]} strokeWidth={1} />
            {b.kind === 'sub' && <rect x={x} y={top} width={bw} height={2} fill={T.gold} />}
            {b.pct && <text x={cx} y={top - 19} textAnchor="middle" fontFamily="Montserrat" fontSize={9} fontWeight={600} fill={T.gold}>({b.pct})</text>}
            <text x={cx} y={top - 7} textAnchor="middle" fontFamily="Montserrat" fontSize={10.5} fontWeight={600} fill={lblColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(b.value >= 0 ? '' : '−') + mil(Math.abs(b.value), 1)}
            </text>
            <text x={cx} y={yPx(yMin) + 16} textAnchor="end" fontFamily="Montserrat" fontSize={10} fontWeight={500} fill={T.text2} transform={`rotate(-32 ${cx} ${yPx(yMin) + 16})`}>
              {b.label}
            </text>
          </g>
        )
      })}
      {/* connectors */}
      {bars.slice(0, -1).map((b, i) => {
        const lvl = b.kind === 'rev' || b.kind === 'sub' ? b.y1 : Math.min(b.y0, b.y1)
        const cxa = padX + slot * i + slot / 2 + bw / 2
        const cxb = padX + slot * (i + 1) + slot / 2 - bw / 2
        return <line key={i} x1={cxa} x2={cxb} y1={yPx(lvl)} y2={yPx(lvl)} stroke={T.grid} strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />
      })}
    </svg>
  )
}

function niceTicks(min: number, max: number, n: number): number[] {
  const span = max - min
  const step = niceStep(span / n)
  const out: number[] = []
  const start = Math.ceil(min / step) * step
  for (let v = start; v <= max + 1; v += step) out.push(Math.round(v))
  if (!out.includes(0) && min <= 0 && max >= 0) out.push(0)
  return out.sort((a, b) => a - b)
}
function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
  return step * mag
}
