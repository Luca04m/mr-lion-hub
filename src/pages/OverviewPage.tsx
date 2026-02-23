import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTasks, getActivities, getRevendedores, getBusinessKPIs, setBusinessKPIs, getMeetings, exportTasksMarkdown, getUser } from "@/lib/store";
import { Task, TaskStatus, TEAM_MEMBERS, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, BusinessKPIs, Revendedor, REVENDEDOR_STATUS_COLORS, RevendedorStatus, Meeting } from "@/lib/types";
import { format, formatDistanceToNow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, TrendingUp, BarChart2, DollarSign, Package, Truck, Download, Pencil, CheckCircle2, AlertTriangle, Clock, Zap, Calendar, Users, Building2, AlertOctagon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

// ─── DRE Data (hardcoded Jan/26) ───
const DRE_CARDS = [
  { label: "Faturamento Bruto", value: "R$ 95.175", icon: TrendingUp, color: "#3B82F6" },
  { label: "CMV", value: "R$ 50.794 · 53,4%", icon: Package, color: "#EF4444" },
  { label: "Lucro Bruto", value: "R$ 44.381 · 46,6%", icon: DollarSign, color: "#22C55E" },
  { label: "Despesas Totais", value: "R$ 92.913 · 97,6%", icon: AlertTriangle, color: "#F59E0B" },
  { label: "Resultado Líquido", value: "R$ 1.131 · 1,2%", icon: BarChart2, color: "#EAB308", badge: "⚠ Margem crítica", badgeTip: "Margem de 1,2% — qualquer imprevisto gera prejuízo." },
];

const COST_COMPOSITION = [
  { name: "CMV", value: 50794, color: "#ef4444" },
  { name: "Marketing", value: 16708, color: "#f59e0b" },
  { name: "Logística", value: 7925, color: "#3b82f6" },
  { name: "Impostos/Taxas", value: 7170, color: "#8b5cf6" },
  { name: "Pessoal", value: 6200, color: "#06b6d4" },
  { name: "Reembolsos", value: 5248, color: "#ec4899" },
  { name: "Resultado", value: 1131, color: "#22c55e" },
];

const ECOM_CARDS = [
  { label: "Vendas Totais", value: "R$ 72.200" },
  { label: "Pedidos", value: "339" },
  { label: "Itens Vendidos", value: "619" },
  { label: "ROAS", value: "10,24x", badge: "Saudável", badgeColor: "#22C55E", tip: "R$ 7.053 investidos em Meta + Google Ads" },
  { label: "Taxa de Devolução", value: "11,5%", badge: "Atenção", badgeColor: "#F59E0B", tip: "R$ 8.278 em devoluções no mês" },
];

const PRODUCT_TABLE = [
  { produto: "Blended", itens: 320, pctVol: "51,7%", receita: 33921, cmv: 19010, margem: "44,0%", status: "✅ Saudável", critical: false },
  { produto: "Honey", itens: 259, pctVol: "41,8%", receita: 32091, cmv: 20196, margem: "37,1%", status: "✅ Saudável", critical: false },
  { produto: "Cappuccino", itens: 50, pctVol: "8,1%", receita: 5497, cmv: 11588, margem: "-110,7%", status: "🚨 Crítico", critical: true },
];

const PRODUCT_CHART = [
  { name: "Blended", receita: 33921, cmv: 19010 },
  { name: "Honey", receita: 32091, cmv: 20196 },
  { name: "Cappuccino", receita: 5497, cmv: 11588 },
];

const OverviewPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ReturnType<typeof getActivities>>([]);
  const [revs, setRevs] = useState<Revendedor[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [kpis, setKpis] = useState<BusinessKPIs>(getBusinessKPIs());
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const userName = getUser();
  const navigate = useNavigate();

  useEffect(() => {
    setTasks(getTasks());
    setActivities(getActivities());
    setRevs(getRevendedores());
    setMeetings(getMeetings());
    setKpis(getBusinessKPIs());
  }, []);

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return "Bom dia"; if (h < 18) return "Boa tarde"; return "Boa noite"; })();

  const total = tasks.length;
  const byStatus = (s: TaskStatus) => tasks.filter(t => t.status === s).length;
  const doneCount = byStatus("concluida");
  const metaPct = kpis.metaMensal > 0 ? Math.round((kpis.realizado / kpis.metaMensal) * 100) : 0;
  const metaColor = metaPct >= 80 ? "#22C55E" : metaPct >= 60 ? "#F59E0B" : "#EF4444";

  const handleExport = () => { navigator.clipboard.writeText(exportTasksMarkdown()); toast.success("Tarefas exportadas para o clipboard ✓"); };

  const pieData = [
    { name: "Pendente", value: byStatus("pendente"), fill: STATUS_COLORS.pendente },
    { name: "Em Andamento", value: byStatus("em-andamento"), fill: STATUS_COLORS["em-andamento"] },
    { name: "Concluída", value: doneCount, fill: STATUS_COLORS.concluida },
    { name: "Atrasada", value: byStatus("atrasada"), fill: STATUS_COLORS.atrasada },
  ].filter(d => d.value > 0);

  const lateTasks = tasks.filter(t => t.status === "atrasada").slice(0, 3);
  const crmByStatus = (s: RevendedorStatus) => revs.filter(r => r.status === s).length;
  const topRevs = [...revs].sort((a, b) => b.volume - a.volume).slice(0, 5);
  const crmBarData = topRevs.map(r => ({ name: r.nome.length > 15 ? r.nome.slice(0, 15) + "…" : r.nome, value: r.volume }));
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayMeetings = meetings.filter(m => m.meetingDate === todayStr);
  const threeDaysLater = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const upcomingTasks = tasks.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= threeDaysLater && t.status !== "concluida").slice(0, 5);

  const kpiCards = [
    { label: "Meta Mensal", value: `${kpis.metaMensal.toLocaleString()} unid.`, icon: Target, color: "#3B82F6", sub: "" },
    { label: "Realizado", value: `${kpis.realizado.toLocaleString()} unid.`, icon: TrendingUp, color: "#22C55E", sub: "e-commerce · jan/26" },
    { label: "% da Meta", value: `${metaPct}%`, icon: BarChart2, color: metaColor, sub: "" },
    { label: "Receita Estimada", value: `R$ ${kpis.receitaEstimada.toLocaleString()}`, icon: DollarSign, color: "#22C55E", sub: "faturamento bruto · jan/26" },
    { label: "Ticket Médio/Rev.", value: `R$ ${kpis.ticketMedio.toLocaleString()}`, icon: Package, color: "#6B7280", sub: "por pedido · WooCommerce" },
    { label: "Custo Entrega", value: `R$ ${kpis.custoEntrega.toFixed(2)}/unid.`, icon: Truck, color: "#6B7280", sub: "frete total / unidades vendidas" },
  ];

  const costTotal = COST_COMPOSITION.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
          <p className="text-sm text-gold mt-1">{greeting}, {userName}!</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-xs gap-1.5 border-border">
          <Download className="w-3.5 h-3.5" /> Exportar
        </Button>
      </div>

      {/* ═══ BLOCO A — KPIs do Negócio ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold">Metas do Negócio</h2>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={() => setKpiDialogOpen(true)}>
            <Pencil className="w-3 h-3 mr-1" /> Editar
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map(kpi => (
            <div key={kpi.label} className="bg-card rounded-lg border border-border p-3 hover:-translate-y-0.5 hover:border-gold/30 transition-all" style={{ borderLeftWidth: 3, borderLeftColor: kpi.color }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              </div>
              <span className="text-lg font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</span>
              {kpi.sub && <p className="text-[9px] text-muted-foreground mt-0.5">{kpi.sub}</p>}
            </div>
          ))}
        </div>
        <div className="mt-2 bg-card rounded-lg border border-border p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Progresso da meta mensal</span>
            <span className="text-xs font-mono font-bold" style={{ color: metaColor }}>{metaPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(metaPct, 100)}%`, backgroundColor: metaColor }} />
          </div>
        </div>
      </div>

      {/* ═══ DRE Simplificado — Jan/26 ═══ */}
      <div>
        <h2 className="text-sm font-semibold mb-3">DRE Simplificado — Jan/26</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {DRE_CARDS.map(card => (
            <div key={card.label} className="bg-card rounded-lg border border-border p-3 hover:-translate-y-0.5 transition-all" style={{ borderLeftWidth: 3, borderLeftColor: card.color }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{card.label}</span>
              </div>
              <span className="text-base font-bold font-mono" style={{ color: card.color }}>{card.value}</span>
              {card.badge && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="text-[9px] mt-1 cursor-help">{card.badge}</Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px] text-xs">{card.badgeTip}</TooltipContent>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
        {/* Cost composition donut */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Onde foi o dinheiro</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={COST_COMPOSITION} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                  {COST_COMPOSITION.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <RTooltip contentStyle={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 18% 14%)", borderRadius: 6, color: "hsl(240 20% 92%)" }} formatter={(val: number) => `R$ ${val.toLocaleString("pt-BR")}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex flex-col justify-center">
              {COST_COMPOSITION.map(c => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="flex-1">{c.name}</span>
                  <span className="font-mono text-muted-foreground">R$ {c.value.toLocaleString("pt-BR")}</span>
                  <span className="font-mono text-muted-foreground w-10 text-right">{((c.value / costTotal) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ E-commerce — Jan/26 ═══ */}
      <div>
        <h2 className="text-sm font-semibold mb-3">E-commerce — WooCommerce · Jan/26</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {ECOM_CARDS.map(card => (
            <div key={card.label} className="bg-card rounded-lg border border-border p-3 hover:-translate-y-0.5 transition-all" style={{ borderLeftWidth: 3, borderLeftColor: "hsl(var(--gold))" }}>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">{card.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-foreground">{card.value}</span>
                {card.badge && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[9px] cursor-help" style={{ borderColor: `${card.badgeColor}40`, color: card.badgeColor }}>{card.badge}</Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px] text-xs">{card.tip}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Product table */}
        <div className="bg-card rounded-lg border border-border overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase text-muted-foreground tracking-wider">
                <th className="px-3 py-2.5 text-left">Produto</th>
                <th className="px-3 py-2.5 text-right">Itens</th>
                <th className="px-3 py-2.5 text-right">% Vol</th>
                <th className="px-3 py-2.5 text-right">Receita</th>
                <th className="px-3 py-2.5 text-right">CMV</th>
                <th className="px-3 py-2.5 text-right">Margem</th>
                <th className="px-3 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_TABLE.map(p => (
                <tr key={p.produto} className={`border-b border-border/50 ${p.critical ? "bg-red-500/5" : ""}`}>
                  <td className="px-3 py-2.5 font-medium">{p.produto}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.itens}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.pctVol}</td>
                  <td className="px-3 py-2.5 text-right font-mono">R$ {p.receita.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2.5 text-right font-mono">R$ {p.cmv.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2.5 text-right font-mono" style={{ color: p.critical ? "#EF4444" : "#22C55E" }}>{p.margem}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs">{p.status}</span>
                    {p.critical && <Badge variant="destructive" className="text-[8px] ml-1">⚠ CMV &gt; Receita</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cappuccino alert */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">
              <strong>⚠ Cappuccino:</strong> CMV de R$ 11.588 supera receita e-commerce de R$ 5.497. Decisão urgente sobre o SKU.
            </p>
          </div>
        </div>

        {/* Receita vs CMV chart */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Receita vs CMV por Produto</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PRODUCT_CHART}>
              <XAxis dataKey="name" tick={{ fill: "hsl(240 8% 55%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(240 8% 55%)", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <RTooltip contentStyle={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 18% 14%)", borderRadius: 6, color: "hsl(240 20% 92%)" }} formatter={(val: number) => `R$ ${val.toLocaleString("pt-BR")}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="receita" name="Receita" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cmv" name="CMV" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ 3 Alert Cards ═══ */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Margem líquida 1,2% · Jan/26</p>
              <p className="text-xs text-muted-foreground">Qualquer custo adicional gera prejuízo. Prioridade: reduzir CMV e reembolsos.</p>
            </div>
          </div>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Cappuccino em colapso</p>
              <p className="text-xs text-muted-foreground">CMV (R$ 11.588) supera receita no e-commerce (R$ 5.497). Avaliar descontinuação.</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400 mb-1">11,5% de devolução</p>
              <p className="text-xs text-muted-foreground">R$ 8.278 devolvidos em jan/26. Investigar causas para proteger receita líquida.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BLOCO B — CRM ═══ */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Revendedores</h2>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate("/revendedores")}>Ver todos</Button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { label: "Ativos", value: crmByStatus("Ativo"), color: "#22C55E" },
                { label: "Em Negociação", value: crmByStatus("Em Negociação"), color: "#F59E0B" },
                { label: "Novos Leads", value: crmByStatus("Novo Lead"), color: "#3B82F6" },
                { label: "Inativos", value: crmByStatus("Inativo"), color: "#6B7280" },
              ].map(s => (
                <Badge key={s.label} variant="outline" className="text-xs px-2.5 py-1" style={{ borderColor: `${s.color}40`, color: s.color }}>
                  {s.label}: <span className="font-mono font-bold ml-1">{s.value}</span>
                </Badge>
              ))}
            </div>
            {topRevs.length > 0 ? (
              <div className="text-xs">
                <div className="grid grid-cols-4 gap-1 text-[10px] uppercase text-muted-foreground tracking-wider mb-1 px-1">
                  <span className="col-span-1">Nome</span><span>Resp.</span><span className="text-right">Vol.</span><span className="text-right">Status</span>
                </div>
                {topRevs.map(r => (
                  <div key={r.id} className="grid grid-cols-4 gap-1 py-1.5 px-1 border-t border-border/40">
                    <span className="truncate col-span-1">{r.nome}</span>
                    <span className="text-muted-foreground">{r.responsavel}</span>
                    <span className="text-right font-mono">{r.volume}</span>
                    <span className="text-right"><Badge variant="outline" className="text-[8px] h-4" style={{ borderColor: `${REVENDEDOR_STATUS_COLORS[r.status]}40`, color: REVENDEDOR_STATUS_COLORS[r.status] }}>{r.status}</Badge></span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum revendedor cadastrado</p>
            )}
          </div>
          <div>
            {crmBarData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={crmBarData} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" tick={{ fill: "hsl(240 8% 55%)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "hsl(240 8% 55%)", fontSize: 9 }} width={100} />
                  <RTooltip contentStyle={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 18% 14%)", borderRadius: 6, color: "hsl(240 20% 92%)" }} />
                  <Bar dataKey="value" fill="hsl(45 64% 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ═══ BLOCO C — Operação ═══ */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Tarefas</h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { label: "Total", value: total, color: "hsl(var(--gold))", icon: CheckCircle2 },
                { label: "Pend.", value: byStatus("pendente"), color: STATUS_COLORS.pendente, icon: Clock },
                { label: "Andamento", value: byStatus("em-andamento"), color: STATUS_COLORS["em-andamento"], icon: Zap },
                { label: "Concl.", value: doneCount, color: STATUS_COLORS.concluida, icon: CheckCircle2 },
                { label: "Atrasada", value: byStatus("atrasada"), color: STATUS_COLORS.atrasada, icon: AlertTriangle },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <span className="text-lg font-bold font-mono block" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[9px] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <RTooltip contentStyle={{ background: "hsl(240 20% 9%)", border: "1px solid hsl(240 18% 14%)", borderRadius: 6, color: "hsl(240 20% 92%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-2 text-red-400">Tarefas Atrasadas</h3>
            {lateTasks.length === 0 ? (
              <div className="flex items-center gap-3 py-4 justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/40" />
                <div><p className="text-sm font-medium text-emerald-400">Tudo em dia!</p><p className="text-xs text-muted-foreground">Nenhuma tarefa atrasada</p></div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {lateTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs p-2 rounded bg-red-500/5 border border-red-500/10 cursor-pointer hover:border-red-500/20" onClick={() => navigate(`/tasks?highlight=${t.id}`)}>
                    <span className="font-mono text-gold">#{t.id}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400">ATRASADA</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gold" /> Reuniões de hoje</h3>
            {todayMeetings.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Nenhuma reunião hoje</p>
            ) : (
              <div className="space-y-1.5">
                {todayMeetings.map(m => (
                  <div key={m.id} className="flex items-center gap-2 text-xs p-2 rounded bg-gold/5 border border-gold/10">
                    <span className="font-mono text-gold">{m.hora || m.meetingDate}</span>
                    <span className="flex-1 truncate">{m.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-2">Próximas entregas</h3>
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Nenhuma entrega nos próximos 3 dias</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/20 border border-border cursor-pointer hover:border-gold/20" onClick={() => navigate(`/tasks?highlight=${t.id}`)}>
                    <span className="font-mono text-gold">#{t.id}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="font-mono text-muted-foreground">{t.dueDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Carga por Pessoa</h3>
            <div className="space-y-2.5">
              {TEAM_MEMBERS.map(member => {
                const mt = tasks.filter(t => t.responsible.includes(member));
                const done = mt.filter(t => t.status === "concluida").length;
                const pct = mt.length > 0 ? Math.round((done / mt.length) * 100) : 0;
                const open = mt.filter(t => t.status !== "concluida").length;
                return (
                  <div key={member} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full gradient-gold flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">{member.charAt(0)}</div>
                    <span className="text-xs w-16 truncate">{member}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full rounded-full gradient-gold" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{open} aber.</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BLOCO D — Atividade Recente ═══ */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">Atividade Recente</h3>
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma atividade ainda</p>
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-start gap-2.5 text-xs relative pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                <div className="absolute left-[-2px] top-1.5 w-[5px] h-[5px] rounded-full bg-gold" />
                <div className="flex-1">
                  <span className="text-gold font-medium">{a.userName}</span>{" "}
                  <span className="text-muted-foreground">{formatActionShort(a.action, a.taskTitle)}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(a.createdAt), { locale: ptBR, addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <KpiEditDialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen} kpis={kpis} onSave={k => { setBusinessKPIs(k); setKpis(k); setKpiDialogOpen(false); toast.success("Metas salvas"); }} />
    </div>
  );
};

function formatActionShort(action: string, title: string): string {
  if (action === "task_created") return `criou "${title}"`;
  if (action === "task_deleted") return `excluiu "${title}"`;
  if (action === "status_change") return `alterou status de "${title}"`;
  if (action === "revendedor_created") return `cadastrou revendedor "${title}"`;
  if (action === "revendedor_deleted") return `removeu revendedor "${title}"`;
  return `editou "${title}"`;
}

function KpiEditDialog({ open, onOpenChange, kpis, onSave }: { open: boolean; onOpenChange: (b: boolean) => void; kpis: BusinessKPIs; onSave: (k: BusinessKPIs) => void }) {
  const [meta, setMeta] = useState(kpis.metaMensal);
  const [real, setReal] = useState(kpis.realizado);
  const [receita, setReceita] = useState(kpis.receitaEstimada);
  const [ticket, setTicket] = useState(kpis.ticketMedio);
  const [custo, setCusto] = useState(kpis.custoEntrega);

  useEffect(() => { setMeta(kpis.metaMensal); setReal(kpis.realizado); setReceita(kpis.receitaEstimada); setTicket(kpis.ticketMedio); setCusto(kpis.custoEntrega); }, [kpis, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader><DialogTitle className="text-gold">Editar Metas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground block mb-1">Meta Mensal (unidades)</label><Input type="number" value={meta} onChange={e => setMeta(Number(e.target.value))} className="bg-secondary/40" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Realizado (unidades)</label><Input type="number" value={real} onChange={e => setReal(Number(e.target.value))} className="bg-secondary/40" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Receita Estimada (R$)</label><Input type="number" value={receita} onChange={e => setReceita(Number(e.target.value))} className="bg-secondary/40" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Ticket Médio/Revendedor (R$)</label><Input type="number" value={ticket} onChange={e => setTicket(Number(e.target.value))} className="bg-secondary/40" /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Custo Entrega (R$/unid.)</label><Input type="number" step="0.01" value={custo} onChange={e => setCusto(Number(e.target.value))} className="bg-secondary/40" /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => onSave({ metaMensal: meta, realizado: real, receitaEstimada: receita, ticketMedio: ticket, custoEntrega: custo })} className="gradient-gold text-primary-foreground font-semibold">Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OverviewPage;
