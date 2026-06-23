// Estado reativo da plataforma = ledger central (mock-first, persistido no navegador).
// Toda ação intencional (ajuste, produção, compra recebida) registra um Movimento.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ITENS, ORDENS, RECEITAS, gerarHistorico } from './mock'
import type { Item, OrdemProducao, PurchaseOrder, Movimento, TipoMovimento } from './types'
import { fetchBlingOrders, planejarBaixa } from './bling'
import { supabase } from '../lib/supabase'

const novoId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
const agora = () => new Date().toISOString()
const seedMovimentos = (itens: Item[]): Movimento[] =>
  itens.flatMap(gerarHistorico).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))

/** Estado da sincronização Bling → estoque (idempotente por id de pedido). */
export interface BlingSyncState {
  lastSyncAt: string | null
  pedidosAplicados: string[]
  syncing: boolean
  ultimo?: { em: string; pedidosNovos?: number; itensBaixados?: number; naoMapeados?: number; erro?: string }
}

interface EstoqueState {
  itens: Item[]
  ordens: OrdemProducao[]
  compras: PurchaseOrder[]
  movimentos: Movimento[]
  /** sincronização com o Bling (puxa pedidos de venda e dá baixa no estoque). */
  blingSync: BlingSyncState
  /** hidrata os saldos a partir do Supabase (fonte de verdade server-side; baixa via WooCommerce). */
  hidratarSupabase: () => Promise<void>
  /** puxa os pedidos novos do Bling e baixa o estoque — idempotente por id de pedido. */
  sincronizarBling: () => Promise<void>
  /** edição inline de saldo (não gera movimento — é correção do número). */
  setEstoque: (id: string, valor: number) => void
  /** edita parâmetros de planejamento do item (mínimo, prazo de reposição, consumo médio, teto). */
  editarItem: (id: string, patch: Partial<Pick<Item, 'min' | 'leadTimeDias' | 'usoMedioDiario' | 'max' | 'custoMedio'>>) => void
  /** aplica delta (+/−) e registra movimento no ledger. */
  ajustar: (id: string, delta: number, tipo?: TipoMovimento, motivo?: string) => void
  /** executa uma receita (etapa): consome o BOM, gera a saída (granel ou PA) e cria ordem concluída. */
  registrarProducao: (receitaId: string, qty: number) => void
  /** cria ordem de compra (status aberta). retorna id. */
  criarPO: (fornecedorId: string, linhas: { itemId: string; qtd: number }[]) => string
  /** recebe a PO: entrada no estoque + movimento de recebimento. */
  receberPO: (poId: string) => void
  resetar: () => void
}

const aplicar = (itens: Item[], id: string, delta: number) =>
  itens.map(i => i.id === id ? { ...i, estoque: Math.max(0, +(i.estoque + delta).toFixed(3)) } : i)

