// ─── Tela LUCRO (/financeiro/lucro) · "onde o lucro nasce e morre" ──────────
// Reskin SÓBRIO do Hub (Montserrat, rounded-card/sub, tokens canônicos, .tnum,
// CTA sólido, sem neon/glow). Period-aware via useFinance(periodo) — o seletor
// Jan/Fev no FinanceiroLayout troca o snapshot REAL inteiro.
//
// 3 abas (SegmentedControl):
//   (A) MARGEM      — margens por produto Jan/26 (real) + WaterfallChart (real)
//                     + SIMULADOR FUNCIONAL (preço PIX/custo/volume → recomputa ao vivo).
//   (B) ROI & ATRIB — MER/ROAS computados (parcial) + RadialGauge + veredito por canal.
//   (C) COORTES&LTV — CohortHeatmap + LTV:CAC (ilustrativo, rotulado).
//
// PROVENIÊNCIA (badge obrigatório por bloco): 'real' | 'parcial' | 'ilustrativo'.
// Margens/mix/custos por produto = SEMPRE Jan/26 (único mês com unit economics
// auditado) — rotulado explicitamente. Top-line DRE = período corrente do seletor.
import { useMemo, useState } from 'react'
import { Lightbulb, RotateCcw, TrendingUp, TrendingDown, Plus, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFinanceiroCtx } from '../FinanceiroLayout'
import { useFinance } from '../data/source'
import { useFinanceiroStore, type EditableProduct, type Periodo } from '../data/store'
import { PRECOS_PIX, CUSTOS_UNIT } from '../data/finance'
import { brl, brlCompact, num, pct as pctFmt } from '../lib/format'
import { WaterfallChart } from '../charts'
import type { Provenance } from '../data/types'

// ── Primitivos sóbrios locais ────────────────────────────────────────────────
const PROV_META: Record<Provenance, { label: string; cls: string }> = {
  real: { label: 'Real', cls: 'text-success border-success/30 bg-success/10' },
  parcial: { label: 'Parcial · computado', cls: 'text-info border-info/30 bg-info/10' },
  ilustrativo: { label: 'Ilustrativo · modelo', cls: 'text-warning border-warning/30 bg-warning/10' },
}

function Badge({ prov }: { prov: Provenance }) {
  const m = PROV_META[prov]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-sub border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', m.cls)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {m.label}
    </span>
  )
}

