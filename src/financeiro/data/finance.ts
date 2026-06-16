import type { FinanceSnapshot, CashPoint } from './types'

// ════════════════════════════════════════════════════════════════════════
// Snapshots financeiros RECONCILIADOS · Casa Mr. Lion — Jan/2026 E Fev/2026.
// FONTE DA VERDADE: Dados/Financeiro/ (dre-jan-fev-2026.md + margem-real-por-produto.md).
// ⚠️ Os números do covil v1 estavam ERRADOS (preços PIX 92/88/89; ad spend 15,1k).
//    Aqui: preços PIX REAIS 152/171/107; ad spend Fev 12.000.
//
// REGRA DE PERÍODO (dura):
//   • Top-line DRE      → Jan OU Fev (cada snapshot rotula o seu período).
//   • Margens/mix/custos por produto → SEMPRE Jan/2026 (único mês com unit
//     economics auditado). NUNCA misturar num só número — a tela rotula o período.
//
// PROVENIÊNCIA por peça de dado:
//   'real'        → DRE Jan/Fev, preços PIX, custos unit., margens Jan, mix Jan,
//                   ad spend, chargebacks.
//   'parcial'     → derivados COMPUTADOS dos reais (MER, ROAS, ticket médio).
//   'ilustrativo' → MODELOS: projeção caixa 90d P10–P90, coortes/LTV, aging,
//                   RFM, impostos projetados. Rotulados explicitamente; NÃO são reais.
//
// RECONCILIAÇÃO DRE (verificada):
//   Fev: 74.081,00 − 33.580,90 = 40.500,10 (LB 54,7%); despesas op 42.829,63
//        (Logística 7.712,17 + Reembolsos 940,47 + Contab/Taxas/Imp 8.193,00 +
//         Sistemas 918,99 + Pessoal 7.221,00 + Gerais 5.844,00 + Tráfego 12.000,00)
//        → Resultado −2.329,53 (PREJUÍZO). Chargebacks 6.132,00 (~8,3%) = RISCO
//        sinalizado, NÃO uma linha separada da DRE (não dobra-contar).
//   Jan: 95.175,08 − 50.794,00 = 44.381,08 (LB 46,6%); despesas 43.251,00
//        → Resultado +1.130,08.
// ════════════════════════════════════════════════════════════════════════

export type Periodo = 'jan' | 'fev'

// ── Constantes REAIS reutilizadas (prov 'real') ──────────────────────────
export const PRECOS_PIX = { honey: 152, cappuccino: 171, blended: 107 } as const
export const PRECOS_CARTAO = { honey: 160, cappuccino: 180, blended: 112 } as const
// Custos unitários por versão (Garrafa/Pingente/Completo) — confirmados Mar/2026.
export const CUSTOS_UNIT = {
  honey: { garrafa: 39.10, pingente: 42.00, completo: 54.97 },
  blended: { garrafa: 39.26, pingente: 42.70, completo: 51.14 },
  cappuccino: { garrafa: 46.48, pingente: 49.38, completo: 63.03 },
} as const

// ── Projeção de caixa 90d (ILUSTRATIVO) — interpolação determinística (R$) ──
// Modelo, NÃO fechamento real. Ancorada no caixa consolidado do período.
function buildCash(caixaInicial: number): CashPoint[] {
  const ck: [number, number][] = [
    [0, caixaInicial], [15, caixaInicial - 10_600], [20, caixaInicial - 15_600],
    [30, caixaInicial - 18_400], [45, caixaInicial - 28_600], [55, caixaInicial - 36_100],
    [70, caixaInicial - 24_600], [90, caixaInicial - 6_600],
  ]
  const base = (t: number) => {
    let i = 0
    while (i < ck.length - 1 && t > ck[i + 1][0]) i++
    const [a, va] = ck[i]
    const [b, vb] = ck[Math.min(i + 1, ck.length - 1)]
    const f = b === a ? 0 : (t - a) / (b - a)
    return va + (vb - va) * f + Math.sin(t / 5) * 1_100
  }
  const pts: CashPoint[] = []
  for (let t = 0; t <= 90; t++) {
    const b = base(t)
    pts.push({
      day: t,
      base: Math.round(b),
      p90: Math.round(b + (3_000 + 250 * t)),
      p10: Math.round(Math.max(2_000, b - (4_000 + 450 * t))),
    })
  }
  return pts
}

