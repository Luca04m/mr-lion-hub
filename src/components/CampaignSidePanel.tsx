import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Campaign, ContentPost, Task,
  CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS,
  CONTENT_STATUS_COLORS, CONTENT_STATUS_LABELS,
  STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS,
} from "@/lib/types";
import { updateTask } from "@/lib/store";
import {
  CalendarDays, FileText, CheckSquare, Pencil, Trash2,
  Megaphone, Tag, Radio, AlertCircle, Zap, StickyNote,
  Mic, Monitor, Camera, ExternalLink, Copy, ChevronDown, ChevronRight,
  BookOpen, ArrowRight, Play, Clock, ListChecks, Check,
  Target, Users, BarChart3, ExternalLink as NavIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, isToday, isBefore, parseISO, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  campaign: Campaign;
  linkedPosts: ContentPost[];
  linkedTasks: Task[];
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToContent: () => void;
}

function fmtDate(d: string, pattern = "dd 'de' MMM") {
  try { return format(parseISO(d + "T12:00:00"), pattern, { locale: ptBR }); } catch { return d; }
}

const RISK_STYLE: Record<string, string> = {
  "Baixo": "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  "Médio": "text-amber-400 bg-amber-500/10 border-amber-500/25",
  "Alto":  "text-red-400 bg-red-500/10 border-red-500/25",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-3 h-px bg-gold/50" />
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{children}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handle} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-gold ml-auto shrink-0">
      {copied ? <span className="text-[9px] text-emerald-400">✓</span> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Task row usado em Visão Geral e Tarefas ───
function TaskRow({
  task, compact = false, onToggle, onNavigate,
}: {
  task: Task;
  compact?: boolean;
  onToggle: (t: Task) => void;
  onNavigate: (t: Task) => void;
}) {
  const done = task.status === "concluida";
  const critical = task.title.includes("[CRÍTICO]");
  const late = task.dueDate && isBefore(parseISO(task.dueDate + "T23:59:59"), new Date()) && !done;

  return (
    <div className={cn(
      "flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-all group",
      done
        ? "bg-emerald-500/5 border-emerald-500/20 opacity-70"
        : critical
          ? "bg-red-500/5 border-red-500/20 hover:border-red-500/35"
          : late
            ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/30"
            : "bg-secondary/20 border-border hover:border-gold/25"
    )}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className={cn(
          "w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all",
          done ? "bg-emerald-500 border-emerald-500" : critical ? "border-red-500/60" : "border-muted-foreground/30 hover:border-gold/60"
        )}>
        {done && <Check className="w-2.5 h-2.5 text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs leading-snug font-medium", done ? "line-through text-muted-foreground" : "text-foreground")}>
          {task.title.replace("[CRÍTICO] ", "")}
        </p>
        {!compact && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-[9px] text-muted-foreground">{task.responsible.join(", ")}</span>
            {task.dueDate && (
              <span className={cn("text-[9px] font-mono", late ? "text-amber-400" : "text-muted-foreground")}>{task.dueDate}</span>
            )}
          </div>
        )}
      </div>

      {/* Right badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {critical && !done && (
          <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1 py-0.5 rounded">CRÍTICO</span>
        )}
        <span className="text-[9px] font-medium" style={{ color: STATUS_COLORS[task.status] }}>
          {STATUS_LABELS[task.status]}
        </span>
        <button
          onClick={() => onNavigate(task)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-gold transition-opacity">
          <NavIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Visão Geral Tab ───
function OverviewTab({
  campaign, linkedTasks, linkedPosts, onToggleTask, onNavigateTask, onNavigateToContent, onSwitchTab,
}: {
  campaign: Campaign;
  linkedTasks: Task[];
  linkedPosts: ContentPost[];
  onToggleTask: (t: Task) => void;
  onNavigateTask: (t: Task) => void;
  onNavigateToContent: () => void;
  onSwitchTab: (tab: string) => void;
}) {
  const today = new Date();

  // GoLive checklist state (read from localStorage — same key as GoLiveChecklist component)
  const storageKey = `mrlion_golive_${campaign.id}`;
  const [glChecked, setGlChecked] = useState<Record<number, boolean>>({});
  useEffect(() => {
    try { setGlChecked(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch { /* */ }
  }, [storageKey]);

  // Parse GoLive items from checklist markdown
  const glItems: string[] = [];
  if (campaign.checklist) {
    const lines = campaign.checklist.split("\n");
    const startIdx = lines.findIndex(l => l.includes("Checklist Final de Go Live"));
    if (startIdx !== -1) {
      for (let i = startIdx + 1; i < lines.length; i++) {
        const m = lines[i].match(/^-\s+\[[ x]\]\s+(.*)/i);
        if (m) glItems.push(m[1].trim());
      }
    }
  }
  const glDone = glItems.filter((_, i) => glChecked[i]).length;
  const glTotal = glItems.length;
  const glPct = glTotal > 0 ? Math.round((glDone / glTotal) * 100) : 0;

  // Task stats
  const taskDone = linkedTasks.filter(t => t.status === "concluida").length;
  const taskTotal = linkedTasks.length;
  const taskPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const statusCounts = {
    pendente:      linkedTasks.filter(t => t.status === "pendente").length,
    "em-andamento": linkedTasks.filter(t => t.status === "em-andamento").length,
    concluida:     linkedTasks.filter(t => t.status === "concluida").length,
    atrasada:      linkedTasks.filter(t => t.status === "atrasada").length,
  };

  // Campaign timeline
  let daysLeft = 0;
  let campaignDays: string[] = [];
  let isPast = false;
  try {
    const endDate = parseISO(campaign.endDate + "T23:59:59");
    const startDate = parseISO(campaign.startDate + "T00:00:00");
    daysLeft = Math.max(0, differenceInDays(endDate, today));
    isPast = today > endDate;
    let d = new Date(startDate);
    while (d <= endDate) {
      campaignDays.push(format(d, "yyyy-MM-dd"));
      d = addDays(d, 1);
    }
  } catch { /* */ }

  // Active phase
  const activePhase = campaign.phases.find(p => {
    try {
      const s = parseISO(p.dateStart + "T00:00:00");
      const e = parseISO(p.dateEnd + "T23:59:59");
      return today >= s && today <= e;
    } catch { return false; }
  });

  // Late + urgent tasks
  const lateTasks = linkedTasks.filter(t =>
    t.status !== "concluida" && t.dueDate && isBefore(parseISO(t.dueDate + "T23:59:59"), today)
  );
  const urgentTasks = linkedTasks
    .filter(t => t.status !== "concluida" && (t.title.includes("[CRÍTICO]") || t.priority === "alta"))
    .filter(t => !lateTasks.includes(t))
    .slice(0, 3);

  // Posts by day (mini-calendar)
  const postsByDay: Record<string, ContentPost[]> = {};
  linkedPosts.forEach(post => {
    if (!postsByDay[post.scheduledDate]) postsByDay[post.scheduledDate] = [];
    postsByDay[post.scheduledDate].push(post);
  });

  const roteirosCount = (campaign.ads?.length ?? 0) + (campaign.videos?.length ?? 0);

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Dias restantes */}
        <div className="bg-card border border-border rounded-xl px-4 py-3.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            {isPast ? "Encerrada" : "Dias restantes"}
          </p>
          <p className="text-2xl font-bold font-mono" style={{
            color: isPast ? "#94A3B8" : daysLeft <= 1 ? "#EF4444" : daysLeft <= 3 ? "#F59E0B" : "#D4A843",
          }}>
            {isPast ? "—" : daysLeft}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {fmtDate(campaign.startDate, "dd/MM")} → {fmtDate(campaign.endDate, "dd/MM")}
          </p>
        </div>

        {/* Tarefas */}
        <button onClick={() => onSwitchTab("tarefas")}
          className="bg-card border border-border rounded-xl px-4 py-3.5 text-left hover:border-gold/30 transition-colors">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tarefas</p>
          <p className="text-2xl font-bold font-mono" style={{
            color: taskTotal > 0 && taskDone === taskTotal ? "#22C55E" : "#D4A843",
          }}>
            {taskPct}<span className="text-sm">%</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{taskDone}/{taskTotal} concluídas</p>
        </button>

        {/* Go Live */}
        <button onClick={() => onSwitchTab("tarefas")}
          className="bg-card border border-border rounded-xl px-4 py-3.5 text-left hover:border-gold/30 transition-colors">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Go Live</p>
          <p className="text-2xl font-bold font-mono" style={{
            color: glTotal > 0 && glDone === glTotal ? "#22C55E" : "#D4A843",
          }}>
            {glPct}<span className="text-sm">%</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{glDone}/{glTotal} itens</p>
        </button>

        {/* Posts */}
        <button onClick={onNavigateToContent}
          className="bg-card border border-border rounded-xl px-4 py-3.5 text-left hover:border-gold/30 transition-colors">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Posts</p>
          <p className="text-2xl font-bold font-mono text-foreground">{linkedPosts.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {linkedPosts.filter(p => p.status === "publicado").length} publicados
          </p>
        </button>
      </div>

      {/* ── Fase ativa + Conceito ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={cn(
          "rounded-xl border px-4 py-3.5",
          activePhase ? "bg-gold/5 border-gold/25" : "bg-secondary/20 border-border"
        )}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: activePhase ? "#D4A843" : undefined }}>
            {activePhase ? "⚡ Fase ativa" : "Status"}
          </p>
          {activePhase ? (
            <>
              <p className="text-sm font-bold text-gold">{activePhase.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activePhase.description}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">
              {isPast ? "Campanha encerrada" : campaign.phases.length > 0 ? `Próxima: ${campaign.phases[0].name}` : "—"}
            </p>
          )}
        </div>

        <div className="bg-gold/5 border border-gold/15 rounded-xl px-4 py-3.5">
          <p className="text-[10px] font-bold text-gold/50 uppercase tracking-wider mb-1.5">Conceito central</p>
          <p className="text-sm font-bold text-gold line-clamp-1">{campaign.concept}</p>
          {campaign.tagline && <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">{campaign.tagline}</p>}
        </div>
      </div>

      {/* ── Barras de progresso ── */}
      {(taskTotal > 0 || glTotal > 0) && (
        <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-4">
          {taskTotal > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-gold/50" />
                  <span className="text-xs font-semibold text-foreground">Progresso operacional</span>
                </div>
                <span className="text-xs font-bold font-mono" style={{ color: taskDone === taskTotal ? "#22C55E" : "#D4A843" }}>
                  {taskDone}/{taskTotal} · {taskPct}%
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${taskPct}%`, backgroundColor: taskDone === taskTotal ? "#22C55E" : "#D4A843" }} />
              </div>
              {/* Status pills — clicáveis para a aba Tarefas */}
              <div className="flex flex-wrap gap-3">
                {(["em-andamento", "pendente", "atrasada", "concluida"] as const).map(s => {
                  const count = statusCounts[s];
                  if (count === 0) return null;
                  return (
                    <button key={s} onClick={() => onSwitchTab("tarefas")}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                      <span className="text-[10px] text-muted-foreground">
                        {STATUS_LABELS[s]}: <span className="font-bold text-foreground">{count}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {taskTotal > 0 && glTotal > 0 && <div className="border-t border-border/50" />}

          {glTotal > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm leading-none">✅</span>
                  <span className="text-xs font-semibold text-foreground">Checklist Go Live</span>
                </div>
                <span className="text-xs font-bold font-mono" style={{ color: glDone === glTotal ? "#22C55E" : "#D4A843" }}>
                  {glDone}/{glTotal} · {glPct}%
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${glPct}%`, backgroundColor: glDone === glTotal ? "#22C55E" : "#D4A843" }} />
              </div>
              {glDone === glTotal && (
                <p className="text-[10px] text-emerald-400 font-semibold mt-1.5 text-center">🦁 Go Live liberado!</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tarefas atrasadas (alerta) ── */}
      {lateTasks.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/25 rounded-xl px-4 py-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs font-bold text-red-400">
              {lateTasks.length} tarefa{lateTasks.length > 1 ? "s" : ""} atrasada{lateTasks.length > 1 ? "s" : ""}
            </span>
            <button onClick={() => onSwitchTab("tarefas")}
              className="ml-auto text-[10px] text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors">
              Ver todas <NavIcon className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {lateTasks.slice(0, 2).map(task => (
              <TaskRow key={task.id} task={task} compact onToggle={onToggleTask} onNavigate={onNavigateTask} />
            ))}
            {lateTasks.length > 2 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                + {lateTasks.length - 2} mais na aba Tarefas
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Tarefas prioritárias (sem atraso) ── */}
      {urgentTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-3 h-px bg-gold/50" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tarefas prioritárias</span>
            <span className="flex-1 h-px bg-border" />
            <button onClick={() => onSwitchTab("tarefas")}
              className="text-[10px] text-gold/60 hover:text-gold flex items-center gap-1 transition-colors">
              Ver todas <NavIcon className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {urgentTasks.map(task => (
              <TaskRow key={task.id} task={task} compact onToggle={onToggleTask} onNavigate={onNavigateTask} />
            ))}
          </div>
        </div>
      )}

      {/* ── Mini calendário de conteúdo ── */}
      {campaignDays.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-px bg-gold/50" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Calendário de conteúdo</span>
            <span className="flex-1 h-px bg-border" />
            {linkedPosts.length > 0 && (
              <button onClick={onNavigateToContent}
                className="text-[10px] text-gold/60 hover:text-gold flex items-center gap-1 transition-colors">
                Ver todos <NavIcon className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${campaignDays.length}, 1fr)` }}>
            {campaignDays.map(day => {
              const posts = postsByDay[day] || [];
              const todayMark = isToday(parseISO(day + "T12:00:00"));
              const phase = campaign.phases.find(p => {
                try { return day >= p.dateStart && day <= p.dateEnd; } catch { return false; }
              });
              return (
                <div key={day} className={cn(
                  "flex flex-col items-center rounded-xl border py-3 px-1.5 gap-1.5 transition-colors",
                  todayMark ? "bg-gold/10 border-gold/30" : "bg-secondary/20 border-border"
                )}>
                  <span className={cn("text-[10px] font-bold font-mono", todayMark ? "text-gold" : "text-muted-foreground")}>
                    {fmtDate(day, "dd/MM")}
                  </span>
                  {phase && (
                    <span className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded text-center leading-none font-medium",
                      todayMark ? "bg-gold/20 text-gold" : "bg-secondary text-muted-foreground/60"
                    )}>
                      {phase.name}
                    </span>
                  )}
                  <div className="flex flex-col items-center gap-1">
                    {posts.length > 0 ? (
                      <>
                        <div className="flex gap-0.5 flex-wrap justify-center">
                          {posts.slice(0, 4).map(post => (
                            <div key={post.id} className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: CONTENT_STATUS_COLORS[post.status] }}
                              title={post.title} />
                          ))}
                        </div>
                        <span className="text-[9px] text-foreground font-medium">{posts.length}</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/30 mt-0.5">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {linkedPosts.length === 0 && (
            <p className="text-[10px] text-muted-foreground/60 text-center mt-1.5">
              Nenhum post agendado — <button onClick={onNavigateToContent} className="text-gold/60 hover:text-gold underline">criar conteúdo</button>
            </p>
          )}
        </div>
      )}

      {/* ── Top 2 ângulos ── */}
      {campaign.angles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-px bg-gold/50" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Ângulos principais</span>
            <span className="flex-1 h-px bg-border" />
            <button onClick={() => onSwitchTab("estrategia")}
              className="text-[10px] text-gold/60 hover:text-gold flex items-center gap-1 transition-colors">
              Ver todos ({campaign.angles.length}) <NavIcon className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="space-y-2">
            {campaign.angles.slice(0, 2).map(angle => (
              <div key={angle.id} className="bg-card border border-border rounded-lg px-4 py-3 hover:border-gold/25 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-bold text-foreground leading-snug">{angle.title}</p>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0",
                    RISK_STYLE[angle.risk] ?? "text-muted-foreground bg-secondary border-border"
                  )}>
                    {angle.risk}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{angle.concept}</p>
                <p className="text-[10px] text-gold/70 mt-1.5 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5" /> {angle.bestChannel}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ações rápidas ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-3 h-px bg-gold/50" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Ações rápidas</span>
          <span className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onSwitchTab("tarefas")} variant="outline" size="sm"
            className="text-xs h-9 gap-1.5 justify-start border-border hover:border-gold/30 hover:text-gold">
            <CheckSquare className="w-3.5 h-3.5 text-gold/50 shrink-0" /> Ver Tarefas
            {taskTotal > 0 && (
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{taskDone}/{taskTotal}</span>
            )}
          </Button>
          <Button onClick={onNavigateToContent} variant="outline" size="sm"
            className="text-xs h-9 gap-1.5 justify-start border-border hover:border-gold/30 hover:text-gold">
            <FileText className="w-3.5 h-3.5 text-gold/50 shrink-0" /> Ver Conteúdo
            {linkedPosts.length > 0 && (
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{linkedPosts.length}</span>
            )}
          </Button>
          <Button onClick={() => onSwitchTab("roteiros")} variant="outline" size="sm"
            className="text-xs h-9 gap-1.5 justify-start border-border hover:border-gold/30 hover:text-gold">
            <Mic className="w-3.5 h-3.5 text-gold/50 shrink-0" /> Ver Roteiros
            {roteirosCount > 0 && (
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{roteirosCount}</span>
            )}
          </Button>
          <Button onClick={() => onSwitchTab("copy")} variant="outline" size="sm"
            className="text-xs h-9 gap-1.5 justify-start border-border hover:border-gold/30 hover:text-gold">
            <BookOpen className="w-3.5 h-3.5 text-gold/50 shrink-0" /> Ver Copy
          </Button>
          <Button onClick={() => onSwitchTab("estrategia")} variant="outline" size="sm"
            className="text-xs h-9 gap-1.5 justify-start border-border hover:border-gold/30 hover:text-gold col-span-2">
            <Target className="w-3.5 h-3.5 text-gold/50 shrink-0" /> Estratégia completa
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              {campaign.angles.length} ângulos · {campaign.phases.length} fases
            </span>
          </Button>
        </div>
      </div>

      {/* Notes */}
      {campaign.notes && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3 flex gap-3">
          <StickyNote className="w-4 h-4 text-amber-400/60 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{campaign.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Go Live Checklist (dentro da aba Tarefas) ───
function GoLiveChecklist({ campaign }: { campaign: Campaign }) {
  const storageKey = `mrlion_golive_${campaign.id}`;
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch { /* */ }
  }, [storageKey]);

  if (!campaign.checklist) return null;

  // Extrai só os itens da seção "Checklist Final de Go Live"
  const lines = campaign.checklist.split("\n");
  const startIdx = lines.findIndex(l => l.includes("Checklist Final de Go Live"));
  if (startIdx === -1) return null;

  const items: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^-\s+\[[ x]\]\s+(.*)/i);
    if (m) items.push(m[1].trim());
  }
  if (items.length === 0) return null;

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = { ...prev, [i]: !prev[i] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const doneCount = items.filter((_, i) => checked[i]).length;
  const pct = Math.round((doneCount / items.length) * 100);
  const allDone = doneCount === items.length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">✅</span>
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Checklist Final de Go Live</span>
        <span className="flex-1 h-px bg-border" />
        <span className={cn("text-[10px] font-mono font-bold", allDone ? "text-emerald-400" : "text-muted-foreground")}>
          {doneCount}/{items.length}
        </span>
      </div>

      {/* Mini progress */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: allDone ? "#22C55E" : "#D4A843" }} />
      </div>

      <div className="space-y-1">
        {items.map((item, i) => {
          const done = !!checked[i];
          return (
            <button key={i} onClick={() => toggle(i)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all",
                done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-secondary/20 border-border hover:border-gold/25"
              )}>
              <div className={cn(
                "w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-all",
                done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-gold/60"
              )}>
                {done && <Check className="w-2 h-2 text-white" />}
              </div>
              <span className={cn("text-xs flex-1", done ? "line-through text-muted-foreground" : "text-foreground")}>
                {item}
              </span>
            </button>
          );
        })}
      </div>

      {allDone && (
        <div className="mt-3 text-center py-2 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-semibold">🦁 Tudo verificado — Go Live liberado!</p>
        </div>
      )}
    </div>
  );
}

// ─── Tarefas Tab ───
function TasksTab({
  campaign, linkedTasks, onToggleTask, onNavigateTask,
}: {
  campaign: Campaign;
  linkedTasks: Task[];
  onToggleTask: (t: Task) => void;
  onNavigateTask: (t: Task) => void;
}) {
  const done = linkedTasks.filter(t => t.status === "concluida").length;
  const total = linkedTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Group by dueDate
  const groups: Record<string, { label: string; tasks: Task[] }> = {};
  linkedTasks.forEach(t => {
    const key = t.dueDate ?? "sem-prazo";
    if (!groups[key]) {
      let label = key === "sem-prazo" ? "Sem prazo" : fmtDate(key, "dd/MM · EEE");
      // Map known dates to phase labels
      const phaseMap: Record<string, string> = {};
      campaign.phases.forEach(p => {
        if (p.dateStart === p.dateEnd) {
          phaseMap[p.dateStart] = `${p.name} · ${fmtDate(p.dateStart, "dd/MM")}`;
        }
      });
      if (t.dueDate && phaseMap[t.dueDate]) label = phaseMap[t.dueDate];
      groups[key] = { label, tasks: [] };
    }
    groups[key].tasks.push(t);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === "sem-prazo") return 1;
    if (b === "sem-prazo") return -1;
    return a.localeCompare(b);
  });

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckSquare className="w-8 h-8 text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground mb-2">Nenhuma tarefa vinculada</p>
        <p className="text-xs text-muted-foreground/60">Defina <code className="text-gold text-[10px]">campanha_id</code> em uma tarefa para vinculá-la aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="bg-card border border-border rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">Progresso das tarefas</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono" style={{ color: done === total ? "#22C55E" : "#D4A843" }}>
              {done}/{total} · {pct}%
            </span>
          </div>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: done === total ? "#22C55E" : "#D4A843" }} />
        </div>
        <div className="flex gap-4 mt-2.5">
          {(["pendente", "em-andamento", "concluida", "atrasada"] as const).map(s => {
            const count = linkedTasks.filter(t => t.status === s).length;
            if (count === 0) return null;
            return (
              <div key={s} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                <span className="text-[9px] text-muted-foreground">{STATUS_LABELS[s]}: <span className="font-bold text-foreground">{count}</span></span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grouped tasks */}
      {sortedKeys.map(key => {
        const group = groups[key];
        const groupDone = group.tasks.filter(t => t.status === "concluida").length;
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{group.label}</span>
              <span className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-mono text-muted-foreground">{groupDone}/{group.tasks.length}</span>
            </div>
            <div className="space-y-1.5">
              {group.tasks.map(task => (
                <TaskRow key={task.id} task={task} onToggle={onToggleTask} onNavigate={onNavigateTask} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Checklist Final de Go Live */}
      {campaign.checklist && (
        <>
          <Separator />
          <GoLiveChecklist campaign={campaign} />
        </>
      )}

      <div className="text-center pt-1">
        <p className="text-[10px] text-muted-foreground">
          Clique em <NavIcon className="w-2.5 h-2.5 inline" /> para abrir a tarefa na aba Tarefas
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───
export function CampaignDetail({ campaign, linkedPosts, linkedTasks, onEdit, onDelete, onNavigateToContent }: Props) {
  const navigate = useNavigate();
  const [expandedVideo, setExpandedVideo] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>(linkedTasks);
  const [activeTab, setActiveTab] = useState("overview");
  const sc = CAMPAIGN_STATUS_COLORS[campaign.status];

  // Keep tasks in sync when linkedTasks prop changes
  if (tasks !== linkedTasks) setTasks(linkedTasks);

  // Reset tab to overview when campaign changes
  useEffect(() => { setActiveTab("overview"); }, [campaign.id]);

  const handleToggleTask = (task: Task) => {
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    updateTask(task.id, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const handleNavigateTask = (task: Task) => {
    navigate(`/tasks?highlight=${task.id}`);
  };

  const roteirosCount = (campaign.ads?.length ?? 0) + (campaign.videos?.length ?? 0);
  const tasksCount = tasks.length;

  return (
    <div className="flex flex-col h-full">

      {/* ── HERO ── */}
      <div className="px-7 pt-6 pb-5 border-b border-border bg-card/60 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                style={{ color: sc, backgroundColor: `${sc}18`, borderColor: `${sc}40` }}>
                {CAMPAIGN_STATUS_LABELS[campaign.status]}
              </span>
              {campaign.product && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {campaign.product}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-auto">
                <CalendarDays className="w-3.5 h-3.5" />
                {fmtDate(campaign.startDate, "dd/MM")} → {fmtDate(campaign.endDate, "dd/MM")}
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground leading-tight">{campaign.title}</h1>
            {campaign.tagline && <p className="text-sm text-gold/70 italic mt-0.5">{campaign.tagline}</p>}
          </div>

          <div className="flex gap-1.5 shrink-0">
            <Button onClick={onEdit} size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
            <Button onClick={onDelete} size="sm" variant="outline"
              className="text-xs h-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-gold/50" /><strong className="text-foreground">{campaign.phases.length}</strong> fases</span>
          <span className="flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5 text-gold/50" /><strong className="text-foreground">{campaign.angles.length}</strong> ângulos</span>
          <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-gold/50" /><strong className="text-foreground">{roteirosCount}</strong> roteiros</span>
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gold/50" /><strong className="text-foreground">{linkedPosts.length}</strong> posts</span>
          <span className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-gold/50" /><strong className="text-foreground">{tasksCount}</strong> tarefas</span>
        </div>

        {/* Channels */}
        {campaign.channels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <Radio className="w-3.5 h-3.5 text-muted-foreground/50 self-center" />
            {campaign.channels.map(ch => (
              <span key={ch} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{ch}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
        <TabsList className="shrink-0 w-full justify-start rounded-none border-b border-border bg-transparent px-6 gap-0 h-10">
          {[
            { value: "overview", label: "Visão Geral" },
            { value: "estrategia", label: "Estratégia" },
            { value: "roteiros", label: roteirosCount > 0 ? `Roteiros (${roteirosCount})` : "Roteiros" },
            { value: "copy", label: "Copy" },
            { value: "tarefas", label: tasksCount > 0 ? `Tarefas (${tasksCount})` : "Tarefas" },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:text-gold data-[state=active]:bg-transparent px-4 h-10 text-xs font-medium">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── TAB: VISÃO GERAL ── */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto px-7 py-6 mt-0">
          <OverviewTab
            campaign={campaign}
            linkedTasks={tasks}
            linkedPosts={linkedPosts}
            onToggleTask={handleToggleTask}
            onNavigateTask={handleNavigateTask}
            onNavigateToContent={onNavigateToContent}
            onSwitchTab={setActiveTab}
          />
        </TabsContent>

        {/* ── TAB: ESTRATÉGIA ── */}
        <TabsContent value="estrategia" className="flex-1 overflow-y-auto px-7 py-6 space-y-7 mt-0">

          {campaign.briefing && (
            <div>
              <SectionTitle>Briefing estratégico</SectionTitle>
              <div className="bg-secondary/20 border border-border rounded-lg p-4 flex gap-3">
                <BookOpen className="w-4 h-4 text-gold/40 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{campaign.briefing}</p>
              </div>
            </div>
          )}

          {campaign.concept && (
            <div>
              <SectionTitle>Conceito central</SectionTitle>
              <div className="bg-gold/5 border border-gold/20 rounded-lg px-5 py-4">
                <p className="text-base font-semibold text-gold mb-1">{campaign.concept}</p>
                {campaign.tagline && <p className="text-sm text-muted-foreground italic">{campaign.tagline}</p>}
              </div>
            </div>
          )}

          {campaign.phases.length > 0 && (
            <div>
              <SectionTitle>Fases da campanha</SectionTitle>
              <div className="relative">
                <div className="absolute left-0 right-0 top-[22px] h-px bg-gold/20" />
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(campaign.phases.length, 4)}, 1fr)` }}>
                  {campaign.phases.map((phase, idx) => {
                    const isActive = (() => {
                      try {
                        const s = parseISO(phase.dateStart + "T00:00:00");
                        const e = parseISO(phase.dateEnd + "T23:59:59");
                        const now = new Date();
                        return now >= s && now <= e;
                      } catch { return false; }
                    })();
                    return (
                      <div key={idx} className="flex flex-col items-center text-center">
                        <span className="text-[9px] font-mono text-gold/50 mb-2">
                          {fmtDate(phase.dateStart, "dd/MM")}{phase.dateStart !== phase.dateEnd ? `→${fmtDate(phase.dateEnd, "dd/MM")}` : ""}
                        </span>
                        <div className={cn("relative z-10 w-3 h-3 rounded-full border-2 bg-background mb-3", isActive ? "border-gold" : "border-gold/40")} />
                        <div className={cn("border rounded-lg px-3 py-2.5 w-full", isActive ? "bg-gold/8 border-gold/30" : "bg-secondary/30 border-border")}>
                          <p className="text-xs font-semibold text-foreground mb-1">{phase.name}</p>
                          {phase.description && <p className="text-[10px] text-muted-foreground leading-snug">{phase.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {campaign.angles.length > 0 && (
            <div>
              <SectionTitle>Ângulos de comunicação</SectionTitle>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {campaign.angles.map(angle => (
                  <div key={angle.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-gold/25 transition-colors">
                    <div className="px-4 pt-3.5 pb-2.5 border-b border-border/50 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-mono text-gold/50 bg-gold/10 px-1.5 py-0.5 rounded">#{angle.id}</span>
                        <h3 className="font-semibold text-sm text-foreground leading-snug mt-0.5">{angle.title}</h3>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${RISK_STYLE[angle.risk] ?? "text-muted-foreground bg-secondary border-border"}`}>
                        {angle.risk}
                      </span>
                    </div>
                    <div className="px-4 py-2.5 border-b border-border/30">
                      <p className="text-xs text-muted-foreground leading-relaxed">{angle.concept}</p>
                    </div>
                    <div className="px-4 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50 mb-0.5"><AlertCircle className="w-2.5 h-2.5" />Gatilho</div>
                        <p className="text-xs text-foreground">{angle.trigger}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50 mb-0.5"><Users className="w-2.5 h-2.5" />Público</div>
                        <p className="text-xs text-foreground line-clamp-2">{angle.audience}</p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50 mb-0.5"><Radio className="w-2.5 h-2.5" />Canal ideal</div>
                        <p className="text-xs text-gold/80 font-medium">{angle.bestChannel}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {campaign.notes && (
            <div>
              <SectionTitle>Notas</SectionTitle>
              <div className="bg-secondary/20 border border-border rounded-lg px-5 py-4 flex gap-3">
                <StickyNote className="w-4 h-4 text-gold/40 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{campaign.notes}</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: ROTEIROS ── */}
        <TabsContent value="roteiros" className="flex-1 overflow-y-auto px-7 py-6 space-y-8 mt-0">

          {(campaign.ads?.length ?? 0) > 0 && (
            <div>
              <SectionTitle>Anúncios (Tráfego Pago)</SectionTitle>
              <div className="space-y-4">
                {campaign.ads!.map(ad => (
                  <div key={ad.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{ad.title}</h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {ad.duration}</span>
                          {ad.objective && <span className="text-[10px] text-gold/70 italic">{ad.objective}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Mic className="w-3.5 h-3.5 text-gold/60" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Script falado</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line italic">"{ad.spoken}"</p>
                      </div>
                      <div className="px-5 py-4 space-y-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Monitor className="w-3.5 h-3.5 text-gold/60" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Texto na tela</span>
                          </div>
                          <div className="bg-secondary/40 rounded-lg px-3 py-2">
                            {ad.screenText.split("\n").map((line, i) => (
                              <p key={i} className={cn("font-mono", i === 0 ? "text-sm font-bold text-foreground" : "text-xs text-muted-foreground")}>{line}</p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Camera className="w-3.5 h-3.5 text-gold/60" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Captação</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{ad.captacao}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(campaign.ads?.length ?? 0) > 0 && (campaign.videos?.length ?? 0) > 0 && <Separator />}

          {(campaign.videos?.length ?? 0) > 0 && (
            <div>
              <SectionTitle>Vídeos por dia</SectionTitle>
              <div className="space-y-3">
                {campaign.videos!.map(video => {
                  const isOpen = expandedVideo === video.id;
                  return (
                    <div key={video.id} className="bg-card border border-border rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedVideo(isOpen ? null : video.id)}
                        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                            <Play className="w-3.5 h-3.5 text-gold" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-foreground">{video.title}</p>
                            <p className="text-[10px] text-muted-foreground">{video.takes.length} takes · {fmtDate(video.date)}</p>
                          </div>
                        </div>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {isOpen && (
                        <div className="border-t border-border">
                          {video.takes.map((take, idx) => (
                            <div key={take.take} className={cn("px-5 py-3.5 flex gap-4", idx < video.takes.length - 1 ? "border-b border-border/50" : "")}>
                              <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground mt-0.5">
                                {take.take}
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                                  <Camera className="w-3 h-3" /> {take.description}
                                </p>
                                <p className="text-sm text-foreground leading-relaxed italic">"{take.spoken}"</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!campaign.ads?.length && !campaign.videos?.length && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mic className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum roteiro cadastrado</p>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: COPY ── */}
        <TabsContent value="copy" className="flex-1 overflow-y-auto px-7 py-6 space-y-7 mt-0">
          {campaign.copy ? (
            <>
              <div>
                <SectionTitle>Headlines ({campaign.copy.headlines.length})</SectionTitle>
                <div className="space-y-1.5">
                  {campaign.copy.headlines.map((h, i) => (
                    <div key={i} className="group flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors">
                      <span className="text-[10px] font-mono text-gold/40 mt-0.5 w-4 shrink-0">{i + 1}</span>
                      <p className="text-sm text-foreground flex-1">{h}</p>
                      <CopyButton text={h} />
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <SectionTitle>Frases de impacto ({campaign.copy.impactPhrases.length})</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {campaign.copy.impactPhrases.map((phrase, i) => (
                    <button key={i} onClick={() => navigator.clipboard.writeText(phrase)}
                      className="group text-xs px-3 py-1.5 rounded-full bg-secondary/40 border border-border text-foreground hover:border-gold/40 hover:bg-gold/5 transition-all text-left">
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <SectionTitle>CTAs ({campaign.copy.ctas.length})</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {campaign.copy.ctas.map((cta, i) => (
                    <div key={i} className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/5 border border-gold/15 hover:border-gold/30 transition-colors">
                      <ArrowRight className="w-3 h-3 text-gold/50 shrink-0" />
                      <p className="text-xs font-bold text-gold flex-1">{cta}</p>
                      <CopyButton text={cta} />
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <SectionTitle>Urgência & Escassez ({campaign.copy.urgencyPhrases.length})</SectionTitle>
                <div className="space-y-1.5">
                  {campaign.copy.urgencyPhrases.map((p, i) => (
                    <div key={i} className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors border-l-2 border-amber-500/30">
                      <p className="text-xs text-foreground flex-1">{p}</p>
                      <CopyButton text={p} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma copy cadastrada</p>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: TAREFAS ── */}
        <TabsContent value="tarefas" className="flex-1 overflow-y-auto px-7 py-6 mt-0">
          <TasksTab
            campaign={campaign}
            linkedTasks={tasks}
            onToggleTask={handleToggleTask}
            onNavigateTask={handleNavigateTask}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
