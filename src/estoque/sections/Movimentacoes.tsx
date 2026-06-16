// Movimentações — ledger de estoque + registro manual de movimento.
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  PackagePlus, PackageCheck, Factory, ShoppingBag, SlidersHorizontal,
  TrendingDown, ArrowLeftRight, Plus, X, Search,
} from 'lucide-react'
import { useEstoque } from '../store'
import { ITEM_BY_ID } from '../mock'
import { fmtNum } from '../engine'
import type { TipoMovimento } from '../types'

const TIPO_META: Record<TipoMovimento, { label: string; icon: typeof Plus; cor: string }> = {
  recebimento:      { label: 'Recebimento',  icon: PackagePlus,        cor: 'var(--ok)' },
  entrada_producao: { label: 'Produção',     icon: PackageCheck,       cor: 'var(--ok)' },
  consumo_producao: { label: 'Consumo',      icon: Factory,            cor: 'var(--warn)' },
  venda:            { label: 'Venda',        icon: ShoppingBag,        cor: 'var(--warn)' },
  ajuste:           { label: 'Ajuste',       icon: SlidersHorizontal,  cor: 'var(--neutral)' },
  perda:            { label: 'Perda',        icon: TrendingDown,       cor: 'var(--crit)' },
  transferencia:    { label: 'Transferência',icon: ArrowLeftRight,     cor: 'var(--neutral)' },
}

const FILTROS: { id: string; label: string; tipos: TipoMovimento[] }[] = [
  { id: 'todos', label: 'Tudo', tipos: [] },
  { id: 'entradas', label: 'Entradas', tipos: ['recebimento', 'entrada_producao'] },
  { id: 'saidas', label: 'Saídas', tipos: ['venda', 'consumo_producao'] },
  { id: 'ajustes', label: 'Ajustes & perdas', tipos: ['ajuste', 'perda', 'transferencia'] },
]

