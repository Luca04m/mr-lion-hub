// Tela CAIXA (/financeiro/caixa) — "o caixa não mente".
// Reskin SÓBRIO sobre o design system do Hub (Montserrat, rounded-card/sub,
// tokens canônicos, .tnum, CTA sólido, SEM neon/glow). Period-aware via o
// Outlet context do FinanceiroLayout (Jan/Fev troca o snapshot REAL inteiro).
//
// PROVENIÊNCIA (badge obrigatório por bloco):
//   'real'        → DRE Jan/Fev (linhas + resultado), ad spend, chargebacks.
//   'parcial'     → alíquota efetiva do Simples (derivada do modelo).
//   'ilustrativo' → projeção de caixa 90d, contas/aging, impostos projetados.
//
// CONTROLES FUNCIONAIS:
//   • Sub-nav de bloco (Fluxo / DRE / Contas / Impostos) — SegmentedControl.
//   • Seletor de CENÁRIO (Pessimista/Base/Otimista) que RECOMPUTA de fato a
//     série de caixa (escala determinística do drawdown + banda P10–P90) e a
//     repassa ao CashProjection, que redesenha o SVG.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, ShieldAlert, FileText, Wallet, TrendingDown, TrendingUp, Plus, Trash2, RotateCcw, Check, X } from 'lucide-react'
import { SegmentedControl } from '@/components/pro/SegmentedControl'
import { CashProjection } from '@/financeiro/charts'
import { useFinanceiroCtx } from '../FinanceiroLayout'
import { useFinance } from '../data/source'
import { useFinanceiroStore, type EditableDRELine, type EditableContaItem, type Periodo } from '../data/store'
import { brl, brlCompact, pct } from '../lib/format'
import type { CashPoint, ContaItem, DRELine, DREKind, Provenance } from '../data/types'

