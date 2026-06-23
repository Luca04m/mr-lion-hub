// Store EDITÁVEL do Financeiro v2 — espelha o molde do Estoque (zustand + persist).
// Seeda dos snapshots REAIS reconciliados (SNAPSHOTS jan/fev de finance.ts) e torna
// as linhas da DRE (despesas) e os custos por produto MUTÁVEIS, persistidos no
// navegador. As partes ilustrativas (caixa/coortes/aging/RFM/impostos) seguem vindo
// congeladas do snapshot — só dre + products viram editáveis aqui.
//
// Versionamento à la Estoque: NÃO há `version`/`migrate`; bump-se a `name` do persist
// (mrlion-financeiro-v1) se o baseline em finance.ts mudar de forma incompatível.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SNAPSHOTS, type Periodo } from './finance'
import type { DRELine, DREKind, Product, ContaItem } from './types'

export type { Periodo }

const novoId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)

/** Linha de DRE com identidade estável (p/ CRUD) + flag de edição (proveniência 'ajustado'). */
export interface EditableDRELine extends DRELine {
  id: string
  /** true quando o lançamento foi adicionado/editado pelo usuário (≠ baseline reconciliado). */
  edited?: boolean
}
/** Produto com flag de edição — custo/preço/unidades ajustáveis na operação. */
export interface EditableProduct extends Product {
  edited?: boolean
}
/** Conta a pagar/receber com flag de edição (lançamento operacional do usuário). */
export interface EditableContaItem extends ContaItem {
  edited?: boolean
}

/**
 * Lançamento UNIFICADO de gasto (aba Gastos · planilha): UM gasto vira ao mesmo tempo
 * 1 linha de DRE (despesa → entra no resultado/lucro) + 1 conta a pagar (com vencimento
 * e status), ligadas por `gastoId`. Lançar/editar/excluir mexe nos dois lados de uma vez.
 */
export interface GastoInput {
  /** Data do gasto — usada como vencimento da conta (YYYY-MM-DD). */
  data: string
  categoria: string
  descricao: string
  /** Valor positivo (o store grava negativo na DRE e positivo na conta). */
  valor: number
  /** true = já pago (conta 'paga', sai do aging); false = a pagar ('aberta'). */
  pago: boolean
}

export interface PeriodData {
  dre: EditableDRELine[]
  products: EditableProduct[]
  contas: EditableContaItem[]
}

/** Clona (deep-o-suficiente) o snapshot do período em estado mutável + ids estáveis. */
function seedPeriodo(p: Periodo): PeriodData {
  const snap = SNAPSHOTS[p]
  return {
    dre: snap.dre.map((l) => ({ ...l, id: novoId() })),
    products: snap.products.map((pr) => ({ ...pr })),
    contas: snap.contas.map((c) => ({ ...c })),
  }
}
function seedData(): Record<Periodo, PeriodData> {
  const out = {} as Record<Periodo, PeriodData>
  for (const p of Object.keys(SNAPSHOTS) as Periodo[]) out[p] = seedPeriodo(p)
  return out
}

interface FinanceiroState {
  /** Dados editáveis por período (seed = baseline reconciliado mai/jan/fev). */
  data: Record<Periodo, PeriodData>

  /** Período selecionado globalmente — persistido (sobrevive navegação/reload). */
  periodo: Periodo
  setPeriodo: (p: Periodo) => void

  // ── DRE (despesas/lançamentos) ──
  /** Adiciona uma linha de DRE; entra logo antes da linha de Resultado (última). */
  addDRELine: (periodo: Periodo, line: DRELine) => void
  /** Edita campos de uma linha (valor/label/kind/plan…) e marca como ajustada. */
  editDRELine: (periodo: Periodo, id: string, patch: Partial<DRELine>) => void
  /** Remove uma linha de DRE. */
  removeDRELine: (periodo: Periodo, id: string) => void

  // ── Custos por produto ──
  /** Adiciona um produto ao período. */
  addProduct: (periodo: Periodo, product: Product) => void
  /** Edita um produto (custo/preço/unidades/margens…) e marca como ajustado. */
  editProduct: (periodo: Periodo, id: string, patch: Partial<Product>) => void
  /** Remove um produto do período. */
  removeProduct: (periodo: Periodo, id: string) => void

