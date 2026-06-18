// Estado reativo da plataforma = ledger central (mock-first, persistido no navegador).
// Toda ação intencional (ajuste, produção, compra recebida) registra um Movimento.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ITENS, ORDENS, RECEITAS, gerarHistorico } from './mock'
import type { Item, OrdemProducao, PurchaseOrder, Movimento, TipoMovimento } from './types'

const novoId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
const agora = () => new Date().toISOString()
const seedMovimentos = (itens: Item[]): Movimento[] =>
  itens.flatMap(gerarHistorico).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))

interface EstoqueState {
  itens: Item[]
  ordens: OrdemProducao[]
  compras: PurchaseOrder[]
  movimentos: Movimento[]
  /** edição inline de saldo (não gera movimento — é correção do número). */
  setEstoque: (id: string, valor: number) => void
  /** edita parâmetros de planejamento do item (mínimo, prazo de reposição, consumo médio, teto). */
  editarItem: (id: string, patch: Partial<Pick<Item, 'min' | 'leadTimeDias' | 'usoMedioDiario' | 'max'>>) => void
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
    (set) => ({
      itens: ITENS.map(i => ({ ...i })),
      ordens: ORDENS.map(o => ({ ...o })),
      compras: [],
      movimentos: seedMovimentos(ITENS),

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
        set({ itens: ITENS.map(i => ({ ...i })), ordens: ORDENS.map(o => ({ ...o })), compras: [], movimentos: seedMovimentos(ITENS) }),
    }),
    {
      name: 'mrlion-estoque-v6', // v6: contagem física 18/06 (João) + pingentes Leão/Coroa + estojo Blended — força refresh dos defaults
      // persiste saldo + parâmetros de planejamento editados na operação (mínimo, prazo, consumo, teto).
      partialize: (s) => ({
        itens: s.itens.map(i => ({
          id: i.id, estoque: i.estoque, min: i.min,
          leadTimeDias: i.leadTimeDias, usoMedioDiario: i.usoMedioDiario, max: i.max,
        })),
        movimentos: s.movimentos, compras: s.compras, ordens: s.ordens,
      }),
      merge: (persisted, current) => {
        type ItemSalvo = { id: string; estoque?: number } & Partial<Pick<Item, 'min' | 'leadTimeDias' | 'usoMedioDiario' | 'max'>>
        const p = (persisted ?? {}) as Partial<{
          itens: ItemSalvo[]; movimentos: Movimento[]; compras: PurchaseOrder[]; ordens: OrdemProducao[]
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
            }
          }),
          movimentos: p.movimentos ?? current.movimentos,
          compras: p.compras ?? current.compras,
          ordens: p.ordens ?? current.ordens,
        }
      },
    },
  ),
)
