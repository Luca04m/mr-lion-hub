import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getTasks, getActivities, getRevendedores, getMeetings, getPosts, exportTasksMarkdown, getUser } from "@/lib/store";
import {
  Task, TaskStatus, STATUS_LABELS,
  Revendedor, RevendedorStatus,
  Meeting, ContentPost, CONTENT_STATUS_LABELS, ContentStatus,
} from "@/lib/types";
import { format, formatDistanceToNow, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, Download,
  CheckCircle2, AlertTriangle, Clock, Zap, Calendar, Building2,
  Megaphone, AlertCircle, ChevronRight, Activity as ActivityIcon,
  Plus, Trash2, RefreshCw, UserPlus, Edit2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
} from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
// (Button/Badge substituídos por CTA sólido neutro .bg-cta + StatusPill do design system pro)
import { useRealtime } from "@/hooks/use-realtime";
import { MetricCard, StatusPill, type StatusTone } from "@/components/pro";

// ─── Activity action config ───────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: (t: string) => string }> = {
  task_created:        { icon: Plus,     color: "hsl(var(--success))", label: t => `criou "${t}"` },
  task_deleted:        { icon: Trash2,   color: "hsl(var(--danger))",  label: t => `excluiu "${t}"` },
  status_change:       { icon: RefreshCw,color: "hsl(var(--info))",    label: t => `alterou status de "${t}"` },
  revendedor_created:  { icon: UserPlus, color: "hsl(var(--gold))", label: t => `cadastrou revendedor "${t}"` },
  revendedor_deleted:  { icon: Trash2,   color: "hsl(var(--danger))",  label: t => `removeu revendedor "${t}"` },
};
const ACTION_DEFAULT = { icon: Edit2, color: "hsl(var(--gold))", label: (t: string) => `editou "${t}"` };

// ─── CRM status → StatusPill tone ───────────────────────────────────────────────
const CRM_TONE: Record<RevendedorStatus, StatusTone> = {
  "Ativo": "success",
  "Recorrente": "gold",
  "Em Negociação": "warning",
  "Novo Lead": "info",
  "Inativo": "neutral",
};

// ─── Task status → StatusPill tone ───────────────────────────────────────────────
const TASK_TONE: Record<TaskStatus, StatusTone> = {
  pendente: "neutral",
  "em-andamento": "info",
  concluida: "success",
  atrasada: "danger",
};

// ─── Content status → StatusPill tone ────────────────────────────────────────────
const CONTENT_TONE: Record<ContentStatus, StatusTone> = {
  rascunho: "neutral",
  aprovado: "info",
  agendado: "warning",
  publicado: "success",
};

// ─── Plataforma → cor SÓBRIA do ponto (sem brand-neon: Instagram/YouTube/etc.) ───
// Override local de PLATFORM_COLORS (vibrante) por tokens dessaturados.
const PLATFORM_DOT: Record<string, string> = {
  Instagram: "hsl(var(--gold))",
  YouTube: "hsl(var(--danger))",
  TikTok: "hsl(var(--info))",
  Twitter: "hsl(var(--info))",
};
const platformDot = (p: string) => PLATFORM_DOT[p] ?? "hsl(var(--muted-foreground))";

// ─── Animation variants (fade-in discreto, sem stagger exagerado) ──────────────
const fadeUp = { hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.03 } } };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 6, color: "hsl(var(--foreground))", fontSize: 12,
};

function fmtDate(dateStr: string) {
  try { return format(new Date(dateStr + "T12:00:00"), "d MMM", { locale: ptBR }); }
  catch { return dateStr.slice(5); }
}