  // ── Contas a pagar / a receber ──
  /** Adiciona uma conta (a pagar/receber) ao período; entra como ajustada. */
  addConta: (periodo: Periodo, conta: ContaItem) => void
  /** Edita campos de uma conta (parte/valor/vencimento/status…) e marca como ajustada. */
  editConta: (periodo: Periodo, id: string, patch: Partial<ContaItem>) => void
  /** Remove uma conta do período. */
  removeConta: (periodo: Periodo, id: string) => void

  // ── Gastos (lançamento UNIFICADO: 1 gasto = 1 linha de DRE + 1 conta a pagar) ──
  /** Lança um gasto: cria a despesa na DRE (afeta o resultado) e a conta a pagar, ligadas por gastoId. */
  addGasto: (periodo: Periodo, gasto: GastoInput) => void
  /** Edita um gasto pelos dois lados (DRE + conta) a partir do gastoId. */
  editGasto: (periodo: Periodo, gastoId: string, patch: Partial<GastoInput>) => void
  /** Remove um gasto (apaga a linha de DRE e a conta de mesmo gastoId). */
  removeGasto: (periodo: Periodo, gastoId: string) => void

  // ── Reset ──
  /** Restaura UM período ao baseline reconciliado de finance.ts. */
  resetarPeriodo: (periodo: Periodo) => void
  /** Restaura TODOS os períodos ao baseline. */
  resetarTudo: () => void
}

/** Categoria → kind de DRE: impostos viram 'tax'; o resto, despesa 'fixed' (ambos reduzem o resultado). */
const kindDeCategoria = (cat: string): DREKind => (/imposto|tribut|\bdas\b|simples/i.test(cat) ? 'tax' : 'fixed')
const statusDePago = (pago: boolean): ContaItem['status'] => (pago ? 'paga' : 'aberta')

/** Atualiza imutavelmente o PeriodData de um período. */
const patchPeriodo = (
  s: FinanceiroState,
  periodo: Periodo,
  fn: (d: PeriodData) => PeriodData,
): { data: Record<Periodo, PeriodData> } => ({
  data: { ...s.data, [periodo]: fn(s.data[periodo]) },
})

