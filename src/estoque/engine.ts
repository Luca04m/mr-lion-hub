// ════════════════════════════════════════════════════════════════════
// Engine de disponibilidade — o coração do sistema.
// "Quantas garrafas dá pra produzir e qual o gargalo" (modelo Katana):
//   fabricaveis(produto) = MIN sobre componentes( floor(saldo / qtd_no_BOM) )
//   gargalo = o componente que produz o menor número.
// + calculated stock, ROP, cobertura em dias (DOH), valor de estoque.
// ════════════════════════════════════════════════════════════════════

import type { Item, Receita, OrdemProducao, StatusEstoque, DisponibilidadeProduto } from './types'

/** Status de um item pelo saldo vs mínimo (3 níveis). */
export function statusEstoque(item: Pick<Item, 'estoque' | 'min'>): StatusEstoque {
  if (item.estoque <= 0) return 'critico'
  if (item.estoque < item.min * 0.5) return 'critico'
  if (item.estoque < item.min) return 'baixo'
  return 'ok'
}

export const STATUS_LABEL: Record<StatusEstoque, string> = {
  ok: 'Em dia', baixo: 'Repor', critico: 'Crítico',
}

/** Quantidade comprometida de um item por ordens abertas (planejada/em_producao). */
export function comprometido(itemId: string, ordens: OrdemProducao[], receitas: Receita[]): number {
  let total = 0
  for (const o of ordens) {
    if (o.status !== 'planejada' && o.status !== 'em_producao') continue
    const rec = receitas.find(r => r.id === o.receitaId)
    const comp = rec?.componentes.find(c => c.itemId === itemId)
    if (comp) total += comp.quantidade * o.qtdPlanejada
  }
  return total
}

/**
 * Saldo projetado (estilo Katana): em estoque − comprometido − segurança.
 * Negativo = precisa comprar/produzir. (esperado de POs omitido no mock.)
 */
export function calculatedStock(
  item: Item, ordens: OrdemProducao[] = [], receitas: Receita[] = [],
): number {
  return item.estoque - comprometido(item.id, ordens, receitas) - item.min
}

/** Ponto de pedido: uso médio diário × lead time + estoque de segurança (min). */
export function reorderPoint(item: Item): number {
  return Math.round((item.usoMedioDiario ?? 0) * (item.leadTimeDias ?? 0) + item.min)
}

/** Cobertura em dias (Days of Inventory on Hand). */
export function coberturaDias(item: Item): number | null {
  if (!item.usoMedioDiario || item.usoMedioDiario <= 0) return null
  return Math.floor(item.estoque / item.usoMedioDiario)
}

export const valorEstoque = (item: Item) => item.estoque * item.custoMedio

/**
 * Disponibilidade de um produto: fabricáveis + gargalo.
 * @param livre se fornecido, usa saldo livre (estoque − comprometido) por item.
 */
export function disponibilidade(
  receita: Receita,
  itens: Item[],
  saldoOverride?: Record<string, number>,
): DisponibilidadeProduto {
  const byId = new Map(itens.map(i => [i.id, i]))
  let min = Infinity
  let gargaloItemId: string | null = null
  const porComponente: DisponibilidadeProduto['porComponente'] = []

  for (const c of receita.componentes) {
    if (c.quantidade <= 0) continue
    const it = byId.get(c.itemId)
    const saldo = saldoOverride?.[c.itemId] ?? it?.estoque ?? 0
    const sustenta = Math.floor(saldo / c.quantidade)
    porComponente.push({ itemId: c.itemId, sustenta, necessarioPorUn: c.quantidade })
    if (sustenta < min) { min = sustenta; gargaloItemId = c.itemId }
  }

  const fabricaveis = min === Infinity ? 0 : Math.max(0, min)
  return {
    produtoId: receita.produtoId,
    fabricaveis,
    gargaloItemId,
    gargaloFabricaveis: fabricaveis,
    incompleta: !!receita.incompleta,
    porComponente: porComponente.sort((a, b) => a.sustenta - b.sustenta),
  }
}

