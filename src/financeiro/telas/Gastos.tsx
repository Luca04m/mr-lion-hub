// Tela GASTOS (/financeiro/gastos) — a planilha de despesas do mês.
// Lançar um gasto aqui é UM ato só: ele entra no resultado do mês (DRE) E vira uma
// conta a pagar (com data e status), via as actions addGasto/editGasto/removeGasto
// do store (ligam DRELine ↔ ContaItem por gastoId). Edição inline célula a célula +
// uma linha "novo gasto" sempre pronta no topo — fácil de mexer como planilha.
// Reskin SÓBRIO do Hub (Montserrat, rounded-card/sub, .tnum, gold discreto, sem glow).
import { useMemo, useState } from 'react'
import { Plus, Trash2, Receipt, Wallet, CircleCheck, Clock, TrendingDown, Coins } from 'lucide-react'
import { useFinanceiroCtx } from '../FinanceiroLayout'
import { useFinance } from '../data/source'
import { useFinanceiroStore } from '../data/store'
import { brl, brlCompact } from '../lib/format'

// Atalhos de categoria — clica e preenche (mesma linguagem do João na Caixa).
const CATEGORIAS = ['Marketing', 'Logística', 'Insumos', 'Embalagem', 'Produção', 'Impostos', 'Frete', 'Pró-labore', 'Outros'] as const

const hojeISO = () => new Date().toISOString().slice(0, 10)

