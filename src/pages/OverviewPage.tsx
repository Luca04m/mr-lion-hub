import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getTasks, getActivities, getRevendedores, getMeetings, getPosts, exportTasksMarkdown, getUser } from "@/lib/store";
import {
  Task, TaskStatus, TEAM_MEMBERS, STATUS_LABELS, STATUS_COLORS,
  Revendedor, REVENDEDOR_STATUS_COLORS, RevendedorStatus,
  Meeting, ContentPost, PLATFORM_COLORS, CONTENT_STATUS_COLORS, CONTENT_STATUS_LABELS,
} from "@/lib/types";
import { format, formatDistanceToNow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, BarChart2, DollarSign, Package, Download,
  CheckCircle2, AlertTriangle, Clock, Zap, Calendar, Building2,
  Megaphone, AlertCircle, ChevronRight, Users,
  Plus, Trash2, RefreshCw, UserPlus, Edit2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/use-realtime";

// ─── Static data ──────────────────────────────────────────────────────────────
const DRE_CARDS = [
  { label: "Faturamento Bruto", value: "R$ 95.175",         icon: TrendingUp,    color: "#3B82F6" },
  { label: "CMV",               value: "R$ 50.794 · 53,4%", icon: Package,       color: "#EF4444" },
  { label: "Lucro Bruto",       value: "R$ 44.381 · 46,6%", icon: DollarSign,    color: "#22C55E" },
  { label: "Despesas Totais",   value: "R$ 92.913 · 97,6%", icon: AlertTriangle, color: "#F59E0B" },
  { label: "Resultado Líquido", value: "R$ 1.131 · 1,2%",   icon: BarChart2,     color: "#EAB308",
    badge: "⚠ Margem crítica", badgeTip: "Margem de 1,2% — qualquer imprevisto gera prejuízo." },
];

const COST_COMPOSITION = [
  { name: "CMV",            value: 50794, color: "#ef4444" },
  { name: "Marketing",      value: 16708, color: "#f59e0b" },
  { name: "Logística",      value: 7925,  color: "#3b82f6" },
  { name: "Impostos/Taxas", value: 7170,  color: "#8b5cf6" },
  { name: "Pessoal",        value: 6200,  color: "#06b6d4" },
  { name: "Reembolsos",     value: 5248,  color: "#ec4899" },
  { name: "Resultado",      value: 1131,  color: "#22c55e" },
];

const ECOM_CARDS = [
  { label: "Vendas Totais",     value: "R$ 72.200" },
  { label: "Pedidos",           value: "339" },
  { label: "Itens Vendidos",    value: "619" },
  { label: "ROAS",              value: "10,24x", badge: "Saudável", badgeColor: "#22C55E", tip: "R$ 7.053 investidos em Meta + Google Ads" },
  { label: "Taxa de Devolução", value: "11,5%",  badge: "Atenção",  badgeColor: "#F59E0B", tip: "R$ 8.278 em devoluções no mês" },
];

// ─── Activity action config ───────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: (t: string) => string }> = {
  task_created:        { icon: Plus,     color: "#22C55E", label: t => `criou "${t}"` },
  task_deleted:        { icon: Trash2,   color: "#EF4444", label: t => `excluiu "${t}"` },
  status_change:       { icon: RefreshCw,color: "#3B82F6", label: t => `alterou status de "${t}"` },
  revendedor_created:  { icon: UserPlus, color: "#8B5CF6", label: t => `cadastrou revendedor "${t}"` },
  revendedor_deleted:  { icon: Trash2,   color: "#EF4444", label: t => `removeu revendedor "${t}"` },
};
const ACTION_DEFAULT = { icon: Edit2, color: "#D4A843", label: (t: string) => `editou "${t}"` };

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background: "hsl(240 20% 9%)", border: "1px solid hsl(240 18% 14%)",
  borderRadius: 6, color: "hsl(240 20% 92%)", fontSize: 12,
};

function fmtDate(dateStr: string) {
  try { return format(new Date(dateStr + "T12:00:00"), "d MMM", { locale: ptBR }); }
  catch { return dateStr.slice(5); }
}