/** Resumo agregado para KPIs do dashboard. */
export interface ResumoEstoque {
  valorTotal: number
  unidadesPA: number
  emDia: number
  repor: number
  critico: number
  itensTotais: number
}

export function resumoEstoque(itens: Item[]): ResumoEstoque {
  let valorTotal = 0, unidadesPA = 0, emDia = 0, repor = 0, critico = 0
  for (const it of itens) {
    if (!it.ativo) continue
    valorTotal += valorEstoque(it)
    if (it.tipo === 'produto_acabado') unidadesPA += it.estoque
    const s = statusEstoque(it)
    if (s === 'ok') emDia++; else if (s === 'baixo') repor++; else critico++
  }
  return { valorTotal, unidadesPA, emDia, repor, critico, itensTotais: itens.filter(i => i.ativo).length }
}

/** Itens abaixo do mínimo, ordenados por severidade (sugestão de compra = repor até 2× min). */
export function listaCompras(itens: Item[]) {
  return itens
    .filter(i => i.ativo && statusEstoque(i) !== 'ok')
    .map(i => ({
      item: i,
      status: statusEstoque(i),
      comprar: Math.max(0, +(i.min * 2 - i.estoque).toFixed(2)),
    }))
    .sort((a, b) =>
      (a.status === 'critico' ? 0 : 1) - (b.status === 'critico' ? 0 : 1) ||
      (b.item.min - b.item.estoque) - (a.item.min - a.item.estoque))
}

// ── Previsão de compras: cruza saldo × consumo médio diário × prazo de reposição ──

export type UrgenciaReposicao = 'atrasado' | 'agora' | 'breve' | 'ok'

export interface PrevisaoItem {
  item: Item
  status: StatusEstoque
  /** dias de estoque que ainda restam ao ritmo de consumo atual (null = sem consumo cadastrado). */
  cobertura: number | null
  /** prazo de reposição do item (dias entre pedir e receber). */
  leadTime: number
  /** ponto de pedido = consumo × leadTime + estoque de segurança. */
  rop: number
  /** folga em dias = cobertura − leadTime. Negativo = vai faltar antes de a compra chegar. */
  margem: number | null
  /** dias até o saldo bater no ponto de pedido (0 = já é hora de pedir). */
  diasAtePedir: number | null
  /** quantidade sugerida — repõe até cobrir ~2 ciclos de reposição + segurança. */
  comprar: number
  urgencia: UrgenciaReposicao
}

const URGENCIA_PESO: Record<UrgenciaReposicao, number> = { atrasado: 0, agora: 1, breve: 2, ok: 3 }
export const URGENCIA_LABEL: Record<UrgenciaReposicao, string> = {
  atrasado: 'Atrasado', agora: 'Pedir agora', breve: 'No radar', ok: 'Em dia',
}

/** Previsão de reposição de 1 item: quando comprar e quanto, cruzando uso médio × lead time. */
export function preverItem(item: Item): PrevisaoItem {
  const uso = item.usoMedioDiario ?? 0
  const leadTime = item.leadTimeDias ?? 0
  const rop = reorderPoint(item)
  const cobertura = coberturaDias(item)
  const margem = cobertura === null ? null : cobertura - leadTime
  const diasAtePedir = uso > 0 ? Math.max(0, Math.floor((item.estoque - rop) / uso)) : null
  // alvo de reposição: cobrir 2 lead times de consumo + estoque de segurança (fallback = 2× mínimo).
  const alvo = uso > 0 ? uso * leadTime * 2 + item.min : item.min * 2
  const comprar = Math.max(0, +(alvo - item.estoque).toFixed(2))

  let urgencia: UrgenciaReposicao
  if (item.estoque <= 0) urgencia = 'atrasado'
  else if (margem !== null && margem < 0) urgencia = 'atrasado'   // cobertura não cobre o prazo de entrega
  else if (item.estoque <= rop) urgencia = 'agora'
  else if (diasAtePedir !== null && diasAtePedir <= 7) urgencia = 'breve'
  else urgencia = 'ok'

  return { item, status: statusEstoque(item), cobertura, leadTime, rop, margem, diasAtePedir, comprar, urgencia }
}

