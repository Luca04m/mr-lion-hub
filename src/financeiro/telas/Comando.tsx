// Tela COMANDO (/financeiro) — "onde está cada real".
// Period-aware: TUDO deriva de useFinance(periodo) + do snapshot REAL do período
// (Jan ↔ Fev trocam o snapshot inteiro, não Fev congelado). Reskin SÓBRIO sobre os
// tokens canônicos do Hub (gold/success/danger/warning/info), sem neon/glow.
// Cada bloco de dado carrega um badge de proveniência (real/parcial/ilustrativo).
import type { ReactNode } from 'react'
import {
  Zap, ShieldAlert, Wallet, ArrowRight, Flame, Ban,
  Truck, RotateCcw, Receipt, Settings2, Users, Megaphone, CircleDollarSign,
} from 'lucide-react'
import { StatusPill } from '@/components/pro'
import { cn } from '@/lib/utils'
import { useFinanceiroCtx } from '../FinanceiroLayout'
import { useFinance } from '../data/source'
import { WaterfallChart, DivergingBars, Sparkline } from '../charts'
import type { Provenance, Kpi, DRELine } from '../data/types'
import { brl, brlCompact, pct, mult } from '../lib/format'

// ── Proveniência: badge sóbrio reutilizando StatusPill do Hub ───────────────
const PROV: Record<Provenance, { label: string; tone: 'gold' | 'info' | 'neutral' }> = {
  real: { label: 'Real', tone: 'gold' },
  parcial: { label: 'Parcial · computado', tone: 'info' },
  ilustrativo: { label: 'Ilustrativo · modelo', tone: 'neutral' },
}
function ProvBadge({ prov, className }: { prov: Provenance; className?: string }) {
  const p = PROV[prov]
  return <StatusPill label={p.label} tone={p.tone} className={className} />
}

// ── Painel sóbrio local (o Hub não tem <Panel>; o do covil usava glow) ──────
function Panel({
  title, meta, prov, right, className, children,
}: {
  title: string
  meta?: string
  prov?: Provenance
  right?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('rounded-card border border-border bg-card p-5 shadow-soft', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] leading-tight text-foreground">{title}</h3>
          {meta && <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{meta}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          {prov && <ProvBadge prov={prov} />}
        </div>
      </header>
      {children}
    </section>
  )
}

// ── Mapeamento de accent dos KPIs (snapshot) → cor do Hub (sóbrio) ──────────
const KPI_SPARK: Record<Kpi['accent'], string> = {
  gold: 'hsl(var(--gold))',
  green: 'hsl(var(--success))',
  red: 'hsl(var(--danger))',
  blue: 'hsl(var(--info))',
  neutral: 'hsl(var(--muted-foreground))',
}
const KPI_VALUE: Record<Kpi['accent'], string> = {
  gold: 'text-gold',
  green: 'text-success',
  red: 'text-danger',
  blue: 'text-info',
  neutral: 'text-foreground',
}
const DELTA_TONE: Record<Kpi['deltaDir'], string> = {
  up: 'text-success',
  down: 'text-danger',
  warn: 'text-warning',
  flat: 'text-muted-foreground',
}

function KpiHero({ k, primary }: { k: Kpi; primary?: boolean }) {
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between rounded-card border bg-card p-4 transition-colors',
        primary ? 'border-gold/40 shadow-elevated' : 'border-border shadow-soft',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {k.label}
        </span>
        <ProvBadge prov={k.prov} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className={cn('tnum font-bold leading-none', primary ? 'text-[26px]' : 'text-[22px]', KPI_VALUE[k.accent])}>
            {k.value}
          </div>
          {k.delta && (
            <div className={cn('tnum mt-1.5 text-[11px] font-medium', DELTA_TONE[k.deltaDir])}>{k.delta}</div>
          )}
        </div>
        {k.spark.length > 1 && <Sparkline data={k.spark} color={KPI_SPARK[k.accent]} w={62} h={26} />}
      </div>
      <p className="mt-3 border-t border-border/60 pt-2.5 text-[11px] leading-snug text-muted-foreground">{k.note}</p>
    </div>
  )
}

// ── Composição de despesa: lê as linhas dedutíveis da DRE REAL do período ───
const EXP_ICON: { test: RegExp; Icon: typeof Truck }[] = [
  { test: /log[íi]stica|frete/i, Icon: Truck },
  { test: /reembolso|contesta/i, Icon: RotateCcw },
  { test: /contabil|taxa|imposto/i, Icon: Receipt },
  { test: /sistema|ferramenta/i, Icon: Settings2 },
  { test: /pessoal|sal[áa]rio|comiss/i, Icon: Users },
  { test: /tr[áa]fego|marketing|m[íi]dia/i, Icon: Megaphone },
]
function expIcon(label: string) {
  return (EXP_ICON.find((e) => e.test.test(label))?.Icon) ?? CircleDollarSign
}

