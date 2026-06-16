// ════════════════════════════════════════════════════════════════════
// Mock data — Casa Mr. Lion (destilaria de whisky premium)
// Insumos líquidos + embalagem → 3 produtos (Honey, Cappuccino, Blended).
// Números de estoque/mínimo/receita são EXEMPLO realista — ajustar com a destilaria.
// ════════════════════════════════════════════════════════════════════

import honeyImg from './assets/products/honey/garrafa-norm.webp'
import cappuccinoImg from './assets/products/cappuccino/garrafa-norm.webp'
import blendedImg from './assets/products/blended/garrafa-norm.webp'
import type { Item, Fornecedor, Receita, OrdemProducao, Movimento, LinhaProduto, GrupoProduto } from './types'

// ── Fornecedores (REAIS — planilha João 10/06) ──
export const FORNECEDORES: Fornecedor[] = [
  { id: 'f-lamas',     nome: 'Lamas (produção interna)',    contato: 'Álcool / malte',  leadTimeDias: 0,  itensFornecidos: ['alcool','malte'] },
  { id: 'f-coopermel', nome: 'Coopermel Bocaiúva',          contato: 'Mel',             leadTimeDias: 7,  itensFornecidos: ['mel'] },
  { id: 'f-fracarolli',nome: 'Irmãos Fracarolli',           contato: 'Aromas / corante',leadTimeDias: 7,  itensFornecidos: ['aroma_mel','aroma_cap','corante'] },
  { id: 'f-atacado',   nome: 'Atacadista (melhor preço)',   contato: 'Leite / creme / açúcar', leadTimeDias: 7, itensFornecidos: ['leite_cond','creme_leite','acucar'] },
  { id: 'f-sulfal',    nome: 'Sulfal (retirada na loja)',   contato: 'CMC / citrato',   leadTimeDias: 2,  itensFornecidos: ['cmc','citrato'] },
  { id: 'f-premier',   nome: 'Premier Pack',                contato: 'Garrafa / rolha', leadTimeDias: 7,  itensFornecidos: ['garrafa_hb','garrafa_cap','rolha'] },
  { id: 'f-inoove',    nome: 'Inoove Embalagens',           contato: 'Tubete',          leadTimeDias: 30, itensFornecidos: ['tubo_hb','tubo_cap'] },
  { id: 'f-flavio',    nome: 'Flávio / Leão ou Coroa',      contato: 'Pingente',        leadTimeDias: 30, itensFornecidos: ['ping_honey','ping_cap','ping_blend'] },
  { id: 'f-fabiana',   nome: 'Fabiana Embalagens',          contato: 'Caixas',          leadTimeDias: 30, itensFornecidos: ['caixa6','caixa23','caixa1'] },
  { id: 'f-graphix',   nome: 'Graphix',                     contato: 'Rótulos',         leadTimeDias: 7,  itensFornecidos: ['rotulo_honey','rotulo_cap','rotulo_blend'] },
]