function workloadColor(pct: number): string {
  if (pct >= 75) return "#22C55E";
  if (pct >= 35) return "#F59E0B";
  return "#EF4444";
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color = "#D4A843", action, onAction }: {
  icon: React.ElementType; title: string; color?: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <span className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </span>
        {title}
      </h2>
      {action && onAction && (
        <button onClick={onAction} className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-gold transition-colors group">
          {action}
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
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

  // CRM
  const crmByStatus = (s: RevendedorStatus) => revs.filter(r => r.status === s).length;
  const topRevs     = [...revs].sort((a, b) => b.volume - a.volume).slice(0, 5);
  const crmBarData  = topRevs.map(r => ({
    name: r.nome.length > 14 ? r.nome.slice(0, 14) + "…" : r.nome,
    value: r.volume,
  }));

  // Pipeline funnel data
  const pipeline = [
    { label: "Novo Lead",      value: crmByStatus("Novo Lead"),     color: "#3B82F6" },
    { label: "Em Negociação",  value: crmByStatus("Em Negociação"), color: "#F59E0B" },
    { label: "Ativo",          value: crmByStatus("Ativo"),         color: "#22C55E" },
    { label: "Recorrente",     value: crmByStatus("Recorrente"),    color: "#8B5CF6" },
  ];
  const pipelineMax = Math.max(...pipeline.map(p => p.value), 1);

  // Charts
  const pieData = [
    { name: "Pendente",     value: byStatus("pendente"),     fill: STATUS_COLORS.pendente },
    { name: "Em Andamento", value: byStatus("em-andamento"), fill: STATUS_COLORS["em-andamento"] },
    { name: "Concluída",    value: doneCount,                fill: STATUS_COLORS.concluida },
    { name: "Atrasada",     value: lateCount,                fill: STATUS_COLORS.atrasada },
  ].filter(d => d.value > 0);

  const costTotal = COST_COMPOSITION.reduce((s, c) => s + c.value, 0);

  const handleExport = () => {
    navigator.clipboard.writeText(exportTasksMarkdown());
    toast.success("Tarefas exportadas para o clipboard ✓");
  };

  const showAlert = !alertDismissed && lateCount > 0;

  return (
    <motion.div
      className="space-y-5"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center text-lg font-bold text-primary-foreground shrink-0 shadow-lg">
            {userName?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{greeting}, {userName}!</h1>
            </div>
            <p className="text-[11px] text-muted-foreground capitalize">{today}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-xs gap-1.5 border-border self-start sm:self-auto">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar tarefas</span>
        </Button>
      </motion.div>

      {/* ══ ALERT BANNER ════════════════════════════════════════════════════ */}
      {showAlert && (
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/8"
        >
          <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-300">
              {lateCount} {lateCount === 1 ? "tarefa atrasada" : "tarefas atrasadas"} · margem crítica em 1,2%
            </p>
            <p className="text-[11px] text-red-400/60 mt-0.5">Atenção imediata necessária para evitar impacto financeiro</p>
          </div>
          <button
            onClick={() => navigate("/tasks")}
            className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors border border-red-500/30 px-2.5 py-1 rounded-md shrink-0"
          >
            Ver tarefas
          </button>
          <button onClick={() => setAlertDismissed(true)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 text-xs">
            ✕
          </button>
        </motion.div>
      )}

      {/* ══ HOJE EM RESUMO — 4 quick stats ══════════════════════════════════ */}
      <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Atrasadas",      value: lateCount,
            icon: AlertTriangle,     color: lateCount > 0 ? "#EF4444" : "#22C55E",
            sub: lateCount > 0 ? "requer ação" : "tudo em dia",
            onClick: () => navigate("/tasks"),
          },
          {
            label: "Reuniões hoje",  value: todayMeetings.length,
            icon: Calendar,          color: "#D4A843",
            sub: todayMeetings.length > 0 ? todayMeetings[0].hora || "sem horário" : "dia livre",
            onClick: () => navigate("/meetings"),
          },
          {
            label: "Posts esta semana", value: upcomingPosts.length,
            icon: Megaphone,            color: "#E1306C",
            sub: upcomingPosts.length > 0 ? `próx. ${fmtDate(upcomingPosts[0].scheduledDate)}` : "nenhum agendado",
            onClick: () => navigate("/calendar"),
          },
          {
            label: "% Concluído",   value: `${donePct}%`,
            icon: CheckCircle2,      color: donePct >= 70 ? "#22C55E" : donePct >= 40 ? "#F59E0B" : "#EF4444",
            sub: `${doneCount} de ${total} tarefas`,
            onClick: () => navigate("/tasks"),
          },
        ].map(card => (
          <motion.div
            key={card.label}
            variants={fadeUp}
            onClick={card.onClick}
            className="bg-card rounded-xl border border-border p-4 cursor-pointer group hover:border-border/60 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${card.color}18` }}
              >
                <card.icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-0.5" />
            </div>
            <span className="text-2xl font-bold font-mono block leading-none mb-1" style={{ color: card.color }}>
              {card.value}
            </span>
            <span className="text-[10px] font-medium text-foreground/70 uppercase tracking-wide block">{card.label}</span>
            <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">{card.sub}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ══ DRE ═════════════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp}>
        <SectionHeader icon={TrendingUp} title="DRE Simplificado — Jan/26" color="#3B82F6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          {DRE_CARDS.map(card => (
            <div
              key={card.label}
              className="bg-card rounded-xl border border-border p-3.5 hover:-translate-y-0.5 transition-all group"
              style={{ borderLeftWidth: 3, borderLeftColor: card.color }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <card.icon className="w-3 h-3 shrink-0" style={{ color: card.color }} />
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight">{card.label}</span>
              </div>
              <span className="text-sm font-bold font-mono block leading-snug" style={{ color: card.color }}>
                {card.value}
              </span>
              {card.badge && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="text-[8px] mt-2 cursor-help px-1.5 py-0">{card.badge}</Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">{card.badgeTip}</TooltipContent>
                </Tooltip>
              )}
            </div>
          ))}
        </div>

        {/* Onde foi o dinheiro */}
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Onde foi o dinheiro</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="relative">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={COST_COMPOSITION} cx="50%" cy="50%" innerRadius={58} outerRadius={88} dataKey="value" paddingAngle={2}>
                    {COST_COMPOSITION.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
                  </Pie>
                  <RTooltip contentStyle={TOOLTIP_STYLE} formatter={(val: number) => `R$ ${val.toLocaleString("pt-BR")}`} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center overlay — CSS, not SVG text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="text-lg font-bold font-mono text-foreground block leading-none">
                    R$ {costTotal.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">total saídas</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {COST_COMPOSITION.map(c => (
                <div key={c.name} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 text-xs text-muted-foreground">{c.name}</span>
                  <span className="font-mono text-xs text-foreground">R$ {c.value.toLocaleString("pt-BR")}</span>
                  <div className="w-10 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.value / costTotal) * 100}%`, backgroundColor: c.color }} />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">
                    {((c.value / costTotal) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ E-COMMERCE ══════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp}>
        <SectionHeader icon={Zap} title="E-commerce — WooCommerce · Jan/26" color="#D4A843" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ECOM_CARDS.map(card => (
            <div
              key={card.label}
              className="bg-card rounded-xl border border-border p-3.5 hover:-translate-y-0.5 transition-all"
              style={{ borderLeftWidth: 3, borderLeftColor: "#D4A843" }}
            >
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1.5">{card.label}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold font-mono text-foreground">{card.value}</span>
                {card.badge && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[9px] cursor-help" style={{ borderColor: `${card.badgeColor}40`, color: card.badgeColor }}>
                        {card.badge}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[240px] text-xs">{card.tip}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══ CRM ══════════════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-4">
        <SectionHeader icon={Building2} title="CRM" color="#3B82F6" action="Ver todos" onAction={() => navigate("/revendedores")} />

        {/* Pipeline funnel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {pipeline.map((stage, i) => (
            <div key={stage.label} className="relative">
              <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                <span className="text-xl font-bold font-mono block" style={{ color: stage.color }}>{stage.value}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 block leading-tight">{stage.label}</span>
                <div className="h-1 rounded-full mt-2 overflow-hidden bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(stage.value / pipelineMax) * 100}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
              {i < pipeline.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 text-muted-foreground/40 text-xs">›</div>
              )}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Table */}
          {topRevs.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[280px]">
              <div className="grid grid-cols-4 gap-1 text-[9px] uppercase text-muted-foreground/60 tracking-wider mb-1.5 px-1">
                <span className="col-span-1">Nome</span>
                <span>Resp.</span>
                <span className="text-right">Vol.</span>
                <span className="text-right">Status</span>
              </div>
              {topRevs.map(r => (
                <div key={r.id} className="grid grid-cols-4 gap-1 py-1.5 px-1 border-t border-border/30 hover:bg-secondary/20 transition-colors rounded text-xs">
                  <span className="truncate font-medium">{r.nome}</span>
                  <span className="text-muted-foreground truncate">{r.responsavel}</span>
                  <span className="text-right font-mono">{r.volume}</span>
                  <span className="text-right">
                    <Badge variant="outline" className="text-[8px] h-4 px-1" style={{ borderColor: `${REVENDEDOR_STATUS_COLORS[r.status]}40`, color: REVENDEDOR_STATUS_COLORS[r.status] }}>
                      {r.status}
                    </Badge>
                  </span>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum revendedor cadastrado</p>
          )}
          {/* Bar chart */}
          {crmBarData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={crmBarData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fill: "hsl(240 8% 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(240 8% 55%)", fontSize: 9 }} width={100} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#D4A843" radius={[0, 4, 4, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ══ OPERAÇÃO — 2 colunas ═════════════════════════════════════════════ */}
      <motion.div variants={stagger} className="grid md:grid-cols-2 gap-4">

        {/* Coluna A */}
        <div className="space-y-4">

          {/* Tarefas */}
          <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-4">
            <SectionHeader icon={CheckCircle2} title="Tarefas" action="Ver todas" onAction={() => navigate("/tasks")} />
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 mb-4 text-center">
              {[
                { label: "Total",    value: total,                  color: "#D4A843" },
                { label: "Pend.",    value: byStatus("pendente"),   color: STATUS_COLORS.pendente },
                { label: "Andando",  value: byStatus("em-andamento"),color: STATUS_COLORS["em-andamento"] },
                { label: "Concl.",   value: doneCount,              color: STATUS_COLORS.concluida },
                { label: "Atrasada", value: lateCount,              color: STATUS_COLORS.atrasada },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-secondary/20 py-2">
                  <span className="text-lg font-bold font-mono block leading-none" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[8px] text-muted-foreground mt-0.5 block">{s.label}</span>
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
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="text-2xl font-bold font-mono" style={{ color: donePct >= 70 ? "#22C55E" : donePct >= 40 ? "#F59E0B" : "#EF4444" }}>
                    {donePct}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">concluído</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Atrasadas */}
          <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-4">
            <SectionHeader icon={AlertTriangle} title="Tarefas Atrasadas" color="#EF4444" />
            {lateTasks.length === 0 ? (
              <div className="flex items-center gap-3 py-5 justify-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Tudo em dia!</p>
                  <p className="text-xs text-muted-foreground">Nenhuma tarefa atrasada</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {lateTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tasks?highlight=${t.id}`)}
                    className="flex items-center gap-2 text-xs p-2 rounded-lg bg-red-500/5 border border-red-500/10 cursor-pointer hover:border-red-500/30 hover:bg-red-500/8 transition-all"
                  >
                    <span className="font-mono text-gold shrink-0 text-[10px]">#{t.id}</span>
                    <span className="flex-1 truncate font-medium">{t.title}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0">{t.responsible.join(", ")}</span>
                    <span className="text-[8px] text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded shrink-0">ATRASADA</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Carga por Pessoa */}
          <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-4">
            <SectionHeader icon={Users} title="Carga por Pessoa" />
            <div className="space-y-3">
              {TEAM_MEMBERS.map(member => {
                const mt     = tasks.filter(t => t.responsible.includes(member));
                const done   = mt.filter(t => t.status === "concluida").length;
                const pct    = mt.length > 0 ? Math.round((done / mt.length) * 100) : 0;
                const open   = mt.filter(t => t.status !== "concluida").length;
                const late   = mt.filter(t => t.status === "atrasada").length;
                const bColor = workloadColor(pct);
                return (
                  <div key={member} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full gradient-gold flex items-center justify-center text-[9px] font-bold text-primary-foreground shrink-0">
                      {member.charAt(0)}
                    </div>
                    <span className="text-xs w-14 truncate text-foreground/80">{member}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: bColor }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{pct}%</span>
                    <span className="text-[10px] font-mono w-8 text-right" style={{ color: open > 0 ? "hsl(var(--muted-foreground))" : "#22C55E" }}>
                      {open}ab.
                    </span>
                    {late > 0 && <span className="text-[9px] text-red-400 shrink-0">{late}⚠</span>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Coluna B */}
        <div className="space-y-4">

          {/* Reuniões */}
          <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-4">
            <SectionHeader icon={Calendar} title="Reuniões de hoje" action="Ver reuniões" onAction={() => navigate("/meetings")} />
            {todayMeetings.length === 0 ? (
              <p className="text-xs text-muted-foreground py-5 text-center">Nenhuma reunião hoje</p>
            ) : (
              <div className="space-y-1.5">
                {todayMeetings.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 text-xs p-2.5 rounded-lg bg-gold/5 border border-gold/10">
                    <div className="w-1 h-6 rounded-full bg-gold shrink-0" />
                    <span className="font-mono text-gold shrink-0 text-[11px]">{m.hora || "—"}</span>
                    <span className="flex-1 truncate font-medium">{m.title}</span>
                    {m.tipo && <span className="text-[9px] text-muted-foreground shrink-0 bg-secondary px-1.5 py-0.5 rounded">{m.tipo}</span>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Próximas entregas */}
          <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-4">
            <SectionHeader icon={Clock} title="Próximas entregas" color="#F59E0B" action="Ver tarefas" onAction={() => navigate("/tasks")} />
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-5 text-center">Nenhuma entrega nos próximos 3 dias</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tasks?highlight=${t.id}`)}
                    className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-secondary/20 border border-border cursor-pointer hover:border-gold/20 hover:bg-secondary/30 transition-all"
                  >
                    <span className="font-mono text-gold shrink-0 text-[10px]">#{t.id}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="font-mono text-muted-foreground shrink-0 text-[10px] bg-secondary/40 px-1.5 py-0.5 rounded">{fmtDate(t.dueDate!)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Próximas Postagens */}
          <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-4">
            <SectionHeader icon={Megaphone} title="Próximas Postagens" color="#E1306C" action="Ver calendário" onAction={() => navigate("/calendar")} />
            {upcomingPosts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-5 text-center">Nenhuma postagem esta semana</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingPosts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate("/calendar")}
                    className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-secondary/20 border border-border cursor-pointer hover:border-gold/20 transition-all"
                  >
                    <span className="font-mono text-muted-foreground shrink-0 text-[10px] bg-secondary/40 px-1.5 py-0.5 rounded w-12 text-center">{fmtDate(p.scheduledDate)}</span>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PLATFORM_COLORS[p.platform] }} />
                    <span className="flex-1 truncate">{p.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{p.creator}</span>
                    <Badge variant="outline" className="text-[8px] h-4 px-1 shrink-0" style={{ borderColor: `${CONTENT_STATUS_COLORS[p.status]}40`, color: CONTENT_STATUS_COLORS[p.status] }}>
                      {CONTENT_STATUS_LABELS[p.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* ══ ATIVIDADE RECENTE ════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border p-4">
        <SectionHeader icon={Zap} title="Atividade Recente" />
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhuma atividade ainda</p>
        ) : (
          <div className="space-y-1">
            {activities.slice(0, 8).map(a => {
              const cfg = ACTION_CONFIG[a.action] ?? ACTION_DEFAULT;
              const ActionIcon = cfg.icon;
              return (
                <div key={a.id} className="flex items-center gap-3 text-xs py-2 border-b border-border/30 last:border-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${cfg.color}15` }}>
                    <ActionIcon className="w-3 h-3" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gold font-medium">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">{cfg.label(a.taskTitle)}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
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
