// Compras — previsão de reposição (saldo × consumo médio × prazo de entrega) → ordem → recebimento.
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Truck, PackageCheck, ShoppingCart, Clock, Check, CalendarClock, Box, Boxes } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { useEstoque } from '../store'
import { FORNECEDORES, FORNECEDOR_BY_ID } from '../mock'
import { previsaoReposicao, devePedir, caixaParaPedido, fmtBRL, fmtNum, URGENCIA_LABEL } from '../engine'
import type { PrevisaoItem, UrgenciaReposicao } from '../engine'
import { CategoriaIcon, ReguaCobertura } from '../ui'
import type { StatusPO, Item } from '../types'

const PO_STATUS: Record<StatusPO, { label: string; cor: string }> = {
  aberta: { label: 'Aguardando', cor: 'var(--warn)' },
  parcial: { label: 'Parcial', cor: 'var(--warn)' },
  recebida: { label: 'Recebida', cor: 'var(--ok)' },
  cancelada: { label: 'Cancelada', cor: 'var(--crit)' },
}

const URGENCIA_VAR: Record<UrgenciaReposicao, string> = {
  atrasado: 'var(--crit)', agora: 'var(--warn)', breve: 'var(--gold)', ok: 'var(--ok)',
}

export function Compras() {
  const { itens, compras, criarPO, receberPO } = useEstoque()
  const hoje = useMemo(() => new Date(), [])

  const previsoes = useMemo(() => previsaoReposicao(itens), [itens])
  const pedirAgora = useMemo(() => previsoes.filter(devePedir), [previsoes])
  const valorEstimado = useMemo(
    () => pedirAgora.reduce((t, p) => t + p.comprar * p.item.custoMedio, 0),
    [pedirAgora],
  )
  const totalAtivos = useMemo(() => itens.filter(i => i.ativo).length, [itens])

  // previsões agrupadas por fornecedor (inclui itens "no radar" como aviso antecipado)
  const porFornecedor = useMemo(() => {
    const grupos = new Map<string, PrevisaoItem[]>()
    previsoes.forEach(p => {
      const f = p.item.fornecedorId; if (!f) return
      if (!grupos.has(f)) grupos.set(f, [])
      grupos.get(f)!.push(p)
    })
    return [...grupos.entries()].map(([fornId, linhas]) => {
      const pedir = linhas.filter(devePedir)
      return {
        fornecedor: FORNECEDOR_BY_ID(fornId)!,
        linhas,
        pedir,
        total: pedir.reduce((t, p) => t + p.comprar * p.item.custoMedio, 0),
      }
    }).sort((a, b) => b.pedir.length - a.pedir.length || b.linhas.length - a.linhas.length)
  }, [previsoes])

  function gerar(fornId: string, pedir: PrevisaoItem[]) {
    criarPO(fornId, pedir.map(p => ({ itemId: p.item.id, qtd: p.comprar })))
    toast.success(`Ordem de compra criada — ${FORNECEDOR_BY_ID(fornId)?.nome}`, { description: `${pedir.length} itens solicitados.` })
  }
  function receber(poId: string, codigo: string) {
    receberPO(poId)
    toast.success(`${codigo} recebida`, { description: 'Itens deram entrada no estoque.' })
  }

  return (
    <div className="animate-fade-up space-y-7">
      <div>
        <h1 className="font-display text-3xl leading-none">Compras</h1>
        <p className="text-sm text-text-secondary mt-1">Previsão de reposição cruzando saldo, consumo médio e prazo de entrega.</p>
      </div>

      {/* ── pulso de reposição: distribuição do estoque por urgência ── */}
      <PulsoReposicao previsoes={previsoes} total={totalAtivos} valor={valorEstimado} />

      <div className="grid lg:grid-cols-12 gap-4">
        {/* ── Previsão de reposição por fornecedor ── */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={18} className="text-gold" />
            <h2 className="font-display text-xl">Quando comprar</h2>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'hsl(var(--gold-bright))' }} /> marca = prazo de entrega
            </span>
          </div>
          {porFornecedor.length === 0 ? (
            <div className="rounded-card border border-border gradient-card p-8 text-center text-sm text-text-secondary">
              <Check size={26} className="mx-auto mb-2" style={{ color: 'hsl(var(--ok))' }} /> Tudo coberto — nenhum item fura o estoque dentro do prazo de entrega.
            </div>
          ) : porFornecedor.map(({ fornecedor, linhas, pedir, total }, i) => {
            const piorU: UrgenciaReposicao = linhas.some(p => p.urgencia === 'atrasado') ? 'atrasado'
              : linhas.some(p => p.urgencia === 'agora') ? 'agora' : 'breve'
            const dc = URGENCIA_VAR[piorU]
            return (
            <div key={fornecedor.id} className="rounded-card border border-border gradient-card overflow-hidden animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}>
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
                <span className="relative w-9 h-9 rounded-lg grid place-items-center text-gold shrink-0" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}>
                  <Truck size={17} />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: `hsl(${dc})`, boxShadow: '0 0 0 2px hsl(var(--surface-raised))' }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{fornecedor.nome}</div>
                  <div className="text-[11px] text-text-muted">entrega em {fornecedor.leadTimeDias} dias · {linhas.length} {linhas.length === 1 ? 'item' : 'itens'} no aviso</div>
                </div>
                {pedir.length > 0 && (
                  <button onClick={() => gerar(fornecedor.id, pedir)}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-cta font-semibold text-sm hover:brightness-110 transition shrink-0">
                    <ShoppingCart size={15} /> Gerar ordem
                  </button>
                )}
              </div>
              <div className="divide-y divide-border">
                {linhas.map(p => <LinhaPrevisao key={p.item.id} p={p} hoje={hoje} />)}
              </div>
              {total > 0 && (
                <div className="flex justify-between px-5 py-2.5 border-t border-border text-sm">
                  <span className="text-text-muted">Estimativa do que repor agora</span>
                  <span className="font-medium tnum">{fmtBRL(total)}</span>
                </div>
              )}
            </div>
            )
          })}
        </section>

        {/* ── Ordens de compra ── */}
        <section className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-xl">Ordens de compra</h2>
          {compras.length === 0 ? (
            <div className="rounded-card border border-border gradient-card p-8 text-center text-sm text-text-secondary">
              <ShoppingCart size={26} className="mx-auto mb-2 text-gold/60" /> Nenhuma ordem ainda. Gere uma a partir da previsão ao lado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {compras.map(po => {
                const f = FORNECEDOR_BY_ID(po.fornecedorId)
                const s = PO_STATUS[po.status]
                return (
                  <div key={po.id} className="rounded-card border border-border gradient-card p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-muted">{po.codigo}</span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ml-auto"
                        style={{ color: `hsl(${s.cor})`, background: `hsl(${s.cor}/0.13)`, border: `1px solid hsl(${s.cor}/0.26)` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${s.cor})` }} />{s.label}
                      </span>
                    </div>
                    <div className="font-medium mt-1.5">{f?.nome}</div>
                    <div className="text-xs text-text-muted">{po.linhas.length} itens · {fmtBRL(po.total)}</div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[11px] text-text-muted flex items-center gap-1 flex-1"><Clock size={12} /> {new Date(po.criadaEm).toLocaleDateString('pt-BR')}</span>
                      {po.status === 'aberta' ? (
                        <button onClick={() => receber(po.id, po.codigo)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition" style={{ color: 'hsl(var(--ok))', background: 'hsl(var(--ok)/0.12)', border: '1px solid hsl(var(--ok)/0.28)' }}>
                          <PackageCheck size={14} /> Receber
                        </button>
                      ) : (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'hsl(var(--ok))' }}><Check size={13} /> recebida</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Caixa de envio deduzida pelo tamanho do pedido (pedido do João) ── */}
      <SimuladorCaixa itens={itens} />

      {/* ── Fornecedores ── */}
      <section>
        <h2 className="font-display text-xl mb-3">Fornecedores</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FORNECEDORES.map(f => (
            <div key={f.id} className="rounded-card border border-border gradient-card p-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg grid place-items-center text-gold shrink-0" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}><Truck size={16} /></span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.nome}</div>
                  <div className="text-[11px] text-text-muted">{f.contato}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-text-muted">entrega <span className="text-foreground tnum">{f.leadTimeDias} dias</span></span>
                <span className="text-text-muted tnum">{f.itensFornecidos.length} itens</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function PulsoReposicao({ previsoes, total, valor }: { previsoes: PrevisaoItem[]; total: number; valor: number }) {
  const at = previsoes.filter(p => p.urgencia === 'atrasado').length
  const ag = previsoes.filter(p => p.urgencia === 'agora').length
  const rd = previsoes.filter(p => p.urgencia === 'breve').length
  const ok = Math.max(0, total - at - ag - rd)
  const segs = [
    { n: at, c: 'var(--crit)', label: 'atrasados' },
    { n: ag, c: 'var(--warn)', label: 'a pedir' },
    { n: rd, c: 'var(--gold)', label: 'no radar' },
    { n: ok, c: 'var(--ok)', label: 'em dia' },
  ]
  const denom = total || 1
  const aPedir = at + ag
  return (
    <div className="rounded-card border border-border gradient-card p-5">
      <div className="flex items-end justify-between gap-4 mb-3.5 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-muted">Pulso de reposição</div>
          <div className="font-display text-2xl mt-0.5 leading-none">
            {aPedir} <span className="text-base text-text-secondary font-sans">{aPedir === 1 ? 'item para pedir' : 'itens para pedir'}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-text-muted">Repor agora</div>
          <div className="font-display text-2xl mt-0.5 leading-none text-gold tnum">{fmtBRL(valor)}</div>
        </div>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px" style={{ background: 'hsl(var(--surface-base))' }}>
        {segs.filter(s => s.n > 0).map(s => (
          <div key={s.label} className="h-full first:rounded-l-full last:rounded-r-full transition-[width] duration-700 ease-out"
            style={{ width: `${(s.n / denom) * 100}%`, background: `hsl(${s.c})`, minWidth: 3 }} title={`${s.n} ${s.label}`} />
        ))}
      </div>
      <div className="flex items-center gap-x-4 gap-y-1 mt-3 flex-wrap text-[11px]">
        {segs.map(s => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${s.c})` }} />
            <span className="tnum text-foreground font-medium">{s.n}</span> {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function LinhaPrevisao({ p, hoje }: { p: PrevisaoItem; hoje: Date }) {
  const it = p.item
  const c = URGENCIA_VAR[p.urgencia]
  const comprarAte = p.diasAtePedir !== null ? addDays(hoje, p.diasAtePedir) : null
  const faltaEm = p.cobertura !== null ? addDays(hoje, p.cobertura) : null
  const quando =
    p.urgencia === 'atrasado' ? 'Comprar imediatamente'
      : p.urgencia === 'agora' ? 'Comprar agora'
        : comprarAte ? `Comprar até ${format(comprarAte, 'dd/MM')}` : URGENCIA_LABEL[p.urgencia]
  return (
    <div className="px-4 py-3 transition-colors hover:bg-[hsl(var(--gold)/0.03)]">
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center w-7 h-7 rounded-md shrink-0 text-gold/90"
          style={{ background: 'hsl(var(--gold)/0.07)', border: '1px solid hsl(var(--gold)/0.1)' }}>
          <CategoriaIcon categoria={it.categoria} size={14} />
        </span>
        <span className="text-sm flex-1 min-w-0 truncate font-medium">{it.nome}</span>
        <UrgenciaBadge u={p.urgencia} />
        {devePedir(p) && p.comprar > 0 && (
          <span className="font-display text-gold text-base tnum w-[82px] text-right shrink-0">+{fmtNum(p.comprar)} <span className="text-xs text-text-muted font-sans">{it.uom}</span></span>
        )}
      </div>
      <div className="mt-2.5 pl-[38px]"><ReguaCobertura cobertura={p.cobertura} leadTime={p.leadTime} /></div>
      <div className="flex items-center gap-x-2.5 mt-1.5 pl-[38px] text-[11px] text-text-muted">
        <span className="flex items-center gap-x-2 flex-wrap min-w-0">
          <span>tem <span className="tnum text-text-secondary">{fmtNum(it.estoque)} {it.uom}</span></span>
          <span className="text-text-muted/40">·</span>
          <span>cobre <span className="tnum text-text-secondary">{p.cobertura !== null ? `${p.cobertura}d` : '—'}</span></span>
          <span className="text-text-muted/40">·</span>
          <span>prazo <span className="tnum text-text-secondary">{p.leadTime}d</span></span>
          {faltaEm && <><span className="text-text-muted/40">·</span><span>zera <span className="tnum text-text-secondary">{format(faltaEm, 'dd/MM')}</span></span></>}
        </span>
        <span className="ml-auto shrink-0 inline-flex items-center font-medium tnum px-1.5 py-0.5 rounded-md"
          style={{ color: `hsl(${c})`, background: `hsl(${c} / 0.1)` }}>{quando}</span>
      </div>
    </div>
  )
}

function UrgenciaBadge({ u }: { u: UrgenciaReposicao }) {
  const c = URGENCIA_VAR[u]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 shrink-0"
      style={{ color: `hsl(${c})`, background: `hsl(${c} / 0.13)`, border: `1px solid hsl(${c} / 0.28)` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${c})` }} />
      {URGENCIA_LABEL[u]}
    </span>
  )
}

// Simulador: dado um pedido de N garrafas, qual caixa de envio é consumida (regra do áudio do João).
function SimuladorCaixa({ itens }: { itens: Item[] }) {
  const [qtd, setQtd] = useState(3)
  const caixas = useMemo(() => caixaParaPedido(qtd, itens), [qtd, itens])
  const totalCaixas = caixas.reduce((t, c) => t + c.qtd, 0)
  const custo = caixas.reduce((t, c) => t + c.custo, 0)
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Boxes size={18} className="text-gold" />
        <h2 className="font-display text-xl">Caixa por pedido</h2>
        <span className="ml-auto text-[11px] text-text-muted">regra inferida do áudio do João — validar</span>
      </div>
      <div className="rounded-card border border-border gradient-card p-5">
        <div className="grid sm:grid-cols-12 gap-5 items-start">
          {/* entrada */}
          <div className="sm:col-span-5">
            <div className="text-xs text-text-muted mb-2">Garrafas no pedido</div>
            <div className="flex items-end gap-2">
              <input type="number" min={1} value={qtd}
                onChange={e => setQtd(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-black/30 border border-border rounded-card px-4 py-3 font-display text-3xl tnum outline-none focus:border-[hsl(var(--gold)/0.5)] transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <span className="text-text-muted pb-3 text-sm">grf</span>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {[1, 2, 3, 4, 6, 12].map(n => (
                <button key={n} onClick={() => setQtd(n)}
                  className={`flex-1 h-8 min-w-[34px] rounded-lg text-xs transition tnum ${qtd === n ? 'border border-[hsl(var(--gold)/0.4)] text-gold' : 'surface-overlay text-text-secondary hover:text-foreground'}`}
                  style={qtd === n ? { background: 'hsl(var(--gold)/0.08)' } : undefined}>{n}</button>
              ))}
            </div>
          </div>
          {/* resultado */}
          <div className="sm:col-span-7">
            <div className="text-xs text-text-muted mb-2">Embalagem de envio consumida</div>
            <div className="space-y-2">
              {caixas.map(c => (
                <div key={c.caixaId} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: 'hsl(var(--gold)/0.05)', border: '1px solid hsl(var(--gold)/0.1)' }}>
                  <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-gold" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}>
                    <Box size={15} />
                  </span>
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{c.nome}</span>
                  <span className="font-display text-gold text-lg tnum">{c.qtd}×</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-sm">
              <span className="text-text-muted">{totalCaixas} {totalCaixas === 1 ? 'caixa' : 'caixas'} · custo de envio</span>
              <span className="font-medium tnum text-gold">{fmtBRL(custo)}</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
          Regra: 1 garrafa → caixa de 1 · 2-3 → caixa do combo · 4-6 → caixa de 6 · acima combina as maiores.
          Ao integrar os pedidos do site, o sistema baixa essas caixas do estoque automaticamente.
        </p>
      </div>
    </section>
  )
}
