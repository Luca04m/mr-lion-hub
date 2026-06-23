// Relatórios — curva ABC, valor por categoria, cobertura e itens em risco.
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { Boxes, Layers, Timer, AlertTriangle } from 'lucide-react'
import { useEstoque } from '../store'
import { valorEstoque, coberturaDias, resumoEstoque, fmtBRL, fmtNum } from '../engine'
import { CategoriaIcon } from '../ui'
import type { Item, CategoriaItem, ClasseAbc } from '../types'

const CAT_LABEL: Record<CategoriaItem, string> = {
  liquido: 'Líquidos', po: 'Pós', aditivo: 'Aditivos', granel: 'Líquido em tanque', garrafa: 'Garrafas', rotulo: 'Rótulos',
  pingente: 'Pingentes', fechamento: 'Fechamento', caixa: 'Caixas',
  honey: 'Honey', cappuccino: 'Cappuccino', blended: 'Blended',
}
const ABC_COR: Record<ClasseAbc, string> = { A: 'var(--gold)', B: 'var(--chart-4)', C: 'var(--neutral)' }
// rótulo claro em vez do jargão A/B/C de gestão de estoque
const VALOR_LABEL: Record<ClasseAbc, string> = { A: 'alto valor', B: 'médio valor', C: 'baixo valor' }