// ── Itens (matéria-prima, embalagem, produto acabado) ──
// custoMedio / fornecedorId / leadTimeDias = REAIS (planilha João 10/06 + açúcar R$5 solto + selo/MO).
// estoque / min / usoMedioDiario = exemplo até a CONTAGEM FÍSICA do João (12/06) — ele passa e a gente cadastra.
export const ITENS: Item[] = [
  // ── matéria-prima (base do whisky + aditivos) ──
  { id:'alcool',     sku:'MP-001', nome:'Álcool de cereais 96%', tipo:'materia_prima', categoria:'liquido', uom:'L',  estoque:800, min:200, custoMedio:11.42, fornecedorId:'f-lamas',     leadTimeDias:0,  usoMedioDiario:30,  classeAbc:'B', compartilhado:true, ativo:true },
  { id:'malte',      sku:'MP-002', nome:'Malte whisky 56GL',     tipo:'materia_prima', categoria:'liquido', uom:'L',  estoque:300, min:100, custoMedio:42.63, fornecedorId:'f-lamas',     leadTimeDias:0,  usoMedioDiario:12,  classeAbc:'A', compartilhado:true, ativo:true },
  { id:'mel',        sku:'MP-003', nome:'Mel silvestre',       tipo:'materia_prima', categoria:'liquido', uom:'kg', estoque:34,  min:12,  custoMedio:24.20, fornecedorId:'f-coopermel', leadTimeDias:7,  usoMedioDiario:2.1, perecivel:true,  classeAbc:'A', ativo:true },
  { id:'acucar',     sku:'MP-004', nome:'Açúcar',              tipo:'materia_prima', categoria:'po',      uom:'kg', estoque:62,  min:20,  custoMedio:5.00,  fornecedorId:'f-atacado',   leadTimeDias:7,  usoMedioDiario:3.0, classeAbc:'B', compartilhado:true, ativo:true },
  { id:'aroma_mel',  sku:'MP-005', nome:'Aroma de mel',        tipo:'materia_prima', categoria:'aditivo', uom:'L',  estoque:2.4, min:1.0, custoMedio:135.77,fornecedorId:'f-fracarolli',leadTimeDias:7,  usoMedioDiario:0.18,classeAbc:'A', ativo:true },
  { id:'creme_leite',sku:'MP-006', nome:'Creme de leite',      tipo:'materia_prima', categoria:'liquido', uom:'kg', estoque:9.5, min:5,   custoMedio:19.31, fornecedorId:'f-atacado',   leadTimeDias:7,  usoMedioDiario:0.9, perecivel:true,  classeAbc:'B', ativo:true },
  { id:'leite_cond', sku:'MP-007', nome:'Leite condensado',    tipo:'materia_prima', categoria:'liquido', uom:'kg', estoque:11,  min:6,   custoMedio:16.76, fornecedorId:'f-atacado',   leadTimeDias:7,  usoMedioDiario:1.0, perecivel:true,  classeAbc:'B', ativo:true },
  { id:'aroma_cap',  sku:'MP-008', nome:'Aroma de cappuccino', tipo:'materia_prima', categoria:'aditivo', uom:'L',  estoque:1.6, min:0.8, custoMedio:128.08,fornecedorId:'f-fracarolli',leadTimeDias:7,  usoMedioDiario:0.12,classeAbc:'A', ativo:true },
  { id:'cmc',        sku:'MP-009', nome:'CMC (espessante)',    tipo:'materia_prima', categoria:'po',      uom:'kg', estoque:0.6, min:0.3, custoMedio:38.50, fornecedorId:'f-sulfal',    leadTimeDias:2,  usoMedioDiario:0.03,classeAbc:'C', ativo:true },
  { id:'corante',    sku:'MP-010', nome:'Corante caramelo',    tipo:'materia_prima', categoria:'aditivo', uom:'L',  estoque:0.9, min:0.4, custoMedio:54.88, fornecedorId:'f-fracarolli',leadTimeDias:7,  usoMedioDiario:0.05,classeAbc:'C', ativo:true },
  { id:'citrato',    sku:'MP-011', nome:'Citrato de sódio',    tipo:'materia_prima', categoria:'po',      uom:'kg', estoque:0.5, min:0.2, custoMedio:42.79, fornecedorId:'f-sulfal',    leadTimeDias:2,  usoMedioDiario:0.02,classeAbc:'C', ativo:true },

  // ── embalagem (componentes da garrafa pronta) ──
  { id:'garrafa_hb', sku:'EM-001', nome:'Garrafa Honey/Blended', tipo:'embalagem', categoria:'garrafa',    uom:'un', estoque:128, min:120, custoMedio:11.74, fornecedorId:'f-premier', leadTimeDias:7,  usoMedioDiario:34, classeAbc:'A', compartilhado:true, ativo:true },
  { id:'garrafa_cap',sku:'EM-002', nome:'Garrafa Cappuccino',    tipo:'embalagem', categoria:'garrafa',    uom:'un', estoque:58,  min:80,  custoMedio:23.83, fornecedorId:'f-premier', leadTimeDias:30, usoMedioDiario:12, classeAbc:'A', ativo:true },
  { id:'rolha',      sku:'EM-003', nome:'Rolha',                 tipo:'embalagem', categoria:'fechamento', uom:'un', estoque:340, min:160, custoMedio:1.28,  fornecedorId:'f-premier', leadTimeDias:7,  usoMedioDiario:46, classeAbc:'B', compartilhado:true, ativo:true },
  { id:'tubo_hb',    sku:'EM-004', nome:'Tubete Honey/Blended',  tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:210, min:150, custoMedio:14.12, fornecedorId:'f-inoove',  leadTimeDias:30, usoMedioDiario:34, classeAbc:'A', compartilhado:true, ativo:true },
  { id:'tubo_cap',   sku:'EM-005', nome:'Tubete Cappuccino',     tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:90,  min:80,  custoMedio:11.36, fornecedorId:'f-inoove',  leadTimeDias:30, usoMedioDiario:12, classeAbc:'A', ativo:true },
  { id:'rotulo_honey',sku:'EM-006',nome:'Rótulo Honey',          tipo:'embalagem', categoria:'rotulo',     uom:'un', estoque:92,  min:120, custoMedio:1.43,  fornecedorId:'f-graphix', leadTimeDias:7,  usoMedioDiario:22, classeAbc:'B', ativo:true },
  { id:'rotulo_cap', sku:'EM-007', nome:'Rótulo Cappuccino',     tipo:'embalagem', categoria:'rotulo',     uom:'un', estoque:150, min:80,  custoMedio:1.43,  fornecedorId:'f-graphix', leadTimeDias:7,  usoMedioDiario:12, classeAbc:'C', ativo:true },
  { id:'rotulo_blend',sku:'EM-008',nome:'Rótulo Blended',        tipo:'embalagem', categoria:'rotulo',     uom:'un', estoque:44,  min:50,  custoMedio:1.43,  fornecedorId:'f-graphix', leadTimeDias:7,  usoMedioDiario:9,  classeAbc:'C', ativo:true },
  { id:'ping_honey', sku:'EM-009', nome:'Pingente Honey',        tipo:'embalagem', categoria:'pingente',   uom:'un', estoque:115, min:80,  custoMedio:2.95,  fornecedorId:'f-flavio',  leadTimeDias:30, usoMedioDiario:22, classeAbc:'A', ativo:true }, // planilha 7–30, conservador 30
  { id:'ping_cap',   sku:'EM-010', nome:'Pingente Cappuccino',   tipo:'embalagem', categoria:'pingente',   uom:'un', estoque:72,  min:60,  custoMedio:2.95,  fornecedorId:'f-flavio',  leadTimeDias:30, usoMedioDiario:12, classeAbc:'A', ativo:true },
  { id:'ping_blend', sku:'EM-011', nome:'Pingente Blended',      tipo:'embalagem', categoria:'pingente',   uom:'un', estoque:26,  min:40,  custoMedio:2.95,  fornecedorId:'f-flavio',  leadTimeDias:30, usoMedioDiario:9,  classeAbc:'A', ativo:true },
  { id:'selo_ipi',   sku:'EM-012', nome:'Selo IPI',              tipo:'embalagem', categoria:'fechamento', uom:'un', estoque:2000,min:500, custoMedio:0.03,                            leadTimeDias:7,  usoMedioDiario:46, classeAbc:'C', compartilhado:true, ativo:true },
  { id:'caixa6',     sku:'EM-013', nome:'Caixa 6 unidades',      tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:30,  min:20,  custoMedio:3.30,  fornecedorId:'f-fabiana', leadTimeDias:30, usoMedioDiario:3,  classeAbc:'C', ativo:true }, // João: caixa média R$3,30 (não separou por tamanho)
  { id:'caixa23',    sku:'EM-014', nome:'Caixa 2–3 unidades',    tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:15,  min:20,  custoMedio:3.30,  fornecedorId:'f-fabiana', leadTimeDias:30, usoMedioDiario:4,  classeAbc:'C', ativo:true },
  { id:'caixa1',     sku:'EM-015', nome:'Caixa 1 unidade',       tipo:'embalagem', categoria:'caixa',      uom:'un', estoque:84,  min:50,  custoMedio:3.30,  fornecedorId:'f-fabiana', leadTimeDias:30, usoMedioDiario:9,  classeAbc:'C', ativo:true },
  { id:'colar',      sku:'EM-016', nome:'Colar / correntinha',   tipo:'embalagem', categoria:'fechamento', uom:'un', estoque:180, min:150, custoMedio:1.30,  fornecedorId:'f-flavio',  leadTimeDias:30, usoMedioDiario:46, classeAbc:'B', compartilhado:true, ativo:false }, // não consta na planilha do João (pingente "Leão/Coroa" já inclui correntinha?) — desativado p/ validar

  // ── produto intermediário (LÍQUIDO PRONTO no tanque, em litros — pedido do João 11/06) ──
  //    custoMedio = custo das matérias-primas por litro (= CMV-líquido/garrafa ÷ 0,75L de enchimento).
  //    estoque/min = exemplo até a contagem física; o caso clássico (muito líquido, pouca garrafa) aparece no envase.
  { id:'granel_honey',      sku:'WIP-001', nome:'Granel Honey (tanque)',      tipo:'produto_intermediario', categoria:'granel', uom:'L', estoque:600, min:150, custoMedio:12.28, usoMedioDiario:11, classeAbc:'A', ativo:true },
  { id:'granel_cappuccino', sku:'WIP-002', nome:'Granel Cappuccino (tanque)', tipo:'produto_intermediario', categoria:'granel', uom:'L', estoque:180, min:60,  custoMedio:12.03, usoMedioDiario:6,  classeAbc:'A', ativo:true },

  // ── produto acabado (custoMedio = CMV real/garrafa: líquido + embalagem + mão de obra R$4,50) ──
  { id:'pa_honey',     sku:'PA-001', nome:'Mr. Lion Honey 750ml',      tipo:'produto_acabado', categoria:'honey',      uom:'un', estoque:96,  min:60, custoMedio:45.26, fotoUrl:honeyImg,      usoMedioDiario:14, classeAbc:'A', ativo:true },
  { id:'pa_cappuccino',sku:'PA-002', nome:'Mr. Lion Cappuccino 750ml', tipo:'produto_acabado', categoria:'cappuccino', uom:'un', estoque:48,  min:40, custoMedio:54.40, fotoUrl:cappuccinoImg, usoMedioDiario:8,  classeAbc:'A', ativo:true },
  { id:'pa_blended',   sku:'PA-003', nome:'Mr. Lion Blended 750ml',    tipo:'produto_acabado', categoria:'blended',    uom:'un', estoque:120, min:50, custoMedio:36.05, fotoUrl:blendedImg,    usoMedioDiario:11, classeAbc:'B', ativo:true }, // incompleto: receita líquida do Blended ainda não veio
]