// Série mensal (top-line REAL em Jan/Fev/26; meses anteriores 'ilustrativos' p/ trend).
const MONTHLY: FinanceSnapshot['monthly'] = [
  { month: 'Set/25', b2c: 58_000, b2b: 21_000, total: 79_000, lucro: 8_200 },
  { month: 'Out/25', b2c: 61_000, b2b: 22_500, total: 83_500, lucro: 8_400 },
  { month: 'Nov/25', b2c: 66_000, b2b: 24_000, total: 90_000, lucro: 8_900 },
  { month: 'Dez/25', b2c: 72_000, b2b: 26_000, total: 98_000, lucro: 9_600 },
  { month: 'Jan/26', b2c: 68_175, b2b: 27_000, total: 95_175, lucro: 1_130 },
  { month: 'Fev/26', b2c: 51_681, b2b: 22_400, total: 74_081, lucro: -2_330 },
]

// ── Produtos · MARGENS/MIX/CUSTOS = SEMPRE Jan/2026 (unit economics auditado) ──
// 'real': units (mix Jan), precoPix, custo (médio ponderado por versão Jan), marginPct (Jan).
// O snapshot mensal os reusa, mas o período fica SEMPRE rotulado "Jan/26" na tela.
const PRODUCTS_JAN: FinanceSnapshot['products'] = [
  // Honey: 246un (G116/P60/C70) · margem real ponderada Jan 64,3% · custo médio ≈ 44,32
  { id: 'honey', name: 'Mr. Lion Honey', linha: 'Honey', img: '/produtos/honey-garrafa.webp',
    revenue: 30_534, units: 246, precoPix: 152, custo: 44.32, marginPct: 64.3, cm2Pct: 24.1, trend: 'down', medal: 'Ouro' },
  // Cappuccino: 46un (P25/C21) · margem real 48,2% · custo médio ≈ 55.61
  { id: 'cappuccino', name: 'Mr. Lion Cappuccino', linha: 'Cappuccino', img: '/produtos/cappuccino-garrafa.webp',
    revenue: 4_937, units: 46, precoPix: 171, custo: 55.61, marginPct: 48.2, cm2Pct: 12.4, trend: 'down', medal: 'Prata' },
  // Blended: 289un (G116/P34/C139) · margem real 58,4% · custo médio ≈ 45.38
  { id: 'blended', name: 'Mr. Lion Blended', linha: 'Blended', img: '/produtos/blended-garrafa.webp',
    revenue: 31_555, units: 289, precoPix: 107, custo: 45.38, marginPct: 58.4, cm2Pct: 21.8, trend: 'flat' },
]

// Coortes/retenção — ILUSTRATIVO (modelo, sem dado de coorte real).
const COHORT: FinanceSnapshot['cohort'] = {
  cols: ['M0', 'M+1', 'M+2', 'M+3', 'M+4', 'M+5'],
  recompraMediana: 46,
  multiSku: 47.4,
  rows: [
    { cohort: 'Set/25', size: 1_180, values: [100, 26, 19, 15, 13, 12] },
    { cohort: 'Out/25', size: 1_420, values: [100, 24, 18, 14, 12, null] },
    { cohort: 'Nov/25', size: 1_690, values: [100, 27, 20, 16, null, null] },
    { cohort: 'Dez/25', size: 2_240, values: [100, 22, 17, null, null, null] },
    { cohort: 'Jan/26', size: 1_980, values: [100, 25, null, null, null, null] },
    { cohort: 'Fev/26', size: 1_393, values: [100, null, null, null, null, null] },
  ],
}

