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
import type { DRELine, DREKind, Product } from './types'

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

export interface PeriodData {
  dre: EditableDRELine[]
  products: EditableProduct[]
}

/** Clona (deep-o-suficiente) o snapshot do período em estado mutável + ids estáveis. */
function seedPeriodo(p: Periodo): PeriodData {
  const snap = SNAPSHOTS[p]
  return {
    dre: snap.dre.map((l) => ({ ...l, id: novoId() })),
    products: snap.products.map((pr) => ({ ...pr })),
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

  // ── Reset ──
  /** Restaura UM período ao baseline reconciliado de finance.ts. */
  resetarPeriodo: (periodo: Periodo) => void
  /** Restaura TODOS os períodos ao baseline. */
  resetarTudo: () => void
}

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
        const okPeriodo = (d: PeriodData | undefined): d is PeriodData =>
          !!d && Array.isArray(d.dre) && Array.isArray(d.products)
        // Genérico sobre os períodos de SNAPSHOTS: usa o persistido se válido,
        // senão seeda do baseline (cobre localStorage legado sem o período novo).
        const data = {} as Record<Periodo, PeriodData>
        for (const k of Object.keys(SNAPSHOTS) as Periodo[]) {
          data[k] = okPeriodo(pd[k]) ? (pd[k] as PeriodData) : current.data[k]
        }
        // período persistido só vale se ainda existir em SNAPSHOTS.
        const periodo = p.periodo && p.periodo in SNAPSHOTS ? p.periodo : current.periodo
        return { ...current, data, periodo }
      },
    },
  ),
)
