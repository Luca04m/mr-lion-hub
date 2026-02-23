import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CheckSquare, FileText, Building2,
  LogOut, Menu, X
} from "lucide-react";
import { getUser, clearUser, getOnlineUsers, updatePresence, getTasks } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { CommandPalette } from "@/components/CommandPalette";

const NAV_ITEMS = [
  { to: "/overview", icon: LayoutDashboard, label: "Visão Geral" },
  { to: "/tasks", icon: CheckSquare, label: "Tarefas", badge: true },
  { to: "/meetings", icon: FileText, label: "Reuniões" },
  { to: "/revendedores", icon: Building2, label: "Revendedores" },
];

const PAGE_TITLES: Record<string, string> = {
  "/overview": "Visão Geral",
  "/tasks": "Tarefas",
  "/meetings": "Reuniões",
  "/revendedores": "Revendedores",
};

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
    updatePresence(userName);
    const interval = setInterval(() => {
      updatePresence(userName);
      setOnlineUsers(getOnlineUsers());
      const tasks = getTasks();
      setPendingCount(tasks.filter(t => t.status === "pendente").length);
      setLateCount(tasks.filter(t => t.status === "atrasada").length);
    }, 5000);
    setOnlineUsers(getOnlineUsers());
    const tasks = getTasks();
    setPendingCount(tasks.filter(t => t.status === "pendente").length);
    setLateCount(tasks.filter(t => t.status === "atrasada").length);
    return () => clearInterval(interval);
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

  const sidebarContent = (
    <>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md gradient-gold flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">🦁</span>
          </div>
          <div>
            <span className="font-bold text-gold tracking-wide">MR. LION</span>
            <span className="text-muted-foreground ml-1.5 text-sm">HUB</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md bg-secondary/40">
          <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground">{initial}</div>
          <span className="text-sm font-medium text-foreground truncate">{userName}</span>
        </div>
      </div>

      <div className="px-4 pb-3">
        <button onClick={() => setCmdOpen(true)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground border border-border hover:border-gold/30 hover:text-foreground transition-all">
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="text-[9px] bg-secondary px-1 py-0.5 rounded font-mono">⌘K</kbd>
        </button>
      </div>

      <Separator className="mx-4 mb-2" />

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors relative",
              isActive ? "bg-accent text-gold font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
            {item.badge && pendingCount > 0 && (
              <span className="ml-auto text-[10px] font-mono font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
            {item.badge && lateCount > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive online-pulse" />
            )}
          </NavLink>
        ))}
      </nav>

      <Separator className="mx-4 mt-2 mb-2" />

      <div className="px-4 pb-4 mt-auto space-y-3">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 online-pulse" />
          <span className="text-xs text-muted-foreground">{onlineUsers.length} online</span>
          <div className="flex -space-x-1 ml-auto">
            {onlineUsers.slice(0, 4).map(u => (
              <div key={u} className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-gold">{u.charAt(0)}</div>
            ))}
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors w-full">
          <LogOut className="w-4 h-4" /><span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background grid-pattern">
      <aside className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0 bg-sidebar-background border-r border-sidebar-border z-40">{sidebarContent}</aside>

      <div className="md:hidden fixed top-0 inset-x-0 h-12 bg-card/90 backdrop-blur-sm border-b border-border z-50 flex items-center px-4">
        <button onClick={() => setMobileOpen(true)} className="p-1"><Menu className="w-5 h-5 text-foreground" /></button>
        <span className="ml-3 font-bold text-gold text-sm">MR. LION <span className="text-muted-foreground font-normal">HUB</span></span>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed inset-y-0 left-0 w-60 bg-sidebar-background border-r border-sidebar-border z-50 flex flex-col md:hidden">
              <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 md:ml-60 pt-12 md:pt-0 min-h-screen">
        <motion.div key={location.pathname} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="p-4 md:p-6 max-w-[1400px] mx-auto">
          {children}
        </motion.div>
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
