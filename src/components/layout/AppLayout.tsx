import { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CheckSquare, Building2, CalendarDays, Zap,
  LogOut, Menu, X, Search, DollarSign, Package, Megaphone, Bell
} from "lucide-react";
import { getUser, clearUser, getOnlineUsers, updatePresence, getTasks, initRealtime, subscribe } from "@/lib/store";
import { PRIVATE_USERS } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/CommandPalette";
import { LionMark } from "@/components/pro/LionMark";
import { ThemeToggle } from "@/components/pro";

const NAV_ITEMS = [
  { to: "/overview", icon: LayoutDashboard, label: "Visão Geral" },
  { to: "/tasks", icon: CheckSquare, label: "Tarefas", badge: true },
  { to: "/calendar", icon: CalendarDays, label: "Calendário" },
  { to: "/campaigns", icon: Zap, label: "Campanhas" },
  { to: "/content", icon: Megaphone, label: "Conteúdo" },
  { to: "/revendedores", icon: Building2, label: "CRM" },
];

const PAGE_TITLES: Record<string, string> = {
  "/overview": "Visão Geral",
  "/tasks": "Tarefas",
  "/calendar": "Calendário",
  "/campaigns": "Campanhas",
  "/content": "Conteúdo",
  "/revendedores": "CRM",
  "/financeiro": "Financeiro",
  "/estoque": "Estoque",
};

// Ferramentas privadas (só Luca + João) — navegação interna gated
const PRIVATE_TOOLS = [
  { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/estoque", icon: Package, label: "Estoque" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = getUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    if (!userName) { navigate("/"); return; }
    // Initialize Supabase realtime subscriptions
    initRealtime();
    updatePresence(userName);

    const refreshCounts = () => {
      setOnlineUsers(getOnlineUsers());
      const tasks = getTasks();
      setPendingCount(tasks.filter(t => t.status === "pendente").length);
      setLateCount(tasks.filter(t => t.status === "atrasada").length);
    };

    const interval = setInterval(() => {
      updatePresence(userName);
      refreshCounts();
    }, 5000);
    refreshCounts();

    // Subscribe to realtime data changes from other users
    const unsub = subscribe(refreshCounts);

    return () => { clearInterval(interval); unsub(); };
  }, [userName, navigate]);

  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || "MR. LION HUB";
    document.title = `${title} | MR. LION HUB`;
  }, [location.pathname]);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => { clearUser(); navigate("/"); };

  if (!userName) return null;
  const initial = userName.charAt(0).toUpperCase();
  const isPrivate = (PRIVATE_USERS as readonly string[]).includes(userName);
  const pageTitle = PAGE_TITLES[location.pathname] || "Mr. Lion Hub";

  const navItem = (to: string, Icon: React.ElementType, label: string, opts?: { badge?: boolean }) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) => cn(
        "group relative flex items-center gap-2.5 rounded-btn px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent text-gold font-medium"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      )}
    >
      {({ isActive }) => (
        <>
          {/* Barra de realce gold do item ativo */}
          <span
            className={cn(
              "absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full bg-gold transition-all",
              isActive ? "w-[3px] opacity-100" : "w-0 opacity-0"
            )}
            aria-hidden
          />
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
          {opts?.badge && pendingCount > 0 && (
            <span className="tnum ml-auto rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">{pendingCount}</span>
          )}
          {opts?.badge && lateCount > 0 && (
            <span className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-danger" />
          )}
        </>
      )}
    </NavLink>
  );

  const navGroupLabel = (txt: string) => (
    <div className="px-5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">{txt}</div>
  );

  const sidebarContent = (
    <>
      {/* Wordmark */}
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <LionMark className="h-9 w-9 rounded-sub border border-border" />
          <div className="leading-tight">
            <span className="font-display text-base text-gold">Mr. Lion</span>
            <span className="ml-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Hub</span>
          </div>
        </div>
      </div>

      {/* Usuário */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2.5 rounded-sub bg-secondary/40 px-2.5 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-gold">{initial}</div>
          <span className="truncate text-sm font-medium text-foreground">{userName}</span>
        </div>
      </div>

      {/* Busca (pill) */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setCmdOpen(true)}
          className="flex w-full items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-gold/30 hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-[9px]">⌘K</kbd>
        </button>
      </div>

      {/* Nav: Principal */}
      {navGroupLabel("Principal")}
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map(item => navItem(item.to, item.icon, item.label, { badge: item.badge }))}
      </nav>

      {/* Nav: Financeiro & Operação (gated) */}
      {isPrivate && (
        <>
          {navGroupLabel("Financeiro & Operação")}
          <nav className="space-y-0.5 px-3">
            {PRIVATE_TOOLS.map(t => (
              <Link
                key={t.to}
                to={t.to}
                onClick={() => setMobileOpen(false)}
                className="group relative flex items-center gap-2.5 rounded-btn px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
              >
                <t.icon className="h-4 w-4 shrink-0" />
                <span>{t.label}</span>
                <span className="ml-auto rounded-full border border-gold/30 bg-gold/[0.12] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-gold">Privado</span>
              </Link>
            ))}
          </nav>
        </>
      )}

      {/* Rodapé: presença + logout */}
      <div className="mt-auto space-y-2 px-4 pb-4 pt-3">
        <div className="flex items-center gap-2 rounded-sub border border-border bg-card px-2.5 py-2">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="tnum text-xs text-muted-foreground">{onlineUsers.length} online</span>
          <div className="ml-auto flex -space-x-1">
            {onlineUsers.slice(0, 4).map(u => (
              <div key={u} className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-secondary text-[9px] font-bold text-gold">{u.charAt(0)}</div>
            ))}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-4 w-4" /><span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar md:flex">
        {sidebarContent}
      </aside>

      {/* Topbar mobile */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center border-b border-border bg-card/90 px-4 backdrop-blur-sm md:hidden">
        <button onClick={() => setMobileOpen(true)} className="p-1"><Menu className="h-5 w-5 text-foreground" /></button>
        <span className="ml-3 font-display text-base text-gold">Mr. Lion <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Hub</span></span>
      </div>

      {/* Drawer mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/70 md:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed inset-y-0 left-0 z-[100] flex w-60 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar md:hidden">
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <div className="flex min-h-screen flex-1 flex-col pt-12 md:ml-60 md:pt-0">
        {/* Header desktop */}
        <header className="sticky top-0 z-30 hidden items-center gap-3 border-b border-border bg-background/80 px-6 py-3 backdrop-blur-md md:flex">
          <h2 className="text-sm font-semibold text-foreground">{pageTitle}</h2>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Notificações"
              className="relative grid h-9 w-9 place-items-center rounded-btn border border-border bg-card text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
            >
              <Bell className="h-4 w-4" />
              {lateCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
              )}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-sm font-bold text-gold" title={userName}>
              {initial}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mx-auto max-w-[1400px] p-4 md:p-6">
            {children}
          </motion.div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
