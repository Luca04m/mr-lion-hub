// ─── Modelo financeiro · Casa Mr. Lion (Financeiro v2 · Hub) ───────────────
// Portado VERBATIM do covil (src/data/types.ts). A flag Provenance é OBRIGATÓRIA
// em cada peça de dado: 'real' (DRE/preços/custos/mix/ad spend/chargebacks),
// 'parcial' (derivados computados: ROAS/MER/ticket), 'ilustrativo' (modelos:
// projeção de caixa, coortes/LTV, aging, RFM, impostos projetados).

export type Provenance = 'real' | 'parcial' | 'ilustrativo'
export type Dir = 'up' | 'down' | 'warn' | 'flat'
export type Accent = 'gold' | 'red' | 'green' | 'neutral' | 'blue'

export interface Kpi {
  key: string
  label: string
  value: string
  delta?: string
  deltaDir: Dir
  note: string
  prov: Provenance
  spark: number[]
  accent: Accent
}

export type WaterfallKind = 'rev' | 'cost' | 'sub' | 'anom' | 'loss'
export interface WaterfallStep {
  label: string
  value: number // em R$ (negativo = redução)
  kind: WaterfallKind
  pct?: string
  flag?: string
}

export interface Channel {
  name: string
  cm2: number
  spend: number
  revenue: number
  roas: number | null
  iroas: number | null
  breakeven: number | null
  kill?: boolean
  prescription?: string
  recover?: number
}

export interface Product {
  id: string
  name: string
  linha: string
  img: string
  revenue: number
  units: number
  precoPix: number
  custo: number
  marginPct: number
  cm2Pct: number
  trend: 'up' | 'down' | 'flat'
  medal?: string
}

export interface CohortRow {
  cohort: string
  size: number
  values: (number | null)[] // % retido por mês desde 1a compra
}

export interface CashPoint {
  day: number
  base: number
  p10: number
  p90: number
}
export interface CashEvent {
  day: number
  type: 'in' | 'out'
  label: string
  value: number
}

export type DREKind = 'rev' | 'ded' | 'sub' | 'fixed' | 'tax' | 'total' | 'loss'
export interface DRELine {
  label: string
  value: number
  kind: DREKind
  pct?: number
  plan?: number
}

export interface AgingBucket {
  label: string
  payable: number
  receivable: number
}
export interface ContaItem {
  id: string
  parte: string
  tipo: 'pagar' | 'receber'
  valor: number
  vencimento: string
  status: 'aberta' | 'paga' | 'vencida'
  categoria: string
}

export interface RFMSegment {
  name: string
  count: number
  ticket: number
  share: number
  tone: 'gold' | 'green' | 'warn' | 'crit' | 'neutral'
}

export interface CohortLTV {
  cohort: string
  cac: number
  ltv: number // lucro bruto
  ratio: number
  paybackDias: number
}

export interface Alert {
  id: string
  kind: 'act' | 'risk' | 'info'
  tag: string
  text: string
  cta: string
  recover?: string
  target?: string
}

export interface TaxModel {
  regime: string
  anexo: string
  faixa: string
  rbt12: number
  aliquotaNominal: number
  aliquotaEfetiva: number
  dasValor: number
  dasVencimento: string
  tetoMei: number
  notas: string[]
}

export interface FinanceSnapshot {
  meta: {
    empresa: string
    periodo: string
    periodoLabel: string
    comparaCom: string
    geradoEm: string
    caixaConsolidado: number
    fonte: string
  }
  kpis: Kpi[]
  waterfall: WaterfallStep[]
  channels: Channel[]
  products: Product[]
  cohort: { cols: string[]; rows: CohortRow[]; recompraMediana: number; multiSku: number }
  cash: { points: CashPoint[]; events: CashEvent[]; min: number; max: number; alvoFolga: number }
  monthly: { month: string; b2c: number; b2b: number; total: number; lucro: number }[]
  dre: DRELine[]
  aging: AgingBucket[]
  contas: ContaItem[]
  rfm: RFMSegment[]
  ltvCohorts: CohortLTV[]
  roi: {
    pixelReportado: number
    wooReal: number
    gapPct: number
    mer: number
    merMeta: number
    merBreakeven: number
    poas: number
  }
  tax: TaxModel
  alerts: Alert[]
  goal: { label: string; atual: number; meta: number; pct: number; sub: string }
}
