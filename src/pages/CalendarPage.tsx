import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getTasks, createTask, logActivity, getUser,
  getMeetings, getPosts, getCampaigns,
} from "@/lib/store";
import {
  Task, Meeting, ContentPost, Campaign,
  STATUS_COLORS, STATUS_LABELS, PLATFORM_COLORS, PRIORITY_LABELS,
  CONTENT_STATUS_LABELS, CONTENT_STATUS_COLORS,
  TaskStatus, TEAM_MEMBERS,
} from "@/lib/types";
import { useRealtime } from "@/hooks/use-realtime";
import {
  ChevronLeft, ChevronRight, CheckSquare, Users, ImageIcon,
  CalendarDays, LayoutGrid, Clock, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isToday, startOfWeek, endOfWeek,
  addWeeks, subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { TaskFormDialog } from "@/pages/TasksPage";
import { TaskSidePanel } from "@/components/TaskSidePanel";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week";
type FilterType = "all" | "tasks" | "meetings" | "posts";
type CalendarEvent =
  | { kind: "task";    date: string; data: Task }
  | { kind: "meeting"; date: string; data: Meeting }
  | { kind: "post";    date: string; data: ContentPost };

// ─── Constants ───────────────────────────────────────────────────────────────

const MEETING_COLOR  = "#8B5CF6";
const CAMPAIGN_COLOR = "#D4A843";
const WEEK_DAYS      = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const FILTER_META: Record<FilterType, { label: string; color: string }> = {
  all:      { label: "Tudo",     color: CAMPAIGN_COLOR },
  tasks:    { label: "Tarefas",  color: "#3B82F6" },
  meetings: { label: "Reuniões", color: MEETING_COLOR },
  posts:    { label: "Posts",    color: "#E1306C" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eventColor(e: CalendarEvent): string {
  if (e.kind === "task")    return STATUS_COLORS[(e.data as Task).status];
  if (e.kind === "meeting") return MEETING_COLOR;
  return PLATFORM_COLORS[(e.data as ContentPost).platform];
}

function campaignFor(e: CalendarEvent, campaigns: Campaign[]): Campaign | null {
  if (e.kind === "meeting") return null;
  const cid = (e.data as Task | ContentPost).campanha_id;
  return cid ? (campaigns.find(c => c.id === cid) ?? null) : null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EventTypeIcon({ kind, className = "w-2.5 h-2.5 shrink-0" }: {
  kind: CalendarEvent["kind"]; className?: string;
}) {
  if (kind === "task")    return <CheckSquare className={className} />;
  if (kind === "meeting") return <Users className={className} />;
  return <ImageIcon className={className} />;
}

function EventTooltipBody({ e, campaigns }: { e: CalendarEvent; campaigns: Campaign[] }) {
  const camp = campaignFor(e, campaigns);
  return (
    <div className="space-y-0.5 max-w-[200px]">
      <p className="font-semibold text-xs">{e.data.title}</p>

      {e.kind === "task" && (() => {
        const t = e.data as Task;
        return (
          <>
            <p className="text-muted-foreground text-[10px]">
              {t.responsible.join(", ")} · {PRIORITY_LABELS[t.priority]}
            </p>
            <p className="text-[10px]" style={{ color: STATUS_COLORS[t.status] }}>
              {STATUS_LABELS[t.status]}
            </p>
          </>
        );
      })()}

      {e.kind === "meeting" && (() => {
        const m = e.data as Meeting;
        return (
          <>
            {m.hora && (
              <p className="text-muted-foreground text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" /> {m.hora}
              </p>
            )}
            {m.tipo && <p className="text-muted-foreground text-[10px]">{m.tipo}</p>}
            {m.participantes?.length ? (
              <p className="text-muted-foreground text-[10px]">{m.participantes.join(", ")}</p>
            ) : null}
          </>
        );
      })()}

      {e.kind === "post" && (() => {
        const p = e.data as ContentPost;
        return (
          <>
            <p className="text-muted-foreground text-[10px]">{p.platform} · {p.type}</p>
            <p className="text-[10px]" style={{ color: CONTENT_STATUS_COLORS[p.status] }}>
              {CONTENT_STATUS_LABELS[p.status]}
            </p>
          </>
        );
      })()}

      {camp && (
        <p className="text-[10px] font-mono" style={{ color: CAMPAIGN_COLOR }}>
          📢 {camp.title}
        </p>
      )}
    </div>
  );
}

/** Compact pill for month view */
function EventPill({ e, campaigns, onClick }: {
  e: CalendarEvent; campaigns: Campaign[]; onClick: () => void;
}) {
  const color = eventColor(e);
  const camp  = campaignFor(e, campaigns);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={ev => { ev.stopPropagation(); onClick(); }}
          className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate cursor-pointer hover:opacity-75 transition-opacity"
          style={{ backgroundColor: `${color}18`, color, borderLeft: `2px solid ${color}` }}
        >
          <EventTypeIcon kind={e.kind} />
          <span className="truncate">{e.data.title}</span>
          {camp && <span className="shrink-0 text-[8px]" style={{ color: CAMPAIGN_COLOR }}>●</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-popover border-border">
        <EventTooltipBody e={e} campaigns={campaigns} />
      </TooltipContent>
    </Tooltip>
  );
}

/** Fuller card for week view */
function WeekEventCard({ e, campaigns, onClick }: {
  e: CalendarEvent; campaigns: Campaign[]; onClick: () => void;
}) {
  const color = eventColor(e);
  const camp  = campaignFor(e, campaigns);

  const subtitle = e.kind === "task"
    ? (e.data as Task).responsible.join(", ")
    : e.kind === "meeting"
    ? [(e.data as Meeting).hora, (e.data as Meeting).tipo].filter(Boolean).join(" · ")
    : `${(e.data as ContentPost).platform} · ${(e.data as ContentPost).type}`;

  return (
    <div
      onClick={ev => { ev.stopPropagation(); onClick(); }}
      className="rounded p-1.5 cursor-pointer hover:opacity-80 transition-opacity"
      style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-1">
        <EventTypeIcon kind={e.kind} className="w-3 h-3 shrink-0" />
        <span className="text-[10px] font-medium truncate leading-tight" style={{ color }}>
          {e.data.title}
        </span>
      </div>
      {subtitle && (
        <p className="text-[9px] text-muted-foreground mt-0.5 truncate pl-4">{subtitle}</p>
      )}
      {camp && (
        <p className="text-[9px] mt-0.5 pl-4 truncate" style={{ color: CAMPAIGN_COLOR }}>
          📢 {camp.title}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const CalendarPage = () => {
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [meetings,  setMeetings]  = useState<Meeting[]>([]);
  const [posts,     setPosts]     = useState<ContentPost[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [currentDate,      setCurrentDate]      = useState(new Date());
  const [viewMode,         setViewMode]         = useState<ViewMode>("month");
  const [filterType,       setFilterType]       = useState<FilterType>("all");
  const [filterCampanha,   setFilterCampanha]   = useState<number | "all">("all");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("all");
  const [expandedDays,     setExpandedDays]     = useState<Set<string>>(new Set());

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [selectedDate,  setSelectedDate]  = useState("");
  const [selectedTask,  setSelectedTask]  = useState<Task | null>(null);
  const userName = getUser() || "";

  const reload = useCallback(() => {
    setTasks(getTasks());
    setMeetings(getMeetings());
    setPosts(getPosts());
    setCampaigns(getCampaigns());
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useRealtime(reload);

  // ─── Date ranges ───
  const monthStart  = startOfMonth(currentDate);
  const monthEnd    = endOfMonth(currentDate);
  const monthDays   = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad    = getDay(monthStart);

  const weekStart   = startOfWeek(currentDate);
  const weekEnd     = endOfWeek(currentDate);
  const weekDayList = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // ─── Event builder ───
  const getEventsForDay = useCallback((day: Date): CalendarEvent[] => {
    const ds = format(day, "yyyy-MM-dd");
    const result: CalendarEvent[] = [];

    if (filterType === "all" || filterType === "tasks") {
      tasks
        .filter(t => t.dueDate === ds)
        .filter(t => filterCampanha === "all" || t.campanha_id === filterCampanha)
        .filter(t => filterResponsavel === "all" || t.responsible.includes(filterResponsavel))
        .forEach(t => result.push({ kind: "task", date: ds, data: t }));
    }

    if (filterType === "all" || filterType === "meetings") {
      meetings
        .filter(m => m.meetingDate === ds)
        .filter(m => filterCampanha === "all")  // meetings have no campanha_id
        .filter(m => filterResponsavel === "all" || m.participantes?.includes(filterResponsavel))
        .forEach(m => result.push({ kind: "meeting", date: ds, data: m }));
    }

    if (filterType === "all" || filterType === "posts") {
      posts
        .filter(p => p.scheduledDate === ds)
        .filter(p => filterCampanha === "all" || p.campanha_id === filterCampanha)
        .filter(p => filterResponsavel === "all" || p.creator === filterResponsavel)
        .forEach(p => result.push({ kind: "post", date: ds, data: p }));
    }

    return result;
  }, [tasks, meetings, posts, filterType, filterCampanha, filterResponsavel]);

  // ─── Summary counts (current visible period, unfiltered by type) ───
  const counts = useMemo(() => {
    const rangeStart = format(viewMode === "month" ? monthStart : weekStart, "yyyy-MM-dd");
    const rangeEnd   = format(viewMode === "month" ? monthEnd   : weekEnd,   "yyyy-MM-dd");
    const inRange = (d: string) => d >= rangeStart && d <= rangeEnd;
    return {
      tasks:    tasks.filter(t => t.dueDate && inRange(t.dueDate)).length,
      meetings: meetings.filter(m => inRange(m.meetingDate)).length,
      posts:    posts.filter(p => inRange(p.scheduledDate)).length,
    };
  }, [tasks, meetings, posts, viewMode, currentDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───
  const handleEventClick = (e: CalendarEvent) => {
    if (e.kind === "task") setSelectedTask(e.data as Task);
  };

  const handleDayClick = (day: Date) => {
    if (getEventsForDay(day).length === 0) {
      setSelectedDate(format(day, "yyyy-MM-dd"));
      setDialogOpen(true);
    }
  };

  const handleSave = (data: Partial<Task>) => {
    const t = createTask({
      title: data.title || "", detail: data.detail || "", responsible: data.responsible || [],
      priority: data.priority || "media", area: data.area || "Comercial",
      status: data.status || "pendente", dependencies: [],
      decision: data.decision || null, notes: data.notes || "", dueDate: data.dueDate || null,
      createdBy: userName, isOriginal: false, tags: data.tags || [], attachments: data.attachments || [],
    });
    logActivity({ taskId: t.id, taskTitle: t.title, userName, action: "task_created", oldValue: null, newValue: t.title });
    setDialogOpen(false);
    reload();
  };

  const toggleExpand = (dateStr: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
      return next;
    });
  };

  const goBack    = () => viewMode === "month" ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subWeeks(currentDate, 1));
  const goForward = () => viewMode === "month" ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addWeeks(currentDate, 1));

  const navTitle = viewMode === "month"
    ? format(currentDate, "MMMM yyyy", { locale: ptBR })
    : `${format(weekStart, "d")} – ${format(weekEnd, "d MMM yyyy", { locale: ptBR })}`;

  const hasFilters = filterType !== "all" || filterCampanha !== "all" || filterResponsavel !== "all";
  const clearFilters = () => { setFilterType("all"); setFilterCampanha("all"); setFilterResponsavel("all"); };

  const activeCampaigns = campaigns.filter(c => c.status === "ativa" || c.status === "rascunho");

  // ─── Render ───
  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 h-[calc(100vh-48px)] md:h-screen overflow-hidden flex flex-col bg-background">

      {/* ── Header ── */}
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-border shrink-0 space-y-3">

        {/* Row 1: title + nav + view toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl font-bold capitalize">{navTitle}</h1>
          <div className="flex items-center gap-2">

            {/* Month / Week toggle */}
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <Button
                variant="ghost" size="sm"
                className={cn("rounded-none h-7 px-2.5 text-xs gap-1.5 border-r border-border", viewMode === "month" && "bg-gold/20 text-gold")}
                onClick={() => setViewMode("month")}
              >
                <LayoutGrid className="w-3 h-3" />Mês
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn("rounded-none h-7 px-2.5 text-xs gap-1.5", viewMode === "week" && "bg-gold/20 text-gold")}
                onClick={() => setViewMode("week")}
              >
                <CalendarDays className="w-3 h-3" />Semana
              </Button>
            </div>

            <Button variant="ghost" size="icon" onClick={goBack}    className="h-8 w-8"><ChevronLeft  className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={goForward} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs text-gold border-gold/30 h-7">
              Hoje
            </Button>
          </div>
        </div>

        {/* Row 2: filter chips + selects */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "tasks", "meetings", "posts"] as FilterType[]).map(type => {
            const { label, color } = FILTER_META[type];
            const count = type === "all"
              ? counts.tasks + counts.meetings + counts.posts
              : counts[type as keyof typeof counts] as number;
            const active = filterType === type;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  active ? "text-white" : "bg-secondary/50 text-muted-foreground hover:text-foreground",
                )}
                style={active ? { backgroundColor: color } : {}}
              >
                {label}
                <span className={cn("text-[10px] rounded-full px-1 min-w-[16px] text-center", active ? "bg-white/20" : "bg-secondary")}>
                  {count}
                </span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-border mx-0.5" />

          <Select value={String(filterCampanha)} onValueChange={v => setFilterCampanha(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="h-7 text-xs w-[160px]">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {activeCampaigns.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CAMPAIGN_COLOR }} />
                    {c.title}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>

        {/* Row 3: legend */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckSquare className="w-3 h-3" style={{ color: "#3B82F6" }} />
            <span>Tarefas</span>
            <div className="flex gap-0.5 ml-0.5">
              {(["pendente", "em-andamento", "concluida", "atrasada"] as TaskStatus[]).map(s => (
                <Tooltip key={s}>
                  <TooltipTrigger>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[s] }} />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">{STATUS_LABELS[s]}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Users className="w-3 h-3" style={{ color: MEETING_COLOR }} />
            <span>Reuniões</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ImageIcon className="w-3 h-3" style={{ color: "#E1306C" }} />
            <span>Posts</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CAMPAIGN_COLOR }} />
            <span>Vinculado a campanha</span>
          </div>
        </div>
      </div>

      {/* ── Calendar body ── */}
      <div className="flex-1 overflow-auto">

        {viewMode === "month" ? (
          /* ── MONTH VIEW ── */
          <div className="flex flex-col h-full">
            {/* Weekday headers — sticky */}
            <div className="grid grid-cols-7 border-b border-border bg-background sticky top-0 z-10 shrink-0">
              {WEEK_DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 flex-1">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[100px] border-b border-r border-border bg-secondary/10" />
              ))}
              {monthDays.map(day => {
                const events    = getEventsForDay(day);
                const today     = isToday(day);
                const dateStr   = format(day, "yyyy-MM-dd");
                const expanded  = expandedDays.has(dateStr);
                const visible   = expanded ? events : events.slice(0, 3);
                const overflow  = events.length - 3;

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "min-h-[100px] border-b border-r border-border p-1.5 transition-colors",
                      today && "bg-gold/5",
                      events.length === 0 && "cursor-pointer hover:bg-secondary/20",
                    )}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono transition-colors",
                        today ? "bg-gold text-black font-bold" : "text-muted-foreground",
                      )}>
                        {format(day, "d")}
                      </div>
                      {events.length > 0 && (
                        <span className="text-[8px] text-muted-foreground font-mono">{events.length}</span>
                      )}
                    </div>

                    {/* Event pills */}
                    <div className="space-y-0.5">
                      {visible.map((e, idx) => (
                        <EventPill
                          key={`${e.kind}-${e.data.id}-${idx}`}
                          e={e} campaigns={campaigns}
                          onClick={() => handleEventClick(e)}
                        />
                      ))}
                      {!expanded && overflow > 0 && (
                        <button
                          onClick={ev => { ev.stopPropagation(); toggleExpand(dateStr); }}
                          className="w-full flex items-center gap-0.5 px-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown className="w-2.5 h-2.5" /> +{overflow} mais
                        </button>
                      )}
                      {expanded && events.length > 3 && (
                        <button
                          onClick={ev => { ev.stopPropagation(); toggleExpand(dateStr); }}
                          className="w-full flex items-center gap-0.5 px-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronUp className="w-2.5 h-2.5" /> Menos
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        ) : (
          /* ── WEEK VIEW ── */
          <div className="flex flex-col h-full">
            {/* Day headers — sticky */}
            <div className="grid grid-cols-7 border-b border-border bg-background sticky top-0 z-10 shrink-0">
              {weekDayList.map(day => {
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "text-center py-2 px-1 border-r border-border last:border-r-0",
                      today && "bg-gold/10",
                    )}
                  >
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {WEEK_DAYS[getDay(day)]}
                    </div>
                    <div className={cn(
                      "mx-auto mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold",
                      today ? "bg-gold text-black" : "text-foreground",
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 capitalize">
                      {format(day, "MMM", { locale: ptBR })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Event columns */}
            <div className="grid grid-cols-7 flex-1">
              {weekDayList.map(day => {
                const events = getEventsForDay(day);
                const today  = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "border-r border-border last:border-r-0 p-2 space-y-1.5 min-h-[300px]",
                      today && "bg-gold/5",
                      events.length === 0 && "cursor-pointer hover:bg-secondary/20",
                    )}
                  >
                    {events.length === 0 ? (
                      <div className="h-12 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground/30">livre</span>
                      </div>
                    ) : (
                      events.map((e, idx) => (
                        <WeekEventCard
                          key={`${e.kind}-${e.data.id}-${idx}`}
                          e={e} campaigns={campaigns}
                          onClick={() => handleEventClick(e)}
                        />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} defaultDueDate={selectedDate} />
      <TaskSidePanel task={selectedTask} open={!!selectedTask} onOpenChange={b => { if (!b) setSelectedTask(null); }} onUpdate={reload} />
    </div>
  );
};

export default CalendarPage;