// ── Receitas / BOM — modelo de 2 ESTÁGIOS (pedido do João 11/06):
//    MO-1 'liquido' = matéria-prima → granel (saída em L) · MO-2 'envase' = granel + embalagem → garrafa (un).
//    Formulação REAL (foto João: batch 900L ÷ 1200 garrafas de 750ml → 0,75 L/garrafa).
//    Os componentes da etapa 'liquido' são "por 1 LITRO de granel" = quantidade-por-garrafa ÷ 0,75.
//    Mass-balance preservado: 1 garrafa = 0,75 L de granel, que por sua vez carrega a mesma matéria-prima de antes.
//    A caixa de ENVIO não entra aqui (depende do tamanho do pedido) → ver caixaParaPedido() na engine.
export const LITROS_POR_GARRAFA = 0.75

export const RECEITAS: Receita[] = [
  // ── HONEY ──
  {
    id:'rec-honey-liquido', produtoId:'pa_honey', saidaId:'granel_honey', etapa:'liquido',
    nome:'Líquido Honey (por litro)', rendimento:1,
    componentes:[
      { itemId:'alcool', quantidade:0.34, uom:'L' },
      { itemId:'malte', quantidade:0.13, uom:'L' },
      { itemId:'mel', quantidade:0.10, uom:'kg' },
      { itemId:'acucar', quantidade:0.06, uom:'kg' },
      { itemId:'aroma_mel', quantidade:0.001, uom:'L' },
    ],
  },
  {
    id:'rec-honey-envase', produtoId:'pa_honey', saidaId:'pa_honey', etapa:'envase',
    nome:'Envase Honey 750ml', rendimento:1,
    componentes:[
      { itemId:'granel_honey', quantidade:0.75, uom:'L' },
      { itemId:'garrafa_hb', quantidade:1, uom:'un' },
      { itemId:'rolha', quantidade:1, uom:'un' },
      { itemId:'rotulo_honey', quantidade:1, uom:'un' },
      { itemId:'tubo_hb', quantidade:1, uom:'un' },
      { itemId:'ping_honey', quantidade:1, uom:'un' },
      { itemId:'selo_ipi', quantidade:1, uom:'un' },
    ],
  },
  // ── CAPPUCCINO ──
  {
    id:'rec-cappuccino-liquido', produtoId:'pa_cappuccino', saidaId:'granel_cappuccino', etapa:'liquido',
    nome:'Líquido Cappuccino (por litro)', rendimento:1,
    componentes:[
      { itemId:'alcool', quantidade:0.15556, uom:'L' },
      { itemId:'malte', quantidade:0.06223, uom:'L' },
      { itemId:'leite_cond', quantidade:0.34667, uom:'kg' },
      { itemId:'acucar', quantidade:0.13889, uom:'kg' },
      { itemId:'creme_leite', quantidade:0.03467, uom:'kg' },
      { itemId:'aroma_cap', quantidade:0.002, uom:'L' },
      { itemId:'corante', quantidade:0.00133, uom:'L' },
      { itemId:'cmc', quantidade:0.00133, uom:'kg' },
      { itemId:'citrato', quantidade:0.00104, uom:'kg' },
    ],
  },
  {
    id:'rec-cappuccino-envase', produtoId:'pa_cappuccino', saidaId:'pa_cappuccino', etapa:'envase',
    nome:'Envase Cappuccino 750ml', rendimento:1,
    componentes:[
      { itemId:'granel_cappuccino', quantidade:0.75, uom:'L' },
      { itemId:'garrafa_cap', quantidade:1, uom:'un' },
      { itemId:'rolha', quantidade:1, uom:'un' },
      { itemId:'rotulo_cap', quantidade:1, uom:'un' },
      { itemId:'tubo_cap', quantidade:1, uom:'un' },
      { itemId:'ping_cap', quantidade:1, uom:'un' },
      { itemId:'selo_ipi', quantidade:1, uom:'un' },
    ],
  },
  // ── BLENDED (etapa única — receita líquida ainda não recebida) ──
  {
    id:'rec-blended', produtoId:'pa_blended', saidaId:'pa_blended', etapa:'completa',
    nome:'Blended 750ml', rendimento:1, incompleta:true,
    componentes:[
      // receita líquida do Blended ainda não recebida (impostos do whisky mudam ao terceirizar) — só embalagem por ora
      { itemId:'garrafa_hb', quantidade:1, uom:'un' },
      { itemId:'rolha', quantidade:1, uom:'un' },
      { itemId:'rotulo_blend', quantidade:1, uom:'un' },
      { itemId:'tubo_hb', quantidade:1, uom:'un' },
      { itemId:'ping_blend', quantidade:1, uom:'un' },
      { itemId:'selo_ipi', quantidade:1, uom:'un' },
    ],
  },
]

