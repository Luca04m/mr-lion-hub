import { useState, useEffect } from "react";
import { getTasks } from "@/lib/store";
import { Task, AREAS, AREA_COLORS, STATUS_LABELS, STATUS_COLORS, TaskStatus } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

const AreasPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  useEffect(() => { setTasks(getTasks()); }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Por Área</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AREAS.map(area => {
          const areaTasks = tasks.filter(t => t.area === area);
          const done = areaTasks.filter(t => t.status === "concluida").length;
          const pct = areaTasks.length > 0 ? Math.round((done / areaTasks.length) * 100) : 0;
          const color = AREA_COLORS[area] || "#888";
          const expanded = expandedArea === area;

          return (
            <div key={area} className="bg-card rounded-lg border border-border hover:border-gold/20 transition-all overflow-hidden">
              <button className="w-full text-left p-3" onClick={() => setExpandedArea(expanded ? null : area)}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold flex-1">{area}</span>
                  <span className="text-xs font-mono text-muted-foreground">{areaTasks.length}</span>
                  {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <div className="flex gap-1.5">
                  {(["pendente", "em-andamento", "concluida", "atrasada"] as TaskStatus[]).map(s => {
                    const count = areaTasks.filter(t => t.status === s).length;
                    if (count === 0) return null;
                    return (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: `${STATUS_COLORS[s]}15`, color: STATUS_COLORS[s] }}>
                        {count} {STATUS_LABELS[s].split(" ")[0].toLowerCase()}
                      </span>
                    );
                  })}
                </div>
              </button>

              <AnimatePresence>
                {expanded && areaTasks.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-border px-3 py-2 space-y-1">
                      {areaTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2 py-1 text-xs">
                          <span className="font-mono text-gold">#{t.id}</span>
                          <span className="flex-1 truncate">{t.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: `${STATUS_COLORS[t.status]}15`, color: STATUS_COLORS[t.status] }}>
                            {STATUS_LABELS[t.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AreasPage;