// ── Badge de proveniência (sóbrio, dessaturado) ──────────────────────────
const PROV_TONE: Record<Provenance, string> = {
  real: 'bg-success/[0.12] text-success border-success/30',
  parcial: 'bg-info/[0.12] text-info border-info/30',
  ilustrativo: 'bg-warning/[0.12] text-warning border-warning/30',
}
// Rótulos em PT claro p/ o João (dono da operação, não-financeiro) — sem "ilustrativo".
const PROV_LABEL: Record<Provenance, string> = {
  real: 'real',
  parcial: 'estimativa',
  ilustrativo: 'projeção',
}
const PROV_HINT: Record<Provenance, string> = {
  real: 'Números reais — vendas, custos e DRE já conciliados.',
  parcial: 'Estimativa — calculada pelo modelo a partir dos dados reais.',
  ilustrativo: 'Projeção — cenário estimado, não é extrato bancário.',
}
const PROV_GLOSSA: Record<Provenance, string> = {
  real: 'número fechado',
  parcial: 'calculado',
  ilustrativo: 'cenário',
}
function ProvBadge({ prov, className = '' }: { prov: Provenance; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sub border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${PROV_TONE[prov]} ${className}`}
      title={PROV_HINT[prov]}
    >
      {PROV_LABEL[prov]}
    </span>
  )
}

/** Legenda compacta dos selos — orienta quem não é da área financeira. */
function ProvLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-text-muted">Como ler os selos</span>
      {(['real', 'parcial', 'ilustrativo'] as Provenance[]).map((p) => (
        <span key={p} className="flex items-center gap-1.5 text-[11px] text-text-secondary" title={PROV_HINT[p]}>
          <ProvBadge prov={p} />
          {PROV_GLOSSA[p]}
        </span>
      ))}
    </div>
  )
}

// ── Section card sóbrio (substitui o Panel do covil) ──────────────────────
function Section({
  title, meta, prov, right, children, className = '',
}: {
  title: string
  meta?: string
  prov?: Provenance
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-card border border-border bg-card p-5 shadow-soft ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[13px] tracking-[0.08em] text-foreground">{title}</h2>
            {prov && <ProvBadge prov={prov} />}
          </div>
          {meta && <p className="mt-1 text-[11.5px] text-muted-foreground">{meta}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  )
}

const BLOCOS = [
  { label: 'Fluxo de caixa', value: 'fluxo' },
  { label: 'Resultado (DRE)', value: 'dre' },
  { label: 'Contas a pagar/receber', value: 'contas' },
  { label: 'Impostos', value: 'impostos' },
] as const
type Bloco = (typeof BLOCOS)[number]['value']

const CENARIOS = [
  { label: 'Pessimista', value: 'pess' },
  { label: 'Base', value: 'base' },
  { label: 'Otimista', value: 'otim' },
] as const
type Cenario = (typeof CENARIOS)[number]['value']

// Fatores de cenário: escalam o DRAWDOWN (queda vs. caixa inicial) e a banda.
// Base = série original. Pessimista aprofunda a queda e alarga o P10.
// Otimista atenua a queda e eleva o P90. RECOMPUTA de fato a série.
const CEN_FATOR: Record<Cenario, { drawdown: number; p10: number; p90: number }> = {
  pess: { drawdown: 1.45, p10: 1.5, p90: 0.7 },
  base: { drawdown: 1.0, p10: 1.0, p90: 1.0 },
  otim: { drawdown: 0.6, p10: 0.6, p90: 1.3 },
}

/** Recomputa a projeção de caixa para um cenário (determinístico, ilustrativo). */
function applyCenario(points: CashPoint[], cen: Cenario): CashPoint[] {
  const f = CEN_FATOR[cen]
  if (cen === 'base') return points
  const caixaInicial = points[0]?.base ?? 0
  return points.map((p) => {
    const draw = p.base - caixaInicial // ≤ 0 no miolo do mês
    const base = Math.round(caixaInicial + draw * f.drawdown)
    const spanUp = p.p90 - p.base
    const spanDown = p.base - p.p10
    return {
      day: p.day,
      base,
      p90: Math.round(base + spanUp * f.p90),
      p10: Math.round(Math.max(0, base - spanDown * f.p10)),
    }
  })
}

function dreStyle(k: DRELine['kind']) {
  if (k === 'sub') return { row: 'bg-gold/[0.05]', label: 'font-semibold text-foreground', val: 'font-semibold text-gold' }
  if (k === 'loss') return { row: 'bg-danger/[0.06]', label: 'font-semibold text-foreground', val: 'font-semibold text-danger' }
  if (k === 'rev') return { row: '', label: 'font-medium text-foreground', val: 'font-semibold text-foreground' }
  return { row: '', label: 'text-text-secondary', val: 'text-text-secondary' }
}

// ── Recompute da DRE a partir das linhas (edit-aware) ─────────────────────────
// Lucro bruto = Receita − CMV; Resultado = Receita + Σ(deduções ded/tax/fixed,
// já armazenadas negativas). NÃO lê a linha congelada de resultado — soma os
// itens, então qualquer edição/adição/remoção recompõe os totais na hora.
const DESPESA_KINDS: DREKind[] = ['ded', 'tax', 'fixed']
const isLucroBrutoLine = (l: DRELine) => l.label.toLowerCase().includes('lucro bruto')

function recomputeDre(dre: EditableDRELine[]) {
  const receita = dre.find((l) => l.kind === 'rev')?.value ?? 0
  const cmvLine = dre.find((l) => l.label.toLowerCase().includes('cmv'))
  const cmv = cmvLine ? Math.abs(cmvLine.value) : 0
  const lucroBruto = receita - cmv
  const margemPct = receita ? (lucroBruto / receita) * 100 : 0
  const resultado = receita + dre.filter((l) => DESPESA_KINDS.includes(l.kind)).reduce((a, l) => a + l.value, 0)
  return { receita, lucroBruto, margemPct, resultado }
}

// ── Aging DERIVADO das contas editáveis ───────────────────────────────────
// Bucketiza por janela de vencimento a partir de HOJE (new Date()). Status 'paga'
// sai do aging. Soma payable (tipo 'pagar') e receivable (tipo 'receber') por bucket.
// Determinístico: regra única de dias → bucket; add/remove conta atualiza na hora.
const AGING_BUCKETS = ['A vencer', '1–30 dias', '31–60 dias', '60+ dias'] as const

/** Parser tolerante: "YYYY-MM-DD" (input date), "dd/mm" ou "dd/mm/aaaa" (seed). */
function parseVencimento(s: string): Date | null {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const br = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (br) {
    const hoje = new Date()
    const ano = br[3] ? (br[3].length === 2 ? 2000 + Number(br[3]) : Number(br[3])) : hoje.getFullYear()
    return new Date(ano, Number(br[2]) - 1, Number(br[1]))
  }
  return null
}

/** Dias entre hoje e o vencimento → rótulo do bucket. */
function bucketDe(venc: string, hoje: Date): (typeof AGING_BUCKETS)[number] {
  const d = parseVencimento(venc)
  if (!d) return 'A vencer'
  const dias = Math.floor((d.getTime() - hoje.getTime()) / 86_400_000)
  if (dias <= 0) return 'A vencer' // vencidas/hoje contam como pressão imediata
  if (dias <= 30) return '1–30 dias'
  if (dias <= 60) return '31–60 dias'
  return '60+ dias'
}

/** Agrega contas (≠ 'paga') em buckets de aging — mesmo shape de AgingBucket. */
function deriveAging(contas: ContaItem[]) {
  const hoje = new Date()
  const map = new Map(AGING_BUCKETS.map((label) => [label, { label, payable: 0, receivable: 0 }]))
  for (const c of contas) {
    if (c.status === 'paga') continue
    const b = map.get(bucketDe(c.vencimento, hoje))!
    if (c.tipo === 'pagar') b.payable += c.valor
    else b.receivable += c.valor
  }
  return AGING_BUCKETS.map((label) => map.get(label)!)
}

export function Caixa() {
  const { periodo } = useFinanceiroCtx()
  const { snapshot, derivados } = useFinance(periodo)
  // Deep-link da aba via ?aba=dre|contas|impostos (ex.: botão "Abrir DRE" do Comando).
  const [searchParams] = useSearchParams()
  const abaParam = searchParams.get('aba')
  const blocoInicial = (BLOCOS.some((b) => b.value === abaParam) ? abaParam : 'fluxo') as Bloco
  const [bloco, setBloco] = useState<Bloco>(blocoInicial)
  useEffect(() => {
    if (abaParam && BLOCOS.some((b) => b.value === abaParam)) setBloco(abaParam as Bloco)
  }, [abaParam])
  const [cen, setCen] = useState<Cenario>('base')

  // Série RECOMPUTADA pelo cenário — memoizada por (período, cenário).
  const pontos = useMemo(() => applyCenario(snapshot.cash.points, cen), [snapshot, cen])
  const at = (d: number) => pontos[d]?.base ?? 0
  const caixaHoje = pontos[0]?.base ?? snapshot.meta.caixaConsolidado
  const cenLabel = CENARIOS.find((c) => c.value === cen)!.label
  // DRE editável (store-backed, com ids); resultado/lucro bruto recomputados das linhas.
  const dreEditavel = snapshot.dre as EditableDRELine[]
  const rec = recomputeDre(dreEditavel)
  const noVermelho = rec.resultado < 0

  // Contas editáveis (store-backed via overlay) + aging DERIVADO delas (≠ snapshot congelado).
  const contas = snapshot.contas as EditableContaItem[]
  const aging = useMemo(() => deriveAging(contas), [contas])
  // Aging: maior barra do conjunto = escala comum.
  const agingMax = Math.max(...aging.map((a) => Math.max(a.payable, a.receivable)), 1)

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Hero da tela ── */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl leading-tight text-foreground">
            O <span className="text-gold">caixa</span> não mente
          </h1>
          <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-text-secondary">
            {snapshot.meta.periodoLabel} · seu fluxo de caixa, o resultado do mês e as contas a
            pagar e a receber, tudo num lugar só.
          </p>
          <ProvLegend className="mt-3" />
        </div>
        <SegmentedControl<Bloco> value={bloco} onChange={setBloco} options={BLOCOS as unknown as { label: string; value: Bloco }[]} />
      </div>

      {/* ════════════════════════ FLUXO DE CAIXA ════════════════════════ */}
      {bloco === 'fluxo' && (
        <>
          {/* Cartões de projeção (ilustrativo) */}
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {[
              { l: 'Caixa hoje', v: caixaHoje, t: 'text-foreground', i: Wallet },
              { l: 'Projetado 30d', v: at(30), t: at(30) < caixaHoje ? 'text-warning' : 'text-foreground', i: TrendingDown },
              { l: 'Projetado 60d', v: at(60), t: at(60) < caixaHoje ? 'text-warning' : 'text-foreground', i: TrendingDown },
              { l: 'Projetado 90d', v: at(90), t: at(90) >= caixaHoje ? 'text-success' : 'text-foreground', i: TrendingUp },
            ].map((s) => (
              <div key={s.l} className="rounded-card border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.l}</span>
                  <s.i className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
                </div>
                <div className={`tnum mt-2 text-[22px] font-bold leading-none ${s.t}`}>{brlCompact(s.v)}</div>
                <div className="mt-1.5"><ProvBadge prov="ilustrativo" /></div>
              </div>
            ))}
          </div>

          {/* Projeção 90d + seletor de cenário (RECOMPUTA a série) */}
          <Section
            title="Projeção de caixa · 90 dias"
            meta="Faixa provável do saldo · marcos de vencimento"
            prov="ilustrativo"
          >
            <CashProjection points={pontos} events={snapshot.cash.events} max={snapshot.cash.max} height={320} />
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-3 text-[12px]">
              {snapshot.cash.events.map((e) => (
                <span key={e.label + e.day} className="flex items-center gap-2 text-text-secondary">
                  <i className={`size-2 rounded-[2px] ${e.type === 'in' ? 'bg-success' : 'bg-danger'}`} />
                  <span className="tnum text-text-muted">d{e.day}</span>
                  {e.label}
                  <b className={`tnum font-semibold ${e.type === 'in' ? 'text-success' : 'text-danger'}`}>
                    {e.type === 'in' ? '+' : '−'}
                    {brlCompact(e.value).replace('−', '')}
                  </b>
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-snug text-text-muted">
              Estimativa ancorada no caixa de hoje — não é extrato bancário. Reflete a projeção do período.
            </p>
          </Section>
        </>
      )}

      {/* ════════════════════════ DRE GERENCIAL (EDITÁVEL) ════════════════════════ */}
      {bloco === 'dre' && (
        <DreEditavel
          key={periodo}
          periodo={periodo}
          dre={dreEditavel}
          derivados={derivados}
          periodoLabel={snapshot.meta.periodoLabel}
        />
      )}

      {/* ════════════════════════ CONTAS / AGING ════════════════════════ */}
      {bloco === 'contas' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Aging · a pagar × a receber" meta="Saldos por janela de vencimento (derivado das contas, a partir de hoje)" prov="parcial">
            <div className="space-y-3.5 pt-1">
              {aging.map((a) => (
                <div key={a.label} className="grid grid-cols-[88px_1fr] items-center gap-4">
                  <span className="text-[12px] font-medium text-text-secondary">{a.label}</span>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-3 rounded-sub bg-success/80" style={{ width: `${(a.receivable / agingMax) * 100}%` }} />
                      <span className="tnum text-[11px] text-success">{brlCompact(a.receivable)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 rounded-sub bg-danger/70" style={{ width: `${(a.payable / agingMax) * 100}%` }} />
                      <span className="tnum text-[11px] text-danger">{brlCompact(a.payable)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-5 border-t border-border/60 pt-3 text-[11.5px]">
                <span className="flex items-center gap-1.5 text-text-secondary"><i className="size-2.5 rounded-[2px] bg-success" />A receber</span>
                <span className="flex items-center gap-1.5 text-text-secondary"><i className="size-2.5 rounded-[2px] bg-danger" />A pagar</span>
              </div>
            </div>
          </Section>

          <ContasEditavel periodo={periodo} contas={contas} />
        </div>
      )}

      {/* ════════════════════════ IMPOSTOS ════════════════════════ */}
      {bloco === 'impostos' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Section
            className="xl:col-span-2"
            title="Simples Nacional · whisky"
            meta={`${snapshot.tax.anexo} · ${snapshot.tax.faixa}`}
            prov="ilustrativo"
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { l: 'Alíquota nominal', v: pct(snapshot.tax.aliquotaNominal), t: 'text-foreground', p: 'ilustrativo' as Provenance },
                { l: 'Alíquota efetiva', v: pct(snapshot.tax.aliquotaEfetiva), t: 'text-success', p: 'parcial' as Provenance },
                { l: 'Faturamento 12m', v: brlCompact(snapshot.tax.rbt12), t: 'text-foreground', p: 'ilustrativo' as Provenance },
                { l: 'DAS do mês', v: brlCompact(snapshot.tax.dasValor), t: 'text-warning', p: 'ilustrativo' as Provenance },
              ].map((s) => (
                <div key={s.l} className="rounded-sub border border-border bg-muted/40 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{s.l}</div>
                    <ProvBadge prov={s.p} />
                  </div>
                  <div className={`tnum mt-1.5 text-[19px] font-bold ${s.t}`}>{s.v}</div>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {snapshot.tax.notas.map((n, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12px] leading-snug text-text-secondary">
                  <FileText className="mt-0.5 size-3.5 shrink-0 text-gold" strokeWidth={1.8} />
                  {n}
                </li>
              ))}
            </ul>
          </Section>

          <div className="space-y-6">
            <Section title="Próximo DAS" prov="ilustrativo">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-sub bg-warning/[0.13] text-warning">
                  <CalendarClock className="size-5" strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-[11px] text-text-muted">Vencimento</div>
                  <div className="tnum text-[17px] font-semibold text-foreground">{snapshot.tax.dasVencimento}</div>
                </div>
              </div>
              <div className="tnum mt-3 text-[26px] font-bold text-warning">{brl(snapshot.tax.dasValor, 0)}</div>
              <p className="mt-1 text-[11.5px] text-text-secondary">Provisionado no fluxo de caixa (pin d20).</p>
            </Section>

            <Section title="Enquadramento" prov="parcial">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-sub bg-info/[0.12] text-info">
                  <ShieldAlert className="size-5" strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-[11px] text-text-muted">Regime correto</div>
                  <div className="text-[14px] font-semibold text-foreground">Acima do teto MEI</div>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-snug text-text-secondary">
                Faturamento {brlCompact(snapshot.tax.rbt12)}/ano supera o teto MEI ({brlCompact(snapshot.tax.tetoMei)}).
                Regime: <b className="text-foreground">{snapshot.tax.regime}</b>.
              </p>
            </Section>
          </div>
        </div>
      )}

      {/* Rodapé contextual do período (sempre visível) */}
      <p className="text-[11px] leading-snug text-text-muted">
        {snapshot.meta.fonte} · gerado em {snapshot.meta.geradoEm}.{' '}
        {noVermelho
          ? `${snapshot.meta.periodoLabel} fechou em ${brl(rec.resultado, 0)} — primeiro mês no vermelho.`
          : `${snapshot.meta.periodoLabel} fechou em ${brl(rec.resultado, 0)}.`}
      </p>
    </div>
  )
}

// ════════════════════════ DRE EDITÁVEL ════════════════════════
const TIPO_OPTS = [
  { label: 'Dedução', value: 'ded' },
  { label: 'Imposto', value: 'tax' },
  { label: 'Fixo', value: 'fixed' },
] as const

/** Badge de proveniência para lançamentos ajustados pelo usuário (≠ baseline). */
function AjustadoBadge() {
  return (
    <span
      className="inline-flex items-center rounded-sub border border-gold/30 bg-gold/[0.1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold"
      title="Lançamento ajustado pelo usuário (≠ baseline reconciliado)"
    >
      ajustado
    </span>
  )
}

/** DRE gerencial EDITÁVEL: edição inline de valor, adicionar/excluir despesa, voltar ao baseline. */
function DreEditavel({
  periodo,
  dre,
  derivados,
  periodoLabel,
}: {
  periodo: Periodo
  dre: EditableDRELine[]
  derivados: { chargebacks: number; receita: number }
  periodoLabel: string
}) {
  const editDRELine = useFinanceiroStore((s) => s.editDRELine)
  const addDRELine = useFinanceiroStore((s) => s.addDRELine)
  const removeDRELine = useFinanceiroStore((s) => s.removeDRELine)
  const resetarPeriodo = useFinanceiroStore((s) => s.resetarPeriodo)

  const [editing, setEditing] = useState<{ id: string; field: 'value' | 'label' | 'plan' } | null>(null)
  const [editVal, setEditVal] = useState('')
  const [adding, setAdding] = useState(false)
  const [fLabel, setFLabel] = useState('')
  const [fKind, setFKind] = useState<DREKind>('ded')
  const [fValor, setFValor] = useState('')
  const [fPlano, setFPlano] = useState('')

  const rec = recomputeDre(dre)
  const lastIdx = dre.length - 1

  const startEdit = (l: EditableDRELine, field: 'value' | 'label' | 'plan') => {
    setEditing({ id: l.id, field })
    if (field === 'label') setEditVal(l.label)
    else if (field === 'plan') setEditVal(l.plan != null ? String(Math.abs(l.plan)) : '')
    else setEditVal(String(Math.abs(l.value)))
  }
  const commit = (l: EditableDRELine) => {
    if (!editing) return
    if (editing.field === 'label') {
      if (editVal.trim() !== '') editDRELine(periodo, l.id, { label: editVal.trim() })
    } else {
      const n = Number(editVal)
      if (editVal.trim() !== '' && !Number.isNaN(n)) {
        const signed = l.kind === 'rev' ? Math.abs(n) : -Math.abs(n)
        editDRELine(periodo, l.id, editing.field === 'plan' ? { plan: signed } : { value: signed })
      }
    }
    setEditing(null)
  }

  const salvarNovo = () => {
    const v = Number(fValor)
    if (fLabel.trim() === '' || Number.isNaN(v) || v <= 0) return
    const plano = fPlano.trim() !== '' && !Number.isNaN(Number(fPlano)) ? -Math.abs(Number(fPlano)) : undefined
    addDRELine(periodo, { label: fLabel.trim(), value: -Math.abs(v), kind: fKind, plan: plano })
    setFLabel('')
    setFValor('')
    setFPlano('')
    setFKind('ded')
    setAdding(false)
  }

  const podeSalvar = fLabel.trim() !== '' && Number(fValor) > 0

  return (
    <Section
      title={`Resultado do mês (DRE) · ${periodoLabel}`}
      meta={`Receita − custos − despesas · editável · fecha em ${brl(rec.resultado, 0)}`}
      prov="real"
      right={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-sub border border-gold/40 bg-gold/[0.08] px-2.5 py-1 text-[11px] font-medium text-gold transition-colors hover:bg-gold/[0.14]"
          >
            <Plus className="size-3" /> Lançar despesa
          </button>
          <button
            type="button"
            onClick={() => {
              resetarPeriodo(periodo)
              setEditing(null)
              setAdding(false)
            }}
            title="Voltar ao baseline reconciliado"
            className="inline-flex items-center gap-1.5 rounded-sub border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Baseline
          </button>
        </div>
      }
    >
      <p className="mb-3 text-[12px] leading-snug text-text-secondary">
        Resumo do mês: a receita menos os custos e as despesas dá o resultado. Para contas com{' '}
        <b className="text-foreground">vencimento</b> (a pagar / a receber), use a aba{' '}
        <b className="text-gold">Contas a pagar/receber</b>.
      </p>
      <div className="grid grid-cols-[1.7fr_1fr_1fr_1fr_28px] gap-3 border-b border-border/60 px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        <span>Linha</span>
        <span className="text-right">Realizado</span>
        <span className="text-right">Plano</span>
        <span className="text-right">Variação</span>
        <span />
      </div>

      {dre.map((l, i) => {
        const st = dreStyle(l.kind)
        const isLB = isLucroBrutoLine(l)
        const isRes = i === lastIdx
        const computed = isLB || isRes
        const despesa = DESPESA_KINDS.includes(l.kind)
        const displayValue = isLB ? rec.lucroBruto : isRes ? rec.resultado : l.value
        const displayPct = isLB ? rec.margemPct : l.pct
        const variance = l.plan != null ? displayValue - l.plan : null
        // Linha de resultado: cor segue o SINAL recomputado (neg→danger, pos→dourado),
        // não o kind congelado — senão um resultado positivo apareceria vermelho.
        const resNeg = isRes && displayValue < 0
        const rowCls = isRes ? (resNeg ? 'bg-danger/[0.06]' : 'bg-gold/[0.05]') : st.row
        const valCls = isRes ? (resNeg ? 'font-semibold text-danger' : 'font-semibold text-gold') : st.val
        return (
          <div
            key={l.id}
            className={`group grid grid-cols-[1.7fr_1fr_1fr_1fr_28px] items-center gap-3 rounded-sub px-3 py-2.5 ${rowCls}`}
          >
            <span className={`flex items-center gap-2 text-[13px] ${st.label}`}>
              {editing?.id === l.id && editing.field === 'label' ? (
                <input
                  autoFocus
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commit(l); if (e.key === 'Escape') setEditing(null) }}
                  onBlur={() => commit(l)}
                  className="min-w-0 flex-1 rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-[13px] text-foreground outline-none"
                />
              ) : computed ? (
                <span>{l.label}</span>
              ) : (
                <button type="button" onClick={() => startEdit(l, 'label')} title="Clique para renomear" className="text-left transition-colors hover:text-gold">
                  {l.label}
                </button>
              )}
              {displayPct != null && <span className="tnum text-[11px] font-medium text-gold">{pct(displayPct)}</span>}
              {l.edited && <AjustadoBadge />}
            </span>

            {/* Realizado — editável (exceto linhas computadas) */}
            {computed ? (
              <span className={`tnum text-right text-[13px] ${valCls}`}>{brl(displayValue, 0)}</span>
            ) : editing?.id === l.id && editing.field === 'value' ? (
              <span className="flex items-center justify-end gap-1">
                <span className="text-[11px] text-muted-foreground">R$</span>
                <input
                  autoFocus
                  type="number"
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit(l)
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  onBlur={() => commit(l)}
                  className="tnum w-24 rounded-sub border border-gold/40 bg-background px-2 py-1 text-right text-[13px] font-semibold text-foreground outline-none"
                />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(l, 'value')}
                className={`tnum text-right text-[13px] ${st.val} underline-offset-2 transition-colors hover:text-gold hover:underline`}
                title="Clique para editar"
              >
                {brl(displayValue, 0)}
              </button>
            )}

            {computed ? (
              <span className="tnum text-right text-[12.5px] text-text-muted">{l.plan != null ? brl(l.plan, 0) : '—'}</span>
            ) : editing?.id === l.id && editing.field === 'plan' ? (
              <span className="flex items-center justify-end gap-1">
                <span className="text-[11px] text-muted-foreground">R$</span>
                <input
                  autoFocus
                  type="number"
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commit(l); if (e.key === 'Escape') setEditing(null) }}
                  onBlur={() => commit(l)}
                  className="tnum w-20 rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-right text-[12.5px] text-foreground outline-none"
                />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(l, 'plan')}
                className="tnum text-right text-[12.5px] text-text-muted underline-offset-2 transition-colors hover:text-gold hover:underline"
                title="Clique para definir o plano"
              >
                {l.plan != null ? brl(l.plan, 0) : '—'}
              </button>
            )}
            <span
              className={`tnum text-right text-[12.5px] font-medium ${
                variance == null ? 'text-text-muted' : variance >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {variance == null ? '—' : (variance >= 0 ? '+' : '−') + brlCompact(Math.abs(variance)).replace('−', '')}
            </span>

            {/* Excluir (só despesas) */}
            <span className="flex justify-end">
              {despesa && (
                <button
                  type="button"
                  onClick={() => removeDRELine(periodo, l.id)}
                  title="Excluir lançamento"
                  className="grid size-6 place-items-center rounded-sub text-text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.8} />
                </button>
              )}
            </span>
          </div>
        )
      })}

      {/* Formulário de adição (sóbrio, inline) */}
      {adding && (
        <div className="mt-3 rounded-sub border border-gold/30 bg-gold/[0.04] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Categoria</span>
              <input
                value={fLabel}
                onChange={(e) => setFLabel(e.target.value)}
                placeholder="ex: (−) Frete extra"
                className="rounded-sub border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-gold/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Tipo</span>
              <SegmentedControl<DREKind>
                size="sm"
                value={fKind}
                onChange={setFKind}
                options={TIPO_OPTS as unknown as { label: string; value: DREKind }[]}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Valor (R$)</span>
              <input
                type="number"
                value={fValor}
                onChange={(e) => setFValor(e.target.value)}
                placeholder="0"
                className="tnum w-28 rounded-sub border border-border bg-background px-2.5 py-1.5 text-right text-[13px] text-foreground outline-none focus:border-gold/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Plano (opc.)</span>
              <input
                type="number"
                value={fPlano}
                onChange={(e) => setFPlano(e.target.value)}
                placeholder="—"
                className="tnum w-24 rounded-sub border border-border bg-background px-2.5 py-1.5 text-right text-[13px] text-foreground outline-none focus:border-gold/40"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={salvarNovo}
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
          <p className="mt-2.5 text-[11px] text-text-muted">
            Adicionando em <b className="text-text-secondary">{periodoLabel}</b> · novos lançamentos entram como{' '}
            <span className="font-semibold text-gold">ajustado</span> e o resultado recompõe na hora.
          </p>
        </div>
      )}

      {/* Nota de chargebacks (sinal de risco, não linha da DRE) */}
      <div className="mt-4 flex items-start gap-2.5 rounded-sub border border-danger/30 bg-danger/[0.06] px-3 py-2.5">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.8} />
        <p className="text-[12px] leading-snug text-text-secondary">
          <b className="text-foreground">Chargebacks {brlCompact(derivados.chargebacks)}</b>{' '}
          ({derivados.receita ? pct((derivados.chargebacks / derivados.receita) * 100) : '—'} da receita) entram como
          <b> sinal de risco</b>, não como linha separada da DRE — não dobra-contar.{' '}
          <span className="text-text-muted">DRE gerencial (não contábil).</span>
        </p>
      </div>
    </Section>
  )
}

