type Props = { data: number[]; color: string; w?: number; h?: number }

// Sparkline SVG caseiro. `color` deve vir como hsl(var(--token)) do chamador
// (reskin sóbrio: gold/success/danger/muted-foreground), sem glow.
export function Sparkline({ data, color, w = 64, h = 22 }: Props) {
  if (!data.length) return null
  const mn = Math.min(...data)
  const mx = Math.max(...data)
  const r = mx - mn || 1
  const xs = (i: number) => (i * w) / (data.length - 1)
  const ys = (v: number) => h - 2 - ((v - mn) / r) * (h - 4)
  const pts = data.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ')
  const last = data.length - 1
  const gid = `sl-${color.replace(/[^a-z]/gi, '')}-${data.length}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
      <circle cx={xs(last)} cy={ys(data[last])} r="2" fill={color} />
    </svg>
  )
}
