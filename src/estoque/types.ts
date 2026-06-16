// ════════════════════════════════════════════════════════════════════
// Casa Mr. Lion — Estoque & Produção · Modelo de domínio (manufatura)
// Matéria-prima + embalagem → ordem de produção (BOM) → produto acabado.
// Spec: Dados/Documentos/research-controle-estoque-manufatura-classe-mundial-2026-05-28.md
// ════════════════════════════════════════════════════════════════════

export type TipoItem = 'materia_prima' | 'embalagem' | 'produto_intermediario' | 'produto_acabado'

export type Uom = 'kg' | 'g' | 'L' | 'ml' | 'un'

export type ClasseAbc = 'A' | 'B' | 'C'

/** Categoria fina para agrupar/filtrar (linha de produto ou família de insumo). */
export type CategoriaItem =
  | 'honey' | 'cappuccino' | 'blended'        // produto acabado / vínculo de linha
  | 'liquido' | 'po' | 'aditivo'              // matéria-prima
  | 'granel'                                  // produto intermediário: líquido pronto no tanque (L)
  | 'garrafa' | 'rotulo' | 'pingente' | 'fechamento' | 'caixa' // embalagem

/** Linha de produto acabado. */
export type LinhaProduto = 'honey' | 'cappuccino' | 'blended'

/**
 * Bucket de organização de um item por produto (derivado do BOM):
 * 1 linha = pertence só a ela · 'compartilhado' = entra em 2+ produtos ·
 * 'geral' = embalagem comum, fora de qualquer receita (ex.: caixas de envio).
 */
export type GrupoProduto = LinhaProduto | 'compartilhado' | 'geral'

export interface Item {
  id: string
  sku: string
  nome: string
  tipo: TipoItem
  categoria: CategoriaItem
  uom: Uom
  /** Saldo atual na uom do item. (No backend final = SUM do ledger; aqui mock-first.) */
  estoque: number
  /** Estoque de segurança / mínimo — gatilho de reposição. */
  min: number
  /** Teto opcional (cobertura máxima). */
  max?: number
  custoMedio: number               // R$ por uom
  fotoUrl?: string
  fornecedorId?: string
  leadTimeDias?: number
  usoMedioDiario?: number          // consumo médio/dia (para ROP e cobertura)
  perecivel?: boolean
  classeAbc?: ClasseAbc
  /** usado por mais de um produto (ex.: açúcar, garrafa Honey/Blended). */
  compartilhado?: boolean
  ativo: boolean
}

export interface Fornecedor {
  id: string
  nome: string
  contato?: string
  leadTimeDias: number
  itensFornecidos: string[]        // ids de Item
}

/** Linha de receita: quanto de um componente entra em 1 unidade do produto. */
export interface BomComponente {
  itemId: string
  quantidade: number               // por unidade do produto
  uom: Uom
}

/**
 * Etapa de manufatura de uma receita (modelo de 2 estágios — pedido do João 11/06):
 * 'liquido' = matéria-prima → granel no tanque (saída em L) ·
 * 'envase'  = granel + embalagem → garrafa pronta (saída em un) ·
 * 'completa'= legado de estágio único (ex.: Blended sem receita líquida ainda).
 */
export type EtapaReceita = 'liquido' | 'envase' | 'completa'

/** Receita / Bill of Materials de uma etapa de produção. */
export interface Receita {
  id: string
  produtoId: string                // → Item produto_acabado (linha à qual a receita pertence)
  saidaId: string                  // → Item gerado por esta receita (granel na etapa 'liquido', PA nas demais)
  etapa: EtapaReceita
  nome: string
  rendimento: number               // unidades de saída produzidas por execução (default 1)
  componentes: BomComponente[]
  /** receita líquida ainda não cadastrada (ex.: Blended) — calcula só pela embalagem. */
  incompleta?: boolean
}

export type StatusMO = 'planejada' | 'em_producao' | 'concluida' | 'cancelada'

export interface OrdemProducao {
  id: string
  codigo: string                   // ex.: OP-0042
  produtoId: string
  receitaId: string
  qtdPlanejada: number
  qtdReal?: number
  status: StatusMO
  criadaEm: string                 // ISO
  concluidaEm?: string
  prioridade: number               // menor = mais prioritária (reserva insumo antes)
}

export type StatusPO = 'aberta' | 'parcial' | 'recebida' | 'cancelada'

export interface POLinha {
  itemId: string
  qtd: number
  precoUnitario: number
}

export interface PurchaseOrder {
  id: string
  codigo: string                   // ex.: PC-0007
  fornecedorId: string
  status: StatusPO
  linhas: POLinha[]
  total: number
  criadaEm: string                 // ISO
  recebidaEm?: string
}

export type TipoMovimento =
  | 'recebimento' | 'consumo_producao' | 'entrada_producao'
  | 'venda' | 'ajuste' | 'transferencia' | 'perda'

export interface Movimento {
  id: string
  itemId: string
  delta: number                    // +/- na uom do item
  tipo: TipoMovimento
  refTipo?: 'po' | 'mo' | 'venda' | 'ajuste'
  refId?: string
  motivo?: string
  usuario?: string
  criadoEm: string                 // ISO
}

// ── tipos derivados (saída da engine) ──

export type StatusEstoque = 'ok' | 'baixo' | 'critico'

export interface DisponibilidadeProduto {
  produtoId: string
  fabricaveis: number              // quantas unidades dá pra produzir agora
  gargaloItemId: string | null     // componente que limita
  gargaloFabricaveis: number
  incompleta: boolean
  /** por componente: quantas unidades o estoque dele sustenta. */
  porComponente: { itemId: string; sustenta: number; necessarioPorUn: number }[]
}
