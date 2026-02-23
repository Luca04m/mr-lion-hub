import { useState, useEffect } from "react";
import { getTasks } from "@/lib/store";
import { Task, TEAM_MEMBERS, STATUS_LABELS, STATUS_COLORS, TaskStatus } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PeoplePage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => { setTasks(getTasks()); }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Por Pessoa</h1>
      <Tabs defaultValue={TEAM_MEMBERS[0]}>
        <TabsList className="bg-secondary/40 mb-4 flex-wrap h-auto gap-1">
          {TEAM_MEMBERS.map(m => (
            <TabsTrigger key={m} value={m} className="data-[state=active]:bg-accent data-[state=active]:text-gold text-xs">
              {m}
            </TabsTrigger>
          ))}
        </TabsList>
        {TEAM_MEMBERS.map(member => {
          const memberTasks = tasks.filter(t => t.responsible.includes(member));
          const done = memberTasks.filter(t => t.status === "concluida").length;
          const pct = memberTasks.length > 0 ? Math.round((done / memberTasks.length) * 100) : 0;
          return (
            <TabsContent key={member} value={member}>
              {/* Profile card */}
              <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-xl font-bold text-primary-foreground">{member.charAt(0)}</div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{member}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{memberTasks.length} tarefas · {pct}% concluído</span>
                    <div className="w-20 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full rounded-full gradient-gold" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(["pendente", "em-andamento", "concluida", "atrasada"] as TaskStatus[]).map(s => (
                    <div key={s} className="text-center">
                      <div className="text-sm font-bold font-mono" style={{ color: STATUS_COLORS[s] }}>
                        {memberTasks.filter(t => t.status === s).length}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{STATUS_LABELS[s].split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task list */}
              <div className="space-y-1">
                {memberTasks.map(t => (
                  <div key={t.id} className="bg-card rounded-lg border border-border px-3 py-2.5 flex items-center gap-2 hover:border-gold/20 transition-all">
                    <span className="font-mono text-xs text-gold">#{t.id}</span>
                    <span className="text-sm flex-1 truncate">{t.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${STATUS_COLORS[t.status]}15`, color: STATUS_COLORS[t.status] }}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                ))}
                {memberTasks.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tarefa atribuída</p>}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default PeoplePage;