function Panel({
  title, meta, prov, right, className, children,
}: {
  title: string; meta?: string; prov?: Provenance; right?: React.ReactNode
  className?: string; children: React.ReactNode
}) {
  return (
    <section className={cn('rounded-card border border-border bg-card p-5 shadow-soft', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
          {meta && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{meta}</p>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          {prov && <Badge prov={prov} />}
        </div>
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-sub border border-border bg-muted/40 p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('tnum mt-1.5 text-xl font-semibold text-foreground', tone)}>{value}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SIMULADOR — estado real (useState) que recomputa margem/contribuição/lucro.
// Seed REAL: preço PIX 152/171/107 · custo unit. médio por linha · volume = mix Jan.
// ════════════════════════════════════════════════════════════════════════════
type SimKey = 'honey' | 'cappuccino' | 'blended'
interface SimRow { id: SimKey; name: string; preco: number; custo: number; volume: number }

// Custo médio "completo" por linha (versão mais comum no D2C) — ponto de partida editável.
const SIM_SEED: SimRow[] = [
  { id: 'honey', name: 'Honey', preco: PRECOS_PIX.honey, custo: CUSTOS_UNIT.honey.completo, volume: 246 },
  { id: 'cappuccino', name: 'Cappuccino', preco: PRECOS_PIX.cappuccino, custo: CUSTOS_UNIT.cappuccino.completo, volume: 46 },
  { id: 'blended', name: 'Blended', preco: PRECOS_PIX.blended, custo: CUSTOS_UNIT.blended.completo, volume: 289 },
]

function NumInput({
  value, onChange, min, max, step, prefix, suffix,
}: {
  value: number; onChange: (v: number) => void
  min: number; max: number; step: number; prefix?: string; suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-[hsl(var(--gold))]"
      />
      <div className="flex items-center rounded-sub border border-border bg-background px-2 py-1">
        {prefix && <span className="mr-0.5 text-[11px] text-muted-foreground">{prefix}</span>}
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tnum w-14 bg-transparent text-right text-[12.5px] font-semibold text-foreground outline-none"
        />
        {suffix && <span className="ml-0.5 text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

function Simulador() {
  const [rows, setRows] = useState<SimRow[]>(SIM_SEED)
  const patch = (id: SimKey, k: keyof SimRow, v: number) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [k]: v } : r)))
  const reset = () => setRows(SIM_SEED)

  // Recompute REAL ao vivo (não estático): margem%, contribuição R$/un, lucro projetado.
  const calc = useMemo(() => {
    const each = rows.map((r) => {
      const contribUnit = r.preco - r.custo
      const margemPct = r.preco ? (contribUnit / r.preco) * 100 : 0
      const lucro = contribUnit * r.volume
      const receita = r.preco * r.volume
      return { ...r, contribUnit, margemPct, lucro, receita }
    })
    const lucroTotal = each.reduce((a, r) => a + r.lucro, 0)
    const receitaTotal = each.reduce((a, r) => a + r.receita, 0)
    const margemTotal = receitaTotal ? ((receitaTotal - each.reduce((a, r) => a + r.custo * r.volume, 0)) / receitaTotal) * 100 : 0
    return { each, lucroTotal, receitaTotal, margemTotal }
  }, [rows])

  // Baseline (seed) p/ mostrar o delta do que o simulador mudou.
  const baseLucro = useMemo(
    () => SIM_SEED.reduce((a, r) => a + (r.preco - r.custo) * r.volume, 0), [],
  )
  const deltaLucro = calc.lucroTotal - baseLucro
  const touched = rows.some((r, i) => r.preco !== SIM_SEED[i].preco || r.custo !== SIM_SEED[i].custo || r.volume !== SIM_SEED[i].volume)

  return (
    <Panel
      title="Simulador de contribuição"
      meta="Mexa preço PIX · custo unit. · volume — margem, contribuição e lucro recomputam ao vivo"
      prov="parcial"
      right={
        <button
          type="button" onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-sub border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3" /> Resetar (real)
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {calc.each.map((r) => {
          const seed = SIM_SEED.find((s) => s.id === r.id)!
          const up = r.margemPct >= (seed.preco ? ((seed.preco - seed.custo) / seed.preco) * 100 : 0)
          return (
            <div key={r.id} className="rounded-sub border border-border bg-muted/30 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-foreground">{r.name}</span>
                <span className="tnum text-[11px] text-muted-foreground">{num(r.volume)} un</span>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Preço PIX</span>
                  </div>
                  <NumInput value={r.preco} onChange={(v) => patch(r.id, 'preco', v)} min={60} max={300} step={1} prefix="R$" />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-muted-foreground">Custo unit.</div>
                  <NumInput value={r.custo} onChange={(v) => patch(r.id, 'custo', v)} min={20} max={150} step={0.5} prefix="R$" />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-muted-foreground">Volume (un)</div>
                  <NumInput value={r.volume} onChange={(v) => patch(r.id, 'volume', v)} min={0} max={600} step={1} />
                </div>
              </div>

              {/* Saídas recomputadas ao vivo */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
                <div>
                  <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Margem</div>
                  <div className={cn('tnum mt-0.5 inline-flex items-center gap-1 text-[14px] font-semibold', up ? 'text-success' : 'text-danger')}>
                    {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {pctFmt(r.margemPct)}
                  </div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Contrib./un</div>
                  <div className="tnum mt-0.5 text-[14px] font-semibold text-foreground">{brl(r.contribUnit, 0)}</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Lucro</div>
                  <div className="tnum mt-0.5 text-[14px] font-semibold text-gold">{brlCompact(r.lucro)}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Totalizador com delta vs. cenário real (seed) */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Receita simulada" value={brlCompact(calc.receitaTotal)} />
        <Stat label="Margem ponderada" value={pctFmt(calc.margemTotal)} tone="text-gold" />
        <div className="rounded-sub border border-border bg-muted/40 p-3.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Lucro de contribuição</div>
          <div className="tnum mt-1.5 text-xl font-semibold text-foreground">{brlCompact(calc.lucroTotal)}</div>
          {touched && (
            <div className={cn('tnum mt-1 text-[11px] font-semibold', deltaLucro >= 0 ? 'text-success' : 'text-danger')}>
              {deltaLucro >= 0 ? '+' : '−'}{brlCompact(Math.abs(deltaLucro)).replace('R$ ', 'R$ ')} vs. cenário real
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-sub border border-border bg-muted/20 p-3 text-[11.5px] leading-snug text-muted-foreground">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-gold" />
        <span>
          Seed = <b className="font-semibold text-foreground">dados reais</b> (preço PIX 152/171/107 · custo unit. médio versão Completo · mix Jan/26).
          Tudo aqui é <b className="font-semibold text-foreground">cenário</b> — por isso o badge "parcial · computado". Custo unit. é por versão; o seed usa a versão Completo.
        </span>
      </p>
    </Panel>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export function Lucro() {
  const { periodo } = useFinanceiroCtx()
  const { snapshot } = useFinance(periodo)

  const periodoTopline = snapshot.meta.periodoLabel
  // Margem ponderada do simulador-baseline / margens por produto = SEMPRE Jan/26.

  return (
    <div className="animate-fade-up space-y-6">
      {/* Cabeçalho da tela */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-foreground">
            Onde o <span className="text-gold">lucro</span> nasce e morre
          </h2>
          <p className="mt-1 max-w-[64ch] text-[13px] leading-relaxed text-muted-foreground">
            Margem por produto e simulador de contribuição. Top-line <b className="font-medium text-foreground">{periodoTopline}</b>;
            unit economics por produto <b className="font-medium text-foreground">sempre Jan/26</b> (único mês auditado).
          </p>
        </div>
      </div>

      {/* ───────────────────────── MARGEM ───────────────────────── */}
      <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-5">
            <Panel
              className="xl:col-span-3"
              title="Cascata da DRE"
              meta={`${periodoTopline} · da receita ao resultado`}
              prov="real"
              right={<span className="rounded-sub border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">R$ mil</span>}
            >
              <WaterfallChart steps={snapshot.waterfall} height={320} />
            </Panel>

            <MargemPorProduto
              className="xl:col-span-2"
              periodo={periodo}
              products={snapshot.products as EditableProduct[]}
              meta={
                periodo === 'mai'
                  ? 'Maio/2026 · editável · custo real ÷ preço PIX (ref) · CM2 a preencher'
                  : 'Jan/26 · editável · margem real ponderada por mix vendido'
              }
            />
          </div>

          <Simulador />
        </div>
    </div>
  )
}

// ════════════════════════ MARGEM POR PRODUTO (EDITÁVEL) ════════════════════════
/** Célula numérica com edição inline (clique → input → Enter/blur commita). */
function EditNum({
  value, format, onCommit, className,
}: {
  value: number
  format: (v: number) => string
  onCommit: (v: number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const commit = () => {
    const n = Number(val)
    if (val.trim() !== '' && !Number.isNaN(n)) onCommit(n)
    setEditing(false)
  }
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        onBlur={commit}
        className="tnum w-16 rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-right text-[12px] font-semibold text-foreground outline-none"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        setEditing(true)
        setVal(String(value))
      }}
      title="Clique para editar"
      className={cn('tnum underline-offset-2 transition-colors hover:text-gold hover:underline', className)}
    >
      {format(value)}
    </button>
  )
}

function ProdAjustado() {
  return (
    <span
      className="inline-flex items-center rounded-sub border border-gold/30 bg-gold/[0.1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold"
      title="Produto ajustado pelo usuário (≠ baseline)"
    >
      ajustado
    </span>
  )
}

const novoIdProd = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)

/** Painel "Margem por produto" EDITÁVEL: custo/preço/unidades/margem inline + add/excluir/baseline. */
function MargemPorProduto({
  periodo, products, className, meta,
}: {
  periodo: Periodo
  products: EditableProduct[]
  className?: string
  meta: string
}) {
  const editProduct = useFinanceiroStore((s) => s.editProduct)
  const addProduct = useFinanceiroStore((s) => s.addProduct)
  const removeProduct = useFinanceiroStore((s) => s.removeProduct)
  const resetarPeriodo = useFinanceiroStore((s) => s.resetarPeriodo)

  const [adding, setAdding] = useState(false)
  const [fName, setFName] = useState('')
  const [fPreco, setFPreco] = useState('')
  const [fCusto, setFCusto] = useState('')
  const [fUnits, setFUnits] = useState('')
  const [fMargin, setFMargin] = useState('')

  const podeSalvar = fName.trim() !== '' && Number(fPreco) > 0
  const salvar = () => {
    if (!podeSalvar) return
    addProduct(periodo, {
      id: novoIdProd(),
      name: fName.trim(),
      linha: fName.trim(),
      img: '',
      revenue: 0,
      units: Number(fUnits) || 0,
      precoPix: Number(fPreco) || 0,
      custo: Number(fCusto) || 0,
      marginPct: Number(fMargin) || 0,
      cm2Pct: 0,
      trend: 'flat',
    })
    setFName('')
    setFPreco('')
    setFCusto('')
    setFUnits('')
    setFMargin('')
    setAdding(false)
  }

  return (
    <Panel
      className={className}
      title="Margem por produto"
      meta={meta}
      prov="real"
      right={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1 rounded-sub border border-gold/40 bg-gold/[0.08] px-2 py-1 text-[11px] font-medium text-gold transition-colors hover:bg-gold/[0.14]"
          >
            <Plus className="size-3" /> Produto
          </button>
          <button
            type="button"
            onClick={() => resetarPeriodo(periodo)}
            title="Voltar ao baseline reconciliado"
            className="inline-flex items-center gap-1 rounded-sub border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Baseline
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {products.map((p) => (
          <div key={p.id} className="group">
            <div className="flex items-baseline justify-between">
              <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                {p.name}
                {p.edited && <ProdAjustado />}
              </span>
              <span className="flex items-center gap-2">
                <EditNum
                  value={p.marginPct}
                  format={(v) => `${num(v, 1)}%`}
                  onCommit={(v) => editProduct(periodo, p.id, { marginPct: v })}
                  className="text-[13px] font-semibold text-gold"
                />
                <button
                  type="button"
                  onClick={() => removeProduct(periodo, p.id)}
                  title="Excluir produto"
                  className="grid size-5 place-items-center rounded-sub text-text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="size-3" strokeWidth={1.8} />
                </button>
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(0, Math.min(100, p.marginPct))}%` }} />
              </div>
              <span className="flex items-center justify-end gap-1 text-right text-[11px] text-muted-foreground">
                <EditNum
                  value={p.precoPix}
                  format={(v) => brl(v, 0)}
                  onCommit={(v) => editProduct(periodo, p.id, { precoPix: v })}
                  className="text-[11px] text-muted-foreground"
                />{' '}
                PIX
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10.5px] text-muted-foreground">
              <EditNum value={p.units} format={(v) => num(v)} onCommit={(v) => editProduct(periodo, p.id, { units: v })} className="text-[10.5px] text-muted-foreground" />
              <span>un · custo</span>
              <EditNum value={p.custo} format={(v) => brl(v, 2)} onCommit={(v) => editProduct(periodo, p.id, { custo: v })} className="text-[10.5px] text-muted-foreground" />
              <span>· CM2 {num(p.cm2Pct, 1)}%</span>
            </div>
          </div>
        ))}

        {products.length > 0 && (
          <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
            {products.map((p) => (
              <Stat key={p.id} label={p.linha} value={`${num(p.marginPct, 1)}%`} tone="text-gold" />
            ))}
          </div>
        )}

        {adding && (
          <div className="rounded-sub border border-gold/30 bg-gold/[0.04] p-3.5">
            <div className="flex flex-wrap items-end gap-2.5">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Nome</span>
                <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Black Honey" className="w-32 rounded-sub border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-gold/40" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Preço PIX</span>
                <input type="number" value={fPreco} onChange={(e) => setFPreco(e.target.value)} placeholder="0" className="tnum w-20 rounded-sub border border-border bg-background px-2 py-1 text-right text-[12px] text-foreground outline-none focus:border-gold/40" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Custo</span>
                <input type="number" value={fCusto} onChange={(e) => setFCusto(e.target.value)} placeholder="0" className="tnum w-20 rounded-sub border border-border bg-background px-2 py-1 text-right text-[12px] text-foreground outline-none focus:border-gold/40" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Un.</span>
                <input type="number" value={fUnits} onChange={(e) => setFUnits(e.target.value)} placeholder="0" className="tnum w-16 rounded-sub border border-border bg-background px-2 py-1 text-right text-[12px] text-foreground outline-none focus:border-gold/40" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Margem %</span>
                <input type="number" value={fMargin} onChange={(e) => setFMargin(e.target.value)} placeholder="0" className="tnum w-16 rounded-sub border border-border bg-background px-2 py-1 text-right text-[12px] text-foreground outline-none focus:border-gold/40" />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={salvar}
                  disabled={!podeSalvar}
                  className="inline-flex items-center gap-1.5 rounded-sub border border-gold/50 bg-gold/[0.14] px-3 py-1.5 text-[12px] font-semibold text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check className="size-3.5" /> Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="inline-flex items-center gap-1.5 rounded-sub border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" /> Cancelar
                </button>
              </div>
            </div>
            <p className="mt-2 text-[10.5px] text-text-muted">
              Novos produtos entram como <span className="font-semibold text-gold">ajustado</span>. Custo/preço/margem por
              produto são dados reais editáveis; o <b className="text-text-secondary">Simulador</b> abaixo é a ferramenta de
              "e se" com margem viva.
            </p>
          </div>
        )}
      </div>
    </Panel>
  )
}

export default Lucro