// RFM — ILUSTRATIVO (modelo de segmentação, sem export real de base ainda).
const RFM: FinanceSnapshot['rfm'] = [
  { name: 'Champions', count: 2_521, ticket: 327, share: 25.5, tone: 'gold' },
  { name: 'Fiéis', count: 2_180, ticket: 218, share: 22.0, tone: 'green' },
  { name: 'Promissores', count: 1_940, ticket: 164, share: 19.6, tone: 'neutral' },
  { name: 'Em risco', count: 1_760, ticket: 142, share: 17.8, tone: 'warn' },
  { name: 'Hibernando', count: 1_502, ticket: 98, share: 15.2, tone: 'crit' },
]

// LTV:CAC por cohort de aquisição — ILUSTRATIVO (modelo).
const LTV_COHORTS: FinanceSnapshot['ltvCohorts'] = [
  { cohort: 'B2B / Revendedores', cac: 0, ltv: 4_242, ratio: 99, paybackDias: 12 },
  { cohort: 'D2C Orgânico', cac: 18, ltv: 214, ratio: 11.9, paybackDias: 21 },
  { cohort: 'Google Ads', cac: 64, ltv: 248, ratio: 3.9, paybackDias: 38 },
  { cohort: 'Meta Ads', cac: 112, ltv: 198, ratio: 1.8, paybackDias: 71 },
]

// Impostos projetados — ILUSTRATIVO (modelo Simples Nacional pendente validação).
const TAX: FinanceSnapshot['tax'] = {
  regime: 'Simples Nacional',
  anexo: 'Anexo I (Comércio)',
  faixa: '5ª faixa',
  rbt12: 1_840_000,
  aliquotaNominal: 9.56,
  aliquotaEfetiva: 9.5,
  dasValor: 2_000,
  dasVencimento: '20/03/2026',
  tetoMei: 81_000,
  notas: [
    'PROJEÇÃO — pendente de validação contábil.',
    'ICMS-ST e PIS/COFINS monofásico do whisky são recolhidos upstream e derrubam a efetiva abaixo da nominal.',
    'Regra CGSN 183/2025: renda do CPF passa a contar para o teto do CNPJ.',
  ],
}