export const useFinanceiroStore = create<FinanceiroState>()(
  persist(
    (set) => ({
      data: seedData(),
      periodo: 'fev',

      setPeriodo: (p) => set({ periodo: p }),

      addDRELine: (periodo, line) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => {
            const nova: EditableDRELine = { ...line, id: novoId(), edited: true }
            // insere antes da linha de Resultado (última) p/ manter a DRE coerente.
            const idx = Math.max(0, d.dre.length - 1)
            return { ...d, dre: [...d.dre.slice(0, idx), nova, ...d.dre.slice(idx)] }
          }),
        ),

      editDRELine: (periodo, id, patch) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => ({
            ...d,
            dre: d.dre.map((l) => (l.id === id ? { ...l, ...patch, edited: true } : l)),
          })),
        ),

      removeDRELine: (periodo, id) =>
        set((s) => patchPeriodo(s, periodo, (d) => ({ ...d, dre: d.dre.filter((l) => l.id !== id) }))),

      addProduct: (periodo, product) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => ({
            ...d,
            products: [...d.products, { ...product, edited: true }],
          })),
        ),

      editProduct: (periodo, id, patch) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => ({
            ...d,
            products: d.products.map((p) => (p.id === id ? { ...p, ...patch, edited: true } : p)),
          })),
        ),

      removeProduct: (periodo, id) =>
        set((s) => patchPeriodo(s, periodo, (d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }))),

      addConta: (periodo, conta) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => ({
            ...d,
            contas: [...d.contas, { ...conta, id: novoId(), edited: true }],
          })),
        ),

      editConta: (periodo, id, patch) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => ({
            ...d,
            contas: d.contas.map((c) => (c.id === id ? { ...c, ...patch, edited: true } : c)),
          })),
        ),

      removeConta: (periodo, id) =>
        set((s) => patchPeriodo(s, periodo, (d) => ({ ...d, contas: d.contas.filter((c) => c.id !== id) }))),

      addGasto: (periodo, g) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => {
            const gastoId = novoId()
            const label = g.descricao.trim() || g.categoria.trim() || 'Gasto'
            const dreLine: EditableDRELine = {
              id: novoId(), gastoId, edited: true,
              label, value: -Math.abs(g.valor), kind: kindDeCategoria(g.categoria),
            }
            const conta: EditableContaItem = {
              id: novoId(), gastoId, edited: true,
              parte: label, categoria: g.categoria.trim(), tipo: 'pagar',
              valor: Math.abs(g.valor), vencimento: g.data, status: statusDePago(g.pago),
            }
            // a despesa entra antes da linha de Resultado (última); a conta vai pro fim do array.
            const idx = Math.max(0, d.dre.length - 1)
            return {
              ...d,
              dre: [...d.dre.slice(0, idx), dreLine, ...d.dre.slice(idx)],
              contas: [...d.contas, conta],
            }
          }),
        ),

      editGasto: (periodo, gastoId, patch) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => {
            const novoLabel = patch.descricao?.trim()
            return {
              ...d,
              dre: d.dre.map((l) => {
                if (l.gastoId !== gastoId) return l
                const next: EditableDRELine = { ...l, edited: true }
                if (novoLabel) next.label = novoLabel
                if (patch.categoria !== undefined) next.kind = kindDeCategoria(patch.categoria)
                if (patch.valor !== undefined && !Number.isNaN(patch.valor)) next.value = -Math.abs(patch.valor)
                return next
              }),
              contas: d.contas.map((c) => {
                if (c.gastoId !== gastoId) return c
                const next: EditableContaItem = { ...c, edited: true }
                if (novoLabel) next.parte = novoLabel
                if (patch.categoria !== undefined) next.categoria = patch.categoria.trim()
                if (patch.valor !== undefined && !Number.isNaN(patch.valor)) next.valor = Math.abs(patch.valor)
                if (patch.data !== undefined) next.vencimento = patch.data
                if (patch.pago !== undefined) next.status = statusDePago(patch.pago)
                return next
              }),
            }
          }),
        ),

      removeGasto: (periodo, gastoId) =>
        set((s) =>
          patchPeriodo(s, periodo, (d) => ({
            ...d,
            dre: d.dre.filter((l) => l.gastoId !== gastoId),
            contas: d.contas.filter((c) => c.gastoId !== gastoId),
          })),
        ),

      resetarPeriodo: (periodo) =>
        set((s) => patchPeriodo(s, periodo, () => seedPeriodo(periodo))),

      resetarTudo: () => set({ data: seedData() }),
    }),
    {
      name: 'mrlion-financeiro-v1',
      // CRUD inclui add/remove → o array persistido é autoritativo (sem merge-by-id;
      // isso ressuscitaria linhas deletadas). Merge per-período só preenche períodos
      // ausentes (localStorage legado/corrompido) com o seed do baseline.
      partialize: (s) => ({ data: s.data, periodo: s.periodo }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<{ data: Partial<Record<Periodo, PeriodData>>; periodo: Periodo }>
        const pd = p.data ?? {}
        // dre/products definem se o período persistido é válido (autoritativo).
        // `contas` é campo novo: NÃO invalida o período legado — se ausente, faz
        // BACKFILL do seed do baseline preservando as edições de dre/products do João.
        const okPeriodo = (d: Partial<PeriodData> | undefined): d is PeriodData =>
          !!d && Array.isArray(d.dre) && Array.isArray(d.products)
        // Genérico sobre os períodos de SNAPSHOTS: usa o persistido se válido,
        // senão seeda do baseline (cobre localStorage legado sem o período novo).
        const data = {} as Record<Periodo, PeriodData>
        for (const k of Object.keys(SNAPSHOTS) as Periodo[]) {
          const pk = pd[k]
          if (okPeriodo(pk)) {
            // contas ausente (state pré-feature) → backfill do baseline, sem mexer em dre/products.
            data[k] = Array.isArray(pk.contas) ? pk : { ...pk, contas: seedPeriodo(k).contas }
          } else {
            data[k] = current.data[k]
          }
        }
        // período persistido só vale se ainda existir em SNAPSHOTS.
        const periodo = p.periodo && p.periodo in SNAPSHOTS ? p.periodo : current.periodo
        return { ...current, data, periodo }
      },
    },
  ),
)
