import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getTasks } from "@/lib/store";
import { Task, STATUS_COLORS, STATUS_LABELS, AREA_COLORS } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, LayoutDashboard, CheckSquare, Columns3, Calendar, Users, FolderKanban, Activity, FileText } from "lucide-react";

const NAV_ITEMS = [
  { path: "/overview", label: "Visão Geral", icon: LayoutDashboard },
  { path: "/tasks", label: "Tarefas", icon: CheckSquare },
  { path: "/kanban", label: "Kanban", icon: Columns3 },
  { path: "/calendar", label: "Calendário", icon: Calendar },
  { path: "/people", label: "Por Pessoa", icon: Users },
  { path: "/areas", label: "Por Área", icon: FolderKanban },
  { path: "/activity", label: "Atividade", icon: Activity },
  { path: "/meetings", label: "Reuniões", icon: FileText },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();

  const tasks = open ? getTasks() : [];
  const q = query.toLowerCase();

  const filteredTasks = q ? tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 8) : [];
  const filteredNav = NAV_ITEMS.filter(n => !q || n.label.toLowerCase().includes(q));
  const allResults = [...filteredNav.map(n => ({ type: "nav" as const, ...n })), ...filteredTasks.map(t => ({ type: "task" as const, task: t }))];

  useEffect(() => { if (open) { setQuery(""); setSelected(0); } }, [open]);

  const handleSelect = useCallback((idx: number) => {
    const item = allResults[idx];
    if (!item) return;
    if (item.type === "nav") {
      navigate(item.path);
    } else {
      navigate(`/tasks?highlight=${item.task.id}`);
    }
    onOpenChange(false);
  }, [allResults, navigate, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); handleSelect(selected); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 bg-card border-border overflow-hidden gap-0" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Buscar tarefas ou navegar..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1.5">
          {filteredNav.length > 0 && (
            <div className="mb-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-2">Navegação</span>
              {filteredNav.map((n, i) => {
                const idx = i;
                return (
                  <button key={n.path} onClick={() => handleSelect(idx)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${selected === idx ? "bg-accent text-gold" : "text-muted-foreground hover:bg-secondary/50"}`}>
                    <n.icon className="w-4 h-4" />
                    <span>{n.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {filteredTasks.length > 0 && (
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-2">Tarefas</span>
              {filteredTasks.map((t, i) => {
                const idx = filteredNav.length + i;
                return (
                  <button key={t.id} onClick={() => handleSelect(idx)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${selected === idx ? "bg-accent text-gold" : "text-foreground hover:bg-secondary/50"}`}>
                    <span className="font-mono text-xs text-gold">#{t.id}</span>
                    <span className="flex-1 truncate text-left">{t.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${STATUS_COLORS[t.status]}15`, color: STATUS_COLORS[t.status] }}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded hidden sm:inline" style={{ backgroundColor: `${AREA_COLORS[t.area] || "#888"}15`, color: AREA_COLORS[t.area] || "#888" }}>
                      {t.area}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {allResults.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">Nenhum resultado</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