export function Movimentacoes() {
  const { movimentos } = useEstoque()
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)

  const lista = useMemo(() => {
    const f = FILTROS.find(x => x.id === filtro)!
    return [...movimentos]
      .filter(m => f.tipos.length === 0 || f.tipos.includes(m.tipo))
      .filter(m => !busca || (ITEM_BY_ID(m.itemId)?.nome ?? '').toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))
  }, [movimentos, filtro, busca])

  // agrupa por dia
  const grupos = useMemo(() => {
    const map = new Map<string, typeof lista>()
    lista.forEach(m => {
      const d = new Date(m.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(m)
    })
    return [...map.entries()]
  }, [lista])

  return (
    <div className="animate-fade-up">
      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="font-display text-3xl leading-none">Movimentações</h1>
          <p className="text-sm text-text-secondary mt-1">Todo evento de estoque, do recebimento ao consumo de produção.</p>
        </div>
        <button onClick={() => setNovo(true)}
          className="ml-auto flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-cta font-semibold text-sm hover:brightness-110 transition">
          <Plus size={16} /> Registrar movimento
        </button>
      </div>

      {/* filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`h-8 px-3.5 rounded-full text-xs font-medium transition border ${filtro === f.id ? 'text-gold border-[hsl(var(--gold)/0.4)]' : 'text-text-secondary border-border hover:text-foreground'}`}
            style={filtro === f.id ? { background: 'hsl(var(--gold)/0.1)' } : undefined}>{f.label}</button>
        ))}
        <div className="relative ml-auto w-full sm:w-56 mt-2 sm:mt-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar item…"
            className="w-full h-8 pl-9 pr-3 rounded-lg bg-[hsl(var(--surface-overlay))] border border-border text-sm outline-none focus:border-[hsl(var(--gold)/0.4)] transition" />
        </div>
      </div>

      <div className="rounded-card border border-border overflow-hidden gradient-card">
        {grupos.length === 0 && <div className="p-10 text-center text-sm text-text-secondary">Nenhuma movimentação.</div>}
        {grupos.map(([dia, movs]) => (
          <div key={dia}>
            <div className="px-5 py-2 text-[11px] uppercase tracking-wider text-text-muted sticky top-14" style={{ background: 'hsl(var(--surface-overlay))' }}>{dia}</div>
            {movs.map(m => {
              const it = ITEM_BY_ID(m.itemId)
              const meta = TIPO_META[m.tipo]
              const Icon = meta.icon
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-t border-border">
                  <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ color: `hsl(${meta.cor})`, background: `hsl(${meta.cor}/0.12)` }}><Icon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{it?.nome ?? m.itemId}</div>
                    <div className="text-[11px] text-text-muted">{meta.label}{m.motivo ? ` · ${m.motivo}` : ''}{m.usuario ? ` · ${m.usuario}` : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base tnum" style={{ color: m.delta >= 0 ? 'hsl(var(--ok))' : 'hsl(var(--crit))' }}>
                      {m.delta >= 0 ? '+' : ''}{fmtNum(m.delta)} <span className="text-[11px] text-text-muted font-sans">{it?.uom}</span>
                    </div>
                    <div className="text-[10px] text-text-muted">{new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {novo && <NovoMovimento onClose={() => setNovo(false)} />}
    </div>
  )
}

function NovoMovimento({ onClose }: { onClose: () => void }) {
  const { itens, ajustar } = useEstoque()
  const [itemId, setItemId] = useState(itens[0]?.id ?? '')
  const [tipo, setTipo] = useState<'recebimento' | 'venda' | 'perda' | 'ajuste'>('recebimento')
  const [sinal, setSinal] = useState<1 | -1>(1)
  const [qtd, setQtd] = useState(1)
  const [motivo, setMotivo] = useState('')
  const item = itens.find(i => i.id === itemId)

  const sinalEfetivo = tipo === 'recebimento' ? 1 : tipo === 'ajuste' ? sinal : -1

  function registrar() {
    if (!item || qtd <= 0) return
    ajustar(item.id, sinalEfetivo * qtd, tipo, motivo || undefined)
    toast.success(`${tipo === 'recebimento' ? 'Entrada' : tipo === 'venda' ? 'Saída' : tipo === 'perda' ? 'Perda' : 'Ajuste'} registrado`, {
      description: `${item.nome}: ${sinalEfetivo > 0 ? '+' : ''}${fmtNum(sinalEfetivo * qtd)} ${item.uom}`,
    })
    onClose()
  }

  const TIPOS = [
    { id: 'recebimento', label: 'Entrada' }, { id: 'venda', label: 'Saída' },
    { id: 'perda', label: 'Perda' }, { id: 'ajuste', label: 'Ajuste' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md surface-float rounded-card gold-glow animate-slide-up p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl">Registrar movimento</h3>
          <button onClick={onClose} className="text-text-muted hover:text-foreground"><X size={18} /></button>
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">Item</label>
        <select value={itemId} onChange={e => setItemId(e.target.value)}
          className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--surface-overlay))] border border-border text-sm outline-none focus:border-[hsl(var(--gold)/0.4)] mb-4">
          {itens.map(i => <option key={i.id} value={i.id} className="bg-[hsl(var(--surface-float))]">{i.nome} ({i.sku})</option>)}
        </select>

        <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">Tipo</label>
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => setTipo(t.id)}
              className={`h-9 rounded-lg text-xs font-medium transition border ${tipo === t.id ? 'text-gold border-[hsl(var(--gold)/0.45)]' : 'text-text-secondary border-border hover:text-foreground'}`}
              style={tipo === t.id ? { background: 'hsl(var(--gold)/0.1)' } : undefined}>{t.label}</button>
          ))}
        </div>

        {tipo === 'ajuste' && (
          <div className="flex gap-1.5 mb-4">
            <button onClick={() => setSinal(1)} className={`flex-1 h-9 rounded-lg text-sm transition ${sinal === 1 ? 'text-[hsl(var(--ok))]' : 'text-text-muted'}`} style={{ background: sinal === 1 ? 'hsl(var(--ok)/0.12)' : 'hsl(var(--surface-overlay))' }}>+ Aumentar</button>
            <button onClick={() => setSinal(-1)} className={`flex-1 h-9 rounded-lg text-sm transition ${sinal === -1 ? 'text-[hsl(var(--crit))]' : 'text-text-muted'}`} style={{ background: sinal === -1 ? 'hsl(var(--crit)/0.12)' : 'hsl(var(--surface-overlay))' }}>− Reduzir</button>
          </div>
        )}

        <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">Quantidade {item && `(${item.uom})`}</label>
        <input type="number" min={0} step={item?.uom === 'un' ? 1 : 0.1} value={qtd} onChange={e => setQtd(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-full h-11 px-3 rounded-lg bg-black/30 border border-border font-display text-2xl tnum outline-none focus:border-[hsl(var(--gold)/0.5)] mb-4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />

        <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1.5">Motivo (opcional)</label>
        <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="ex.: quebra, contagem, venda balcão…"
          className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--surface-overlay))] border border-border text-sm outline-none focus:border-[hsl(var(--gold)/0.4)] mb-5" />

        <button onClick={registrar} disabled={qtd <= 0}
          className={`w-full h-11 rounded-card font-semibold transition ${qtd > 0 ? 'bg-cta hover:brightness-110' : 'bg-[hsl(var(--surface-overlay))] text-text-muted cursor-not-allowed'}`}>
          Registrar
        </button>
      </div>
    </div>
  )
}
