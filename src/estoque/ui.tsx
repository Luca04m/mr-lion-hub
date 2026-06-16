// Componentes visuais compartilhados da plataforma (dark + gold premium).
import type { ReactNode } from 'react'
import {
  Droplet, FlaskConical, Wheat, Wine, Tags, Gem, Link2, Box, Package, Container,
} from 'lucide-react'
import type { Item, StatusEstoque, CategoriaItem } from './types'
import { statusEstoque, STATUS_LABEL } from './engine'
import { grupoProduto, GRUPO_META } from './mock'

// ── cor por status (tokens do design system) ──
export const STATUS_VAR: Record<StatusEstoque, string> = {
  ok: 'var(--ok)', baixo: 'var(--warn)', critico: 'var(--crit)',
}

export function StatusPill({ status, dense }: { status: StatusEstoque; dense?: boolean }) {
  const c = STATUS_VAR[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ${dense ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}
      style={{ color: `hsl(${c})`, background: `hsl(${c} / 0.13)`, border: `1px solid hsl(${c} / 0.28)` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${c})` }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── ícone por categoria ──
const ICON_MAP: Record<CategoriaItem, typeof Droplet> = {
  liquido: Droplet, po: Wheat, aditivo: FlaskConical, granel: Container,
  garrafa: Wine, rotulo: Tags, pingente: Gem, fechamento: Link2, caixa: Box,
  honey: Package, cappuccino: Package, blended: Package,
}
export function CategoriaIcon({ categoria, size = 16 }: { categoria: CategoriaItem; size?: number }) {
  const Ico = ICON_MAP[categoria] ?? Package
  return <Ico size={size} strokeWidth={1.6} />
}

// ── chip de vínculo de produto (Honey / Cappuccino / Blended / Compartilhado / Comum) ──
export function ProdutoChip({ itemId, className = '' }: { itemId: string; className?: string }) {
  const meta = GRUPO_META[grupoProduto(itemId)]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 leading-none ${className}`}
      style={{ color: `hsl(${meta.cor})`, background: `hsl(${meta.cor} / 0.12)`, border: `1px solid hsl(${meta.cor} / 0.24)` }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: `hsl(${meta.cor})` }} />
      {meta.label}
    </span>
  )
}

// ── barra de estoque (saldo vs 2× mínimo) ── reskin sóbrio: trilho neutro, fill chapado.
export function StockBar({ item, height = 5 }: { item: Item; height?: number }) {
  const status = statusEstoque(item)
  const pct = Math.max(3, Math.min(100, (item.estoque / (item.min * 2 || 1)) * 100))
  const c = STATUS_VAR[status]
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'hsl(var(--muted))' }}>
      <div className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: `hsl(${c})` }} />
    </div>
  )
}

// ── régua de cobertura × prazo de entrega (mini-timeline) ──
// Trilho = horizonte em dias. Preenchimento = estoque restante ao ritmo atual.
// Marca dourada = quando a compra chega se pedida hoje (lead time). Se o preenchimento
// não alcança a marca, há um vão = dias sem estoque → repor já.
export function ReguaCobertura({ cobertura, leadTime, height = 10 }: {
  cobertura: number | null; leadTime: number; height?: number
}) {
  const horizonte = Math.max(leadTime, cobertura ?? 0, 1) * 1.2
  const covPct = cobertura !== null ? Math.min(100, (cobertura / horizonte) * 100) : 100
  const ltPct = Math.min(100, (leadTime / horizonte) * 100)
  const furou = cobertura !== null && cobertura <= leadTime
  const aperto = cobertura !== null && !furou && cobertura - leadTime <= 7
  const c = cobertura === null ? 'var(--text-muted)' : furou ? 'var(--crit)' : aperto ? 'var(--warn)' : 'var(--ok)'
  const railH = Math.max(4, height - 4)
  return (
    <div className="relative w-full" style={{ height }}>
      {/* trilho — neutro, sem tinta dourada */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full overflow-hidden"
        style={{ height: railH, background: 'hsl(var(--muted))' }}>
        {/* vão sem estoque destacado quando a cobertura não cobre o prazo */}
        {furou && (
          <div className="absolute inset-y-0 rounded-full"
            style={{ left: `${covPct}%`, width: `${Math.max(0, ltPct - covPct)}%`, background: 'repeating-linear-gradient(45deg, hsl(var(--crit) / 0.28) 0 3px, transparent 3px 6px)' }} />
        )}
        {/* cobertura preenchida — fill chapado */}
        <div className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${covPct}%`, background: cobertura !== null ? `hsl(${c})` : 'hsl(var(--muted-foreground) / 0.3)' }} />
      </div>
      {/* marca do prazo de entrega: haste + cap dourado discreto, sem glow */}
      {leadTime > 0 && (
        <div className="absolute top-0 bottom-0" style={{ left: `calc(${ltPct}% - 1px)` }} title={`entrega em ${leadTime}d`}>
          <div className="h-full rounded-full" style={{ width: 2, background: 'hsl(var(--gold))' }} />
          <div className="absolute -top-px left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: 5, height: 5, background: 'hsl(var(--gold))' }} />
        </div>
      )}
    </div>
  )
}

// ── sparkline SVG (saldo acumulado ao longo do tempo) ──
export function Sparkline({ values, width = 96, height = 28, color = 'var(--gold-bright)' }: {
  values: number[]; width?: number; height?: number; color?: string
}) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const pts = values.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${d} L${width},${height} L0,${height} Z`
  const id = `spk-${Math.round(values[0] * 100)}-${values.length}`
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${color} / 0.28)`} />
          <stop offset="100%" stopColor={`hsl(${color} / 0)`} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={`hsl(${color})`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── card base ── reskin sóbrio: card chapado + border neutra + shadow-soft.
export function Card({ children, className = '', glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`bg-card rounded-card border border-border shadow-soft ${glow ? 'gold-glow' : ''} ${className}`}>
      {children}
    </div>
  )
}

// ── cabeçalho de seção ──
export function SectionHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end gap-3 mb-4 flex-wrap">
      <h2 className="font-display text-2xl text-foreground leading-none">{title}</h2>
      {hint && <span className="text-xs text-text-muted mb-0.5">{hint}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}