/** Itens que precisam de atenção de compra (exclui 'ok'), ordenados por urgência → menor folga. */
export function previsaoReposicao(itens: Item[]): PrevisaoItem[] {
  return itens
    .filter(i => i.ativo)
    .map(preverItem)
    .filter(p => p.urgencia !== 'ok')
    .sort((a, b) =>
      URGENCIA_PESO[a.urgencia] - URGENCIA_PESO[b.urgencia] ||
      (a.margem ?? 1e9) - (b.margem ?? 1e9))
}

/** True quando o item já deve entrar numa ordem de compra (não só no radar). */
export const devePedir = (p: PrevisaoItem) => p.urgencia === 'atrasado' || p.urgencia === 'agora'

// ── Custo de produção (CMV) por garrafa: líquido + embalagem + mão de obra ──

/** Mão de obra por garrafa (planilha João: R$4,50/un). */
export const MAO_DE_OBRA_POR_UN = 4.50

export interface CustoReceita {
  liquido: number      // soma das matérias-primas do BOM
  embalagem: number    // garrafa + rolha + tubete + rótulo + pingente + selo
  maoDeObra: number
  total: number        // = CMV da garrafa pronta
}

/** Detalha o custo de 1 unidade produzida a partir do BOM + mão de obra. */
export function custoReceita(receita: Receita, itens: Item[]): CustoReceita {
  const byId = new Map(itens.map(i => [i.id, i]))
  let liquido = 0, embalagem = 0
  for (const c of receita.componentes) {
    const it = byId.get(c.itemId)
    if (!it) continue
    const custo = it.custoMedio * c.quantidade
    // matéria-prima OU granel (líquido pronto, que já carrega o custo da MP) contam como líquido.
    if (it.tipo === 'materia_prima' || it.tipo === 'produto_intermediario') liquido += custo
    else embalagem += custo
  }
  return { liquido, embalagem, maoDeObra: MAO_DE_OBRA_POR_UN, total: liquido + embalagem + MAO_DE_OBRA_POR_UN }
}

// ── Caixa de ENVIO deduzida pelo tamanho do pedido (pedido do João — áudio 10/06) ──
// Regra inferida do áudio: 1 garrafa → caixa de 1 · 2-3 → caixa do combo · 4-6 → caixa de 6 · 7+ → combinação.
// ⚠️ VALIDAR a regra com o João. Capacidades vêm dos itens caixa1 / caixa23 / caixa6.

export interface CaixaConsumo { caixaId: string; nome: string; capacidade: number; qtd: number; custo: number }

const CAIXAS_ENVIO: { id: string; capacidade: number }[] = [
  { id: 'caixa6',  capacidade: 6 },
  { id: 'caixa23', capacidade: 3 },
  { id: 'caixa1',  capacidade: 1 },
]

/** Quais (e quantas) caixas de envio um pedido de N garrafas consome — empacotamento guloso pela maior caixa. */
export function caixaParaPedido(qtdGarrafas: number, itens: Item[]): CaixaConsumo[] {
  let q = Math.max(0, Math.floor(qtdGarrafas))
  const cont: Record<string, number> = {}
  while (q > 0) {
    const id = q >= 4 ? 'caixa6' : q >= 2 ? 'caixa23' : 'caixa1'
    cont[id] = (cont[id] ?? 0) + 1
    q -= CAIXAS_ENVIO.find(c => c.id === id)!.capacidade
  }
  const byId = new Map(itens.map(i => [i.id, i]))
  return CAIXAS_ENVIO
    .filter(c => cont[c.id])
    .map(c => {
      const it = byId.get(c.id)
      return { caixaId: c.id, nome: it?.nome ?? c.id, capacidade: c.capacidade, qtd: cont[c.id], custo: (it?.custoMedio ?? 0) * cont[c.id] }
    })
}

export const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtNum = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString('pt-BR') : (+n.toFixed(2)).toLocaleString('pt-BR')
