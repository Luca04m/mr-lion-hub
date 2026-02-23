import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getTasks, getRole, setRole, getActivities, createTask, logActivity, getUser } from "@/lib/store";
import { Task, TEAM_MEMBERS, STATUS_LABELS, STATUS_COLORS, TaskStatus } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { TaskFormDialog } from "@/pages/TasksPage";
import { TaskSidePanel } from "@/components/TaskSidePanel";
import { toast } from "sonner";

const PeoplePage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMember, setDialogMember] = useState("");
  const [sidePanelTask, setSidePanelTask] = useState<Task | null>(null);
  const [searchParams] = useSearchParams();
  const defaultMember = searchParams.get("member") || TEAM_MEMBERS[0];
  const userName = getUser() || "";

  const reload = useCallback(() => {
    setTasks(getTasks());
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const handleSave = (data: any) => {
    const t = createTask({
      title: data.title || "", detail: data.detail || "", responsible: data.responsible || [],
      priority: data.priority || "media", area: data.area || "Comercial",
      status: data.status || "pendente", dependencies: [],
      decision: data.decision || null, notes: data.notes || "", dueDate: data.dueDate || null,
      createdBy: userName, isOriginal: false, tags: data.tags || [], attachments: data.attachments || [],
    });
    logActivity({ taskId: t.id, taskTitle: t.title, userName, action: "task_created", oldValue: null, newValue: t.title });
    toast.success("Tarefa criada");
    setDialogOpen(false);
    reload();
  };

  const activities = getActivities();

  if (loading) {
    return (
      <div><Skeleton className="h-8 w-40 mb-4" />
        <div className="grid grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Por Pessoa</h1>
      <Tabs defaultValue={defaultMember}>
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
          const role = getRole(member);

          // Activity heatmap (last 7 days)
          const heatmap = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            const dayStr = d.toISOString().split("T")[0];
            return activities.filter(a => a.userName === member && a.createdAt.startsWith(dayStr)).length;
          });

          return (
            <TabsContent key={member} value={member}>
              <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-xl font-bold text-primary-foreground">{member.charAt(0)}</div>
                <div className="flex-1 min-w-[200px]">
                  <h2 className="text-lg font-bold">{member}</h2>
                  <Input
                    placeholder="Cargo (ex: CEO, Marketing...)"
                    defaultValue={role}
                    onBlur={e => setRole(member, e.target.value)}
                    className="h-6 text-xs bg-transparent border-none p-0 text-muted-foreground focus:text-foreground w-48"
                  />
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
                {/* Mini heatmap */}
                <div className="flex items-center gap-0.5">
                  {heatmap.map((count, i) => (
                    <div key={i} className="w-3 h-3 rounded-sm" style={{
                      backgroundColor: count === 0 ? "hsl(var(--surface-elevated))" : count < 3 ? "hsl(var(--gold) / 0.3)" : "hsl(var(--gold))"
                    }} title={`${count} ações`} />
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" className="mb-3 text-xs gap-1.5"
                onClick={() => { setDialogMember(member); setDialogOpen(true); }}>
                <Plus className="w-3.5 h-3.5" /> Atribuir tarefa a {member}
              </Button>

              <div className="space-y-1">
                {memberTasks.map(t => (
                  <div key={t.id} onClick={() => setSidePanelTask(t)}
                    className="bg-card rounded-lg border border-border px-3 py-2.5 flex items-center gap-2 hover:border-gold/20 transition-all cursor-pointer">
                    <span className="font-mono text-xs text-gold">#{t.id}</span>
                    <span className="text-sm flex-1 truncate">{t.title}</span>
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${STATUS_COLORS[t.status]}40`, color: STATUS_COLORS[t.status] }}>
                      {STATUS_LABELS[t.status]}
                    </Badge>
                  </div>
                ))}
                {memberTasks.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tarefa atribuída</p>}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} defaultResponsible={dialogMember ? [dialogMember] : undefined} />
      <TaskSidePanel task={sidePanelTask} open={!!sidePanelTask} onOpenChange={b => { if (!b) setSidePanelTask(null); }} onUpdate={reload} />
    </div>
  );
};

export default PeoplePage;
