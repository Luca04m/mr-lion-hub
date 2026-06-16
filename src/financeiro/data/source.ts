import { useMemo } from 'react'
import { SNAPSHOTS, type Periodo } from './finance'
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
  const resultado = snap.dre.find((d) => d.kind === 'loss')?.value
    ?? snap.dre[snap.dre.length - 1].value

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

export interface UseFinanceResult {
  periodo: Periodo
  snapshot: FinanceSnapshot
  derivados: DerivadosFinance
}

/**
 * Hook PERIOD-AWARE do Financeiro v2.
 * @param periodo 'jan' | 'fev' — default 'fev' (período corrente da v2).
 * Troca o snapshot REAL inteiro (não Fev congelado) e recomputa os derivados
 * ('parcial') a cada período. Margens/mix por produto são SEMPRE Jan/26 —
 * a tela é responsável por rotular o período de cada métrica.
 */
export function useFinance(periodo: Periodo = 'fev'): UseFinanceResult {
  return useMemo(() => {
    const snapshot = SNAPSHOTS[periodo]
    return { periodo, snapshot, derivados: computeDerivados(snapshot) }
  }, [periodo])
}
