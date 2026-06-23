// Shell da área /estoque DENTRO do Hub.
// NÃO repete a sidebar/topbar — o AppLayout (injetado pelo PrivateRoute) já
// provê todo o chrome. Aqui só vive o sub-nav das 6 seções + a seção ativa.
// Estado da seção via useState (default = Painel). Reskin sóbrio do Hub.
import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, Boxes, Factory, ShoppingCart, Truck, BarChart3, RotateCcw, RefreshCw,
} from 'lucide-react'
import { useEstoque, type BlingSyncState } from './store'
import { resumoEstoque, fmtBRL } from './engine'

/** Rótulo compacto do estado da última sincronização com o Bling. */
function syncLabel(b: BlingSyncState): string {
  if (b.syncing) return 'sincronizando…'
  if (b.ultimo?.erro) return 'falhou — tentar de novo'
  if (!b.lastSyncAt) return 'nunca'
  const min = Math.floor((Date.now() - new Date(b.lastSyncAt).getTime()) / 60000)
  const quando = min < 1 ? 'agora' : min < 60 ? `há ${min}min` : `há ${Math.floor(min / 60)}h`
  const baixas = b.ultimo?.itensBaixados ?? 0
  return baixas > 0 ? `${quando} · ${baixas} baixa${baixas > 1 ? 's' : ''}` : quando
}
import { Dashboard } from './sections/Dashboard'
import { Estoque } from './sections/Estoque'
import { Producao } from './sections/Producao'
import { Compras } from './sections/Compras'
import { Movimentacoes } from './sections/Movimentacoes'
import { Relatorios } from './sections/Relatorios'

type Secao = 'dashboard' | 'estoque' | 'producao' | 'compras' | 'movimentacoes' | 'relatorios'

const NAV: { id: Secao; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard',     label: 'Painel',         icon: LayoutDashboard },
  { id: 'estoque',       label: 'Estoque',        icon: Boxes },
  { id: 'producao',      label: 'Produção',       icon: Factory },
  { id: 'compras',       label: 'Compras',        icon: ShoppingCart },
  { id: 'movimentacoes', label: 'Movimentações',  icon: Truck },
  { id: 'relatorios',    label: 'Relatórios',     icon: BarChart3 },
]

export function EstoqueLayout() {
  const [secao, setSecao] = useState<Secao>('dashboard')
  const { itens } = useEstoque()
  const resetar = useEstoque(s => s.resetar)
  const blingSync = useEstoque(s => s.blingSync)
  const sincronizarBling = useEstoque(s => s.sincronizarBling)
  const hidratarSupabase = useEstoque(s => s.hidratarSupabase)
  const resumo = useMemo(() => resumoEstoque(itens), [itens])
  const alertas = resumo.repor + resumo.critico

  // Mantém o título da aba alinhado com a seção ativa (AppLayout cuida do header).
  useEffect(() => {
    const label = NAV.find(n => n.id === secao)?.label ?? 'Estoque'
    document.title = `${label} · Estoque | MR. LION HUB`
  }, [secao])

  // Ao abrir: hidrata os saldos do Supabase (fonte de verdade — baixa via WooCommerce
  // a cada pedido pago). O botão "Sincronizar Bling" segue disponível como apoio manual.
  useEffect(() => {
    void hidratarSupabase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="animate-fade-up">
      {/* ── Cabeçalho da área + sub-nav das 6 seções ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Casa Mr. Lion · Operação
          </div>
          <h1 className="mt-0.5 font-display text-2xl text-foreground">Estoque & Produção</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="tnum text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor em estoque</div>
            <div className="font-display text-base text-foreground">{fmtBRL(resumo.valorTotal)}</div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bling</div>
            <div className={'text-[11px] ' + (blingSync.ultimo?.erro ? 'text-warning' : 'text-muted-foreground')}>
              {syncLabel(blingSync)}
            </div>
          </div>
          <button
            onClick={() => void sincronizarBling()}
            disabled={blingSync.syncing}
            title={blingSync.ultimo?.erro ? `Erro: ${blingSync.ultimo.erro}` : 'Puxar pedidos do Bling e dar baixa no estoque'}
            className="flex h-9 items-center gap-1.5 rounded-btn border border-border bg-card px-3 text-xs text-muted-foreground shadow-soft transition-colors hover:border-gold/30 hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw size={13} className={blingSync.syncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{blingSync.syncing ? 'Sincronizando…' : 'Sincronizar Bling'}</span>
          </button>
          <button
            onClick={resetar}
            title="Restaurar dados de exemplo"
            className="flex h-9 items-center gap-1.5 rounded-btn border border-border bg-card px-3 text-xs text-muted-foreground shadow-soft transition-colors hover:border-gold/30 hover:text-foreground"
          >
            <RotateCcw size={13} /> <span className="hidden sm:inline">Restaurar</span>
          </button>
        </div>
      </div>

      {/* Sub-nav sóbrio (tabs no padrão SegmentedControl, com ícones + badge de alerta). */}
      <div
        role="tablist"
        className="mb-6 flex flex-wrap items-center gap-0.5 rounded-btn border border-border bg-muted/50 p-0.5"
      >
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = secao === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSecao(id)}
              className={
                'flex items-center gap-1.5 rounded-sub px-3 py-1.5 text-xs font-medium transition-colors duration-150 ' +
                (active
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              <Icon size={14} className={active ? 'text-gold' : ''} strokeWidth={1.8} />
              <span>{label}</span>
              {id === 'estoque' && alertas > 0 && (
                <span className="tnum ml-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                  {alertas}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Seção ativa ── */}
      {secao === 'dashboard' && <Dashboard goto={setSecao} />}
      {secao === 'estoque' && <Estoque />}
      {secao === 'producao' && <Producao />}
      {secao === 'compras' && <Compras />}
      {secao === 'movimentacoes' && <Movimentacoes />}
      {secao === 'relatorios' && <Relatorios />}
    </div>
  )
}

export default EstoqueLayout
