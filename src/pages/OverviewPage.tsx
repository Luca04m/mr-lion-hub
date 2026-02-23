import { useState, useEffect, useCallback } from "react";
import { getTasks, getActivities } from "@/lib/store";
import { getUser } from "@/lib/store";
import { Task, TaskStatus, TEAM_MEMBERS, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListChecks, Clock, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatDistanceToNow } from "date-fns";

const OverviewPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ReturnType<typeof getActivities>>([]);
  const userName = getUser();

  useEffect(() => {
    setTasks(getTasks());
    setActivities(getActivities());
  }, []);

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const total = tasks.length;
  const byStatus = (s: TaskStatus) => tasks.filter(t => t.status === s).length;
  const donePercent = total > 0 ? Math.round((byStatus("concluida") / total) * 100) : 0;

  const kpis = [
    { label: "Total", value: total, icon: ListChecks, color: "hsl(var(--gold))" },
    { label: "Pendentes", value: byStatus("pendente"), icon: Clock, color: STATUS_COLORS.pendente },
    { label: "Em Andamento", value: byStatus("em-andamento"), icon: Zap, color: STATUS_COLORS["em-andamento"] },
    { label: "Concluídas", value: byStatus("concluida"), icon: CheckCircle2, color: STATUS_COLORS.concluida },
    { label: "Atrasadas", value: byStatus("atrasada"), icon: AlertTriangle, color: STATUS_COLORS.atrasada },
  ];

  const barData = [
    { name: "Pendente", value: byStatus("pendente"), fill: STATUS_COLORS.pendente },
    { name: "Em Andamento", value: byStatus("em-andamento"), fill: STATUS_COLORS["em-andamento"] },
    { name: "Concluída", value: byStatus("concluida"), fill: STATUS_COLORS.concluida },
    { name: "Atrasada", value: byStatus("atrasada"), fill: STATUS_COLORS.atrasada },
  ];

  const pieData = [
    { name: "Alta", value: tasks.filter(t => t.priority === "alta").length, fill: PRIORITY_COLORS.alta },
    { name: "Média", value: tasks.filter(t => t.priority === "media").length, fill: PRIORITY_COLORS.media },
    { name: "Baixa", value: tasks.filter(t => t.priority === "baixa").length, fill: PRIORITY_COLORS.baixa },
  ].filter(d => d.value > 0);

  const lateTasks = tasks.filter(t => t.status === "atrasada");
  const recentActivities = activities.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
        <p className="text-sm text-gold mt-1">{greeting}, {userName}!</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card rounded-lg border border-border p-4 hover:-translate-y-0.5 hover:border-gold/30 transition-all" style={{ borderLeftWidth: 3, borderLeftColor: kpi.color }}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <span className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Progresso geral da equipe</span>
          <span className="text-sm font-bold font-mono text-gold">{donePercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
          <div className="h-full rounded-full gradient-gold transition-all duration-500" style={{ width: `${donePercent}%` }} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-3 bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-4">Tarefas por Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 18% 14%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(240 8% 55%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(240 8% 55%)", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 18% 14%)", borderRadius: 6, color: "hsl(240 20% 92%)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="md:col-span-2 bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-4">Por Prioridade</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Legend formatter={(v) => <span style={{ color: "hsl(240 8% 55%)", fontSize: 11 }}>{v}</span>} />
              <Tooltip contentStyle={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 18% 14%)", borderRadius: 6, color: "hsl(240 20% 92%)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Late tasks + Recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3 text-red-400">Tarefas Atrasadas</h3>
          {lateTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa atrasada 🎉</p>
          ) : (
            <div className="space-y-2">
              {lateTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm p-2 rounded bg-red-500/5 border border-red-500/10">
                  <span className="font-mono text-xs text-gold">#{t.id}</span>
                  <span className="flex-1 truncate">{t.title}</span>
                  <div className="flex -space-x-1">
                    {t.responsible.map(r => (
                      <div key={r} className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-gold">{r.charAt(0)}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Atividade Recente</h3>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-gold shrink-0 mt-0.5">{a.userName.charAt(0)}</div>
                  <div className="flex-1">
                    <span className="text-gold font-medium">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">{formatAction(a.action)}</span>{" "}
                    <span className="text-foreground">'{a.taskTitle}'</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                    {formatDistanceToNow(new Date(a.createdAt), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workload by person */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Carga por Pessoa</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TEAM_MEMBERS.map(member => {
            const memberTasks = tasks.filter(t => t.responsible.includes(member));
            const done = memberTasks.filter(t => t.status === "concluida").length;
            const pct = memberTasks.length > 0 ? Math.round((done / memberTasks.length) * 100) : 0;
            const pending = memberTasks.filter(t => t.status === "pendente" || t.status === "atrasada").length;
            return (
              <div key={member} className="bg-card rounded-lg border border-border p-3 hover:-translate-y-0.5 hover:border-gold/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground">{member.charAt(0)}</div>
                  <span className="text-sm font-medium">{member}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden mb-1.5">
                  <div className="h-full rounded-full gradient-gold" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{done}/{memberTasks.length}</span>
                  <span>{pending} pendente{pending !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function formatAction(action: string): string {
  if (action === "task_created") return "criou";
  if (action === "task_deleted") return "excluiu";
  if (action === "status_change") return "alterou status de";
  if (action === "notes_update") return "atualizou notas de";
  if (action.startsWith("field_update")) return "editou";
  return action;
}

export default OverviewPage;