/** Conta itens por dia nos últimos `days` dias (série pronta p/ Sparkline/AreaChart). */
function dailyCounts(timestamps: string[], days: number) {
  const buckets: { key: string; label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(new Date(), i);
    buckets.push({ key: format(d, "yyyy-MM-dd"), label: format(d, "d/MM"), value: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const ts of timestamps) {
    try {
      const key = format(new Date(ts), "yyyy-MM-dd");
      const i = idx.get(key);
      if (i !== undefined) buckets[i].value += 1;
    } catch { /* ignore bad date */ }
  }
  return buckets;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
// Header de seção com ícone tintado (bg cor/15 + ícone na cor) — flat, sem chapado
function SectionTitle({ icon: Icon, title, color = "hsl(var(--gold))", action, onAction }: {
  icon: React.ElementType; title: string; color?: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-sub"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </span>
        {title}
      </h2>
      {action && onAction && (
        <button
          onClick={onAction}
          className="group flex items-center gap-0.5 rounded-btn px-1 py-0.5 text-[11px] text-muted-foreground outline-none transition-colors hover:text-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
        >
          {action}
          <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

// Empty-state que ENSINA — ícone neutro + frase orientadora + ação opcional.
function EmptyState({ icon: Icon, message, action, onAction }: {
  icon: React.ElementType; message: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-sub border border-dashed border-border/60 py-6 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="max-w-[34ch] text-xs text-muted-foreground">{message}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-0.5 inline-flex items-center gap-1 rounded-btn px-2 py-1 text-[11px] font-medium text-gold outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {action}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const OverviewPage = () => {
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [activities,   setActivities]   = useState<ReturnType<typeof getActivities>>([]);
  const [revs,         setRevs]         = useState<Revendedor[]>([]);
  const [meetings,     setMeetings]     = useState<Meeting[]>([]);
  const [contentPosts, setContentPosts] = useState<ContentPost[]>([]);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const userName = getUser();
  const navigate = useNavigate();

  const reload = () => {
    setTasks(getTasks());
    setActivities(getActivities());
    setRevs(getRevendedores());
    setMeetings(getMeetings());
    setContentPosts(getPosts());
  };
  useEffect(() => { reload(); }, []);
  useRealtime(reload);

  const todayStr    = format(new Date(), "yyyy-MM-dd");
  const today       = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const greeting    = (() => { const h = new Date().getHours(); if (h < 12) return "Bom dia"; if (h < 18) return "Boa tarde"; return "Boa noite"; })();
  const threeDays   = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const thisWeekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

  // Task stats
  const total      = tasks.length;
  const byStatus   = (s: TaskStatus) => tasks.filter(t => t.status === s).length;
  const doneCount  = byStatus("concluida");
  const lateCount  = byStatus("atrasada");
  const donePct    = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Today data
  const todayMeetings = meetings.filter(m => m.meetingDate === todayStr);
  const upcomingTasks = tasks
    .filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= threeDays && t.status !== "concluida")
    .slice(0, 5);
  const lateTasks = tasks.filter(t => t.status === "atrasada").slice(0, 4);
  const upcomingPosts = contentPosts
    .filter(p => p.scheduledDate >= todayStr && p.scheduledDate <= thisWeekEnd && p.status !== "publicado")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 5);

  // ── Séries reais (14 dias) — derivadas do store, NÃO inventadas ──────────────
  const activitySeries = dailyCounts(activities.map(a => a.createdAt), 14);
  const doneSeries = dailyCounts(
    tasks.filter(t => t.status === "concluida").map(t => t.updatedAt),
    14,
  );
  const activitySpark = activitySeries.map(b => b.value);
  const doneSpark = doneSeries.map(b => b.value);
  const activityTotal14 = activitySpark.reduce((s, v) => s + v, 0);
  const donePrev7 = doneSpark.slice(0, 7).reduce((s, v) => s + v, 0);
  const doneLast7 = doneSpark.slice(7).reduce((s, v) => s + v, 0);
  const doneDelta = (() => {
    if (donePrev7 === 0) return doneLast7 > 0 ? { value: "novo", direction: "up" as const } : undefined;
    const pct = Math.round(((doneLast7 - donePrev7) / donePrev7) * 100);
    return { value: `${pct >= 0 ? "+" : ""}${pct}%`, direction: pct > 0 ? "up" as const : pct < 0 ? "down" as const : "flat" as const };
  })();

  // CRM
  const crmByStatus = (s: RevendedorStatus) => revs.filter(r => r.status === s).length;
  const topRevs     = [...revs].sort((a, b) => b.volume - a.volume).slice(0, 5);
  const crmBarData  = topRevs.map(r => ({
    name: r.nome.length > 14 ? r.nome.slice(0, 14) + "…" : r.nome,
    value: r.volume,
  }));

  // Pipeline funnel data (warm coerente)
  const pipeline = [
    { label: "Novo Lead",      value: crmByStatus("Novo Lead"),     color: "hsl(var(--info))" },
    { label: "Em Negociação",  value: crmByStatus("Em Negociação"), color: "hsl(var(--warning))" },
    { label: "Ativo",          value: crmByStatus("Ativo"),         color: "hsl(var(--success))" },
    { label: "Recorrente",     value: crmByStatus("Recorrente"),    color: "hsl(var(--gold))" },
  ];
  const pipelineMax = Math.max(...pipeline.map(p => p.value), 1);

  // Donut tarefas — paleta sóbria (neutro + status dessaturados)
  const TASK_DONUT_COLORS: Record<TaskStatus, string> = {
    pendente: "hsl(var(--muted-foreground))",
    "em-andamento": "hsl(var(--info))",
    concluida: "hsl(var(--success))",
    atrasada: "hsl(var(--danger))",
  };
  const pieData = [
    { name: "pendente",     value: byStatus("pendente") },
    { name: "em-andamento", value: byStatus("em-andamento") },
    { name: "concluida",    value: doneCount },
    { name: "atrasada",     value: lateCount },
  ].filter(d => d.value > 0).map(d => ({ ...d, fill: TASK_DONUT_COLORS[d.name as TaskStatus] }));

  const handleExport = () => {
    navigator.clipboard.writeText(exportTasksMarkdown());
    toast.success("Tarefas exportadas para o clipboard ✓");
  };

  const showAlert = !alertDismissed && lateCount > 0;
  const donePctColor = donePct >= 70 ? "hsl(var(--success))" : donePct >= 40 ? "hsl(var(--warning))" : "hsl(var(--danger))";

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sub border border-border bg-secondary text-lg font-bold text-gold">
            {userName?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{greeting}, {userName}!</h1>
            <p className="text-[11px] capitalize text-muted-foreground">{today}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="bg-cta inline-flex items-center gap-2 self-start rounded-btn px-4 py-2.5 text-sm font-semibold shadow-soft outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Exportar tarefas
        </button>
      </motion.div>

      {/* ══ ALERT BANNER ════════════════════════════════════════════════════ */}
      {showAlert && (
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 rounded-card border border-danger/30 bg-danger/[0.08] px-4 py-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sub bg-danger/15">
            <AlertCircle className="h-4 w-4 text-danger" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">
              <span className="tnum">{lateCount}</span> {lateCount === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Atenção imediata necessária</p>
          </div>
          <button
            onClick={() => navigate("/tasks")}
            className="shrink-0 rounded-btn border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger outline-none transition-colors hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ver tarefas
          </button>
          <button
            onClick={() => setAlertDismissed(true)}
            aria-label="Dispensar alerta"
            className="shrink-0 rounded-btn p-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* ══ LINHA HERO — 4 MetricCards (dados REAIS, clicáveis via teclado) ══ */}
      <motion.div variants={stagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.div variants={fadeUp} className="h-full">
          <MetricCard
            label="Tarefas atrasadas"
            value={String(lateCount)}
            accent={lateCount > 0 ? "cta" : "success"}
            icon={<AlertTriangle className="h-4 w-4" />}
            delta={lateCount > 0 ? { value: "requer ação", direction: "down" } : { value: "tudo em dia", direction: "flat" }}
            onClick={() => navigate("/tasks")}
            ariaLabel={`${lateCount} tarefas atrasadas. Abrir tarefas`}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="h-full">
          <MetricCard
            label="% Concluído"
            value={`${donePct}%`}
            accent="success"
            icon={<CheckCircle2 className="h-4 w-4" />}
            sparkline={doneSpark}
            delta={doneDelta}
            onClick={() => navigate("/tasks")}
            ariaLabel={`${donePct}% das tarefas concluídas. Abrir tarefas`}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="h-full">
          <MetricCard
            label="Reuniões hoje"
            value={String(todayMeetings.length)}
            accent="gold"
            icon={<Calendar className="h-4 w-4" />}
            delta={todayMeetings.length > 0 ? { value: todayMeetings[0].hora || "agendada", direction: "flat" } : undefined}
            onClick={() => navigate("/calendar")}
            ariaLabel={`${todayMeetings.length} reuniões hoje. Abrir calendário`}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="h-full">
          <MetricCard
            label="Atividade (14d)"
            value={String(activityTotal14)}
            accent="gold"
            icon={<ActivityIcon className="h-4 w-4" />}
            sparkline={activitySpark}
            onClick={() => navigate("/calendar")}
            ariaLabel={`${activityTotal14} ações nos últimos 14 dias. Abrir calendário`}
          />
        </motion.div>
      </motion.div>

      {/* ══ ATALHO FINANCEIRO ══════════════════════════════════════════════ */}
      <motion.button
        variants={fadeUp}
        type="button"
        onClick={() => navigate("/financeiro")}
        className="group flex w-full items-center gap-3 rounded-card border border-border bg-card p-4 text-left shadow-soft outline-none transition-colors hover:border-gold/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sub bg-gold/[0.12]">
          <DollarSign className="h-4 w-4 text-gold" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Financeiro</p>
          <p className="text-[11px] text-muted-foreground">DRE, contas a pagar e receber por período</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </motion.button>

      {/* ══ CRM ══════════════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="rounded-card border border-border bg-card p-4 shadow-soft">
        <SectionTitle icon={Building2} title="CRM" color="hsl(var(--info))" action="Ver todos" onAction={() => navigate("/revendedores")} />

        {/* Pipeline funnel */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pipeline.map((stage, i) => (
            <div key={stage.label} className="relative">
              <div className="rounded-sub bg-muted/40 p-2.5 text-center">
                <span className="tnum block text-xl font-bold" style={{ color: stage.color }}>{stage.value}</span>
                <span className="mt-0.5 block leading-tight text-[9px] text-muted-foreground">{stage.label}</span>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(stage.value / pipelineMax) * 100}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
              {i < pipeline.length - 1 && (
                <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2 text-xs text-muted-foreground/40">›</div>
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Table */}
          {topRevs.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[280px]">
                <div className="mb-1.5 grid grid-cols-4 gap-1 px-1 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  <span className="col-span-1">Nome</span>
                  <span>Resp.</span>
                  <span className="text-right">Vol.</span>
                  <span className="text-right">Status</span>
                </div>
                {topRevs.map(r => (
                  <div key={r.id} className="grid grid-cols-4 gap-1 rounded border-t border-border/30 px-1 py-1.5 text-xs transition-colors hover:bg-muted/30">
                    <span className="truncate font-medium">{r.nome}</span>
                    <span className="truncate text-muted-foreground">{r.responsavel}</span>
                    <span className="tnum text-right">{r.volume}</span>
                    <span className="flex justify-end">
                      <StatusPill label={r.status} tone={CRM_TONE[r.status]} dot={false} className="px-1.5 py-0 text-[9px]" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={Building2} message="Nenhum revendedor cadastrado ainda. Adicione o primeiro para acompanhar o pipeline." action="Abrir CRM" onAction={() => navigate("/revendedores")} />
          )}
          {/* Bar chart */}
          {crmBarData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={crmBarData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} width={100} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Bar dataKey="value" fill="hsl(var(--gold))" radius={[0, 4, 4, 0]} fillOpacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ══ OPERAÇÃO — 2 colunas ═════════════════════════════════════════════ */}
      <motion.div variants={stagger} className="grid gap-4 md:grid-cols-2">

        {/* Coluna A */}
        <div className="space-y-4">

          {/* Tarefas */}
          <motion.div variants={fadeUp} className="rounded-card border border-border bg-card p-4 shadow-soft">
            <SectionTitle icon={CheckCircle2} title="Tarefas" action="Ver todas" onAction={() => navigate("/tasks")} />
            <div className="mb-4 grid grid-cols-3 gap-1 text-center sm:grid-cols-5">
              {[
                { label: "Total",    value: total,                   color: "hsl(var(--gold))" },
                { label: "Pend.",    value: byStatus("pendente"),    color: TASK_DONUT_COLORS.pendente },
                { label: "Andando",  value: byStatus("em-andamento"),color: TASK_DONUT_COLORS["em-andamento"] },
                { label: "Concl.",   value: doneCount,               color: TASK_DONUT_COLORS.concluida },
                { label: "Atrasada", value: lateCount,               color: TASK_DONUT_COLORS.atrasada },
              ].map(s => (
                <div key={s.label} className="rounded-sub bg-muted/30 py-2">
                  <span className="tnum block leading-none text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
                  <span className="mt-0.5 block text-[8px] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            {/* Donut com center text via CSS overlay */}
            <div className="relative">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} strokeWidth={0} />)}
                  </Pie>
                  <RTooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, STATUS_LABELS[n as TaskStatus] ?? n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="tnum text-2xl font-bold" style={{ color: donePctColor }}>
                    {donePct}%
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">concluído</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Atrasadas */}
          <motion.div variants={fadeUp} className="rounded-card border border-border bg-card p-4 shadow-soft">
            <SectionTitle icon={AlertTriangle} title="Tarefas Atrasadas" color="hsl(var(--danger))" />
            {lateTasks.length === 0 ? (
              <div className="flex items-center justify-center gap-3 py-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-sub bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-success">Tudo em dia!</p>
                  <p className="text-xs text-muted-foreground">Nenhuma tarefa atrasada</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {lateTasks.map(t => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => navigate(`/tasks?highlight=${t.id}`)}
                    aria-label={`Tarefa atrasada ${t.title}. Abrir nas tarefas`}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sub border border-danger/10 bg-danger/[0.05] p-2 text-left text-xs outline-none transition-all hover:border-danger/30 hover:bg-danger/[0.08] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
                  >
                    <span className="tnum shrink-0 text-[10px] text-gold">#{t.id}</span>
                    <span className="flex-1 truncate font-medium">{t.title}</span>
                    <span className="shrink-0 text-[9px] text-muted-foreground">{t.responsible.join(", ")}</span>
                    <StatusPill label="Atrasada" tone="danger" dot={false} className="shrink-0 px-1.5 py-0 text-[8px]" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Coluna B */}
        <div className="space-y-4">

          {/* Reuniões */}
          <motion.div variants={fadeUp} className="rounded-card border border-border bg-card p-4 shadow-soft">
            <SectionTitle icon={Calendar} title="Reuniões de hoje" action="Ver reuniões" onAction={() => navigate("/calendar")} />
            {todayMeetings.length === 0 ? (
              <EmptyState icon={Calendar} message="Nenhuma reunião hoje. Agende encontros no calendário para vê-los aqui." action="Abrir calendário" onAction={() => navigate("/calendar")} />
            ) : (
              <div className="space-y-1.5">
                {todayMeetings.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 rounded-sub border border-gold/10 bg-gold/[0.05] p-2.5 text-xs">
                    <div className="h-6 w-1 shrink-0 rounded-full bg-gold" />
                    <span className="tnum shrink-0 text-[11px] text-gold">{m.hora || "·"}</span>
                    <span className="flex-1 truncate font-medium">{m.title}</span>
                    {m.tipo && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{m.tipo}</span>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Próximas entregas */}
          <motion.div variants={fadeUp} className="rounded-card border border-border bg-card p-4 shadow-soft">
            <SectionTitle icon={Clock} title="Próximas entregas" color="hsl(var(--warning))" action="Ver tarefas" onAction={() => navigate("/tasks")} />
            {upcomingTasks.length === 0 ? (
              <EmptyState icon={Clock} message="Nenhuma entrega nos próximos 3 dias. Defina prazos nas tarefas para planejar a semana." action="Abrir tarefas" onAction={() => navigate("/tasks")} />
            ) : (
              <div className="space-y-1.5">
                {upcomingTasks.map(t => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => navigate(`/tasks?highlight=${t.id}`)}
                    aria-label={`Entrega ${t.title} em ${fmtDate(t.dueDate!)}. Abrir nas tarefas`}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sub border border-border bg-muted/30 p-2.5 text-left text-xs outline-none transition-all hover:border-gold/20 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
                  >
                    <span className="tnum shrink-0 text-[10px] text-gold">#{t.id}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="tnum shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{fmtDate(t.dueDate!)}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Próximas Postagens */}
          <motion.div variants={fadeUp} className="rounded-card border border-border bg-card p-4 shadow-soft">
            <SectionTitle icon={Megaphone} title="Próximas Postagens" color="hsl(var(--gold))" action="Ver calendário" onAction={() => navigate("/calendar")} />
            {upcomingPosts.length === 0 ? (
              <EmptyState icon={Megaphone} message="Nenhuma postagem agendada esta semana. Programe conteúdo no calendário editorial." action="Abrir calendário" onAction={() => navigate("/calendar")} />
            ) : (
              <div className="space-y-1.5">
                {upcomingPosts.map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => navigate("/calendar")}
                    aria-label={`Postagem ${p.title} em ${fmtDate(p.scheduledDate)}. Abrir no calendário`}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-sub border border-border bg-muted/30 p-2.5 text-left text-xs outline-none transition-all hover:border-gold/20 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
                  >
                    <span className="tnum w-12 shrink-0 rounded bg-muted px-1.5 py-0.5 text-center text-[10px] text-muted-foreground">{fmtDate(p.scheduledDate)}</span>
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformDot(p.platform) }} />
                    <span className="flex-1 truncate">{p.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{p.creator}</span>
                    <StatusPill label={CONTENT_STATUS_LABELS[p.status]} tone={CONTENT_TONE[p.status]} dot={false} className="shrink-0 px-1.5 py-0 text-[8px]" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* ══ ATIVIDADE RECENTE ════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="rounded-card border border-border bg-card p-4 shadow-soft">
        <SectionTitle icon={Zap} title="Atividade Recente" />
        {activities.length === 0 ? (
          <EmptyState icon={ActivityIcon} message="Nenhuma atividade ainda. Ações da equipe (tarefas, revendedores) aparecem aqui." />
        ) : (
          <div className="space-y-1">
            {activities.slice(0, 8).map(a => {
              const cfg = ACTION_CONFIG[a.action] ?? ACTION_DEFAULT;
              const ActionIcon = cfg.icon;
              return (
                <div key={a.id} className="flex items-center gap-3 border-b border-border/30 py-2 text-xs last:border-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${cfg.color} 15%, transparent)` }}>
                    <ActionIcon className="h-3 w-3" style={{ color: cfg.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gold">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">{cfg.label(a.taskTitle)}</span>
                  </div>
                  <span className="tnum shrink-0 text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(a.createdAt), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OverviewPage;
