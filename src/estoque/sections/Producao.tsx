// Produção — modelo de 2 estágios (pedido do João 11/06):
//   1 · Líquido  → matéria-prima vira granel no tanque (saída em litros)
//   2 · Envase   → granel + embalagem viram garrafa pronta (saída em unidades)
// A etapa selecionada define a receita; BOM, fabricáveis e simulador derivam dela.
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Factory, AlertTriangle, Zap, Droplet, Wine } from 'lucide-react'
import { useEstoque } from '../store'
import { RECEITAS_PA, ITEM_BY_ID, receitasDoProduto } from '../mock'
import { disponibilidade, fmtNum, fmtBRL, custoReceita } from '../engine'
import { CategoriaIcon } from '../ui'

const STATUS_MO: Record<string, { label: string; cor: string }> = {
  planejada: { label: 'Planejada', cor: 'var(--neutral)' },
  em_producao: { label: 'Em produção', cor: 'var(--warn)' },
  concluida: { label: 'Concluída', cor: 'var(--ok)' },
  cancelada: { label: 'Cancelada', cor: 'var(--crit)' },
}

const semMrLion = (n: string) => n.replace('Mr. Lion ', '').replace(' 750ml', '')

export function Producao() {
  const { itens, ordens, registrarProducao } = useEstoque()
  const [produtoId, setProdutoId] = useState('pa_honey')
  // receita selecionada: por padrão, a que gera o produto acabado (envase/completa).
  const [receitaId, setReceitaId] = useState(() => RECEITAS_PA.find(r => r.produtoId === 'pa_honey')!.id)
  const [qty, setQty] = useState(50)

  const etapas = useMemo(() => receitasDoProduto(produtoId), [produtoId])
  const receita = etapas.find(r => r.id === receitaId) ?? etapas[etapas.length - 1]
  const ehLiquido = receita.etapa === 'liquido'
  const saida = ITEM_BY_ID(receita.saidaId)!
  const unidade = saida.uom // 'L' no líquido, 'un' no envase
  const rotuloUn = ehLiquido ? 'litro' : 'garrafa'

  const disp = useMemo(() => disponibilidade(receita, itens), [receita, itens])
  const custo = useMemo(() => custoReceita(receita, itens), [receita, itens])
  const sustentaById = new Map(disp.porComponente.map(c => [c.itemId, c.sustenta]))

  const podeProduzir = qty > 0 && qty <= disp.fabricaveis
  const excede = qty > disp.fabricaveis

  // troca de produto: volta para a etapa que gera o PA e reseta a quantidade.
  function trocarProduto(pid: string) {
    setProdutoId(pid)
    const pa = receitasDoProduto(pid).find(r => r.etapa !== 'liquido')
    if (pa) setReceitaId(pa.id)
    setQty(50)
  }
  function trocarEtapa(id: string) {
    setReceitaId(id)
    const r = etapas.find(x => x.id === id)
    setQty(r?.etapa === 'liquido' ? 300 : 50)
  }

  function registrar() {
    if (!podeProduzir) return
    registrarProducao(receita.id, qty)
    toast.success(`Produção registrada: ${fmtNum(qty)} ${unidade} · ${semMrLion(saida.nome)}`, {
      description: ehLiquido
        ? 'Matéria-prima consumida, líquido pronto no tanque e ordem concluída.'
        : 'Granel + embalagem consumidos, garrafas em estoque e ordem concluída.',
    })
    setQty(ehLiquido ? 300 : 50)
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="font-display text-3xl leading-none">Produção</h1>
          <p className="text-sm text-text-secondary mt-1">Líquido no tanque e envase em garrafa — separados, como na fábrica.</p>
        </div>
      </div>

      {/* seletor de produto */}
      <div className="flex gap-2.5 mb-4 flex-wrap">
        {RECEITAS_PA.map(r => {
          const p = ITEM_BY_ID(r.produtoId)!
          const d = disponibilidade(r, itens)
          const active = r.produtoId === produtoId
          return (
            <button key={r.produtoId} onClick={() => trocarProduto(r.produtoId)}
              className={`flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-card border transition ${active ? 'border-[hsl(var(--gold)/0.5)] gold-glow' : 'border-border hover:border-[hsl(var(--gold)/0.3)]'}`}
              style={{ background: active ? 'hsl(var(--gold)/0.08)' : 'hsl(var(--surface-raised))' }}>
              {p.fotoUrl && <img src={p.fotoUrl} alt="" className="h-12 w-auto object-contain" />}
              <div className="text-left">
                <div className={`font-medium ${active ? 'text-gold' : ''}`}>{semMrLion(p.nome)}</div>
                <div className="text-[11px] text-text-muted tnum">{fmtNum(d.fabricaveis)} fabricáveis</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* seletor de etapa (só quando a linha tem produção de líquido) */}
      {etapas.length > 1 && (
        <div className="inline-flex gap-1 mb-6 p-1 rounded-card border border-border" style={{ background: 'hsl(var(--surface-raised))' }}>
          {etapas.map(r => {
            const liq = r.etapa === 'liquido'
            const active = r.id === receita.id
            const granel = liq ? ITEM_BY_ID(r.saidaId) : null
            return (
              <button key={r.id} onClick={() => trocarEtapa(r.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-cta' : 'text-text-secondary hover:text-foreground'}`}>
                {liq ? <Droplet size={15} /> : <Wine size={15} />}
                <span>{liq ? '1 · Líquido' : '2 · Envase'}</span>
                <span className={`text-[11px] tnum ${active ? 'opacity-80' : 'text-text-muted'}`}>
                  {liq ? `${fmtNum(granel?.estoque ?? 0)} L no tanque` : `${fmtNum(disponibilidade(r, itens).fabricaveis)} un`}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-4">
        {/* ── Receita / BOM ── */}
        <div className="lg:col-span-7 rounded-card border border-border overflow-hidden gradient-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display text-xl">Receita · {receita.nome}</h2>
            <span className="text-xs text-text-muted">por 1 {rotuloUn}</span>
          </div>
          {disp.incompleta && (
            <div className="mx-5 mt-4 text-[12px] rounded-lg px-3 py-2.5 flex items-center gap-2" style={{ color: 'hsl(var(--warn))', background: 'hsl(var(--warn)/0.12)', border: '1px solid hsl(var(--warn)/0.25)' }}>
              <AlertTriangle size={14} /> Receita líquida ainda não cadastrada — fabricáveis considera só a embalagem.
            </div>
          )}
          <div className="p-2">
            {receita.componentes.map(c => {
              const it = ITEM_BY_ID(c.itemId)!
              const sustenta = sustentaById.get(c.itemId) ?? 0
              const gargalo = c.itemId === disp.gargaloItemId
              return (
                <div key={c.itemId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={gargalo ? { background: 'hsl(var(--warn)/0.07)' } : undefined}>
                  <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-gold" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}>
                    <CategoriaIcon categoria={it.categoria} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-2">{it.nome}
                      {gargalo && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: 'hsl(var(--warn))', background: 'hsl(var(--warn)/0.15)' }}>gargalo</span>}</div>
                    <div className="text-[11px] text-text-muted tnum">{fmtNum(c.quantidade)} {c.uom}/{rotuloUn} · {fmtNum(it.estoque)} {it.uom} em estoque</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg tnum" style={{ color: gargalo ? 'hsl(var(--warn))' : undefined }}>{fmtNum(sustenta)}</div>
                    <div className="text-[10px] text-text-muted -mt-0.5">sustenta</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Simulador de produção ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-card border border-border gradient-card p-5 gold-glow">
            <div className="flex items-center gap-2 text-sm font-semibold mb-1"><Zap size={15} className="text-gold" /> Nova ordem · {ehLiquido ? 'líquido' : 'envase'}</div>
            <div className="text-xs text-text-muted mb-4">
              {ehLiquido ? `quantos litros de ${semMrLion(saida.nome)} produzir` : `quantas garrafas de ${semMrLion(saida.nome)} envasar`}
            </div>

            <div className="flex items-end gap-2 mb-2">
              <input type="number" min={0} value={qty} onChange={e => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-black/30 border border-border rounded-card px-4 py-3 font-display text-3xl tnum outline-none focus:border-[hsl(var(--gold)/0.5)] transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <span className="text-text-muted pb-3 text-sm">{unidade}</span>
            </div>
            <div className="flex gap-1.5 mb-4">
              {(ehLiquido ? [300, 900] : [50, 100]).map(n => (
                <button key={n} onClick={() => setQty(n)} className="flex-1 h-8 rounded-lg text-xs surface-overlay text-text-secondary hover:text-foreground transition tnum">{n}</button>
              ))}
              <button onClick={() => setQty(disp.fabricaveis)} className="flex-1 h-8 rounded-lg text-xs border border-[hsl(var(--gold)/0.3)] text-gold hover:bg-[hsl(var(--gold)/0.08)] transition tnum">Máx {fmtNum(disp.fabricaveis)}</button>
            </div>

            {excede ? (
              <div className="text-[12px] rounded-lg px-3 py-2.5 mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--crit))', background: 'hsl(var(--crit)/0.12)', border: '1px solid hsl(var(--crit)/0.25)' }}>
                <AlertTriangle size={14} /> Só dá pra {ehLiquido ? 'produzir' : 'envasar'} {fmtNum(disp.fabricaveis)} {unidade} agora{disp.gargaloItemId ? ` (falta ${ITEM_BY_ID(disp.gargaloItemId)!.nome})` : ''}.
              </div>
            ) : null}

            {/* Prévia: insumo → saída (antes → depois) */}
            {podeProduzir && (
              <div className="mb-3 rounded-card border border-border overflow-hidden" style={{ background: 'hsl(var(--surface-overlay))' }}>
                <div className="px-3.5 py-2.5 border-b border-border">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Vai gerar</div>
                  <div className="flex items-center gap-2 mt-1">
                    {saida.fotoUrl
                      ? <img src={saida.fotoUrl} alt="" className="h-7 w-auto object-contain" />
                      : <span className="text-gold"><CategoriaIcon categoria={saida.categoria} size={18} /></span>}
                    <span className="font-display text-lg tnum" style={{ color: 'hsl(var(--ok))' }}>+{fmtNum(qty)}</span>
                    <span className="text-sm text-foreground">{semMrLion(saida.nome)} <span className="text-text-muted">{unidade}</span></span>
                    <span className="ml-auto text-[11px] text-text-muted tnum">{fmtNum(saida.estoque)} → <span className="text-foreground">{fmtNum(saida.estoque + qty)}</span></span>
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">Consome</div>
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                    {receita.componentes.map(c => {
                      const it = ITEM_BY_ID(c.itemId)!
                      const consumo = c.quantidade * qty
                      const depois = +(it.estoque - consumo).toFixed(2)
                      return (
                        <div key={c.itemId} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 min-w-0 truncate text-text-secondary">{it.nome}</span>
                          <span className="tnum shrink-0" style={{ color: 'hsl(var(--crit))' }}>−{fmtNum(consumo)}</span>
                          <span className="tnum text-text-muted w-[104px] text-right shrink-0">{fmtNum(it.estoque)} → <span style={depois <= 0 ? { color: 'hsl(var(--crit))' } : { color: 'hsl(var(--text-primary))' }}>{fmtNum(depois)}</span> <span className="text-text-muted">{it.uom}</span></span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <button onClick={registrar} disabled={!podeProduzir}
              className={`w-full h-11 rounded-card font-semibold flex items-center justify-center gap-2 transition ${podeProduzir ? 'bg-cta hover:brightness-110' : 'bg-[hsl(var(--surface-overlay))] text-text-muted cursor-not-allowed'}`}>
              <Factory size={16} /> {ehLiquido ? 'Registrar produção de líquido' : 'Registrar envase'}
            </button>
          </div>

          <div className="rounded-card border border-border gradient-card p-5">
            <div className="text-[11px] uppercase tracking-wider text-text-muted">{ehLiquido ? 'Litros possíveis agora' : 'Garrafas envasáveis agora'}</div>
            <div className="font-display text-4xl text-gold tnum mt-1">{fmtNum(disp.fabricaveis)} <span className="font-sans text-base text-text-muted">{unidade}</span></div>
            <div className="text-xs text-text-secondary mt-1">
              {disp.gargaloItemId ? <>limitado por <span className="text-foreground">{ITEM_BY_ID(disp.gargaloItemId)!.nome}</span></> : 'sem gargalo'}
            </div>
          </div>

          {/* ── Custo ── */}
          {ehLiquido ? (
            <div className="rounded-card border border-border gradient-card p-5">
              <div className="text-[11px] uppercase tracking-wider text-text-muted">Custo por litro (matéria-prima)</div>
              <div className="font-display text-4xl text-gold tnum mt-1">{fmtBRL(custo.liquido)}</div>
              <div className="text-[11px] text-text-muted mt-3">Embalagem e mão de obra entram só no envase.</div>
            </div>
          ) : (
            <div className="rounded-card border border-border gradient-card p-5">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-muted">Custo por garrafa (CMV)</div>
                  <div className="font-display text-4xl text-gold tnum mt-1">{fmtBRL(custo.total)}</div>
                </div>
                {disp.incompleta && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md" style={{ color: 'hsl(var(--warn))', background: 'hsl(var(--warn)/0.13)' }}>sem líquido</span>
                )}
              </div>
              <div className="mt-3.5 space-y-1.5">
                {[
                  { l: 'Líquido (granel)', v: custo.liquido },
                  { l: 'Embalagem (garrafa, tubete, rótulo…)', v: custo.embalagem },
                  { l: 'Mão de obra', v: custo.maoDeObra },
                ].map(r => (
                  <div key={r.l} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{r.l}</span>
                    <span className="tnum text-foreground">{fmtBRL(r.v)}</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-text-muted mt-3">Caixa de envio não entra no CMV — varia por pedido (ver Compras).</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Ordens de produção ── */}
      <section className="mt-7">
        <h2 className="font-display text-xl mb-3">Ordens de produção</h2>
        <div className="rounded-card border border-border overflow-hidden gradient-card divide-y divide-border">
          {ordens.map(o => {
            const p = ITEM_BY_ID(o.produtoId)!
            const s = STATUS_MO[o.status]
            const liq = p.tipo === 'produto_intermediario'
            return (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="font-mono text-xs text-text-muted w-20">{o.codigo}</span>
                {p.fotoUrl
                  ? <img src={p.fotoUrl} alt="" className="h-9 w-auto object-contain" />
                  : <span className="h-9 w-9 grid place-items-center text-gold shrink-0"><CategoriaIcon categoria={p.categoria} size={18} /></span>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {semMrLion(p.nome)}
                    {liq && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: 'hsl(var(--info))', background: 'hsl(var(--info) / 0.14)' }}>líquido</span>}
                  </div>
                  <div className="text-[11px] text-text-muted tnum">{fmtNum(o.qtdReal ?? o.qtdPlanejada)} {p.uom} · {new Date(o.criadaEm).toLocaleDateString('pt-BR')}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ color: `hsl(${s.cor})`, background: `hsl(${s.cor}/0.13)`, border: `1px solid hsl(${s.cor}/0.26)` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${s.cor})` }} />{s.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