// ── Ordens de produção (exemplo) ──
//    produtoId de uma ordem = item GERADO (granel na etapa líquido, PA no envase).
export const ORDENS: OrdemProducao[] = [
  { id:'op-0043', codigo:'OP-0043', produtoId:'granel_honey',  receitaId:'rec-honey-liquido',     qtdPlanejada:900, status:'em_producao', criadaEm:'2026-06-09T09:00:00Z', prioridade:1 },
  { id:'op-0042', codigo:'OP-0042', produtoId:'pa_honey',      receitaId:'rec-honey-envase',      qtdPlanejada:120, status:'em_producao', criadaEm:'2026-05-26T09:00:00Z', prioridade:1 },
  { id:'op-0041', codigo:'OP-0041', produtoId:'pa_cappuccino', receitaId:'rec-cappuccino-envase', qtdPlanejada:80,  status:'planejada',   criadaEm:'2026-05-27T14:00:00Z', prioridade:2 },
  { id:'op-0040', codigo:'OP-0040', produtoId:'pa_blended',    receitaId:'rec-blended',           qtdPlanejada:200, qtdReal:198, status:'concluida', criadaEm:'2026-05-20T08:00:00Z', concluidaEm:'2026-05-22T17:00:00Z', prioridade:1 },
]

export const ITEM_BY_ID = (id: string) => ITENS.find(i => i.id === id)
export const FORNECEDOR_BY_ID = (id?: string) => FORNECEDORES.find(f => f.id === id)