// ════════════════════════════════════════════════════════════════════════
// FEVEREIRO/2026  (Resultado −2.329,53 · PREJUÍZO)
// ════════════════════════════════════════════════════════════════════════
const FEV: FinanceSnapshot = {
  meta: {
    empresa: 'Casa Mr. Lion',
    periodo: 'fev-2026',
    periodoLabel: 'Fevereiro 2026',
    comparaCom: 'Janeiro 2026',
    geradoEm: '2026-02-28',
    caixaConsolidado: 96_200, // ilustrativo (modelo de caixa)
    fonte: 'DRE Fev/2026 (Dados/Financeiro) + Bling + WooCommerce',
  },

  kpis: [
    { key: 'lucro', label: 'Resultado do mês', value: '−R$ 2,3 mil', delta: '−R$ 3,5 mil vs jan', deltaDir: 'down', accent: 'red', prov: 'real',
      note: 'Primeiro mês no vermelho (−R$ 2.329,53). Vetores: chargebacks 8,3% + tráfego R$ 12 mil sem retorno proporcional.', spark: [9.6, 1.1, -2.3] },
    { key: 'receita', label: 'Receita bruta', value: 'R$ 74,1 mil', delta: '−22,2% vs jan', deltaDir: 'down', accent: 'neutral', prov: 'real',
      note: 'R$ 74.081,00 (DRE Fev). Jan fechou R$ 95.175,08.', spark: [98, 95.2, 74.1] },
    { key: 'cm1', label: 'Lucro bruto (CM1)', value: 'R$ 40,5 mil', delta: '54,7% da receita', deltaDir: 'up', accent: 'gold', prov: 'real',
      note: 'Receita − CMV (R$ 33.580,90). Margem bruta subiu vs 46,6% em jan.', spark: [44.4, 40.5] },
    { key: 'mer', label: 'MER', value: '6,2×', delta: 'meta 6,0× · BE 1,83×', deltaDir: 'up', accent: 'gold', prov: 'parcial',
      note: 'Receita R$ 74,1 mil ÷ ad spend R$ 12 mil. Break-even = 1/margem CM1.', spark: [5.7, 6.2] },
    { key: 'chargeback', label: 'Chargebacks', value: 'R$ 6,1 mil', delta: '8,3% da receita', deltaDir: 'down', accent: 'red', prov: 'real',
      note: 'R$ 6.132,00 contestados — CRÍTICO. Investigar gateway/fraude antes do próximo fechamento.', spark: [0.8, 8.3] },
    { key: 'caixa', label: 'Caixa projetado · 30d', value: 'R$ 96,2 mil', delta: 'modelo (ilustrativo)', deltaDir: 'warn', accent: 'neutral', prov: 'ilustrativo',
      note: 'PROJEÇÃO timing-aware — não é saldo real. A receber − a pagar − DAS.', spark: [114.6, 108, 96.2] },
  ],

  // Waterfall = decomposição da DRE real de Fev. Fecha em −2,3 mil.
  // Chargebacks NÃO entram como linha (não dobra-contar a DRE); aparecem como flag.
  waterfall: [
    { label: 'Receita', value: 74_081, kind: 'rev' },
    { label: 'CMV', value: -33_581, kind: 'cost' },
    { label: 'Lucro bruto', value: 40_500, kind: 'sub', pct: '54,7%' },
    { label: 'Logística', value: -7_712, kind: 'cost' },
    { label: 'Reembolsos', value: -940, kind: 'cost', flag: 'chargebacks 8,3%' },
    { label: 'Contab/Taxas/Imp', value: -8_193, kind: 'cost' },
    { label: 'Sistemas', value: -919, kind: 'cost' },
    { label: 'Pessoal', value: -7_221, kind: 'cost' },
    { label: 'Gerais', value: -5_844, kind: 'cost' },
    { label: 'Tráfego pago', value: -12_000, kind: 'cost' },
    { label: 'Resultado', value: -2_330, kind: 'loss' },
  ],

  // Split de canal = ILUSTRATIVO; total de spend ancorado no REAL (R$ 12 mil Fev).
  channels: [
    { name: 'B2B / Revendedores', cm2: 9_800, spend: 0, revenue: 22_400, roas: null, iroas: null, breakeven: null },
    { name: 'D2C Orgânico', cm2: 7_100, spend: 0, revenue: 18_900, roas: null, iroas: null, breakeven: null },
    { name: 'Google Ads', cm2: 2_400, spend: 5_500, revenue: 18_000, roas: 3.3, iroas: 2.6, breakeven: 1.83 },
    { name: 'Meta Ads', cm2: -1_400, spend: 6_500, revenue: 10_400, roas: 1.6, iroas: 1.2, breakeven: 1.83, kill: true, recover: 3_500,
      prescription: 'Pausar conjuntos abaixo do break-even ROAS 1,83×. Split de canal é modelo; total de tráfego (R$ 12 mil) é REAL.' },
  ],

  products: PRODUCTS_JAN, // margens/mix = SEMPRE Jan/26 (rotular na tela)

  cohort: COHORT,

  cash: { points: buildCash(114_600), events: [
    { day: 8, type: 'in', label: 'Receber B2B', value: 12_000 },
    { day: 20, type: 'out', label: 'DAS Simples', value: 2_000 },
    { day: 35, type: 'out', label: 'Compra estoque', value: 18_000 },
    { day: 50, type: 'in', label: 'Receber B2B', value: 9_000 },
  ], min: 0, max: 145_000, alvoFolga: 60_000 },

  monthly: MONTHLY,

  dre: [
    { label: 'Receita bruta', value: 74_081, kind: 'rev', plan: 95_175 },
    { label: '(−) CMV', value: -33_581, kind: 'ded' },
    { label: 'Lucro bruto (CM1)', value: 40_500, kind: 'sub', pct: 54.7 },
    { label: '(−) Logística / fretes / reenvios', value: -7_712, kind: 'ded' },
    { label: '(−) Reembolsos', value: -940, kind: 'ded' },
    { label: '(−) Contabilidade / taxas / impostos', value: -8_193, kind: 'tax' },
    { label: '(−) Sistemas / ferramentas', value: -919, kind: 'ded' },
    { label: '(−) Pessoal (salários + comissão)', value: -7_221, kind: 'fixed' },
    { label: '(−) Despesas gerais', value: -5_844, kind: 'ded' },
    { label: '(−) Tráfego pago (Meta + Google)', value: -12_000, kind: 'ded' },
    { label: 'Resultado do mês', value: -2_330, kind: 'loss', plan: 1_130 },
  ],

  // Aging = ILUSTRATIVO (modelo de contas a pagar/receber).
  aging: [
    { label: 'A vencer', payable: 18_400, receivable: 31_200 },
    { label: '1–30 dias', payable: 9_800, receivable: 14_600 },
    { label: '31–60 dias', payable: 4_200, receivable: 6_100 },
    { label: '60+ dias', payable: 1_900, receivable: 3_800 },
  ],

  // Contas = ILUSTRATIVO (exemplos de movimentação).
  contas: [
    { id: 'r1', parte: 'Distribuidora BH', tipo: 'receber', valor: 12_000, vencimento: '08/03', status: 'aberta', categoria: 'B2B' },
    { id: 'p1', parte: 'DAS Simples Nacional', tipo: 'pagar', valor: 2_000, vencimento: '20/03', status: 'aberta', categoria: 'Imposto' },
    { id: 'p2', parte: 'Destilaria (insumos)', tipo: 'pagar', valor: 18_000, vencimento: '12/03', status: 'aberta', categoria: 'Estoque' },
    { id: 'p3', parte: 'Tráfego pago', tipo: 'pagar', valor: 12_000, vencimento: '05/03', status: 'vencida', categoria: 'Mídia' },
    { id: 'r3', parte: 'Empório Premium', tipo: 'receber', valor: 9_000, vencimento: '22/03', status: 'aberta', categoria: 'B2B' },
  ],

  rfm: RFM,
  ltvCohorts: LTV_COHORTS,

  // ROI/MER: mer é REAL-derivado (74,1k/12k); o resto do bloco é ilustrativo.
  roi: { pixelReportado: 49_000, wooReal: 38_500, gapPct: 27, mer: 6.2, merMeta: 6.0, merBreakeven: 1.83, poas: 2.7 },

  tax: TAX,

  alerts: [
    { id: 'a1', kind: 'risk', tag: 'Risco · R$ 6,1 mil',
      text: 'Chargebacks saltaram para 8,3% (R$ 6.132,00) — CRÍTICO. Investigar gateway e fraude antes do fechamento.', cta: 'Ver conciliação' },
    { id: 'a2', kind: 'act', tag: 'Ação · resultado negativo',
      text: 'Fev fechou em −R$ 2.329,53 (1º mês no vermelho). Cortar tráfego sem retorno e renegociar logística.', cta: 'Abrir DRE', target: 'Tráfego pago' },
    { id: 'a3', kind: 'info', tag: 'Caixa · modelo 30d',
      text: 'Projeção de caixa cai ~R$ 18 mil em 30d (ilustrativo). DAS vence dia 20.', cta: 'Abrir fluxo de caixa' },
  ],

  goal: { label: 'MER', atual: 6.2, meta: 6.0, pct: 100, sub: 'Acima da meta — mas o resultado fechou negativo por chargebacks + custos fixos.' },
}

