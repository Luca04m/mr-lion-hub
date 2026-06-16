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
import { useMemo, useState } from 'react'
import { CalendarClock, ShieldAlert, FileText, Wallet, TrendingDown, TrendingUp } from 'lucide-react'
import { SegmentedControl } from '@/components/pro/SegmentedControl'
import { CashProjection } from '@/financeiro/charts'
import { useFinanceiroCtx } from '../FinanceiroLayout'
import { useFinance } from '../data/source'
import { brl, brlCompact, pct } from '../lib/format'
import type { CashPoint, DRELine, Provenance } from '../data/types'

// ── Badge de proveniência (sóbrio, dessaturado) ──────────────────────────
const PROV_TONE: Record<Provenance, string> = {
  real: 'bg-success/[0.12] text-success border-success/30',
  parcial: 'bg-info/[0.12] text-info border-info/30',
  ilustrativo: 'bg-warning/[0.12] text-warning border-warning/30',
}
const PROV_LABEL: Record<Provenance, string> = {
  real: 'real',
  parcial: 'parcial',
  ilustrativo: 'ilustrativo',
}
function ProvBadge({ prov, className = '' }: { prov: Provenance; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sub border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${PROV_TONE[prov]} ${className}`}
      title={`Proveniência do dado: ${PROV_LABEL[prov]}`}
    >
      {PROV_LABEL[prov]}
    </span>
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
  { label: 'Fluxo', value: 'fluxo' },
  { label: 'DRE', value: 'dre' },
  { label: 'Contas', value: 'contas' },
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

export function Caixa() {
  const { periodo } = useFinanceiroCtx()
  const { snapshot, derivados } = useFinance(periodo)
  const [bloco, setBloco] = useState<Bloco>('fluxo')
  const [cen, setCen] = useState<Cenario>('base')

  // Série RECOMPUTADA pelo cenário — memoizada por (período, cenário).
  const pontos = useMemo(() => applyCenario(snapshot.cash.points, cen), [snapshot, cen])
  const at = (d: number) => pontos[d]?.base ?? 0
  const caixaHoje = pontos[0]?.base ?? snapshot.meta.caixaConsolidado
  const cenLabel = CENARIOS.find((c) => c.value === cen)!.label
  const resultadoLinha = snapshot.dre.find((d) => d.kind === 'loss')
    ?? snapshot.dre[snapshot.dre.length - 1]
  const noVermelho = resultadoLinha.value < 0

  // Aging: maior barra do conjunto = escala comum.
  const agingMax = Math.max(...snapshot.aging.map((a) => Math.max(a.payable, a.receivable)), 1)

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Hero da tela ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl leading-tight text-foreground">
            O <span className="text-gold">caixa</span> não mente
          </h1>
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
            {snapshot.meta.periodoLabel} · projeção timing-aware com vencimentos do Bling, DRE
            gerencial real, contas a pagar/receber e a conta do Simples Nacional.
          </p>
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
            meta={`Banda de confiança P10–P90 · pins de vencimento · cenário ${cenLabel}`}
            prov="ilustrativo"
            right={
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Cenário</span>
                <SegmentedControl<Cenario>
                  size="sm"
                  value={cen}
                  onChange={setCen}
                  options={CENARIOS as unknown as { label: string; value: Cenario }[]}
                />
              </div>
            }
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
              Modelo determinístico ancorado no caixa consolidado — NÃO é fechamento bancário. O cenário
              <b className="text-text-secondary"> {cenLabel}</b> recalcula o drawdown e a banda de
              confiança; <b className="text-text-secondary">Base</b> reflete a série original do período.
            </p>
          </Section>
        </>
      )}

      {/* ════════════════════════ DRE GERENCIAL ════════════════════════ */}
      {bloco === 'dre' && (
        <Section
          title={`DRE gerencial · ${snapshot.meta.periodoLabel}`}
          meta={`Realizado vs plano · receita ao resultado · fecha em ${brl(resultadoLinha.value, 0)}`}
          prov="real"
        >
          <div className="grid grid-cols-[1.7fr_1fr_1fr_1fr] gap-3 border-b border-border/60 px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            <span>Linha</span>
            <span className="text-right">Realizado</span>
            <span className="text-right">Plano</span>
            <span className="text-right">Variação</span>
          </div>
          {snapshot.dre.map((l) => {
            const st = dreStyle(l.kind)
            const variance = l.plan != null ? l.value - l.plan : null
            return (
              <div key={l.label} className={`grid grid-cols-[1.7fr_1fr_1fr_1fr] items-center gap-3 rounded-sub px-3 py-2.5 ${st.row}`}>
                <span className={`text-[13px] ${st.label}`}>
                  {l.label}
                  {l.pct != null && <span className="tnum ml-2 text-[11px] font-medium text-gold">{pct(l.pct)}</span>}
                </span>
                <span className={`tnum text-right text-[13px] ${st.val}`}>{brl(l.value, 0)}</span>
                <span className="tnum text-right text-[12.5px] text-text-muted">{l.plan != null ? brl(l.plan, 0) : '—'}</span>
                <span
                  className={`tnum text-right text-[12.5px] font-medium ${
                    variance == null ? 'text-text-muted' : variance >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {variance == null ? '—' : (variance >= 0 ? '+' : '−') + brlCompact(Math.abs(variance)).replace('−', '')}
                </span>
              </div>
            )
          })}
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
      )}

      {/* ════════════════════════ CONTAS / AGING ════════════════════════ */}
      {bloco === 'contas' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Aging · a pagar × a receber" meta="Saldos por janela de vencimento" prov="ilustrativo">
            <div className="space-y-3.5 pt-1">
              {snapshot.aging.map((a) => (
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

          <Section title="Lançamentos" meta="Vencimentos próximos · espelho Bling /contas" prov="ilustrativo">
            <div className="grid grid-cols-[1.4fr_0.9fr_auto_auto] gap-3 border-b border-border/60 px-1 pb-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              <span>Parte</span>
              <span>Categoria</span>
              <span className="text-right">Venc. / valor</span>
              <span className="text-right">Status</span>
            </div>
            {snapshot.contas.map((c) => (
              <div key={c.id} className="grid grid-cols-[1.4fr_0.9fr_auto_auto] items-center gap-3 px-1 py-2.5">
                <div className="flex items-center gap-2">
                  <i className={`size-2 rounded-[2px] ${c.tipo === 'receber' ? 'bg-success' : 'bg-danger'}`} />
                  <span className="text-[13px] text-foreground">{c.parte}</span>
                </div>
                <span className="text-[12px] text-text-muted">{c.categoria}</span>
                <span className="text-right">
                  <span className="tnum block text-[12px] text-text-secondary">{c.vencimento}</span>
                  <span className={`tnum block text-[13px] font-semibold ${c.tipo === 'receber' ? 'text-success' : 'text-foreground'}`}>
                    {brlCompact(c.valor)}
                  </span>
                </span>
                <span className="flex justify-end">
                  <span
                    className={`rounded-sub border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      c.status === 'vencida'
                        ? 'border-danger/30 bg-danger/[0.1] text-danger'
                        : c.status === 'paga'
                          ? 'border-success/30 bg-success/[0.1] text-success'
                          : 'border-border bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {c.status}
                  </span>
                </span>
              </div>
            ))}
          </Section>
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
                { l: 'RBT12', v: brlCompact(snapshot.tax.rbt12), t: 'text-foreground', p: 'ilustrativo' as Provenance },
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
          ? `${snapshot.meta.periodoLabel} fechou em ${brl(resultadoLinha.value, 0)} — primeiro mês no vermelho.`
          : `${snapshot.meta.periodoLabel} fechou em ${brl(resultadoLinha.value, 0)}.`}
      </p>
    </div>
  )
}

export default Caixa