export const useEstoque = create<EstoqueState>()(
  persist(
    (set, get) => ({
      itens: ITENS.map(i => ({ ...i })),
      ordens: ORDENS.map(o => ({ ...o })),
      compras: [],
      movimentos: seedMovimentos(ITENS),
      blingSync: { lastSyncAt: null, pedidosAplicados: [], syncing: false },

      // Lê os saldos reais do Supabase (RPC saldos_estoque) e sobrescreve os locais.
      // O estoque server-side é a fonte de verdade — baixa a cada pedido pago no WooCommerce.
      hidratarSupabase: async () => {
        try {
          const [saldosRes, movsRes] = await Promise.all([
            supabase.rpc('saldos_estoque'),
            supabase.rpc('movimentos_recentes', { p_limit: 200 }),
          ])
          set(s => {
            const patch: Partial<EstoqueState> = {}
            if (!saldosRes.error && saldosRes.data) {
              const bySlug = new Map((saldosRes.data as { slug: string; estoque: number }[]).map(r => [r.slug, Number(r.estoque)]))
              patch.itens = s.itens.map(i => (bySlug.has(i.id) ? { ...i, estoque: bySlug.get(i.id)! } : i))
            }
            // ledger real do Supabase (saldo inicial + vendas a cada pedido pago) substitui o histórico mock
            if (!movsRes.error && movsRes.data) {
              patch.movimentos = (movsRes.data as Array<{ id: string; item_slug: string; delta: number; tipo: TipoMovimento; motivo: string | null; usuario: string | null; criado_em: string }>)
                .map(r => ({ id: r.id, itemId: r.item_slug, delta: Number(r.delta), tipo: r.tipo, motivo: r.motivo ?? undefined, usuario: r.usuario ?? undefined, criadoEm: r.criado_em }))
            }
            return patch
          })
        } catch { /* offline: mantém os dados locais persistidos */ }
      },

      sincronizarBling: async () => {
        if (get().blingSync.syncing) return
        set(s => ({ blingSync: { ...s.blingSync, syncing: true } }))
        let resp
        try {
          // 1ª sync (sem lastSync) começa de HOJE — não re-aplica o histórico de vendas
          // já refletido na contagem física (evita baixa dobrada no 1º uso).
          const since = get().blingSync.lastSyncAt ?? new Date().toISOString().slice(0, 10)
          resp = await fetchBlingOrders(since)
        } catch (e) {
          set(s => ({ blingSync: { ...s.blingSync, syncing: false, ultimo: { em: agora(), erro: String((e as Error)?.message ?? e) } } }))
          return
        }
        if (!resp.ok || !resp.orders) {
          set(s => ({ blingSync: { ...s.blingSync, syncing: false, ultimo: { em: agora(), erro: resp.error ?? 'falha na sincronização' } } }))
          return
        }
        set(s => {
          const aplicados = new Set(s.blingSync.pedidosAplicados)
          const plano = planejarBaixa(resp!.orders!, aplicados)
          let itens = s.itens
          const movs: Movimento[] = []
          for (const m of plano.movimentos) {
            itens = aplicar(itens, m.itemId, m.delta)
            movs.push({ id: novoId(), itemId: m.itemId, delta: m.delta, tipo: 'venda', refTipo: 'venda', motivo: m.motivo, usuario: 'Bling', criadoEm: agora() })
          }
          plano.pedidosIds.forEach(id => aplicados.add(id))
          return {
            itens,
            movimentos: [...movs, ...s.movimentos],
            blingSync: {
              ...s.blingSync,
              syncing: false,
              // se truncou (janela larga), retoma da data do último processado; senão avança p/ agora.
              lastSyncAt: (resp!.truncated && resp!.nextSince) ? resp!.nextSince : (resp!.serverTime ?? agora()),
              pedidosAplicados: [...aplicados],
              ultimo: { em: agora(), pedidosNovos: plano.pedidosIds.length, itensBaixados: plano.movimentos.length, naoMapeados: plano.naoMapeados.length },
            },
          }
        })
      },

      setEstoque: (id, valor) =>
        set(s => ({ itens: s.itens.map(i => i.id === id ? { ...i, estoque: Math.max(0, valor) } : i) })),

      editarItem: (id, patch) =>
        set(s => ({ itens: s.itens.map(i => i.id === id ? { ...i, ...patch } : i) })),

      ajustar: (id, delta, tipo = 'ajuste', motivo) =>
        set(s => ({
          itens: aplicar(s.itens, id, delta),
          movimentos: [{ id: novoId(), itemId: id, delta, tipo, motivo, usuario: 'Você', criadoEm: agora() }, ...s.movimentos],
        })),

      registrarProducao: (receitaId, qty) =>
        set(s => {
          const rec = RECEITAS.find(r => r.id === receitaId)
          if (!rec || qty <= 0) return s
          let itens = s.itens
          const movs: Movimento[] = []
          rec.componentes.forEach(c => {
            const delta = -c.quantidade * qty
            itens = aplicar(itens, c.itemId, delta)
            movs.push({ id: novoId(), itemId: c.itemId, delta, tipo: 'consumo_producao', refTipo: 'mo', criadoEm: agora() })
          })
          // gera a saída da receita: granel (etapa líquido) ou produto acabado (envase/completa).
          itens = aplicar(itens, rec.saidaId, qty)
          movs.push({ id: novoId(), itemId: rec.saidaId, delta: qty, tipo: 'entrada_producao', refTipo: 'mo', criadoEm: agora() })
          const codigo = `OP-${String(40 + s.ordens.length + 1).padStart(4, '0')}`
          const op: OrdemProducao = {
            id: novoId(), codigo, produtoId: rec.saidaId, receitaId: rec.id, qtdPlanejada: qty, qtdReal: qty,
            status: 'concluida', criadaEm: agora(), concluidaEm: agora(), prioridade: 1,
          }
          return { itens, movimentos: [...movs, ...s.movimentos], ordens: [op, ...s.ordens] }
        }),

      criarPO: (fornecedorId, linhas) => {
        const id = novoId()
        set(s => {
          const poLinhas = linhas
            .filter(l => l.qtd > 0)
            .map(l => {
              const it = s.itens.find(i => i.id === l.itemId)
              return { itemId: l.itemId, qtd: l.qtd, precoUnitario: it?.custoMedio ?? 0 }
            })
          const total = poLinhas.reduce((t, l) => t + l.qtd * l.precoUnitario, 0)
          const codigo = `PC-${String(s.compras.length + 1).padStart(4, '0')}`
          const po: PurchaseOrder = { id, codigo, fornecedorId, status: 'aberta', linhas: poLinhas, total, criadaEm: agora() }
          return { compras: [po, ...s.compras] }
        })
        return id
      },

      receberPO: (poId) =>
        set(s => {
          const po = s.compras.find(p => p.id === poId)
          if (!po || po.status === 'recebida') return s
          let itens = s.itens
          const movs: Movimento[] = []
          po.linhas.forEach(l => {
            itens = aplicar(itens, l.itemId, l.qtd)
            movs.push({ id: novoId(), itemId: l.itemId, delta: l.qtd, tipo: 'recebimento', refTipo: 'po', refId: po.id, criadoEm: agora() })
          })
          return {
            itens,
            movimentos: [...movs, ...s.movimentos],
            compras: s.compras.map(p => p.id === poId ? { ...p, status: 'recebida', recebidaEm: agora() } : p),
          }
        }),

      resetar: () =>
        set({
          itens: ITENS.map(i => ({ ...i })), ordens: ORDENS.map(o => ({ ...o })), compras: [], movimentos: seedMovimentos(ITENS),
          blingSync: { lastSyncAt: null, pedidosAplicados: [], syncing: false },
        }),
    }),
    {
      name: 'mrlion-estoque-v6', // v6: contagem física 18/06 (João) + pingentes Leão/Coroa + estojo Blended — força refresh dos defaults
      // persiste saldo + parâmetros de planejamento editados na operação (mínimo, prazo, consumo, teto).
      partialize: (s) => ({
        itens: s.itens.map(i => ({
          id: i.id, estoque: i.estoque, min: i.min,
          leadTimeDias: i.leadTimeDias, usoMedioDiario: i.usoMedioDiario, max: i.max,
          custoMedio: i.custoMedio, // custo do insumo editável na operação (não re-hidratado do Supabase → persiste local)
        })),
        movimentos: s.movimentos, compras: s.compras, ordens: s.ordens,
        blingSync: { lastSyncAt: s.blingSync.lastSyncAt, pedidosAplicados: s.blingSync.pedidosAplicados, ultimo: s.blingSync.ultimo },
      }),
      merge: (persisted, current) => {
        type ItemSalvo = { id: string; estoque?: number } & Partial<Pick<Item, 'min' | 'leadTimeDias' | 'usoMedioDiario' | 'max' | 'custoMedio'>>
        const p = (persisted ?? {}) as Partial<{
          itens: ItemSalvo[]; movimentos: Movimento[]; compras: PurchaseOrder[]; ordens: OrdemProducao[]
          blingSync: Partial<BlingSyncState>
        }>
        const byId = new Map((p.itens ?? []).map(x => [x.id, x]))
        return {
          ...current,
          // campo salvo tem precedência; ausente (ex.: localStorage legado) cai no default do mock.
          itens: current.itens.map(i => {
            const o = byId.get(i.id)
            if (!o) return i
            return {
              ...i,
              estoque: o.estoque ?? i.estoque,
              min: o.min ?? i.min,
              leadTimeDias: o.leadTimeDias ?? i.leadTimeDias,
              usoMedioDiario: o.usoMedioDiario ?? i.usoMedioDiario,
              max: o.max ?? i.max,
              custoMedio: o.custoMedio ?? i.custoMedio,
            }
          }),
          movimentos: p.movimentos ?? current.movimentos,
          compras: p.compras ?? current.compras,
          ordens: p.ordens ?? current.ordens,
          blingSync: {
            lastSyncAt: p.blingSync?.lastSyncAt ?? current.blingSync.lastSyncAt,
            pedidosAplicados: p.blingSync?.pedidosAplicados ?? current.blingSync.pedidosAplicados,
            ultimo: p.blingSync?.ultimo ?? current.blingSync.ultimo,
            syncing: false,
          },
        }
      },
    },
  ),
)
