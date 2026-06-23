// Painel de controle — garrafas em estoque, últimas movimentações, produção possível, reposição.
import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  AlertTriangle, TriangleAlert, ArrowRight,
  ShoppingBag, PackagePlus, PackageCheck, Factory, SlidersHorizontal, TrendingDown, ArrowLeftRight,
} from 'lucide-react'
import { useEstoque } from '../store'
import { RECEITAS_PA, granelDaLinha } from '../mock'
import {
  disponibilidade, resumoEstoque, listaCompras, valorEstoque, statusEstoque,
  fmtBRL, fmtNum,
} from '../engine'
import { Card, StatusPill, StockBar, STATUS_VAR } from '../ui'
import type { Item, Movimento, TipoMovimento } from '../types'

// Aparência de cada tipo de movimento no painel de "últimas movimentações" (mesmo léxico da seção Movimentações).
const MOV_META: Record<TipoMovimento, { label: string; icon: typeof ShoppingBag; cor: string }> = {
  recebimento:      { label: 'Recebimento',   icon: PackagePlus,       cor: 'var(--ok)' },
  entrada_producao: { label: 'Produção',      icon: PackageCheck,      cor: 'var(--ok)' },
  consumo_producao: { label: 'Consumo',       icon: Factory,           cor: 'var(--warn)' },
  venda:            { label: 'Venda',         icon: ShoppingBag,       cor: 'var(--warn)' },
  ajuste:           { label: 'Ajuste',        icon: SlidersHorizontal, cor: 'var(--neutral)' },
  perda:            { label: 'Perda',         icon: TrendingDown,      cor: 'var(--crit)' },
  transferencia:    { label: 'Transferência', icon: ArrowLeftRight,    cor: 'var(--neutral)' },
}

