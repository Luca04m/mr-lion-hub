import { useMemo } from 'react'
import { SNAPSHOTS, type Periodo } from './finance'
import { useFinanceiroStore } from './store'
import { mil, mult, pct } from '../lib/format'
import type { FinanceSnapshot } from './types'

export type { Periodo }

// ── Métricas DERIVADAS (prov 'parcial') — COMPUTADAS dos reais, não congeladas ──
export interface DerivadosFinance {
  /** Receita bruta REAL do período (R$). */
  receita: number
  /** CMV REAL (R$). */
  cmv: number
  /** Lucro bruto / CM1 REAL (R$). */
  lucroBruto: number
  /** Margem bruta CM1 (%) computada = LB ÷ receita. */
  margemBrutaPct: number
  /** Resultado do mês REAL (R$). */
  resultado: number
  /** Ad spend total REAL (R$). */
  adSpend: number
  /** MER computado = receita ÷ ad spend. */
  mer: number
  /** Break-even MER computado = 1 ÷ margem CM1. */
  merBreakeven: number
  /** Unidades totais vendidas (mix Jan/26). */
  unidades: number
  /** Ticket médio computado = receita-produtos ÷ unidades (mix Jan). */
  ticketMedio: number
  /** Chargebacks REAIS do período (R$) — 0 se não materiais. */
  chargebacks: number
}

function lineByLabel(snap: FinanceSnapshot, includes: string): number {
  const l = snap.dre.find((d) => d.label.toLowerCase().includes(includes.toLowerCase()))
  return l ? Math.abs(l.value) : 0
}

function computeDerivados(snap: FinanceSnapshot): DerivadosFinance {
  // Top-line vindo da DRE REAL do período.
  const receita = lineByLabel(snap, 'receita')
  const cmv = lineByLabel(snap, 'cmv')
  const lucroBruto = receita - cmv
  const margemBrutaPct = receita ? (lucroBruto / receita) * 100 : 0
  // Resultado = receita + Σ(deduções ded/tax/fixed, já armazenadas negativas).
  // Soma das linhas (NÃO lê a linha congelada) → recompõe com edições/adições/remoções.
  const resultado = receita + snap.dre
    .filter((d) => d.kind === 'ded' || d.kind === 'tax' || d.kind === 'fixed')
    .reduce((a, d) => a + d.value, 0)

  // Ad spend = linha de tráfego/marketing da DRE (REAL).
  const adSpend = lineByLabel(snap, 'tráfego') || lineByLabel(snap, 'marketing')
  const mer = adSpend ? receita / adSpend : 0
  const merBreakeven = margemBrutaPct ? 100 / margemBrutaPct : 0

  // Ticket médio dos produtos (mix Jan/26 — período rotulado na tela).
  const unidades = snap.products.reduce((a, p) => a + p.units, 0)
  const receitaProdutos = snap.products.reduce((a, p) => a + p.revenue, 0)
  const ticketMedio = unidades ? receitaProdutos / unidades : 0

  // Chargebacks: o KPI 'chargeback' carrega o valor real quando material (Fev).
  const cbKpi = snap.kpis.find((k) => k.key === 'chargeback')
  const chargebacks = cbKpi ? parseChargeback(cbKpi.value) : 0

  return {
    receita, cmv, lucroBruto, margemBrutaPct, resultado,
    adSpend, mer, merBreakeven, unidades, ticketMedio, chargebacks,
  }
}

// "−R$ 6,1 mil" → 6100 (best-effort; só usado p/ surfacing, não p/ DRE).
function parseChargeback(v: string): number {
  const m = v.match(/([\d.,]+)\s*mil/i)
  if (m) return Math.round(parseFloat(m[1].replace('.', '').replace(',', '.')) * 1000)
  return 0
}

// KPI em milhares, sinal antes do R$: "−R$ 2,3 mil" / "R$ 74,1 mil".
const fmtKpiMil = (v: number) => `${v < 0 ? '−' : ''}R$ ${mil(Math.abs(v), 1)} mil`

/**
 * Regenera os KPIs sensíveis a edição (resultado/receita/lucro bruto/MER) a partir
 * dos derivados — period-aware. Baseline reproduz as strings curadas exatas; com
 * edições na DRE os cards recompõem. Os demais KPIs (chargeback/caixa/margem real)
 * seguem do snapshot. Texto de note/delta de contexto preservado.
 */
function recomputeKpis(kpis: FinanceSnapshot['kpis'], d: DerivadosFinance): FinanceSnapshot['kpis'] {
  return kpis.map((k) => {
    switch (k.key) {
      case 'lucro':
        return { ...k, value: fmtKpiMil(d.resultado), accent: d.resultado < 0 ? 'red' : 'green', deltaDir: d.resultado < 0 ? 'down' : 'up' }
      case 'receita':
        return { ...k, value: fmtKpiMil(d.receita) }
      case 'cm1':
        return { ...k, value: fmtKpiMil(d.lucroBruto), delta: `${pct(d.margemBrutaPct)} da receita` }
      case 'mer':
        return { ...k, value: mult(d.mer) }
      default:
        return k
    }
  })
}

export interface UseFinanceResult {
  periodo: Periodo
  snapshot: FinanceSnapshot
  derivados: DerivadosFinance
}

/**
 * Hook PERIOD-AWARE do Financeiro v2.
 * @param periodo 'jan' | 'fev' — default 'fev' (período corrente da v2).
 * A DRE (despesas), os custos por produto e as contas a pagar/receber vêm do
 * store EDITÁVEL persistido (seed = baseline reconciliado); o restante do snapshot
 * (caixa/coortes/kpis/waterfall…) segue congelado de SNAPSHOTS. O aging é DERIVADO
 * das contas na própria tela. Os derivados ('parcial') são
 * recomputados dos reais a cada período/edição. Margens/mix por produto são
 * SEMPRE Jan/26 — a tela rotula o período de cada métrica.
 */
export function useFinance(periodo: Periodo = 'fev'): UseFinanceResult {
  const periodData = useFinanceiroStore((s) => s.data[periodo])
  return useMemo(() => {
    const base = SNAPSHOTS[periodo]
    // Overlay editável sobre o snapshot congelado: dre + products + contas são mutáveis.
    const overlaid: FinanceSnapshot = { ...base, dre: periodData.dre, products: periodData.products, contas: periodData.contas }
    const derivados = computeDerivados(overlaid)
    // KPIs sensíveis a edição recompõem dos derivados (period-aware); resto congelado.
    const snapshot: FinanceSnapshot = { ...overlaid, kpis: recomputeKpis(overlaid.kpis, derivados) }
    return { periodo, snapshot, derivados }
  }, [periodo, periodData])
}