/** "2026-06-23" → "23/06". Tolerante a string vazia/seed. */
function fmtData(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}/${m[2]}`
  return s || '—'
}

// Grid compartilhado entre cabeçalho, linha de novo gasto e linhas — mantém o alinhamento.
const GRID = 'grid grid-cols-[104px_1.1fr_1.5fr_112px_108px_28px] gap-3 items-center'

interface GastoRow {
  gastoId: string
  data: string
  categoria: string
  descricao: string
  valor: number
  pago: boolean
}

export function Gastos() {
  const { periodo } = useFinanceiroCtx()
  const { snapshot, derivados } = useFinance(periodo)
  const contas = useFinanceiroStore((s) => s.data[periodo].contas)
  const addGasto = useFinanceiroStore((s) => s.addGasto)
  const editGasto = useFinanceiroStore((s) => s.editGasto)
  const removeGasto = useFinanceiroStore((s) => s.removeGasto)

  // Gastos = contas geradas pela aba (têm gastoId). Mais recentes primeiro.
  const gastos = useMemo<GastoRow[]>(
    () =>
      contas
        .filter((c) => c.gastoId)
        .map((c) => ({
          gastoId: c.gastoId!,
          data: c.vencimento,
          categoria: c.categoria,
          descricao: c.parte,
          valor: c.valor,
          pago: c.status === 'paga',
        }))
        .reverse(),
    [contas],
  )

  const total = gastos.reduce((a, g) => a + g.valor, 0)
  const pago = gastos.filter((g) => g.pago).reduce((a, g) => a + g.valor, 0)
  const aPagar = total - pago
  const resNeg = derivados.resultado < 0

  // ── Linha "novo gasto" (sempre visível no topo) ──
  const [nData, setNData] = useState(hojeISO())
  const [nCat, setNCat] = useState('')
  const [nDesc, setNDesc] = useState('')
  const [nValor, setNValor] = useState('')
  const [nPago, setNPago] = useState(false)
  const podeAdd = Number(nValor) > 0 && (nDesc.trim() !== '' || nCat.trim() !== '')

  const adicionar = () => {
    if (!podeAdd) return
    addGasto(periodo, {
      data: nData || hojeISO(),
      categoria: nCat.trim(),
      descricao: nDesc.trim(),
      valor: Math.abs(Number(nValor)),
      pago: nPago,
    })
    setNCat('')
    setNDesc('')
    setNValor('')
    setNPago(false)
    setNData(hojeISO())
  }

  // ── Edição inline célula a célula ──
  const [editing, setEditing] = useState<{ gastoId: string; field: 'data' | 'categoria' | 'descricao' | 'valor' } | null>(null)
  const [editVal, setEditVal] = useState('')
  const startEdit = (g: GastoRow, field: 'data' | 'categoria' | 'descricao' | 'valor') => {
    setEditing({ gastoId: g.gastoId, field })
    setEditVal(field === 'valor' ? String(g.valor) : g[field])
  }
  const commit = (g: GastoRow) => {
    if (!editing) return
    const f = editing.field
    if (f === 'valor') {
      const n = Number(editVal)
      if (editVal.trim() !== '' && !Number.isNaN(n) && n > 0) editGasto(periodo, g.gastoId, { valor: Math.abs(n) })
    } else if (f === 'data') {
      editGasto(periodo, g.gastoId, { data: editVal })
    } else if (editVal.trim() !== '') {
      editGasto(periodo, g.gastoId, { [f]: editVal.trim() })
    }
    setEditing(null)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Hero ── */}
      <div>
        <h1 className="font-display text-2xl leading-tight text-foreground">
          Seus <span className="text-gold">gastos</span> do mês
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-text-secondary">
          {snapshot.meta.periodoLabel} · lance aqui tudo que a operação gasta. Cada lançamento já entra no{' '}
          <b className="text-foreground">resultado do mês</b> e vira uma{' '}
          <b className="text-foreground">conta a pagar</b> — sem precisar abrir a DRE nem a aba de contas.
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {[
          { l: 'Total de gastos', v: brl(total, 0), t: 'text-foreground', i: Receipt, sub: `${gastos.length} lançamento${gastos.length === 1 ? '' : 's'}` },
          { l: 'A pagar', v: brl(aPagar, 0), t: 'text-danger', i: Clock, sub: 'em aberto' },
          { l: 'Já pago', v: brl(pago, 0), t: 'text-success', i: CircleCheck, sub: 'quitado' },
          { l: 'Resultado do mês', v: brl(derivados.resultado, 0), t: resNeg ? 'text-danger' : 'text-gold', i: resNeg ? TrendingDown : Coins, sub: 'com estes gastos' },
        ].map((s) => (
          <div key={s.l} className="rounded-card border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.l}</span>
              <s.i className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
            </div>
            <div className={`tnum mt-2 text-[20px] font-bold leading-none ${s.t}`}>{s.v}</div>
            <div className="mt-1.5 text-[11px] text-text-muted">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Planilha ── */}
      <section className="rounded-card border border-border bg-card p-5 shadow-soft">
        <header className="mb-4">
          <h2 className="font-display text-[13px] tracking-[0.08em] text-foreground">PLANILHA DE GASTOS · {snapshot.meta.periodoLabel}</h2>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Preencha a primeira linha e clique em adicionar. Clique em qualquer célula para editar.</p>
        </header>

        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            {/* Cabeçalho */}
            <div className={`${GRID} border-b border-border/60 px-2 pb-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted`}>
              <span>Data</span>
              <span>Categoria</span>
              <span>Descrição</span>
              <span className="text-right">Valor</span>
              <span className="text-center">Status</span>
              <span />
            </div>

            {/* Linha NOVO GASTO (sempre pronta) */}
            <div className={`${GRID} rounded-sub border border-gold/30 bg-gold/[0.04] my-2 px-2 py-2.5`}>
              <input
                type="date"
                value={nData}
                onChange={(e) => setNData(e.target.value)}
                className="tnum w-full rounded-sub border border-border bg-background px-1.5 py-1 text-[12px] text-foreground outline-none focus:border-gold/40"
              />
              <input
                value={nCat}
                onChange={(e) => setNCat(e.target.value)}
                placeholder="Categoria"
                list="cats-gasto"
                className="w-full rounded-sub border border-border bg-background px-2 py-1 text-[12.5px] text-foreground outline-none focus:border-gold/40"
              />
              <input
                value={nDesc}
                onChange={(e) => setNDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }}
                placeholder="ex: Tráfego Meta · Frete Correios · Mel Coopermel"
                className="w-full rounded-sub border border-border bg-background px-2 py-1 text-[12.5px] text-foreground outline-none focus:border-gold/40"
              />
              <span className="flex items-center justify-end gap-1">
                <span className="text-[11px] text-muted-foreground">R$</span>
                <input
                  type="number"
                  value={nValor}
                  onChange={(e) => setNValor(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }}
                  placeholder="0"
                  className="tnum w-20 rounded-sub border border-border bg-background px-2 py-1 text-right text-[13px] font-semibold text-foreground outline-none focus:border-gold/40"
                />
              </span>
              <button
                type="button"
                onClick={() => setNPago((v) => !v)}
                className={`mx-auto flex items-center gap-1 rounded-sub border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                  nPago ? 'border-success/30 bg-success/[0.1] text-success' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {nPago ? <CircleCheck className="size-3" /> : <Clock className="size-3" />}
                {nPago ? 'Pago' : 'A pagar'}
              </button>
              <button
                type="button"
                onClick={adicionar}
                disabled={!podeAdd}
                title="Adicionar gasto"
                className="grid size-7 place-items-center rounded-sub border border-gold/50 bg-gold/[0.14] text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <datalist id="cats-gasto">
              {CATEGORIAS.map((c) => <option key={c} value={c} />)}
            </datalist>

            {/* Chips de categoria rápida (preenchem a linha nova) */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5 px-2">
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Categorias rápidas</span>
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNCat(cat)}
                  className={`rounded-sub border px-2 py-0.5 text-[11px] transition-colors ${
                    nCat === cat ? 'border-gold/50 bg-gold/[0.1] text-gold' : 'border-border text-text-secondary hover:border-gold/40 hover:text-gold'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Linhas de gastos */}
            {gastos.length === 0 ? (
              <p className="px-2 py-8 text-center text-[12.5px] text-text-muted">
                Nenhum gasto lançado em {snapshot.meta.periodoLabel}. Use a linha acima para lançar o primeiro.
              </p>
            ) : (
              gastos.map((g) => (
                <div key={g.gastoId} className="group border-b border-border/50 last:border-0">
                  <div className={`${GRID} rounded-sub px-2 py-2.5 transition-colors hover:bg-muted/30`}>
                    {/* Data */}
                    {editing?.gastoId === g.gastoId && editing.field === 'data' ? (
                      <input
                        autoFocus type="date" value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commit(g); if (e.key === 'Escape') setEditing(null) }}
                        onBlur={() => commit(g)}
                        className="tnum w-full rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-[12px] text-foreground outline-none"
                      />
                    ) : (
                      <button type="button" onClick={() => startEdit(g, 'data')} className="tnum text-left text-[12.5px] text-text-secondary underline-offset-2 transition-colors hover:text-gold hover:underline">
                        {fmtData(g.data)}
                      </button>
                    )}

                    {/* Categoria */}
                    {editing?.gastoId === g.gastoId && editing.field === 'categoria' ? (
                      <input
                        autoFocus value={editVal} list="cats-gasto"
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commit(g); if (e.key === 'Escape') setEditing(null) }}
                        onBlur={() => commit(g)}
                        className="w-full rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-[12px] text-foreground outline-none"
                      />
                    ) : (
                      <button type="button" onClick={() => startEdit(g, 'categoria')} className="flex w-fit items-center text-left">
                        {g.categoria ? (
                          <span className="rounded-sub border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-text-secondary transition-colors group-hover:border-gold/30">{g.categoria}</span>
                        ) : (
                          <span className="text-[12px] text-text-muted transition-colors hover:text-gold">+ categoria</span>
                        )}
                      </button>
                    )}

                    {/* Descrição */}
                    {editing?.gastoId === g.gastoId && editing.field === 'descricao' ? (
                      <input
                        autoFocus value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commit(g); if (e.key === 'Escape') setEditing(null) }}
                        onBlur={() => commit(g)}
                        className="w-full rounded-sub border border-gold/40 bg-background px-1.5 py-0.5 text-[13px] text-foreground outline-none"
                      />
                    ) : (
                      <button type="button" onClick={() => startEdit(g, 'descricao')} className="truncate text-left text-[13px] text-foreground transition-colors hover:text-gold">
                        {g.descricao || '—'}
                      </button>
                    )}

                    {/* Valor */}
                    {editing?.gastoId === g.gastoId && editing.field === 'valor' ? (
                      <span className="flex items-center justify-end gap-1">
                        <span className="text-[11px] text-muted-foreground">R$</span>
                        <input
                          autoFocus type="number" value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') commit(g); if (e.key === 'Escape') setEditing(null) }}
                          onBlur={() => commit(g)}
                          className="tnum w-20 rounded-sub border border-gold/40 bg-background px-2 py-0.5 text-right text-[13px] font-semibold text-foreground outline-none"
                        />
                      </span>
                    ) : (
                      <button type="button" onClick={() => startEdit(g, 'valor')} className="tnum text-right text-[13px] font-semibold text-foreground underline-offset-2 transition-colors hover:text-gold hover:underline">
                        {brl(g.valor, 0)}
                      </button>
                    )}

                    {/* Status (toggle pago/aberta) */}
                    <button
                      type="button"
                      onClick={() => editGasto(periodo, g.gastoId, { pago: !g.pago })}
                      title={g.pago ? 'Pago — clique para marcar como a pagar' : 'A pagar — clique para marcar como pago'}
                      className={`mx-auto flex items-center gap-1 rounded-sub border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                        g.pago ? 'border-success/30 bg-success/[0.1] text-success' : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {g.pago ? <CircleCheck className="size-3" /> : <Clock className="size-3" />}
                      {g.pago ? 'Pago' : 'A pagar'}
                    </button>

                    {/* Excluir */}
                    <span className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeGasto(periodo, g.gastoId)}
                        title="Excluir gasto"
                        className="grid size-6 place-items-center rounded-sub text-text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.8} />
                      </button>
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Rodapé: total */}
            {gastos.length > 0 && (
              <div className={`${GRID} mt-1 border-t border-border px-2 pt-3`}>
                <span className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Total do mês</span>
                <span className="text-right text-[11px] text-text-muted">{gastos.length} itens</span>
                <span className="tnum text-right text-[14px] font-bold text-gold">{brl(total, 0)}</span>
                <span className="text-center text-[10px] text-text-muted">{brlCompact(pago)} pago</span>
                <span />
              </div>
            )}
          </div>
        </div>

        {/* Nota: como o gasto se propaga */}
        <div className="mt-4 flex items-start gap-2.5 rounded-sub border border-border bg-muted/30 px-3 py-2.5">
          <Wallet className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.8} />
          <p className="text-[12px] leading-snug text-text-secondary">
            Cada gasto lançado aqui <b className="text-foreground">reduz o resultado do mês</b> (aparece na DRE, na aba Caixa) e
            entra como <b className="text-foreground">conta a pagar</b> (no aging, em Caixa → Contas). Marcou{' '}
            <span className="font-semibold text-success">Pago</span>? Sai do “a pagar”, mas o gasto segue no resultado.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Gastos
