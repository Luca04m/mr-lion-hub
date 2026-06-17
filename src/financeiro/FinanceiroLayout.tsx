// Shell SÓBRIO da área /financeiro DENTRO do Hub.
// NÃO repete sidebar/topbar — o AppLayout (injetado pelo PrivateRoute) já provê
// todo o chrome. Aqui só vivem: cabeçalho da área, sub-nav (Comando/Lucro/Caixa)
// com <NavLink> RR6, o seletor de período GLOBAL (Jan/Fev) e o <Outlet/>.
// O período é compartilhado com as sub-telas via Outlet context (useOutletContext).
import { useEffect } from 'react'
import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
import { LineChart, Coins, Wallet } from 'lucide-react'
import { SegmentedControl } from '@/components/pro/SegmentedControl'
import { useFinanceiroStore } from './data/store'
import type { Periodo } from './data/source'

// ── Contexto de período compartilhado com as sub-telas ──
export interface FinanceiroCtx {
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
}

/** Hook para as sub-telas lerem o período global. */
export function useFinanceiroCtx(): FinanceiroCtx {
  return useOutletContext<FinanceiroCtx>()
}

const NAV: { to: string; label: string; icon: typeof LineChart; end?: boolean }[] = [
  { to: '/financeiro', label: 'Comando', icon: LineChart, end: true },
  { to: '/financeiro/lucro', label: 'Lucro', icon: Coins },
  { to: '/financeiro/caixa', label: 'Caixa', icon: Wallet },
]

export function FinanceiroLayout() {
  // Período GLOBAL — vem do store persistido (sobrevive navegação/reload).
  const periodo = useFinanceiroStore((s) => s.periodo)
  const setPeriodo = useFinanceiroStore((s) => s.setPeriodo)

  useEffect(() => {
    document.title = 'Financeiro | MR. LION HUB'
  }, [])

  return (
    <div className="animate-fade-up">
      {/* ── Cabeçalho da área + seletor de período global ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Casa Mr. Lion · Gestão
          </div>
          <h1 className="mt-0.5 font-display text-2xl text-foreground">Financeiro</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Período</span>
          <SegmentedControl<Periodo>
            value={periodo}
            onChange={setPeriodo}
            options={[
              { label: 'Mai/25', value: 'mai' },
              { label: 'Jan/26', value: 'jan' },
              { label: 'Fev/26', value: 'fev' },
            ]}
          />
        </div>
      </div>

      {/* ── Sub-nav sóbrio (NavLink RR6, padrão SegmentedControl) ── */}
      <div
        role="tablist"
        className="mb-6 inline-flex flex-wrap items-center gap-0.5 rounded-btn border border-border bg-muted/50 p-0.5"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            role="tab"
            className={({ isActive }) =>
              'flex items-center gap-1.5 rounded-sub px-3 py-1.5 text-xs font-medium transition-colors duration-150 ' +
              (isActive
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={14} className={isActive ? 'text-gold' : ''} strokeWidth={1.8} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* ── Sub-tela ativa (recebe o período via Outlet context) ── */}
      <Outlet context={{ periodo, setPeriodo } satisfies FinanceiroCtx} />
    </div>
  )
}

export default FinanceiroLayout