export function Relatorios() {
  const { itens } = useEstoque()
  const ativos = useMemo(() => itens.filter(i => i.ativo), [itens])
  const resumo = useMemo(() => resumoEstoque(itens), [itens])

  // curva ABC por valor de estoque
  const abc = useMemo(() => {
    const ranked = ativos.map(i => ({ item: i, valor: valorEstoque(i) })).sort((a, b) => b.valor - a.valor)
    const total = ranked.reduce((t, r) => t + r.valor, 0) || 1
    let acc = 0
    const classified = ranked.map(r => {
      acc += r.valor
      const pctAcc = acc / total
      const classe: ClasseAbc = pctAcc <= 0.8 ? 'A' : pctAcc <= 0.95 ? 'B' : 'C'
      return { ...r, classe, pctValor: r.valor / total }
    })
    const dist = (['A', 'B', 'C'] as ClasseAbc[]).map(c => {
      const its = classified.filter(x => x.classe === c)
      return { classe: c, itens: its.length, valor: its.reduce((t, x) => t + x.valor, 0), pct: its.reduce((t, x) => t + x.pctValor, 0) }
    })
    return { classified, dist, total }
  }, [ativos])

  // valor por categoria
  const porCategoria = useMemo(() => {
    const map = new Map<CategoriaItem, number>()
    ativos.forEach(i => map.set(i.categoria, (map.get(i.categoria) ?? 0) + valorEstoque(i)))
    return [...map.entries()].map(([cat, valor]) => ({ nome: CAT_LABEL[cat], valor: Math.round(valor) }))
      .sort((a, b) => b.valor - a.valor)
  }, [ativos])

  // cobertura média + itens em risco
  const comCobertura = ativos.map(i => ({ item: i, dias: coberturaDias(i) })).filter(x => x.dias !== null) as { item: Item; dias: number }[]
  const coberturaMedia = comCobertura.length ? Math.round(comCobertura.reduce((t, x) => t + x.dias, 0) / comCobertura.length) : 0
  const risco = [...comCobertura].sort((a, b) => a.dias - b.dias).slice(0, 8)

  return (
    <div className="animate-fade-up space-y-7">
      <div>
        <h1 className="font-display text-3xl leading-none">Relatórios</h1>
        <p className="text-sm text-text-secondary mt-1">Onde está concentrado o valor do estoque, por categoria e risco de ruptura.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpi icon={<Boxes size={15} />} label="Valor total" value={fmtBRL(resumo.valorTotal)} />
        <MiniKpi icon={<Layers size={15} />} label="Itens de alto valor" value={`${abc.dist[0].itens}`} sub={`${Math.round(abc.dist[0].pct * 100)}% do valor`} />
        <MiniKpi icon={<Timer size={15} />} label="Cobertura média" value={`${coberturaMedia}`} sub="dias de estoque" />
        <MiniKpi icon={<AlertTriangle size={15} />} label="Em risco (<7d)" value={`${comCobertura.filter(x => x.dias < 7).length}`} tone="warn" />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* Onde está concentrado o valor */}
        <section className="lg:col-span-5 rounded-card border border-border gradient-card p-5">
          <h2 className="font-display text-xl mb-1">Onde está concentrado o valor</h2>
          <p className="text-xs text-text-muted mb-4">poucos itens costumam concentrar a maior parte do valor em estoque</p>
          {/* barra empilhada */}
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {abc.dist.map(d => d.pct > 0 && (
              <div key={d.classe} style={{ width: `${d.pct * 100}%`, background: `hsl(${ABC_COR[d.classe]})` }} title={`${VALOR_LABEL[d.classe]}: ${Math.round(d.pct * 100)}%`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {abc.dist.map(d => (
              <div key={d.classe} className="rounded-card p-3 text-center" style={{ background: `hsl(${ABC_COR[d.classe]}/0.08)`, border: `1px solid hsl(${ABC_COR[d.classe]}/0.2)` }}>
                <div className="font-display text-sm capitalize" style={{ color: `hsl(${ABC_COR[d.classe]})` }}>{VALOR_LABEL[d.classe]}</div>
                <div className="text-xs text-text-secondary tnum mt-1">{d.itens} itens</div>
                <div className="text-[11px] text-text-muted tnum">{Math.round(d.pct * 100)}% valor</div>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {abc.classified.slice(0, 6).map(({ item, valor, classe }) => (
              <div key={item.id} className="flex items-center gap-2.5 py-1.5 text-sm">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `hsl(${ABC_COR[classe]})` }} title={VALOR_LABEL[classe]} />
                <span className="flex-1 min-w-0 truncate text-text-secondary">{item.nome}</span>
                <span className="tnum text-foreground">{fmtBRL(valor)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Valor por categoria */}
        <section className="lg:col-span-7 rounded-card border border-border gradient-card p-5">
          <h2 className="font-display text-xl mb-4">Valor por categoria</h2>
          <ResponsiveContainer width="100%" height={porCategoria.length * 34 + 10}>
            <BarChart layout="vertical" data={porCategoria} margin={{ left: 8, right: 56, top: 0, bottom: 0 }} barCategoryGap={6}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nome" width={86} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={18}>
                {porCategoria.map((_, i) => <Cell key={i} fill={`hsl(var(--gold) / ${0.95 - i * 0.06})`} />)}
                <LabelList dataKey="valor" position="right" formatter={(v: number) => fmtBRL(v)} style={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Itens em risco */}
      <section className="rounded-card border border-border gradient-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: 'hsl(var(--warn))' }} />
          <h2 className="font-display text-xl">Risco de ruptura</h2>
          <span className="text-xs text-text-muted">itens com menor cobertura</span>
        </div>
        <div className="divide-y divide-border">
          {risco.map(({ item, dias }) => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-gold/80"><CategoriaIcon categoria={item.categoria} size={16} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.nome}</div>
                <div className="text-[11px] text-text-muted tnum">consumo {fmtNum(item.usoMedioDiario ?? 0)} {item.uom}/dia</div>
              </div>
              <div className="w-32 hidden sm:block">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--gold)/0.07)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (dias / 30) * 100)}%`, background: dias < 7 ? 'hsl(var(--crit))' : dias < 14 ? 'hsl(var(--warn))' : 'hsl(var(--ok))' }} />
                </div>
              </div>
              <div className="text-right w-16">
                <span className="font-display text-lg tnum" style={{ color: dias < 7 ? 'hsl(var(--crit))' : dias < 14 ? 'hsl(var(--warn))' : 'hsl(var(--text-primary))' }}>{dias}</span>
                <span className="text-[11px] text-text-muted"> dias</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MiniKpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'warn' }) {
  const c = tone === 'warn' ? 'hsl(var(--warn))' : undefined
  return (
    <div className="gradient-card rounded-card border border-border p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-secondary">
        <span style={{ color: c ?? 'hsl(var(--gold))' }}>{icon}</span>{label}
      </div>
      <div className="font-display text-2xl mt-2 tnum" style={{ color: c }}>{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}
