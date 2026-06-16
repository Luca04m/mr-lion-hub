// Painel de controle — KPIs, produção possível, reposição, distribuição de valor.
import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { AlertTriangle, TriangleAlert, ArrowRight } from 'lucide-react'
import { useEstoque } from '../store'
import { RECEITAS_PA, ITEM_BY_ID, granelDaLinha } from '../mock'
import {
  disponibilidade, resumoEstoque, listaCompras, valorEstoque, statusEstoque,
  fmtBRL, fmtNum,
} from '../engine'
import { Card, StatusPill, StockBar, Sparkline } from '../ui'
import type { Item } from '../types'

export function Dashboard({ goto }: { goto: (s: 'estoque' | 'producao') => void }) {
  const { itens } = useEstoque()
  const resumo = useMemo(() => resumoEstoque(itens), [itens])
  const disp = useMemo(() => RECEITAS_PA.map(r => ({ receita: r, d: disponibilidade(r, itens) })), [itens])
  const totalFabricavel = disp.reduce((s, x) => s + x.d.fabricaveis, 0)
  const compras = useMemo(() => listaCompras(itens), [itens])

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

  // série sintética de produção possível (sparkline KPI)
  const trend = useMemo(() => [62, 58, 71, 65, 80, 76, 74, totalFabricavel].map(Number), [totalFabricavel])

  return (
    <div className="space-y-7 animate-fade-up">
      {/* Hero title */}
      <div>
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-dim mb-1.5">Casa Mr. Lion · Destilaria Lamas</div>
        <h1 className="font-display text-3xl md:text-[40px] leading-none">Bom dia. Aqui está o seu estoque.</h1>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Valor em estoque" value={fmtBRL(resumo.valorTotal)} sub={`${resumo.itensTotais} itens ativos`} accent>
          <Sparkline values={[resumo.valorTotal * 0.92, resumo.valorTotal * 0.97, resumo.valorTotal * 0.94, resumo.valorTotal]} />
        </Kpi>
        <Kpi label="Produção possível hoje" value={fmtNum(totalFabricavel)} unit="garrafas" sub="somando os 3 produtos">
          <Sparkline values={trend} />
        </Kpi>
        <Kpi label="A repor" value={resumo.repor} icon={<AlertTriangle size={15} />} tone="warn" sub="abaixo do mínimo" onClick={() => goto('estoque')} />
        <Kpi label="Crítico / esgotado" value={resumo.critico} icon={<TriangleAlert size={15} />} tone="crit" sub="ação urgente" onClick={() => goto('estoque')} />
      </div>

      {/* Produção possível */}
      <section>
        <div className="flex items-end gap-3 mb-4">
          <h2 className="font-display text-2xl leading-none">Produção possível agora</h2>
          <span className="text-xs text-text-muted mb-0.5">quantas garrafas dá pra montar com o estoque atual — e o que trava</span>
          <button onClick={() => goto('producao')} className="ml-auto text-xs text-gold hover:underline flex items-center gap-1">Ver receitas <ArrowRight size={13} /></button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {disp.map(({ receita, d }) => {
            const pa = ITEM_BY_ID(receita.produtoId)!
            const gargalo = d.gargaloItemId ? ITEM_BY_ID(d.gargaloItemId) : null
            const granelId = granelDaLinha(receita.produtoId)
            const granel = granelId ? ITEM_BY_ID(granelId) : null
            return (
              <Card key={receita.id} className="p-5 relative overflow-hidden">
                <div className="absolute -right-6 -top-10 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--gold)/0.10), transparent 70%)' }} />
                <div className="flex items-start justify-between gap-3 relative">
                  <div>
                    <div className="font-display text-xl leading-tight">{pa.nome.replace('Mr. Lion ', '').replace(' 750ml', '')}</div>
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
                    <span className="text-text-muted">· dá p/ ~{fmtNum(Math.floor(granel.estoque / 0.75))} garrafas</span>
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