const fmtQuando = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
  ' · ' + new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function Dashboard({ goto }: { goto: (s: 'estoque' | 'producao' | 'movimentacoes') => void }) {
  const { itens, movimentos } = useEstoque()
  const resumo = useMemo(() => resumoEstoque(itens), [itens])
  const disp = useMemo(() => RECEITAS_PA.map(r => ({ receita: r, d: disponibilidade(r, itens) })), [itens])
  const totalFabricavel = disp.reduce((s, x) => s + x.d.fabricaveis, 0)
  const compras = useMemo(() => listaCompras(itens), [itens])
  // lookup reativo do store (estoque atualizado pela hidratação do Supabase) — NÃO usar o mock estático
  const byId = useMemo(() => new Map(itens.map(i => [i.id, i])), [itens])

  // Garrafas prontas (produto acabado), na ordem das linhas — o que está pronto pra vender.
  const garrafas = useMemo(
    () => RECEITAS_PA.map(r => byId.get(r.produtoId)).filter((x): x is Item => !!x && x.ativo),
    [byId],
  )
  // Últimas movimentações (vendas a cada pedido pago + entradas/produção) — fonte: ledger do Supabase.
  const recentes = useMemo<Movimento[]>(
    () => [...movimentos].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)).slice(0, 8),
    [movimentos],
  )

  const valorPorTipo = useMemo(() => {
    const g = { materia_prima: 0, embalagem: 0, produto_intermediario: 0, produto_acabado: 0 }
    itens.forEach(i => { g[i.tipo] += valorEstoque(i) })
    return [
      { nome: 'Matéria-prima', valor: g.materia_prima, cor: 'hsl(var(--gold))' },
      { nome: 'Líquido em tanque', valor: g.produto_intermediario, cor: 'hsl(var(--info))' },
      { nome: 'Embalagem', valor: g.embalagem, cor: 'hsl(var(--muted-foreground))' },
      { nome: 'Produto acabado', valor: g.produto_acabado, cor: 'hsl(var(--success))' },
    ].filter(s => s.valor > 0)
  }, [itens])

  return (
    <div className="space-y-7 animate-fade-up">
      {/* Hero title */}
      <div>
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-dim mb-1.5">Casa Mr. Lion · Destilaria Lamas</div>
        <h1 className="font-display text-3xl md:text-[40px] leading-none">Bom dia. Aqui está o seu estoque.</h1>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Valor em estoque" value={fmtBRL(resumo.valorTotal)} sub={`${resumo.itensTotais} itens ativos`} accent />
        <Kpi label="Produção possível hoje" value={fmtNum(totalFabricavel)} unit="garrafas" sub="somando os 3 produtos" />
        <Kpi label="A repor" value={resumo.repor} icon={<AlertTriangle size={15} />} tone="warn" sub="abaixo do mínimo" onClick={() => goto('estoque')} />
        <Kpi label="Crítico / esgotado" value={resumo.critico} icon={<TriangleAlert size={15} />} tone="crit" sub="ação urgente" onClick={() => goto('estoque')} />
      </div>

      {/* Garrafas prontas em estoque — destaque por produto */}
      <section>
        <div className="flex items-end gap-3 mb-4">
          <h2 className="font-display text-2xl leading-none">Garrafas em estoque</h2>
          <span className="text-xs text-text-muted mb-0.5">quanto tem pronto pra vender agora, por produto</span>
          <div className="ml-auto text-right">
            <div className="font-display text-2xl leading-none tnum" style={{ color: 'hsl(var(--gold-bright))' }}>{fmtNum(resumo.unidadesPA)}</div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">no total</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {garrafas.map(pa => {
            const st = statusEstoque(pa)
            const nome = pa.nome.replace('Mr. Lion ', '').replace(/ \d+ml$/, '')
            return (
              <Card key={pa.id} className="p-5 flex items-center gap-4">
                {pa.fotoUrl && (
                  <img src={pa.fotoUrl} alt={pa.nome} className="h-24 w-auto object-contain shrink-0"
                    style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,.45))' }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-lg leading-none">{nome}</span>
                    <StatusPill status={st} dense />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="font-display text-[44px] leading-none tnum" style={{ color: `hsl(${STATUS_VAR[st]})` }}>{fmtNum(pa.estoque)}</span>
                    <span className="text-sm text-text-muted">garrafas</span>
                  </div>
                  <div className="mt-3.5"><StockBar item={pa} height={5} /></div>
                  <div className="mt-1.5 text-[11px] text-text-muted">mínimo {fmtNum(pa.min)} un · {pa.sku}</div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Últimas movimentações — vendas e entradas mais recentes (ledger Supabase) */}
      <section>
        <div className="flex items-end gap-3 mb-4">
          <h2 className="font-display text-2xl leading-none">Últimas movimentações</h2>
          <span className="text-xs text-text-muted mb-0.5">cada venda dá baixa automática; entradas e produção também entram aqui</span>
          <button onClick={() => goto('movimentacoes')} className="ml-auto text-xs text-gold hover:underline flex items-center gap-1">Ver todas <ArrowRight size={13} /></button>
        </div>
        <Card className="p-5">
          {recentes.length === 0 ? (
            <div className="text-sm text-text-secondary py-8 text-center">Sem movimentações ainda — a primeira venda paga aparece aqui.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-8">
              {recentes.map(m => {
                const it = byId.get(m.itemId)
                const meta = MOV_META[m.tipo] ?? MOV_META.ajuste
                const Icon = meta.icon
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-0">
                    <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ color: `hsl(${meta.cor})`, background: `hsl(${meta.cor}/0.12)` }}>
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{it?.nome ?? m.itemId}</div>
                      <div className="text-[11px] text-text-muted truncate">{meta.label}{m.usuario ? ` · ${m.usuario}` : ''} · {fmtQuando(m.criadoEm)}</div>
                    </div>
                    <div className="font-display text-base tnum shrink-0" style={{ color: m.delta >= 0 ? 'hsl(var(--ok))' : 'hsl(var(--crit))' }}>
                      {m.delta >= 0 ? '+' : ''}{fmtNum(m.delta)} <span className="text-[11px] text-text-muted font-sans">{it?.uom}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </section>

      {/* Produção possível */}
      <section>
        <div className="flex items-end gap-3 mb-4">
          <h2 className="font-display text-2xl leading-none">Produção possível agora</h2>
          <span className="text-xs text-text-muted mb-0.5">quantas garrafas dá pra montar com o estoque atual — e o que trava</span>
          <button onClick={() => goto('producao')} className="ml-auto text-xs text-gold hover:underline flex items-center gap-1">Ver receitas <ArrowRight size={13} /></button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {disp.map(({ receita, d }) => {
            const pa = byId.get(receita.produtoId)!
            const gargalo = d.gargaloItemId ? byId.get(d.gargaloItemId) : null
            const granelId = granelDaLinha(receita.produtoId)
            const granel = granelId ? byId.get(granelId) : null
            // litros/garrafa = quantidade de granel na própria receita de envase (Honey 0,72 · Cappuccino 0,75)
            const litrosPorGarrafa = granelId ? (receita.componentes.find(c => c.itemId === granelId)?.quantidade ?? 0.75) : 0.75
            return (
              <Card key={receita.id} className="p-5 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 relative">
                  <div>
                    <div className="font-display text-xl leading-tight">{pa.nome.replace('Mr. Lion ', '').replace(/ \d+ml$/, '')}</div>
                    <div className="text-[11px] uppercase tracking-wider text-gold-dim mt-1">{pa.sku} · {pa.estoque} em estoque</div>
                  </div>
                  {pa.fotoUrl && <img src={pa.fotoUrl} alt={pa.nome} className="h-24 w-auto object-contain" style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,.55))' }} />}
                </div>
                <div className="mt-3 relative">
                  <div className={`font-display text-5xl leading-none ${d.fabricaveis === 0 ? '' : 'text-gold'}`} style={d.fabricaveis === 0 ? { color: 'hsl(var(--crit))' } : undefined}>{fmtNum(d.fabricaveis)}</div>
                  <div className="text-xs text-text-secondary mt-1">garrafas fabricáveis</div>
                </div>
                <div className="mt-4 pt-3.5 border-t border-border text-xs text-text-secondary relative">
                  {gargalo ? (<>Gargalo: <span className="text-foreground font-medium">{gargalo.nome}</span> <span className="text-text-muted">· {fmtNum(gargalo.estoque)} {gargalo.uom} em estoque</span></>) : 'Sem gargalo'}
                </div>
                {granel && (
                  <div className="mt-2 text-xs text-text-secondary relative flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--info))' }} />
                    Líquido pronto: <span className="text-foreground font-medium tnum">{fmtNum(granel.estoque)} L</span>
                    <span className="text-text-muted">· dá p/ ~{fmtNum(Math.floor(granel.estoque / litrosPorGarrafa))} garrafas</span>
                  </div>
                )}
                {d.incompleta && (
                  <div className="mt-3 text-[11px] rounded-lg px-3 py-2 relative" style={{ color: 'hsl(var(--warn))', background: 'hsl(var(--warn)/0.12)', border: '1px solid hsl(var(--warn)/0.25)' }}>
                    Receita líquida do Blended ainda não cadastrada — conta só a embalagem.
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </section>

      {/* Reposição + distribuição */}
      <div className="grid lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">A repor agora</h2>
            <button onClick={() => goto('estoque')} className="text-xs text-gold hover:underline flex items-center gap-1">Abrir estoque <ArrowRight size={13} /></button>
          </div>
          {compras.length === 0 ? (
            <div className="text-sm text-text-secondary py-8 text-center">Tudo em dia — nenhum item abaixo do mínimo.</div>
          ) : (
            <div className="space-y-1">
              {compras.slice(0, 6).map(({ item, comprar }) => (
                <ReporRow key={item.id} item={item} comprar={comprar} />
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5 p-5">
          <h2 className="font-display text-xl mb-2">Valor por tipo</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-[150px] h-[150px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={valorPorTipo} dataKey="valor" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">
                    {valorPorTipo.map((e, i) => <Cell key={i} fill={e.cor} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Total</div>
                <div className="font-display text-base tnum">{fmtBRL(resumo.valorTotal).replace('R$', 'R$ ')}</div>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {valorPorTipo.map(e => (
                <div key={e.nome} className="flex items-center gap-2.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.cor }} />
                  <span className="text-text-secondary flex-1">{e.nome}</span>
                  <span className="tnum font-medium">{fmtBRL(e.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Kpi({ label, value, unit, sub, children, icon, tone, accent, onClick }: {
  label: string; value: string | number; unit?: string; sub?: string; children?: React.ReactNode
  icon?: React.ReactNode; tone?: 'warn' | 'crit'; accent?: boolean; onClick?: () => void
}) {
  const toneColor = tone === 'warn' ? 'hsl(var(--warn))' : tone === 'crit' ? 'hsl(var(--crit))' : undefined
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`gradient-card rounded-card border border-border p-4 text-left ${onClick ? 'hover:border-[hsl(var(--gold)/0.28)] transition cursor-pointer' : 'cursor-default'}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-secondary">
        {icon && <span style={{ color: toneColor }}>{icon}</span>}{label}
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="font-display text-3xl leading-none tnum" style={{ color: toneColor ?? (accent ? 'hsl(var(--gold-bright))' : undefined) }}>
          {value}{unit && <span className="font-sans text-sm text-text-muted ml-1.5">{unit}</span>}
        </div>
        {children}
      </div>
      {sub && <div className="text-[11px] text-text-muted mt-1.5">{sub}</div>}
    </button>
  )
}

function ReporRow({ item, comprar }: { item: Item; comprar: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <StatusPill status={statusEstoque(item)} dense />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{item.nome}</div>
        <div className="mt-1 max-w-[160px]"><StockBar item={item} height={4} /></div>
      </div>
      <div className="text-right">
        <div className="text-xs text-text-muted">tem <span className="text-text-secondary tnum">{fmtNum(item.estoque)} {item.uom}</span></div>
        <div className="font-display text-gold text-lg tnum leading-tight">+{fmtNum(comprar)} <span className="text-xs text-text-muted font-sans">{item.uom}</span></div>
      </div>
    </div>
  )
}