/** Receitas que GERAM um produto acabado (envase ou etapa única) — exclui as de líquido/granel. */
export const RECEITAS_PA = RECEITAS.filter(r => r.etapa !== 'liquido')
/** A receita que produz o PA de uma linha (envase ou completa) — usada por Dashboard/Estoque/CMV. */
export const RECEITA_BY_PRODUTO = (produtoId: string) => RECEITAS_PA.find(r => r.produtoId === produtoId)
/** Todas as receitas (etapas) de uma linha, líquido antes do envase. */
const ORDEM_ETAPA: Record<string, number> = { liquido: 0, envase: 1, completa: 1 }
export const receitasDoProduto = (produtoId: string) =>
  RECEITAS.filter(r => r.produtoId === produtoId).sort((a, b) => ORDEM_ETAPA[a.etapa] - ORDEM_ETAPA[b.etapa])
/** Item de granel (líquido pronto) de uma linha, ou undefined se ela não tem etapa de líquido. */
export const granelDaLinha = (produtoId: string): string | undefined =>
  RECEITAS.find(r => r.produtoId === produtoId && r.etapa === 'liquido')?.saidaId

// ════════════════════════════════════════════════════════════════════
// Organização POR PRODUTO — derivada do BOM (fonte única = RECEITAS).
// Um insumo "pertence" às linhas cujas receitas o consomem; o produto
// acabado pertence à própria linha. Compartilhado = entra em 2+ produtos.
// ════════════════════════════════════════════════════════════════════

