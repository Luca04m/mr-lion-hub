// Estoque — tabela densa de classe mundial + filtros laterais + drawer de detalhe.
// Organiza por PRODUTO (derivado do BOM), por tipo, ou lista plana.
import { Fragment, useMemo, useState } from 'react'
import {
  Search, Rows3, Rows4, X, Plus, Minus, Pencil, ArrowDownUp,
} from 'lucide-react'
import { useEstoque } from '../store'
import {
  FORNECEDOR_BY_ID, gerarHistorico, grupoProduto, linhasDoItem,
  GRUPO_META, GRUPO_ORDER, RECEITA_BY_PRODUTO,
} from '../mock'
import {
  statusEstoque, STATUS_LABEL, reorderPoint, coberturaDias, valorEstoque,
  disponibilidade, fmtBRL, fmtNum,
} from '../engine'
import { StatusPill, StockBar, CategoriaIcon, Sparkline, ProdutoChip } from '../ui'
import type { Item, TipoItem, StatusEstoque, GrupoProduto } from '../types'

type FiltroTipo = 'todos' | TipoItem
type FiltroStatus = 'todos' | StatusEstoque
type FiltroProduto = 'todos' | GrupoProduto
type Agrupar = 'produto' | 'tipo' | 'lista'

const TIPO_LABEL: Record<TipoItem, string> = {
  materia_prima: 'Matéria-prima', embalagem: 'Embalagem', produto_intermediario: 'Líquido (granel)', produto_acabado: 'Produto acabado',
}
const TIPO_ORDER: TipoItem[] = ['produto_acabado', 'produto_intermediario', 'materia_prima', 'embalagem']

const LINHAS_PRODUTO: GrupoProduto[] = ['honey', 'cappuccino', 'blended']
const ehLinhaProduto = (p: FiltroProduto): p is 'honey' | 'cappuccino' | 'blended' =>
  (LINHAS_PRODUTO as FiltroProduto[]).includes(p)

// Pertence ao filtro de produto. Para uma LINHA (honey/cappuccino/blended) inclui os itens
// COMPARTILHADOS que ela usa (João: "ver tudo que o Honey precisa, inclusive garrafa/rolha").
// Para 'compartilhado'/'geral' mantém o bucket exato.
function pertenceAoProduto(itemId: string, p: FiltroProduto): boolean {
  if (p === 'todos') return true
  return ehLinhaProduto(p) ? linhasDoItem(itemId).includes(p) : grupoProduto(itemId) === p
}

// Sub-rótulo usado ao separar, dentro de cada produto, matéria-prima de insumos de embalagem.
const SUBGRUPO_LABEL: Record<TipoItem, string> = {
  produto_acabado: 'Produto acabado', produto_intermediario: 'Líquido em tanque', materia_prima: 'Matéria-prima', embalagem: 'Insumos · embalagem',
}
/** Parte uma lista de itens em sub-blocos por tipo, na ordem canônica (PA → MP → embalagem). */
function subdividirPorTipo(itens: Item[]): { tipo: TipoItem; itens: Item[] }[] {
  const map = new Map<TipoItem, Item[]>()
  itens.forEach(i => { if (!map.has(i.tipo)) map.set(i.tipo, []); map.get(i.tipo)!.push(i) })
  return TIPO_ORDER.filter(t => map.has(t)).map(t => ({ tipo: t, itens: map.get(t)! }))
}

