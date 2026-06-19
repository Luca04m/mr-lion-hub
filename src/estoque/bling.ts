// ════════════════════════════════════════════════════════════════════════
// Integração Bling → Estoque (cliente). A função /api/bling-sync devolve os
// pedidos de venda; aqui mapeamos cada item (codigo Bling) → produto acabado
// do estoque e damos baixa (1 item vendido = −1 garrafa da linha).
//
// Catálogo Bling capturado ao vivo (18/06/2026):
//   Honey       → 003 (Completo) · 871 (Garrafa) · 872 (Pingente)
//   Cappuccino  → 222 (Completo) · 333 (Garrafa) · 111 (Pingente)
//   Blended     → 779 (Completo) · 778 (Garrafa) · 780 (Pingente)
//   Black Honey → 777 (Pingente)  ← SEM produto acabado no estoque (não-mapeado)
// Variações (Completo/Garrafa/Pingente) são a MESMA garrafa de 750ml da linha;
// o que muda é a embalagem (pingente/colar) — no MVP a baixa é do produto acabado.
// ════════════════════════════════════════════════════════════════════════

/** Mapa explícito codigo-Bling → id do produto acabado no estoque. */
export const BLING_SKU_TO_PA: Record<string, string> = {
  '003': 'pa_honey', '871': 'pa_honey', '872': 'pa_honey',
  '222': 'pa_cappuccino', '333': 'pa_cappuccino', '111': 'pa_cappuccino',
  '779': 'pa_blended', '778': 'pa_blended', '780': 'pa_blended',
}

/** Resolve um item de pedido Bling → produto acabado (codigo primeiro, descrição como fallback). */
export function mapItemToPA(codigo: string | null, descricao: string | null): string | null {
  if (codigo && BLING_SKU_TO_PA[codigo]) return BLING_SKU_TO_PA[codigo]
  const d = (descricao ?? '').toLowerCase()
  if (!d) return null
  if (d.includes('black')) return null // Black Honey não tem PA no estoque
  if (d.includes('blended')) return 'pa_blended'
  if (d.includes('capucc') || d.includes('cappucc')) return 'pa_cappuccino'
  if (d.includes('honey')) return 'pa_honey'
  return null
}

export interface BlingItem { codigo: string | null; descricao: string | null; quantidade: number }
export interface BlingOrder { id: string; numero: number | string; data: string; situacaoId: number | null; itens: BlingItem[] }
export interface BlingSyncResponse {
  ok: boolean
  since?: string
  total?: number
  aplicaveis?: number
  truncated?: boolean
  nextSince?: string | null
  serverTime?: string
  orders?: BlingOrder[]
  error?: string
}

/** Chama a function serverless. `since` = data ISO/YYYY-MM-DD (default no servidor = 7d). */
export async function fetchBlingOrders(since: string | null): Promise<BlingSyncResponse> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  const r = await fetch(`/api/bling-sync${qs}`, { headers: { Accept: 'application/json' } })
  return (await r.json()) as BlingSyncResponse
}

/** Plano de baixa derivado de um conjunto de pedidos NOVOS (não aplicados ainda). */
export interface BaixaPlano {
  porItem: { itemId: string; delta: number }[]   // delta negativo por produto acabado
  movimentos: { itemId: string; delta: number; motivo: string }[]
  pedidosIds: string[]
  naoMapeados: { codigo: string | null; descricao: string | null; quantidade: number; pedido: string | number }[]
}

/** Constrói o plano de baixa: agrega por produto + lista linhas individuais (1 movimento por item de pedido). */
export function planejarBaixa(orders: BlingOrder[], jaAplicados: Set<string>): BaixaPlano {
  const porItemMap = new Map<string, number>()
  const movimentos: BaixaPlano['movimentos'] = []
  const naoMapeados: BaixaPlano['naoMapeados'] = []
  const pedidosIds: string[] = []

  for (const o of orders) {
    if (jaAplicados.has(o.id)) continue
    pedidosIds.push(o.id)
    for (const it of o.itens) {
      const qtd = Number(it.quantidade) || 0
      if (qtd <= 0) continue
      const pa = mapItemToPA(it.codigo, it.descricao)
      if (!pa) {
        naoMapeados.push({ codigo: it.codigo, descricao: it.descricao, quantidade: qtd, pedido: o.numero })
        continue
      }
      porItemMap.set(pa, (porItemMap.get(pa) ?? 0) - qtd)
      movimentos.push({ itemId: pa, delta: -qtd, motivo: `Venda Bling #${o.numero}` })
    }
  }

  return {
    porItem: [...porItemMap].map(([itemId, delta]) => ({ itemId, delta })),
    movimentos,
    pedidosIds,
    naoMapeados,
  }
}