/** Metadados de cada bucket de organização (rótulo + cor + PA da linha). */
export const GRUPO_META: Record<GrupoProduto, { label: string; cor: string; produtoId?: string }> = {
  honey:         { label: 'Honey',           cor: '40 73% 55%',  produtoId: 'pa_honey' },
  cappuccino:    { label: 'Cappuccino',      cor: '25 48% 50%',  produtoId: 'pa_cappuccino' },
  blended:       { label: 'Blended',         cor: '210 38% 56%', produtoId: 'pa_blended' },
  compartilhado: { label: 'Compartilhado',   cor: '40 12% 52%' },
  geral:         { label: 'Embalagem comum', cor: '40 8% 42%' },
}

/** Ordem canônica das seções "por produto". */
export const GRUPO_ORDER: GrupoProduto[] = ['honey', 'cappuccino', 'blended', 'compartilhado', 'geral']

const LINHAS: LinhaProduto[] = ['honey', 'cappuccino', 'blended']
const PRODUTO_DA_LINHA = new Map<string, LinhaProduto>(LINHAS.map(l => [GRUPO_META[l].produtoId!, l]))

/** itemId → linhas de produto que o usam (PA da própria linha + componentes do BOM). */
export const VINCULO_PRODUTO: Map<string, LinhaProduto[]> = (() => {
  const acc = new Map<string, Set<LinhaProduto>>()
  const add = (itemId: string, linha: LinhaProduto) => {
    if (!acc.has(itemId)) acc.set(itemId, new Set())
    acc.get(itemId)!.add(linha)
  }
  for (const rec of RECEITAS) {
    const linha = PRODUTO_DA_LINHA.get(rec.produtoId)
    if (!linha) continue
    add(rec.produtoId, linha)
    add(rec.saidaId, linha)            // granel (etapa líquido) pertence à própria linha
    rec.componentes.forEach(c => add(c.itemId, linha))
  }
  return new Map([...acc].map(([id, set]) => [id, LINHAS.filter(l => set.has(l))]))
})()

/** Linhas de produto que usam um item (vazio = nenhuma receita o consome). */
export const linhasDoItem = (itemId: string): LinhaProduto[] => VINCULO_PRODUTO.get(itemId) ?? []

/** Bucket de organização de um item: a linha (1), 'compartilhado' (2+) ou 'geral' (0). */
export function grupoProduto(itemId: string): GrupoProduto {
  const l = linhasDoItem(itemId)
  return l.length === 0 ? 'geral' : l.length === 1 ? l[0] : 'compartilhado'
}

/** Histórico sintético de movimentos por item (para sparkline/drawer). Determinístico. */
export function gerarHistorico(item: Item): Movimento[] {
  const hoje = new Date('2026-05-28T12:00:00Z').getTime()
  const dia = 86400000
  const seed = item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const out: Movimento[] = []
  for (let i = 14; i >= 1; i--) {
    const pulso = ((seed * (i + 3)) % 7)
    if (pulso < 4) continue
    const ent = pulso % 2 === 0
    const mag = item.uom === 'un'
      ? Math.max(1, Math.round((item.usoMedioDiario ?? 5) * (0.6 + (pulso % 3) * 0.5)))
      : +(((item.usoMedioDiario ?? 1) * (0.5 + (pulso % 3) * 0.4))).toFixed(2)
    out.push({
      id: `${item.id}-h${i}`,
      itemId: item.id,
      delta: ent ? mag : -mag,
      tipo: ent ? 'recebimento' : 'consumo_producao',
      criadoEm: new Date(hoje - i * dia).toISOString(),
    })
  }
  return out
}