// ════════════════════════════════════════════════════════════════════════
// JANEIRO/2026  (Resultado +1.130,08 · positivo)
// ════════════════════════════════════════════════════════════════════════
const JAN: FinanceSnapshot = {
  meta: {
    empresa: 'Casa Mr. Lion',
    periodo: 'jan-2026',
    periodoLabel: 'Janeiro 2026',
    comparaCom: 'Dezembro 2025',
    geradoEm: '2026-01-31',
    caixaConsolidado: 114_600, // ilustrativo (modelo)
    fonte: 'DRE Jan/2026 (Dados/Financeiro) + Bling + WooCommerce',
  },

  kpis: [
    { key: 'lucro', label: 'Resultado do mês', value: 'R$ 1,1 mil', delta: 'positivo', deltaDir: 'up', accent: 'green', prov: 'real',
      note: 'R$ 1.130,08 no azul. Margem bruta apertada (46,6%) com CMV alto.', spark: [9.6, 1.1] },
    { key: 'receita', label: 'Receita bruta', value: 'R$ 95,2 mil', delta: 'pico recente', deltaDir: 'up', accent: 'gold', prov: 'real',
      note: 'R$ 95.175,08 (DRE Jan). Maior faturamento da série.', spark: [90, 98, 95.2] },
    { key: 'cm1', label: 'Lucro bruto (CM1)', value: 'R$ 44,4 mil', delta: '46,6% da receita', deltaDir: 'flat', accent: 'gold', prov: 'real',
      note: 'Receita − CMV (R$ 50.794,00). CMV alto = 53,4% da receita.', spark: [44.4] },
    { key: 'mer', label: 'MER', value: '7,9×', delta: 'meta 6,0× · BE 2,15×', deltaDir: 'up', accent: 'green', prov: 'parcial',
      note: 'Receita R$ 95,2 mil ÷ ad spend R$ 12 mil (mesmo nível de tráfego). BE = 1/margem CM1.', spark: [6.2, 7.9] },
    { key: 'margemReal', label: 'Margem real (unit)', value: '60,4%', delta: 'ponderada por mix', deltaDir: 'up', accent: 'gold', prov: 'real',
      note: 'Unit economics Jan/26 por versão vendida. Honey 64,3% · Cappuccino 48,2% · Blended 58,4%.', spark: [58, 60.4] },
    { key: 'caixa', label: 'Caixa projetado · 30d', value: 'R$ 96,2 mil', delta: 'modelo (ilustrativo)', deltaDir: 'warn', accent: 'neutral', prov: 'ilustrativo',
      note: 'PROJEÇÃO timing-aware — não é saldo real.', spark: [114.6, 96.2] },
  ],

  // Jan tem detalhamento de despesas agregado (43.251,00). Decomposto pelo grão disponível.
  waterfall: [
    { label: 'Receita', value: 95_175, kind: 'rev' },
    { label: 'CMV', value: -50_794, kind: 'cost' },
    { label: 'Lucro bruto', value: 44_381, kind: 'sub', pct: '46,6%' },
    { label: 'Marketing', value: -16_708, kind: 'cost' },
    { label: 'Logística', value: -7_925, kind: 'cost' },
    { label: 'Imp/Taxas/Sist', value: -7_170, kind: 'cost' },
    { label: 'Pessoal', value: -6_200, kind: 'cost' },
    { label: 'Reembolsos', value: -5_248, kind: 'cost' },
    { label: 'Resultado', value: 1_130, kind: 'sub', pct: '1,2%' },
  ],

  // Split de canal = ILUSTRATIVO; total spend ancorado no real (~R$ 12 mil).
  channels: [
    { name: 'B2B / Revendedores', cm2: 11_200, spend: 0, revenue: 27_000, roas: null, iroas: null, breakeven: null },
    { name: 'D2C Orgânico', cm2: 8_400, spend: 0, revenue: 22_000, roas: null, iroas: null, breakeven: null },
    { name: 'Google Ads', cm2: 3_900, spend: 6_000, revenue: 24_000, roas: 4.0, iroas: 3.1, breakeven: 2.15 },
    { name: 'Meta Ads', cm2: 1_600, spend: 6_000, revenue: 16_000, roas: 2.7, iroas: 2.0, breakeven: 2.15 },
  ],

  products: PRODUCTS_JAN, // mesmas margens Jan (canônico)

  cohort: COHORT,

  cash: { points: buildCash(128_000), events: [
    { day: 10, type: 'in', label: 'Receber B2B', value: 14_000 },
    { day: 20, type: 'out', label: 'DAS Simples', value: 2_000 },
    { day: 32, type: 'out', label: 'Compra estoque', value: 20_000 },
    { day: 55, type: 'in', label: 'Receber B2B', value: 10_000 },
  ], min: 0, max: 160_000, alvoFolga: 60_000 },

  monthly: MONTHLY,

  dre: [
    { label: 'Receita bruta', value: 95_175, kind: 'rev', plan: 90_000 },
    { label: '(−) CMV', value: -50_794, kind: 'ded' },
    { label: 'Lucro bruto (CM1)', value: 44_381, kind: 'sub', pct: 46.6 },
    { label: '(−) Marketing', value: -16_708, kind: 'ded' },
    { label: '(−) Logística', value: -7_925, kind: 'ded' },
    { label: '(−) Impostos / taxas / sistemas', value: -7_170, kind: 'tax' },
    { label: '(−) Pessoal', value: -6_200, kind: 'fixed' },
    { label: '(−) Reembolsos / contestações', value: -5_248, kind: 'ded' },
    { label: 'Resultado do mês', value: 1_130, kind: 'sub', plan: 0 },
  ],

  aging: [
    { label: 'A vencer', payable: 16_000, receivable: 34_000 },
    { label: '1–30 dias', payable: 8_400, receivable: 16_000 },
    { label: '31–60 dias', payable: 3_600, receivable: 5_200 },
    { label: '60+ dias', payable: 1_400, receivable: 2_900 },
  ],

  contas: [
    { id: 'r1', parte: 'Distribuidora BH', tipo: 'receber', valor: 14_000, vencimento: '10/02', status: 'aberta', categoria: 'B2B' },
    { id: 'p1', parte: 'DAS Simples Nacional', tipo: 'pagar', valor: 2_000, vencimento: '20/02', status: 'aberta', categoria: 'Imposto' },
    { id: 'p2', parte: 'Destilaria (insumos)', tipo: 'pagar', valor: 20_000, vencimento: '12/02', status: 'aberta', categoria: 'Estoque' },
    { id: 'r2', parte: 'Empório Premium', tipo: 'receber', valor: 10_000, vencimento: '22/02', status: 'aberta', categoria: 'B2B' },
  ],

  rfm: RFM,
  ltvCohorts: LTV_COHORTS,

  roi: { pixelReportado: 61_000, wooReal: 48_000, gapPct: 27, mer: 7.9, merMeta: 6.0, merBreakeven: 2.15, poas: 3.4 },

  tax: { ...TAX, dasVencimento: '20/02/2026' },

  alerts: [
    { id: 'a1', kind: 'info', tag: 'Resultado · positivo',
      text: 'Jan fechou em +R$ 1.130,08, mas margem bruta apertada (46,6%) por CMV alto (53,4% da receita).', cta: 'Abrir DRE' },
    { id: 'a2', kind: 'act', tag: 'Atenção · margem real vs DRE',
      text: 'Margem unit (pedido) é 60,4% vs DRE (caixa) 46,6%. Gap = estoque comprado em jan vendido depois.', cta: 'Ver margens', target: 'CMV' },
    { id: 'a3', kind: 'info', tag: 'Caixa · modelo 30d',
      text: 'Projeção de caixa ilustrativa — não é saldo real.', cta: 'Abrir fluxo de caixa' },
  ],

  goal: { label: 'MER', atual: 7.9, meta: 6.0, pct: 100, sub: 'Acima da meta. Resultado fino — atacar CMV para folga real.' },
}

// ── Registro por período ──────────────────────────────────────────────────
export const SNAPSHOTS: Record<Periodo, FinanceSnapshot> = { jan: JAN, fev: FEV }

// Retrocompat: export default = Fev (período default da v2).
export const FINANCE = FEV