const ALERT_META: Record<'act' | 'risk' | 'info', { Icon: typeof Zap; ring: string; chip: string; tag: string }> = {
  act: { Icon: Zap, ring: 'border-gold/35', chip: 'bg-gold/[0.12] text-gold', tag: 'text-gold' },
  risk: { Icon: ShieldAlert, ring: 'border-danger/35', chip: 'bg-danger/[0.12] text-danger', tag: 'text-danger' },
  info: { Icon: Wallet, ring: 'border-info/35', chip: 'bg-info/[0.12] text-info', tag: 'text-info' },
}

export function Comando() {
  const { periodo } = useFinanceiroCtx()
  const { snapshot: f, derivados: d } = useFinance(periodo)

  const isLoss = d.resultado < 0
  const resultadoTone = isLoss ? 'text-danger' : 'text-success'

  // Veredito de canal: candidato a KILL (computado do split de canal do período).
  const killer = f.channels.find((c) => c.kill || c.cm2 < 0)

  // Linhas de despesa = deduções/impostos/fixos da DRE REAL (exclui receita/CMV/subtotais).
  const expLines: DRELine[] = f.dre.filter(
    (l) => (l.kind === 'ded' || l.kind === 'tax' || l.kind === 'fixed') && l.value < 0,
  )
  const totalExp = expLines.reduce((a, l) => a + Math.abs(l.value), 0)
  const maiorDespesa = expLines.reduce((a, l) => (Math.abs(l.value) > Math.abs(a.value) ? l : a), expLines[0])

  // Chargebacks REAIS do período (vêm do KPI 'chargeback' → derivado).
  const cbKpi = f.kpis.find((k) => k.key === 'chargeback')

  return (
    <div className="space-y-6">
      {/* ── Header narrativo period-aware ── */}
      <div>
        <h2 className="font-display text-[clamp(22px,2.4vw,30px)] leading-[1.05] text-foreground">
          Onde está <span className="text-gold">cada real</span> · {f.meta.periodoLabel}
        </h2>
        <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-muted-foreground">
          {isLoss ? (
            <>
              {f.meta.periodoLabel} fechou em{' '}
              <b className={cn('font-semibold', resultadoTone)}>{brl(d.resultado)}</b> — o primeiro mês no
              vermelho. A cascata aponta os culpados: <b className="font-medium text-foreground">chargebacks
              a {cbKpi?.delta ?? '8,3%'}</b> e o <b className="font-medium text-foreground">tráfego de
              R$ 12 mil sem retorno proporcional</b>.
            </>
          ) : (
            <>
              {f.meta.periodoLabel} fechou em{' '}
              <b className={cn('font-semibold', resultadoTone)}>{brl(d.resultado)}</b> — no azul, mas com
              margem bruta apertada (<b className="font-medium text-foreground">{pct(d.margemBrutaPct)}</b>)
              por CMV alto. Folga real só atacando o custo do produto.
            </>
          )}
        </p>
      </div>

      {/* ── KPIs hero do período (vêm prontos do snapshot, com prov) ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {f.kpis.map((k, i) => (
          <KpiHero key={k.key} k={k} primary={i === 0} />
        ))}
      </div>

      {/* ── ALERTA destacado: o evento crítico do período ── */}
      {f.alerts.slice(0, 1).map((a) => {
        const m = ALERT_META[a.kind]
        return (
          <div
            key={a.id}
            className={cn('flex items-center gap-4 rounded-card border bg-card p-4 shadow-soft', m.ring)}
          >
            <div className={cn('grid size-11 shrink-0 place-items-center rounded-sub', m.chip)}>
              <m.Icon className="size-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] font-bold uppercase tracking-[0.08em]', m.tag)}>{a.tag}</span>
                <ProvBadge prov="real" />
              </div>
              <p className="mt-1 text-[13px] leading-snug text-foreground">{a.text}</p>
            </div>
            <button className="hidden shrink-0 items-center gap-1.5 rounded-btn border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold sm:flex">
              {a.cta}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )
      })}

      {/* ── Cascata da DRE: Receita → −CMV → LB → −Despesas → Resultado ── */}
      <Panel
        title="Cascata da DRE"
        meta={`Receita → −CMV → Lucro bruto → −Despesas → Resultado · fecha em ${brl(d.resultado)}`}
        prov="real"
        right={
          <span className="rounded-sub border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            R$ mil
          </span>
        }
      >
        <WaterfallChart steps={f.waterfall} />
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-[12px] sm:grid-cols-4">
          <div>
            <div className="tnum text-[15px] font-semibold text-foreground">{brl(d.receita)}</div>
            <div className="text-[11px] text-muted-foreground">Receita bruta</div>
          </div>
          <div>
            <div className="tnum text-[15px] font-semibold text-foreground">{brl(d.cmv)}</div>
            <div className="text-[11px] text-muted-foreground">(−) CMV</div>
          </div>
          <div>
            <div className="tnum text-[15px] font-semibold text-gold">{brl(d.lucroBruto)}</div>
            <div className="text-[11px] text-muted-foreground">Lucro bruto · {pct(d.margemBrutaPct)}</div>
          </div>
          <div>
            <div className={cn('tnum text-[15px] font-semibold', resultadoTone)}>{brl(d.resultado)}</div>
            <div className="text-[11px] text-muted-foreground">Resultado do mês</div>
          </div>
        </div>
      </Panel>

      {/* ── Veredito de canais (KILL) + composição de despesa ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Margem CM2 por canal"
          meta="Receita − CMV − taxas − frete − ad spend · total de tráfego é REAL, o split por canal é modelo"
          prov="ilustrativo"
        >
          <DivergingBars channels={f.channels} />
          {killer && (
            <div className="mt-3 flex items-start gap-3 border-t border-border/60 pt-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-sub bg-danger/[0.12] text-danger">
                <Ban className="size-4" strokeWidth={1.9} />
              </div>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                <b className="font-semibold text-danger">
                  {killer.cm2 < 0 ? `KILL · ${killer.name} CM2 ${brlCompact(killer.cm2)}.` : `Atenção · ${killer.name}.`}
                </b>{' '}
                {killer.prescription ??
                  `ROAS ${killer.roas != null ? mult(killer.roas) : '—'} vs break-even ${killer.breakeven != null ? mult(killer.breakeven) : '—'}.`}
                {killer.recover ? <> Recupera ~<span className="tnum">{brlCompact(killer.recover)}</span>/mês.</> : null}
              </p>
            </div>
          )}
        </Panel>

        <Panel
          title="Composição da despesa"
          meta={`${expLines.length} linhas operacionais · total ${brl(totalExp)} · maior peso: ${maiorDespesa.label.replace(/^\(−\)\s*/, '')}`}
          prov="real"
        >
          <ul className="flex flex-col gap-1.5">
            {expLines
              .slice()
              .sort((x, y) => Math.abs(y.value) - Math.abs(x.value))
              .map((l) => {
                const v = Math.abs(l.value)
                const share = totalExp ? (v / totalExp) * 100 : 0
                const Icon = expIcon(l.label)
                const isMidia = /tr[áa]fego|marketing|m[íi]dia/i.test(l.label)
                return (
                  <li key={l.label} className="flex items-center gap-3 rounded-sub px-1 py-1.5">
                    <div className="grid size-8 shrink-0 place-items-center rounded-sub bg-muted/60 text-muted-foreground">
                      <Icon className="size-4" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12.5px] text-foreground">
                          {l.label.replace(/^\(−\)\s*/, '')}
                        </span>
                        <span className="tnum shrink-0 text-[12.5px] font-semibold text-foreground">{brl(v)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full rounded-full', isMidia ? 'bg-danger/70' : 'bg-gold/60')}
                            style={{ width: `${Math.max(3, share)}%` }}
                          />
                        </div>
                        <span className="tnum w-10 shrink-0 text-right text-[10.5px] text-muted-foreground">
                          {pct(share)}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
          </ul>
        </Panel>
      </div>

      {/* ── Demais ações prescritivas do período ── */}
      {f.alerts.length > 1 && (
        <Panel title="Próximos passos" meta="O painel não só reporta: indica a próxima ação">
          <div className="flex flex-col gap-2.5">
            {f.alerts.slice(1).map((a) => {
              const m = ALERT_META[a.kind]
              return (
                <div key={a.id} className={cn('flex items-center gap-3 rounded-sub border bg-card p-3', m.ring)}>
                  <div className={cn('grid size-8 shrink-0 place-items-center rounded-sub', m.chip)}>
                    {a.kind === 'act' ? <Flame className="size-4" strokeWidth={1.8} /> : <m.Icon className="size-4" strokeWidth={1.8} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-[9.5px] font-bold uppercase tracking-[0.08em]', m.tag)}>{a.tag}</div>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{a.text}</p>
                  </div>
                  <button className="hidden shrink-0 items-center gap-1.5 rounded-btn border border-border px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold sm:flex">
                    {a.cta}
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {/* ── Rodapé: fonte + período (transparência de proveniência) ── */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span>Fonte: {f.meta.fonte}.</span>
        <span>Margens/mix por produto são sempre Jan/26 (único mês com unit economics auditado).</span>
        <span>Resultado real do período: <b className={cn('font-semibold', resultadoTone)}>{brl(d.resultado)}</b> · MER <span className="tnum">{mult(d.mer)}</span> (computado · break-even {mult(d.merBreakeven)}).</span>
      </p>
    </div>
  )
}

export default Comando