export function Estoque() {
  const { itens, setEstoque } = useEstoque()
  const [agrupar, setAgrupar] = useState<Agrupar>('produto')
  const [tipo, setTipo] = useState<FiltroTipo>('todos')
  const [produto, setProduto] = useState<FiltroProduto>('todos')
  const [status, setStatus] = useState<FiltroStatus>('todos')
  const [busca, setBusca] = useState('')
  const [denso, setDenso] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [ordenarBaixo, setOrdenarBaixo] = useState(true)

  const ativos = useMemo(() => itens.filter(i => i.ativo), [itens])
  const countTipo = (t: FiltroTipo) => t === 'todos' ? ativos.length : ativos.filter(i => i.tipo === t).length
  const countStatus = (s: FiltroStatus) => s === 'todos' ? ativos.length : ativos.filter(i => statusEstoque(i) === s).length
  const countProduto = (p: FiltroProduto) => p === 'todos' ? ativos.length : ativos.filter(i => pertenceAoProduto(i.id, p)).length

  // fabricáveis por linha de produto (para o cabeçalho das seções)
  const fabricaveisPorLinha = useMemo(() => {
    const m = new Map<GrupoProduto, number>()
    ;(['honey', 'cappuccino', 'blended'] as const).forEach(l => {
      const rec = RECEITA_BY_PRODUTO(GRUPO_META[l].produtoId!)
      if (rec) m.set(l, disponibilidade(rec, itens).fabricaveis)
    })
    return m
  }, [itens])

  const filtrados = useMemo(() => {
    let r = ativos
    if (tipo !== 'todos') r = r.filter(i => i.tipo === tipo)
    if (produto !== 'todos') r = r.filter(i => pertenceAoProduto(i.id, produto))
    if (status !== 'todos') r = r.filter(i => statusEstoque(i) === status)
    if (busca) r = r.filter(i => (i.nome + i.sku).toLowerCase().includes(busca.toLowerCase()))
    const sev = (i: Item) => { const s = statusEstoque(i); return s === 'critico' ? 0 : s === 'baixo' ? 1 : 2 }
    return [...r].sort((a, b) => ordenarBaixo ? sev(a) - sev(b) || a.nome.localeCompare(b.nome) : a.nome.localeCompare(b.nome))
  }, [ativos, tipo, produto, status, busca, ordenarBaixo])

  // seções (por produto / por tipo / sem agrupamento)
  const secoes = useMemo(() => {
    if (agrupar === 'lista') return [{ key: '', itens: filtrados }]
    const keyOf = (i: Item): string => agrupar === 'produto' ? grupoProduto(i.id) : i.tipo
    const order: string[] = agrupar === 'produto' ? GRUPO_ORDER : TIPO_ORDER
    const map = new Map<string, Item[]>()
    filtrados.forEach(i => {
      const k = keyOf(i)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(i)
    })
    return order.filter(k => map.has(k)).map(k => ({ key: k, itens: map.get(k)! }))
  }, [filtrados, agrupar])

  const rowH = denso ? 'h-11' : 'h-[58px]'
  const selItem = sel ? itens.find(i => i.id === sel) ?? null : null

  return (
    <div className="animate-fade-up">
      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="font-display text-3xl leading-none">Estoque</h1>
          <p className="text-sm text-text-secondary mt-1">Por produto, com matéria-prima e insumos de embalagem separados.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[210px_1fr] gap-5">
        {/* ── Filtros laterais ── */}
        <aside className="space-y-5">
          <FilterGroup titulo="Produto">
            <FilterItem label="Todos" count={countProduto('todos')} active={produto === 'todos'} onClick={() => setProduto('todos')} />
            {GRUPO_ORDER.map(g => (
              <FilterItem key={g} label={GRUPO_META[g].label} count={countProduto(g)} active={produto === g}
                onClick={() => setProduto(g)} dot={GRUPO_META[g].cor} />
            ))}
          </FilterGroup>
          <FilterGroup titulo="Tipo">
            <FilterItem label="Todos" count={countTipo('todos')} active={tipo === 'todos'} onClick={() => setTipo('todos')} />
            {TIPO_ORDER.map(t => (
              <FilterItem key={t} label={TIPO_LABEL[t]} count={countTipo(t)} active={tipo === t} onClick={() => setTipo(t)} />
            ))}
          </FilterGroup>
          <FilterGroup titulo="Situação">
            <FilterItem label="Todas" count={countStatus('todos')} active={status === 'todos'} onClick={() => setStatus('todos')} />
            {(['ok', 'baixo', 'critico'] as StatusEstoque[]).map(s => (
              <FilterItem key={s} label={STATUS_LABEL[s]} count={countStatus(s)} active={status === s} onClick={() => setStatus(s)}
                dot={s === 'ok' ? 'var(--ok)' : s === 'baixo' ? 'var(--warn)' : 'var(--crit)'} />
            ))}
          </FilterGroup>
        </aside>

        {/* ── Tabela ── */}
        <div className="min-w-0">
          {/* view header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[hsl(var(--surface-overlay))] border border-border text-sm outline-none focus:border-[hsl(var(--gold)/0.4)] transition" />
            </div>
            <span className="text-xs text-text-muted tnum">{filtrados.length} itens</span>
            <div className="ml-auto flex items-center gap-1.5">
              {/* agrupamento */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                {([['produto', 'Por produto'], ['tipo', 'Por tipo'], ['lista', 'Lista']] as [Agrupar, string][]).map(([k, label]) => (
                  <button key={k} onClick={() => setAgrupar(k)}
                    className={`h-9 px-2.5 text-xs transition ${agrupar === k ? 'text-gold bg-[hsl(var(--gold)/0.1)] font-medium' : 'text-text-muted hover:text-foreground'}`}>{label}</button>
                ))}
              </div>
              <button onClick={() => setOrdenarBaixo(o => !o)} title="Ordenar por urgência"
                className={`h-9 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${ordenarBaixo ? 'border-[hsl(var(--gold)/0.4)] text-gold' : 'border-border text-text-muted hover:text-foreground'}`}>
                <ArrowDownUp size={13} /> <span className="hidden sm:inline">Urgência</span>
              </button>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button onClick={() => setDenso(false)} className={`h-9 w-9 grid place-items-center ${!denso ? 'text-gold bg-[hsl(var(--gold)/0.1)]' : 'text-text-muted'}`}><Rows3 size={15} /></button>
                <button onClick={() => setDenso(true)} className={`h-9 w-9 grid place-items-center ${denso ? 'text-gold bg-[hsl(var(--gold)/0.1)]' : 'text-text-muted'}`}><Rows4 size={15} /></button>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border overflow-hidden gradient-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-text-muted" style={{ background: 'hsl(var(--surface-overlay))' }}>
                    <th className="text-left font-medium px-4 py-3 sticky left-0" style={{ background: 'hsl(var(--surface-overlay))' }}>Item</th>
                    <th className="text-left font-medium px-3 py-3 hidden sm:table-cell">Tipo</th>
                    <th className="text-right font-medium px-3 py-3">Estoque</th>
                    <th className="text-right font-medium px-3 py-3 hidden md:table-cell">Mínimo</th>
                    <th className="text-center font-medium px-3 py-3">Situação</th>
                    <th className="text-right font-medium px-3 py-3 hidden lg:table-cell">Cobertura</th>
                    <th className="text-right font-medium px-4 py-3 hidden md:table-cell">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-text-secondary">Nenhum item com esses filtros.</td></tr>
                  )}
                  {secoes.map(sec => (
                    <SecaoRows key={sec.key || 'flat'}>
                      {sec.key && (
                        <GroupHeader grupo={sec.key} itens={sec.itens} agrupar={agrupar}
                          fabricaveis={fabricaveisPorLinha.get(sec.key as GrupoProduto)} />
                      )}
                      {agrupar === 'produto'
                        ? subdividirPorTipo(sec.itens).map(sub => (
                            <Fragment key={sub.tipo}>
                              <SubHeader tipo={sub.tipo} count={sub.itens.length} />
                              {sub.itens.map(item => (
                                <Linha key={item.id} item={item} rowH={rowH} agrupar={agrupar} produtoFiltro={produto}
                                  onSelect={() => setSel(item.id)} setEstoque={setEstoque} />
                              ))}
                            </Fragment>
                          ))
                        : sec.itens.map(item => (
                            <Linha key={item.id} item={item} rowH={rowH} agrupar={agrupar} produtoFiltro={produto}
                              onSelect={() => setSel(item.id)} setEstoque={setEstoque} />
                          ))}
                    </SecaoRows>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selItem && <ItemDrawer item={selItem} onClose={() => setSel(null)} />}
    </div>
  )
}

// Fragment wrapper só pra agrupar header + linhas de uma seção.
function SecaoRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function GroupHeader({ grupo, itens, agrupar, fabricaveis }: {
  grupo: string; itens: Item[]; agrupar: Agrupar; fabricaveis?: number
}) {
  const ehProduto = agrupar === 'produto'
  const meta = ehProduto ? GRUPO_META[grupo as GrupoProduto] : null
  const label = ehProduto ? meta!.label : TIPO_LABEL[grupo as TipoItem]
  const cor = ehProduto ? meta!.cor : 'var(--gold)'
  const valor = itens.reduce((t, i) => t + valorEstoque(i), 0)
  const ehLinha = ehProduto && (grupo === 'honey' || grupo === 'cappuccino' || grupo === 'blended')
  return (
    <tr>
      <td colSpan={7} className="px-0 pt-3">
        <div className="flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg"
          style={{ background: `hsl(${cor} / 0.08)`, borderLeft: `2px solid hsl(${cor})` }}>
          <span className="font-display text-sm" style={{ color: `hsl(${cor})` }}>{label}</span>
          <span className="text-[11px] text-text-muted tnum">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
          {ehLinha && fabricaveis !== undefined && (
            <span className="text-[10px] uppercase tracking-wider tnum px-1.5 py-0.5 rounded"
              style={{ color: `hsl(${cor})`, background: `hsl(${cor} / 0.12)` }}>{fmtNum(fabricaveis)} fabricáveis</span>
          )}
          <span className="ml-auto text-xs tnum text-text-secondary">{fmtBRL(valor)}</span>
        </div>
      </td>
    </tr>
  )
}

// Sub-cabeçalho leve dentro de uma seção de produto: separa matéria-prima de insumos de embalagem.
function SubHeader({ tipo, count }: { tipo: TipoItem; count: number }) {
  return (
    <tr>
      <td colSpan={7} className="px-0 pt-2">
        <div className="flex items-center gap-2 px-4 mx-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-text-secondary font-medium">{SUBGRUPO_LABEL[tipo]}</span>
          <span className="text-[10px] text-text-muted tnum">{count}</span>
          <span className="flex-1 h-px" style={{ background: 'hsl(var(--gold) / 0.08)' }} />
        </div>
      </td>
    </tr>
  )
}

function Linha({ item, rowH, agrupar, produtoFiltro, onSelect, setEstoque }: {
  item: Item; rowH: string; agrupar: Agrupar; produtoFiltro: FiltroProduto; onSelect: () => void; setEstoque: (id: string, v: number) => void
}) {
  const st = statusEstoque(item)
  const cob = coberturaDias(item)
  // Filtrando UMA linha, marca os itens compartilhados que vieram emprestados de outra(s) linha(s).
  const linhas = linhasDoItem(item.id)
  const compartilhadoNaLinha = ehLinhaProduto(produtoFiltro) && linhas.length > 1
  const outras = compartilhadoNaLinha ? linhas.filter(l => l !== produtoFiltro) : []
  return (
    <tr onClick={onSelect}
      className={`group ${rowH} border-t border-border cursor-pointer hover:bg-[hsl(var(--gold)/0.04)] transition-colors`}>
      {/* Item */}
      <td className="px-4 sticky left-0 bg-transparent group-hover:bg-[hsl(var(--surface-raised))]">
        <div className="flex items-center gap-3">
          {item.fotoUrl
            ? <img src={item.fotoUrl} alt="" className="w-7 h-9 object-contain shrink-0" />
            : <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-gold" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}><CategoriaIcon categoria={item.categoria} /></span>}
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">{item.nome}</div>
            <div className="text-[11px] text-text-muted tnum flex items-center gap-1.5 flex-wrap">
              {item.sku}
              {/* no modo "por produto" o vínculo já é a seção; nos outros mostra o chip */}
              {agrupar !== 'produto' && <ProdutoChip itemId={item.id} />}
              {/* filtrando uma linha: sinaliza item compartilhado emprestado de outra(s) linha(s) */}
              {compartilhadoNaLinha && (
                <span className="inline-flex items-center gap-1 rounded-md text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 leading-none"
                  style={{ color: `hsl(${GRUPO_META.compartilhado.cor})`, background: `hsl(${GRUPO_META.compartilhado.cor} / 0.12)`, border: `1px solid hsl(${GRUPO_META.compartilhado.cor} / 0.24)` }}>
                  compartilhado{outras.length ? ` · com ${outras.map(l => GRUPO_META[l].label).join(', ')}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      {/* Tipo */}
      <td className="px-3 hidden sm:table-cell text-text-secondary text-xs">{TIPO_LABEL[item.tipo]}</td>
      {/* Estoque (inline edit) */}
      <td className="px-3 text-right" onClick={e => e.stopPropagation()}>
        <div className="inline-flex items-center gap-1 justify-end">
          <input type="number" value={item.estoque}
            onChange={e => setEstoque(item.id, parseFloat(e.target.value) || 0)}
            className="w-16 text-right bg-transparent tnum font-medium text-foreground rounded px-1.5 py-1 outline-none border border-transparent hover:border-border focus:border-[hsl(var(--gold)/0.5)] focus:bg-black/30 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          <span className="text-[11px] text-text-muted w-5 text-left">{item.uom}</span>
          <Pencil size={11} className="text-text-muted opacity-0 group-hover:opacity-60 transition" />
        </div>
      </td>
      {/* Mínimo */}
      <td className="px-3 text-right tnum text-text-secondary hidden md:table-cell">{fmtNum(item.min)} <span className="text-[11px] text-text-muted">{item.uom}</span></td>
      {/* Situação */}
      <td className="px-3"><div className="flex justify-center"><StatusPill status={st} dense /></div></td>
      {/* Cobertura */}
      <td className="px-3 text-right tnum hidden lg:table-cell">
        {cob !== null ? <span className={cob < 7 ? 'text-[hsl(var(--warn))]' : 'text-text-secondary'}>{cob} <span className="text-[11px] text-text-muted">dias</span></span> : <span className="text-text-muted">—</span>}
      </td>
      {/* Valor */}
      <td className="px-4 text-right tnum text-text-secondary hidden md:table-cell">{fmtBRL(valorEstoque(item))}</td>
    </tr>
  )
}

function FilterGroup({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-2 px-1">{titulo}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
function FilterItem({ label, count, active, onClick, dot }: { label: string; count: number; active: boolean; onClick: () => void; dot?: string }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg text-sm transition ${active ? 'text-gold font-medium' : 'text-text-secondary hover:text-foreground hover:bg-[hsl(var(--gold)/0.05)]'}`}
      style={active ? { background: 'hsl(var(--gold)/0.1)' } : undefined}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${dot})` }} />}
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs tnum text-text-muted">{count}</span>
    </button>
  )
}

function ItemDrawer({ item, onClose }: { item: Item; onClose: () => void }) {
  const ajustar = useEstoque(s => s.ajustar)
  const editarItem = useEstoque(s => s.editarItem)
  const fornecedor = FORNECEDOR_BY_ID(item.fornecedorId)
  const hist = useMemo(() => gerarHistorico(item), [item.id])
  const linhas = linhasDoItem(item.id)
  // série acumulada terminando no estoque atual
  const serie = useMemo(() => {
    const deltas = hist.map(h => h.delta)
    const soma = deltas.reduce((a, b) => a + b, 0)
    let acc = item.estoque - soma
    return [acc, ...deltas.map(d => (acc += d))]
  }, [hist, item.estoque])
  const st = statusEstoque(item)
  const rop = reorderPoint(item)
  const cob = coberturaDias(item)
  const step = item.uom === 'un' ? 1 : 0.5

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <aside className="relative w-full max-w-md surface-float h-full overflow-y-auto animate-slide-up" style={{ animationName: 'fade-up' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {item.fotoUrl
              ? <img src={item.fotoUrl} alt="" className="w-12 h-16 object-contain" />
              : <span className="w-12 h-12 rounded-card grid place-items-center text-gold" style={{ background: 'hsl(var(--gold)/0.1)', border: '1px solid hsl(var(--gold)/0.14)' }}><CategoriaIcon categoria={item.categoria} size={22} /></span>}
            <div>
              <h3 className="font-display text-xl leading-tight">{item.nome}</h3>
              <div className="text-xs text-text-muted tnum mt-0.5">{item.sku} · {TIPO_LABEL[item.tipo]}</div>
              <div className="mt-2 flex items-center gap-2 flex-wrap"><StatusPill status={st} /><ProdutoChip itemId={item.id} /></div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-foreground"><X size={18} /></button>
        </div>

        {/* saldo + ajuste rápido */}
        <div className="p-5 border-b border-border">
          <div className="text-[11px] uppercase tracking-wider text-text-muted">Saldo atual</div>
          <div className="flex items-end gap-3 mt-1">
            <div className="font-display text-4xl tnum">{fmtNum(item.estoque)} <span className="text-base text-text-muted font-sans">{item.uom}</span></div>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => ajustar(item.id, -step)} className="w-9 h-9 rounded-lg grid place-items-center surface-overlay text-foreground hover:border-[hsl(var(--crit)/0.5)] transition"><Minus size={16} /></button>
              <button onClick={() => ajustar(item.id, step)} className="w-9 h-9 rounded-lg grid place-items-center bg-cta"><Plus size={16} /></button>
            </div>
          </div>
          <div className="mt-3"><StockBar item={item} height={6} /></div>
          <div className="flex justify-between text-[11px] text-text-muted mt-1.5">
            <span>mínimo {fmtNum(item.min)} {item.uom}</span>
            <span>ponto de pedido {fmtNum(rop)} {item.uom}</span>
          </div>
        </div>

        {/* métricas */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <Metric label="Cobertura" value={cob !== null ? `${cob}` : '—'} unit={cob !== null ? 'dias' : ''} />
          <MetricCusto value={item.custoMedio} onChange={v => editarItem(item.id, { custoMedio: v })} />
          <Metric label="Valor total" value={fmtBRL(valorEstoque(item))} />
        </div>

        {/* parâmetros de reposição — editáveis na operação */}
        <div className="p-5 border-b border-border">
          <div className="text-[11px] uppercase tracking-wider text-text-muted mb-3">Parâmetros de reposição</div>
          <div className="grid grid-cols-3 gap-2">
            <ParamField label="Mínimo" sufixo={item.uom} value={item.min} step={step}
              onChange={v => editarItem(item.id, { min: v })} />
            <ParamField label="Prazo" sufixo="dias" value={item.leadTimeDias ?? 0} step={1}
              onChange={v => editarItem(item.id, { leadTimeDias: v })} />
            <ParamField label="Consumo/dia" sufixo={item.uom} value={item.usoMedioDiario ?? 0} step={step}
              onChange={v => editarItem(item.id, { usoMedioDiario: v })} />
          </div>
          <p className="text-[11px] text-text-muted mt-2.5 leading-relaxed">
            Ponto de pedido <span className="text-gold tnum">{fmtNum(rop)} {item.uom}</span> — consumo × prazo + segurança.
            {cob !== null && <> No ritmo atual, o estoque dura <span className="tnum text-text-secondary">{cob} dias</span>.</>}
          </p>
        </div>

        {/* usado em quais produtos */}
        {linhas.length > 0 && (
          <div className="px-5 py-4 border-b border-border">
            <div className="text-[11px] uppercase tracking-wider text-text-muted mb-2">Entra na produção de</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {linhas.map(l => (
                <span key={l} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                  style={{ color: `hsl(${GRUPO_META[l].cor})`, background: `hsl(${GRUPO_META[l].cor} / 0.1)`, border: `1px solid hsl(${GRUPO_META[l].cor} / 0.22)` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${GRUPO_META[l].cor})` }} />
                  {GRUPO_META[l].label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* histórico */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Movimentação · 14 dias</h4>
            <Sparkline values={serie} width={120} height={32} />
          </div>
          {fornecedor && (
            <div className="mb-4 text-xs flex items-center justify-between p-3 rounded-lg surface-overlay">
              <div><div className="text-text-muted">Fornecedor</div><div className="text-foreground font-medium">{fornecedor.nome}</div></div>
              <div className="text-right"><div className="text-text-muted">Lead time</div><div className="text-foreground tnum">{fornecedor.leadTimeDias} dias</div></div>
            </div>
          )}
          <div className="space-y-0.5">
            {hist.slice().reverse().map(h => (
              <div key={h.id} className="flex items-center gap-3 py-2 text-sm border-b border-border last:border-0">
                <span className="tnum font-medium w-16 text-right" style={{ color: h.delta >= 0 ? 'hsl(var(--ok))' : 'hsl(var(--crit))' }}>{h.delta >= 0 ? '+' : ''}{fmtNum(h.delta)}</span>
                <span className="text-text-secondary capitalize flex-1">{h.tipo.replace('_', ' ')}</span>
                <span className="text-xs text-text-muted">{new Date(h.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="font-display text-lg mt-1 tnum">{value}{unit && <span className="text-xs text-text-muted font-sans ml-1">{unit}</span>}</div>
    </div>
  )
}

// Custo médio editável (pedido do João: "como faço pra mudar o preço de um insumo?").
// Aceita vírgula ou ponto; grava no blur/Enter. Editar custoMedio recalcula valor de estoque e CMV.
function MetricCusto({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(value.toFixed(2).replace('.', ','))
  const commit = () => {
    const v = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
    onChange(Number.isFinite(v) && v >= 0 ? v : value)
    setRaw((Number.isFinite(v) && v >= 0 ? v : value).toFixed(2).replace('.', ','))
  }
  return (
    <div className="p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">Custo médio</div>
      <div className="mt-1 flex items-center justify-center gap-1 font-display text-lg tnum">
        <span className="text-text-muted text-sm font-sans">R$</span>
        <input value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          inputMode="decimal"
          className="w-20 text-center bg-transparent tnum font-display text-lg rounded px-1 py-0.5 outline-none border border-transparent hover:border-border focus:border-[hsl(var(--gold)/0.5)] focus:bg-black/30 transition" />
      </div>
    </div>
  )
}

function ParamField({ label, value, onChange, sufixo, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; sufixo?: string; step?: number
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-1 rounded-lg surface-overlay border border-border focus-within:border-[hsl(var(--gold)/0.4)] px-2 h-9 transition">
        <input type="number" value={value} step={step} min={0}
          onChange={e => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
          onClick={e => e.stopPropagation()}
          className="w-full bg-transparent tnum text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        {sufixo && <span className="text-[10px] text-text-muted shrink-0">{sufixo}</span>}
      </div>
    </label>
  )
}