// ════════════════════════ CONTAS A PAGAR / RECEBER (EDITÁVEL) ════════════════════════
const TIPO_CONTA_OPTS = [
  { label: 'A pagar', value: 'pagar' },
  { label: 'A receber', value: 'receber' },
] as const
const STATUS_CONTA_OPTS = [
  { label: 'Aberta', value: 'aberta' },
  { label: 'Paga', value: 'paga' },
  { label: 'Vencida', value: 'vencida' },
] as const
// Atalhos de categoria (o João pediu "marketing / logística") — clica e preenche.
const CATEGORIAS_COMUNS = ['Marketing', 'Logística', 'Insumos', 'Impostos', 'Frete', 'B2B', 'Reembolso'] as const

const STATUS_TONE: Record<ContaItem['status'], string> = {
  vencida: 'border-danger/30 bg-danger/[0.1] text-danger',
  paga: 'border-success/30 bg-success/[0.1] text-success',
  aberta: 'border-border bg-muted/40 text-muted-foreground',
}

/** Contas a pagar/receber EDITÁVEL: lançamento (parte/categoria/tipo/valor/venc/status),
 *  edição inline e exclusão. Mesmo molde do DreEditavel; o aging deriva destas contas. */
function ContasEditavel({ periodo, contas }: { periodo: Periodo; contas: EditableContaItem[] }) {
  const addConta = useFinanceiroStore((s) => s.addConta)
  const editConta = useFinanceiroStore((s) => s.editConta)
  const removeConta = useFinanceiroStore((s) => s.removeConta)

  const [editing, setEditing] = useState<{ id: string; field: 'parte' | 'categoria' | 'valor' | 'vencimento' } | null>(null)
  const [editVal, setEditVal] = useState('')
  const [adding, setAdding] = useState(false)
  const [fParte, setFParte] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [fTipo, setFTipo] = useState<ContaItem['tipo']>('pagar')
  const [fValor, setFValor] = useState('')
  const [fVenc, setFVenc] = useState('')
  const [fStatus, setFStatus] = useState<ContaItem['status']>('aberta')

  const startEdit = (c: EditableContaItem, field: 'parte' | 'categoria' | 'valor' | 'vencimento') => {
    setEditing({ id: c.id, field })
    if (field === 'valor') setEditVal(String(c.valor))
    else setEditVal(c[field])
  }
  const commit = (c: EditableContaItem) => {
    if (!editing) return
    if (editing.field === 'valor') {
      const n = Number(editVal)
      if (editVal.trim() !== '' && !Number.isNaN(n) && n > 0) editConta(periodo, c.id, { valor: Math.abs(n) })
    } else if (editVal.trim() !== '') {
      const patch: Partial<ContaItem> = { [editing.field]: editVal.trim() }
      editConta(periodo, c.id, patch)
    }
    setEditing(null)
  }

  const salvarNovo = () => {
    const v = Number(fValor)
    if (fParte.trim() === '' || Number.isNaN(v) || v <= 0) return
    addConta(periodo, {
      id: '', // sobrescrito no store
      parte: fParte.trim(),
      tipo: fTipo,
      valor: Math.abs(v),
      vencimento: fVenc.trim(),
      status: fStatus,
      categoria: fCategoria.trim(),
    })
    setFParte('')
    setFCategoria('')
    setFTipo('pagar')
    setFValor('')
    setFVenc('')
    setFStatus('aberta')
    setAdding(false)
  }
  const podeSalvar = fParte.trim() !== '' && Number(fValor) > 0

  return (
    <Section
      title="Contas a pagar e a receber"
      meta="Lance o que tem a pagar e a receber · o aging ao lado se atualiza sozinho"
      prov="real"
      right={
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-sub border border-gold/40 bg-gold/[0.08] px-2.5 py-1 text-[11px] font-medium text-gold transition-colors hover:bg-gold/[0.14]"
        >
          <Plus className="size-3" /> Lançar conta
        </button>
      }
    >
      <p className="mb-3 text-[12px] leading-snug text-text-secondary">
        Lance aqui tudo que tem a <b className="text-foreground">pagar</b> (frete, impostos,
        fornecedores) e a <b className="text-foreground">receber</b> (vendas a prazo). Clique em
        qualquer campo pra editar.
      </p>
      <div className="grid grid-cols-[1.4fr_0.9fr_auto_auto_28px] gap-3 border-b border-border/60 px-1 pb-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        <span>Parte</span>
        <span>Categoria</span>
        <span className="text-right">Venc. / valor</span>
        <span className="text-right">Status</span>
        <span />
      </div>

      {contas.length === 0 && (
        <p className="px-1 py-4 text-[12px] text-text-muted">Nenhum lançamento. Clique em <b className="text-gold">Adicionar</b> para lançar uma conta a pagar ou a receber.</p>
      )}

      {contas.map((c) => (
        <div key={c.id} className="group grid grid-cols-[1.4fr_0.9fr_auto_auto_28px] items-center gap-3 rounded-sub px-1 py-2.5">
          {/* Parte (texto, click-to-edit) + indicador de tipo */}
          <div className="flex items-center gap-2">
            <i className={`size-2 shrink-0 rounded-[2px] ${c.tipo === 'receber' ? 'bg-success' : 'bg-danger'}`} />
            {editing?.id === c.id && editing.field === 'parte' ? (
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(c); if (e.key === 'Escape') setEditing(null) }}
                onBlur={() => commit(c)}
                className="min-w-0 flex-1 rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-[13px] text-foreground outline-none"
              />
            ) : (
              <button type="button" onClick={() => startEdit(c, 'parte')} title="Clique para renomear" className="text-left text-[13px] text-foreground transition-colors hover:text-gold">
                {c.parte}
              </button>
            )}
            {c.edited && <AjustadoBadge />}
          </div>

          {/* Categoria (texto livre, click-to-edit) */}
          {editing?.id === c.id && editing.field === 'categoria' ? (
            <input
              autoFocus
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(c); if (e.key === 'Escape') setEditing(null) }}
              onBlur={() => commit(c)}
              placeholder="ex: Marketing"
              className="min-w-0 rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-[12px] text-foreground outline-none"
            />
          ) : (
            <button type="button" onClick={() => startEdit(c, 'categoria')} title="Clique para editar a categoria" className="text-left text-[12px] text-text-muted transition-colors hover:text-gold">
              {c.categoria || '—'}
            </button>
          )}

          {/* Venc. / valor (click-to-edit cada) */}
          <span className="flex flex-col items-end gap-0.5">
            {editing?.id === c.id && editing.field === 'vencimento' ? (
              <input
                autoFocus
                type="date"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(c); if (e.key === 'Escape') setEditing(null) }}
                onBlur={() => commit(c)}
                className="tnum rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-[12px] text-foreground outline-none"
              />
            ) : (
              <button type="button" onClick={() => startEdit(c, 'vencimento')} title="Clique para editar o vencimento" className="tnum text-[12px] text-text-secondary underline-offset-2 transition-colors hover:text-gold hover:underline">
                {c.vencimento || '—'}
              </button>
            )}
            {editing?.id === c.id && editing.field === 'valor' ? (
              <span className="flex items-center justify-end gap-1">
                <span className="text-[11px] text-muted-foreground">R$</span>
                <input
                  autoFocus
                  type="number"
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commit(c); if (e.key === 'Escape') setEditing(null) }}
                  onBlur={() => commit(c)}
                  className="tnum w-24 rounded-sub border border-gold/40 bg-background px-2 py-0.5 text-right text-[13px] font-semibold text-foreground outline-none"
                />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(c, 'valor')}
                title="Clique para editar o valor"
                className={`tnum text-[13px] font-semibold underline-offset-2 transition-colors hover:text-gold hover:underline ${c.tipo === 'receber' ? 'text-success' : 'text-foreground'}`}
              >
                {brlCompact(c.valor)}
              </button>
            )}
          </span>

          {/* Tipo + Status (segmented inline, commit imediato) */}
          <span className="flex flex-col items-end gap-1">
            <SegmentedControl<ContaItem['tipo']>
              size="sm"
              value={c.tipo}
              onChange={(t) => editConta(periodo, c.id, { tipo: t })}
              options={TIPO_CONTA_OPTS as unknown as { label: string; value: ContaItem['tipo'] }[]}
            />
            <span className="flex items-center gap-1.5">
              <span className={`rounded-sub border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_TONE[c.status]}`}>{c.status}</span>
              <SegmentedControl<ContaItem['status']>
                size="sm"
                value={c.status}
                onChange={(st) => editConta(periodo, c.id, { status: st })}
                options={STATUS_CONTA_OPTS as unknown as { label: string; value: ContaItem['status'] }[]}
              />
            </span>
          </span>

          {/* Excluir */}
          <span className="flex justify-end">
            <button
              type="button"
              onClick={() => removeConta(periodo, c.id)}
              title="Excluir lançamento"
              className="grid size-6 place-items-center rounded-sub text-text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" strokeWidth={1.8} />
            </button>
          </span>
        </div>
      ))}

      {/* Formulário de adição (sóbrio, inline) */}
      {adding && (
        <div className="mt-3 rounded-sub border border-gold/30 bg-gold/[0.04] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[160px] flex-1 flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Parte</span>
              <input
                value={fParte}
                onChange={(e) => setFParte(e.target.value)}
                placeholder="ex: Distribuidora BH"
                className="rounded-sub border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-gold/40"
              />
            </label>
            <label className="flex min-w-[140px] flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Categoria</span>
              <input
                value={fCategoria}
                onChange={(e) => setFCategoria(e.target.value)}
                placeholder="ex: Marketing / Logística"
                className="rounded-sub border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-gold/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Tipo</span>
              <SegmentedControl<ContaItem['tipo']>
                size="sm"
                value={fTipo}
                onChange={setFTipo}
                options={TIPO_CONTA_OPTS as unknown as { label: string; value: ContaItem['tipo'] }[]}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Valor (R$)</span>
              <input
                type="number"
                value={fValor}
                onChange={(e) => setFValor(e.target.value)}
                placeholder="0"
                className="tnum w-28 rounded-sub border border-border bg-background px-2.5 py-1.5 text-right text-[13px] text-foreground outline-none focus:border-gold/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Vencimento</span>
              <input
                type="date"
                value={fVenc}
                onChange={(e) => setFVenc(e.target.value)}
                className="tnum rounded-sub border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-gold/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Status</span>
              <SegmentedControl<ContaItem['status']>
                size="sm"
                value={fStatus}
                onChange={setFStatus}
                options={STATUS_CONTA_OPTS as unknown as { label: string; value: ContaItem['status'] }[]}
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={salvarNovo}
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
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">Categorias rápidas</span>
            {CATEGORIAS_COMUNS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFCategoria(cat)}
                className={`rounded-sub border px-2 py-0.5 text-[11px] transition-colors ${
                  fCategoria === cat
                    ? 'border-gold/50 bg-gold/[0.1] text-gold'
                    : 'border-border text-text-secondary hover:border-gold/40 hover:text-gold'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-text-muted">
            Novos lançamentos entram como <span className="font-semibold text-gold">ajustado</span> e o aging
            (a pagar × a receber) recompõe na hora a partir do vencimento.
          </p>
        </div>
      )}
    </Section>
  )
}

export default Caixa
