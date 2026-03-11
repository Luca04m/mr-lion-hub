import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getTasks, getUser, updateTask, deleteTask, createTask, logActivity, exportTasksMarkdown, getActivities, getRole, setRole, getCampaigns } from "@/lib/store";
import { Task, TaskStatus, TaskPriority, TEAM_MEMBERS, AREAS, AREA_COLORS, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, TaskAttachment, Activity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, X, ChevronDown, ChevronRight, Trash2, Check, Download, Pencil, Paperclip, FileText, Link2, GripVertical, ChevronLeft, Activity as ActivityIcon, ArrowRight, AlertCircle, Clock, CheckCircle2, User, Users, ListTodo, LayoutGrid, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { TaskSidePanel } from "@/components/TaskSidePanel";
import { useRealtime } from "@/hooks/use-realtime";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLUMNS: TaskStatus[] = ["pendente", "em-andamento", "concluida", "atrasada"];

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [myTasks, setMyTasks] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sidePanelTask, setSidePanelTask] = useState<Task | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("minhas");
  const userName = getUser() || "";
  const [searchParams] = useSearchParams();

  const reload = useCallback(() => setTasks(getTasks()), []);
  useEffect(() => { reload(); }, [reload]);
  useRealtime(reload);

  // Handle URL params
  useEffect(() => {
    const status = searchParams.get("status");
    if (status) setStatusFilter(status);
    const highlight = searchParams.get("highlight");
    if (highlight) {
      const id = Number(highlight);
      setHighlightId(id);
      setActiveTab("lista");
      setTimeout(() => {
        document.getElementById(`task-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightId(null), 3000);
      }, 300);
    }
  }, [searchParams]);

  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))];

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (areaFilter !== "all" && t.area !== areaFilter) return false;
    if (responsibleFilter !== "all" && !t.responsible.includes(responsibleFilter)) return false;
    if (tagFilter !== "all" && !(t.tags || []).includes(tagFilter)) return false;
    if (myTasks && !t.responsible.includes(userName)) return false;
    return true;
  });

  const hasFilters = search || statusFilter !== "all" || areaFilter !== "all" || responsibleFilter !== "all" || tagFilter !== "all" || myTasks;
  const doneCount = tasks.filter(t => t.status === "concluida").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const handleToggleComplete = (task: Task) => {
    const prevStatus = task.status;
    const newStatus: TaskStatus = prevStatus === "concluida" ? "pendente" : "concluida";
    updateTask(task.id, { status: newStatus });
    logActivity({ taskId: task.id, taskTitle: task.title, userName, action: "status_change", oldValue: prevStatus, newValue: newStatus });
    if (newStatus === "concluida") {
      confetti({ particleCount: 80, spread: 60, colors: ["#D4A843", "#F5D77A", "#22C55E", "#6366F1"], origin: { y: 0.7 } });
      toast.success(`"${task.title}" concluída! 🎉`, {
        duration: 5000,
        action: {
          label: "Desfazer",
          onClick: () => { updateTask(task.id, { status: prevStatus }); reload(); },
        },
      });
    }
    reload();
  };

  const handleStatusChange = (id: number, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const prevStatus = task.status;
    updateTask(id, { status });
    logActivity({ taskId: id, taskTitle: task.title, userName, action: "status_change", oldValue: prevStatus, newValue: status });
    if (status === "concluida") {
      confetti({ particleCount: 80, spread: 60, colors: ["#D4A843", "#F5D77A", "#22C55E", "#6366F1"], origin: { y: 0.7 } });
      toast.success(`"${task.title}" concluída! 🎉`, {
        duration: 5000,
        action: {
          label: "Desfazer",
          onClick: () => { updateTask(id, { status: prevStatus }); reload(); },
        },
      });
    } else {
      toast.info(`Status atualizado para ${STATUS_LABELS[status]}`);
    }
    reload();
  };

  const handleDelete = (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    deleteTask(id);
    logActivity({ taskId: id, taskTitle: task.title, userName, action: "task_deleted", oldValue: task.title, newValue: null });
    toast.success("Tarefa excluída");
    reload();
  };

  const handleSave = (data: Partial<Task>) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      logActivity({ taskId: editingTask.id, taskTitle: data.title || editingTask.title, userName, action: "field_update:edit", oldValue: "", newValue: "" });
      toast.success("Tarefa atualizada");
    } else {
      const t = createTask({
        title: data.title || "", detail: data.detail || "", responsible: data.responsible || [],
        priority: data.priority || "media", area: data.area || "Comercial",
        status: data.status || "pendente", dependencies: data.dependencies || [],
        decision: data.decision || null, notes: data.notes || "", dueDate: data.dueDate || null,
        createdBy: userName, isOriginal: false, tags: data.tags || [], attachments: data.attachments || [],
      });
      logActivity({ taskId: t.id, taskTitle: t.title, userName, action: "task_created", oldValue: null, newValue: t.title });
      toast.success("Tarefa criada");
    }
    setEditingTask(undefined);
    setDialogOpen(false);
    reload();
  };

  const handleInlineNotes = (id: number, notes: string) => { updateTask(id, { notes }); reload(); };
  const handleInlineDecision = (id: number, decision: string) => { updateTask(id, { decision: decision || null }); reload(); };

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setAreaFilter("all"); setResponsibleFilter("all"); setTagFilter("all"); setMyTasks(false);
  };

  const handleExport = () => {
    navigator.clipboard.writeText(exportTasksMarkdown());
    toast.success("Tarefas exportadas para o clipboard ✓");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault(); setEditingTask(undefined); setDialogOpen(true);
      }
      if (e.key === "Escape") setDialogOpen(false);
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault(); document.getElementById("task-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const lateCount = tasks.filter(t => t.status === "atrasada").length;
  const inProgressCount = tasks.filter(t => t.status === "em-andamento").length;
  const pendingCount = tasks.filter(t => t.status === "pendente").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Tarefas</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{doneCount}/{tasks.length} concluídas</span>
            <div className="w-28 h-2 rounded-full bg-surface-elevated overflow-hidden">
              <div className="h-full rounded-full gradient-gold transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-mono text-gold font-semibold">{progress}%</span>
          </div>
        </div>
        <div className="flex gap-2 self-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleExport} className="text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exportar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copiar tarefas em Markdown</TooltipContent>
          </Tooltip>
          <Button onClick={() => { setEditingTask(undefined); setDialogOpen(true); }} className="gradient-gold text-primary-foreground font-semibold glow-pulse" size="sm">
            <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Nova Tarefa</span><span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats Strip */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mt-1">
        {[
          { label: "Atrasadas", count: lateCount, color: "#EF4444", icon: AlertCircle },
          { label: "Andamento", count: inProgressCount, color: "#3B82F6", icon: Clock },
          { label: "Pendentes", count: pendingCount, color: "#F59E0B", icon: Clock },
          { label: "Concluídas", count: doneCount, color: "#22C55E", icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs shrink-0 transition-all"
            style={{ borderColor: `${s.color}30`, backgroundColor: `${s.color}08`, color: s.color }}>
            <s.icon className="w-3 h-3" />
            <span className="font-bold font-mono">{s.count}</span>
            <span className="opacity-75">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/40 h-auto gap-0.5 w-full overflow-x-auto flex justify-start p-1">
          <TabsTrigger value="minhas" className="data-[state=active]:bg-accent data-[state=active]:text-gold text-xs whitespace-nowrap flex items-center gap-1.5">
            <User className="w-3 h-3 shrink-0" />Minhas
            {lateCount > 0 && <span className="ml-0.5 text-[9px] font-mono font-bold bg-red-500/20 text-red-400 px-1 py-0.5 rounded-full">{lateCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="lista" className="data-[state=active]:bg-accent data-[state=active]:text-gold text-xs whitespace-nowrap flex items-center gap-1.5">
            <ListTodo className="w-3 h-3 shrink-0" />Lista
          </TabsTrigger>
          <TabsTrigger value="kanban" className="data-[state=active]:bg-accent data-[state=active]:text-gold text-xs whitespace-nowrap flex items-center gap-1.5">
            <LayoutGrid className="w-3 h-3 shrink-0" />Kanban
          </TabsTrigger>
          <TabsTrigger value="pessoa" className="data-[state=active]:bg-accent data-[state=active]:text-gold text-xs whitespace-nowrap flex items-center gap-1.5">
            <Users className="w-3 h-3 shrink-0" />Pessoa
          </TabsTrigger>
          <TabsTrigger value="area" className="data-[state=active]:bg-accent data-[state=active]:text-gold text-xs whitespace-nowrap flex items-center gap-1.5">
            <Tag className="w-3 h-3 shrink-0" />Área
          </TabsTrigger>
          <TabsTrigger value="atividade" className="data-[state=active]:bg-accent data-[state=active]:text-gold text-xs whitespace-nowrap flex items-center gap-1.5">
            <ActivityIcon className="w-3 h-3 shrink-0" />Atividade
          </TabsTrigger>
        </TabsList>

        {/* TAB: Lista */}
        <TabsContent value="lista">
          <ListTabContent
            tasks={tasks} filtered={filtered} search={search} setSearch={setSearch}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            areaFilter={areaFilter} setAreaFilter={setAreaFilter}
            responsibleFilter={responsibleFilter} setResponsibleFilter={setResponsibleFilter}
            tagFilter={tagFilter} setTagFilter={setTagFilter}
            myTasks={myTasks} setMyTasks={setMyTasks}
            allTags={allTags} hasFilters={hasFilters} clearFilters={clearFilters}
            expandedId={expandedId} setExpandedId={setExpandedId}
            highlightId={highlightId}
            onToggleComplete={handleToggleComplete}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onEdit={(t) => { setEditingTask(t); setDialogOpen(true); }}
            onInlineNotes={handleInlineNotes}
            onInlineDecision={handleInlineDecision}
            onTitleClick={(t) => setSidePanelTask(t)}
            userName={userName}
          />
        </TabsContent>

        {/* TAB: Minhas Tarefas */}
        <TabsContent value="minhas">
          <MyTasksTabContent tasks={tasks} userName={userName} onToggleComplete={handleToggleComplete} onStatusChange={handleStatusChange} onDelete={handleDelete} onEdit={(t) => { setEditingTask(t); setDialogOpen(true); }} onTitleClick={(t) => setSidePanelTask(t)} reload={reload} />
        </TabsContent>

        {/* TAB: Kanban */}
        <TabsContent value="kanban">
          <KanbanTabContent tasks={tasks} reload={reload} userName={userName} onCardClick={t => setSidePanelTask(t)} />
        </TabsContent>

        {/* TAB: Por Pessoa */}
        <TabsContent value="pessoa">
          <PeopleTabContent tasks={tasks} reload={reload} userName={userName} onTaskClick={t => setSidePanelTask(t)} onCreateTask={handleSave} />
        </TabsContent>

        {/* TAB: Por Área */}
        <TabsContent value="area">
          <AreasTabContent tasks={tasks} onTaskClick={t => setSidePanelTask(t)} />
        </TabsContent>


        {/* TAB: Atividade */}
        <TabsContent value="atividade">
          <ActivityTabContent />
        </TabsContent>
      </Tabs>

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} onSave={handleSave} />
      <TaskSidePanel task={sidePanelTask} open={!!sidePanelTask} onOpenChange={b => { if (!b) setSidePanelTask(null); }} onUpdate={() => { reload(); if (sidePanelTask) setSidePanelTask(getTasks().find(t => t.id === sidePanelTask.id) || null); }} />
    </div>
  );
};

// ═══════════════════════════════════════════════════
// TAB: Minhas Tarefas
// ═══════════════════════════════════════════════════
function MyTasksTabContent({ tasks, userName, onToggleComplete, onStatusChange, onDelete, onEdit, onTitleClick, reload }: any) {
  const myTasks = tasks.filter((t: Task) => t.responsible.includes(userName));
  const pending = myTasks.filter((t: Task) => t.status === "pendente");
  const inProgress = myTasks.filter((t: Task) => t.status === "em-andamento");
  const late = myTasks.filter((t: Task) => t.status === "atrasada");
  const done = myTasks.filter((t: Task) => t.status === "concluida");
  const doneCount = done.length;
  const pct = myTasks.length > 0 ? Math.round((doneCount / myTasks.length) * 100) : 0;

  const renderGroup = (label: string, items: Task[], color: string) => (
    items.length > 0 ? (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>{items.length}</span>
        </div>
        <div className="space-y-1">
          {items.map((task: Task) => {
            const due = formatDue(task.dueDate);
            return (
              <div key={task.id} className="bg-card rounded-lg border border-border px-3 py-2.5 flex items-center gap-2 hover:border-gold/20 transition-all cursor-pointer group">
                <button onClick={() => onToggleComplete(task)} className="shrink-0">
                  {task.status === "concluida" ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-muted-foreground/30 group-hover:border-gold/50 transition-colors" />
                  )}
                </button>
                <span className="font-mono text-xs text-gold shrink-0">#{task.id}</span>
                <span className="text-sm flex-1 truncate cursor-pointer hover:text-gold transition-colors" onClick={() => onTitleClick(task)}>{task.title}</span>
                <Badge variant="outline" className="text-[9px] hidden sm:inline-flex" style={{ borderColor: `${AREA_COLORS[task.area] || "#888"}40`, color: AREA_COLORS[task.area] || "#888" }}>
                  {task.area}
                </Badge>
                {task.campanha_id && (() => { const c = getCampaigns().find(x => x.id === task.campanha_id); return c ? <Badge variant="outline" className="text-[9px] hidden lg:inline-flex border-gold/30 text-gold gap-0.5"><span>⚡</span>{c.title.split(" ")[0]}</Badge> : null; })()}
                {due && <span className="text-[10px] font-mono shrink-0 hidden md:inline" style={{ color: due.color }}>{due.label}</span>}
              </div>
            );
          })}
        </div>
      </div>
    ) : null
  );

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-card rounded-lg border border-border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center text-lg font-bold text-primary-foreground shrink-0">{userName.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold truncate">{userName}</h2>
            <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{myTasks.length} tarefas · {doneCount} concluídas</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 sm:w-20 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                  <div className="h-full rounded-full gradient-gold" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-mono text-gold">{pct}%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 justify-around sm:justify-end flex-wrap">
          {([["pendente", STATUS_COLORS.pendente], ["em-andamento", STATUS_COLORS["em-andamento"]], ["atrasada", STATUS_COLORS.atrasada]] as const).map(([s, c]) => (
            <div key={s} className="text-center min-w-[40px]">
              <div className="text-sm font-bold font-mono" style={{ color: c }}>{myTasks.filter((t: Task) => t.status === s).length}</div>
              <div className="text-[9px] text-muted-foreground">{STATUS_LABELS[s]}</div>
            </div>
          ))}
        </div>
      </div>

      {myTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tarefa atribuída a você</p>
      ) : (
        <>
          {renderGroup("Atrasadas", late, STATUS_COLORS.atrasada)}
          {renderGroup("Em Andamento", inProgress, STATUS_COLORS["em-andamento"])}
          {renderGroup("Pendentes", pending, STATUS_COLORS.pendente)}
          {renderGroup("Concluídas", done, STATUS_COLORS.concluida)}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TAB: Lista
// ═══════════════════════════════════════════════════
function ListTabContent({ tasks, filtered, search, setSearch, statusFilter, setStatusFilter, areaFilter, setAreaFilter, responsibleFilter, setResponsibleFilter, tagFilter, setTagFilter, myTasks, setMyTasks, allTags, hasFilters, clearFilters, expandedId, setExpandedId, highlightId, onToggleComplete, onStatusChange, onDelete, onEdit, onInlineNotes, onInlineDecision, onTitleClick, userName }: any) {
  return (
    <div className="space-y-3 mt-3">
      {/* Status pills */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: "all", label: "Total", count: tasks.length, color: "hsl(var(--gold))" },
          { key: "pendente", label: "Pendentes", count: tasks.filter((t: Task) => t.status === "pendente").length, color: STATUS_COLORS.pendente },
          { key: "em-andamento", label: "Em Andamento", count: tasks.filter((t: Task) => t.status === "em-andamento").length, color: STATUS_COLORS["em-andamento"] },
          { key: "concluida", label: "Concluídas", count: tasks.filter((t: Task) => t.status === "concluida").length, color: STATUS_COLORS.concluida },
          { key: "atrasada", label: "Atrasadas", count: tasks.filter((t: Task) => t.status === "atrasada").length, color: STATUS_COLORS.atrasada },
        ].map(s => (
          <button key={s.key} onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${statusFilter === s.key ? "border-current opacity-100" : "border-transparent opacity-60 hover:opacity-80"}`}
            style={{ color: s.color }}>
            {s.label} <span className="font-mono">{s.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input id="task-search" value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Buscar... ( / )" className="pl-8 h-8 text-sm bg-secondary/40" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas áreas</SelectItem>
              {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
            <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Resp." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {allTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[90px] sm:w-[110px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {allTags.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <button onClick={() => setMyTasks(!myTasks)} className={`px-2.5 py-1 rounded-md text-xs border transition-all ${myTasks ? "border-gold/50 text-gold bg-accent/40" : "border-border text-muted-foreground hover:text-foreground"}`}>
            Minhas
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-1">
        <AnimatePresence>
          {filtered.map((task: Task) => (
            <TaskRow
              key={task.id}
              task={task}
              expanded={expandedId === task.id}
              highlighted={highlightId === task.id}
              onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
              onToggleComplete={() => onToggleComplete(task)}
              onStatusChange={(s: TaskStatus) => onStatusChange(task.id, s)}
              onDelete={() => onDelete(task.id)}
              onEdit={() => onEdit(task)}
              onNotesChange={(n: string) => onInlineNotes(task.id, n)}
              onDecisionChange={(d: string) => onInlineDecision(task.id, d)}
              onTitleClick={() => onTitleClick(task)}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-14 bg-card/40 rounded-xl border border-border/50">
            <div className="w-12 h-12 rounded-full bg-secondary/60 flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa encontrada</p>
            {hasFilters ? (
              <button onClick={clearFilters} className="text-xs text-gold hover:underline mt-2 flex items-center gap-1 mx-auto">
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            ) : (
              <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Nova Tarefa" ou pressione <kbd className="text-[9px] bg-secondary px-1 py-0.5 rounded font-mono">N</kbd> para começar</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TAB: Kanban
// ═══════════════════════════════════════════════════
function KanbanTabContent({ tasks, reload, userName, onCardClick }: { tasks: Task[]; reload: () => void; userName: string; onCardClick: (t: Task) => void }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === Number(event.active.id));
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = Number(active.id);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let targetStatus: TaskStatus | null = null;
    if (COLUMNS.includes(over.id as TaskStatus)) {
      targetStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === Number(over.id));
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus && targetStatus !== task.status) {
      const prevStatus = task.status;
      updateTask(taskId, { status: targetStatus });
      logActivity({ taskId, taskTitle: task.title, userName, action: "status_change", oldValue: prevStatus, newValue: targetStatus });
      if (targetStatus === "concluida") {
        confetti({ particleCount: 80, spread: 60, colors: ["#D4A843", "#F5D77A", "#22C55E", "#6366F1"], origin: { y: 0.6 } });
        toast.success(`"${task.title}" concluída! 🎉`, {
          duration: 5000,
          action: {
            label: "Desfazer",
            onClick: () => { updateTask(taskId, { status: prevStatus }); reload(); },
          },
        });
      } else {
        toast.info(`Movido para ${STATUS_LABELS[targetStatus]}`);
      }
      reload();
    }
  };

  return (
    <div className="mt-3 overflow-x-auto -mx-2 px-2 pb-2">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 min-w-[500px] md:min-w-0">
          {COLUMNS.map(status => {
            const columnTasks = tasks.filter(t => t.status === status);
            return <KanbanColumn key={status} status={status} tasks={columnTasks} onCardClick={onCardClick} />;
          })}
        </div>
        <DragOverlay>
          {activeTask && <KanbanCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({ status, tasks, onCardClick }: { status: TaskStatus; tasks: Task[]; onCardClick: (t: Task) => void }) {
  const { setNodeRef } = useSortable({ id: status });
  return (
    <div ref={setNodeRef} className="bg-card/50 rounded-lg border border-border min-h-[200px] md:min-h-[300px] flex flex-col"
      style={{ borderTopWidth: 3, borderTopColor: STATUS_COLORS[status] }}>
      <div className="px-3 py-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
        <span className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 px-2 pb-2 space-y-1.5 overflow-y-auto max-h-[60vh]">
          {tasks.map(task => <SortableKanbanCard key={task.id} task={task} onCardClick={onCardClick} />)}
          {tasks.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-md p-4 text-center text-xs text-muted-foreground">
              Arraste tarefas aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableKanbanCard({ task, onCardClick }: { task: Task; onCardClick: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard task={task} onClick={() => onCardClick(task)} />
    </div>
  );
}

function KanbanCard({ task, isDragging, onClick }: { task: Task; isDragging?: boolean; onClick?: () => void }) {
  const due = formatDue(task.dueDate);
  const campaign = task.campanha_id ? getCampaigns().find(x => x.id === task.campanha_id) : null;
  return (
    <div onClick={onClick} className={`bg-card rounded-md border border-border p-2.5 cursor-grab active:cursor-grabbing hover:border-gold/20 transition-all ${isDragging ? "shadow-lg shadow-gold/10 border-gold/30" : ""}`}>
      <div className="flex items-start gap-1.5">
        <GripVertical className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {campaign && <p className="text-[9px] text-gold flex items-center gap-0.5 mt-0.5 truncate"><span>⚡</span>{campaign.title}</p>}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: `${PRIORITY_COLORS[task.priority]}40`, color: PRIORITY_COLORS[task.priority] }}>
              {PRIORITY_LABELS[task.priority]}
            </Badge>
            <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: `${AREA_COLORS[task.area] || "#888"}40`, color: AREA_COLORS[task.area] || "#888" }}>
              {task.area}
            </Badge>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                {task.responsible.slice(0, 3).map(r => (
                  <div key={r} className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[8px] font-bold text-gold">{r.charAt(0)}</div>
                ))}
              </div>
              {(task.attachments || []).some(a => a.type === "link" || a.url) && (
                <span className="text-[9px] text-gold">🔗</span>
              )}
            </div>
            {due && (
              <span className="text-[9px] font-mono" style={{ color: due.color }}>{due.label}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TAB: Por Pessoa
// ═══════════════════════════════════════════════════
function PeopleTabContent({ tasks, reload, userName, onTaskClick, onCreateTask }: { tasks: Task[]; reload: () => void; userName: string; onTaskClick: (t: Task) => void; onCreateTask: (d: Partial<Task>) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMember, setDialogMember] = useState("");
  const activities = getActivities();

  const handleSave = (data: Partial<Task>) => {
    onCreateTask({ ...data, responsible: data.responsible?.length ? data.responsible : [dialogMember] });
    setDialogOpen(false);
  };

  return (
    <div className="mt-3">
      <Tabs defaultValue={TEAM_MEMBERS[0]}>
        <TabsList className="bg-secondary/40 mb-4 h-auto gap-1 w-full overflow-x-auto flex justify-start p-1">
          {TEAM_MEMBERS.map(m => (
            <TabsTrigger key={m} value={m} className="data-[state=active]:bg-accent data-[state=active]:text-gold text-xs">{m}</TabsTrigger>
          ))}
        </TabsList>
        {TEAM_MEMBERS.map(member => {
          const memberTasks = tasks.filter(t => t.responsible.includes(member));
          const done = memberTasks.filter(t => t.status === "concluida").length;
          const pct = memberTasks.length > 0 ? Math.round((done / memberTasks.length) * 100) : 0;
          const role = getRole(member);

          const heatmap = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            const dayStr = d.toISOString().split("T")[0];
            return activities.filter(a => a.userName === member && a.createdAt.startsWith(dayStr)).length;
          });

          return (
            <TabsContent key={member} value={member}>
              <div className="bg-card rounded-lg border border-border p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full gradient-gold flex items-center justify-center text-lg sm:text-xl font-bold text-primary-foreground shrink-0">{member.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold">{member}</h2>
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
                <div className="flex gap-2 flex-wrap">
                  {(["pendente", "em-andamento", "concluida", "atrasada"] as TaskStatus[]).map(s => (
                    <div key={s} className="text-center">
                      <div className="text-sm font-bold font-mono" style={{ color: STATUS_COLORS[s] }}>
                        {memberTasks.filter(t => t.status === s).length}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{STATUS_LABELS[s].split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
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
                  <div key={t.id} onClick={() => onTaskClick(t)}
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
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TAB: Por Área
// ═══════════════════════════════════════════════════
function AreasTabContent({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  return (
    <div className="mt-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AREAS.map(area => {
          const areaTasks = tasks.filter(t => t.area === area);
          if (areaTasks.length === 0) return null;
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
                      <Badge key={s} variant="outline" className="text-[9px] font-mono h-4" style={{ borderColor: `${STATUS_COLORS[s]}40`, color: STATUS_COLORS[s] }}>
                        {count} {STATUS_LABELS[s].split(" ")[0].toLowerCase()}
                      </Badge>
                    );
                  })}
                </div>
              </button>

              <AnimatePresence>
                {expanded && areaTasks.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-border px-3 py-2 space-y-1">
                      {areaTasks.map(t => (
                        <div key={t.id} onClick={() => onTaskClick(t)}
                          className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-secondary/30 rounded px-1">
                          <span className="font-mono text-gold">#{t.id}</span>
                          <span className="flex-1 truncate">{t.title}</span>
                          <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: `${STATUS_COLORS[t.status]}40`, color: STATUS_COLORS[t.status] }}>
                            {STATUS_LABELS[t.status]}
                          </Badge>
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
}


// ═══════════════════════════════════════════════════
// TAB: Atividade
// ═══════════════════════════════════════════════════
function getActionIcon(action: string) {
  if (action === "task_created") return Plus;
  if (action === "task_deleted") return Trash2;
  if (action === "status_change") return ArrowRight;
  if (action.includes("update") || action.includes("edit")) return Pencil;
  return FileText;
}

function getActionBadge(action: string): { label: string; color: string } {
  if (action === "task_created") return { label: "Criação", color: "#22C55E" };
  if (action === "task_deleted") return { label: "Exclusão", color: "#EF4444" };
  if (action === "status_change") return { label: "Status", color: "#3B82F6" };
  if (action.includes("update") || action.includes("edit")) return { label: "Edição", color: "#F59E0B" };
  return { label: "Ação", color: "#6B7280" };
}

function formatAction(a: Activity): string {
  if (a.action === "task_created") return `criou "${a.taskTitle}"`;
  if (a.action === "task_deleted") return `excluiu "${a.taskTitle}"`;
  if (a.action === "status_change") {
    if (a.newValue === "concluida") return `concluiu "${a.taskTitle}" 🎉`;
    return `moveu "${a.taskTitle}" para ${a.newValue}`;
  }
  if (a.action === "notes_update") return `atualizou notas de "${a.taskTitle}"`;
  if (a.action.startsWith("field_update")) return `editou "${a.taskTitle}"`;
  return `ação em "${a.taskTitle}"`;
}

function ActivityTabContent() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [personFilter, setPersonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => { setActivities(getActivities()); }, []);

  const filtered = activities.filter(a => {
    if (personFilter !== "all" && a.userName !== personFilter) return false;
    if (typeFilter !== "all") {
      if (typeFilter === "created" && a.action !== "task_created") return false;
      if (typeFilter === "status" && a.action !== "status_change") return false;
      if (typeFilter === "edit" && !a.action.includes("update") && !a.action.includes("edit")) return false;
      if (typeFilter === "deleted" && a.action !== "task_deleted") return false;
    }
    return true;
  });

  return (
    <div className="mt-3">
      <div className="flex items-center justify-end mb-3 gap-2">
        <Select value={personFilter} onValueChange={setPersonFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Pessoa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="created">Criação</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="edit">Edição</SelectItem>
            <SelectItem value="deleted">Exclusão</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        {filtered.map(a => {
          const Icon = getActionIcon(a.action);
          const badge = getActionBadge(a.action);
          return (
            <div key={a.id} className="bg-card rounded-lg border border-border px-3 py-2.5 flex flex-col sm:flex-row sm:items-start gap-2 hover:border-gold/20 transition-all">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-gold shrink-0 mt-0.5">
                  {a.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="text-gold font-medium">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">{formatAction(a)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-9 sm:ml-0">
                <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: `${badge.color}40`, color: badge.color }}>
                  {badge.label}
                </Badge>
                <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {formatDistanceToNow(new Date(a.createdAt), { locale: ptBR, addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <ActivityIcon className="w-10 h-10 text-gold/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">As ações da equipe aparecerão aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Due Date Helper
// ═══════════════════════════════════════════════════
function formatDue(dueDate: string | null | undefined): { label: string; color: string } | null {
  if (!dueDate) return null;
  const d = differenceInDays(new Date(dueDate + "T12:00:00"), new Date());
  if (d < 0) return { label: "Atrasada", color: "#EF4444" };
  if (d === 0) return { label: "Hoje", color: "#F59E0B" };
  if (d === 1) return { label: "Amanhã", color: "#F59E0B" };
  if (d <= 7) return { label: `${d}d`, color: "#6B7280" };
  return { label: format(new Date(dueDate + "T12:00:00"), "dd/MM"), color: "#4B5563" };
}

// ═══════════════════════════════════════════════════
// Task Row Component
// ═══════════════════════════════════════════════════
function TaskRow({ task, expanded, highlighted, onToggleExpand, onToggleComplete, onStatusChange, onDelete, onEdit, onNotesChange, onDecisionChange, onTitleClick }: {
  task: Task; expanded: boolean; highlighted?: boolean;
  onToggleExpand: () => void; onToggleComplete: () => void;
  onStatusChange: (s: TaskStatus) => void; onDelete: () => void; onEdit: () => void;
  onNotesChange: (n: string) => void; onDecisionChange: (d: string) => void; onTitleClick: () => void;
}) {
  const isDone = task.status === "concluida";
  const due = formatDue(task.dueDate);
  return (
    <motion.div id={`task-${task.id}`} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      className={`bg-card rounded-lg border transition-all ${highlighted ? "border-gold/50 ring-1 ring-gold/20" : "border-border hover:border-gold/20"}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2.5 cursor-pointer" onClick={onToggleExpand}>
        <button onClick={e => { e.stopPropagation(); onToggleComplete(); }}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isDone ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-gold/60"}`}>
          {isDone && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className="font-mono text-xs text-gold shrink-0">#{task.id}</span>
        <span onClick={e => { e.stopPropagation(); onTitleClick(); }}
          className={`text-sm font-medium flex-1 truncate hover:text-gold cursor-pointer ${isDone ? "line-through opacity-50" : ""}`}>{task.title}</span>
        <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex" style={{ borderColor: `${PRIORITY_COLORS[task.priority]}40`, color: PRIORITY_COLORS[task.priority] }}>
          {PRIORITY_LABELS[task.priority]}
        </Badge>
        <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex" style={{ borderColor: `${AREA_COLORS[task.area] || "#888"}40`, color: AREA_COLORS[task.area] || "#888" }}>
          {task.area}
        </Badge>
        {(task.tags || []).slice(0, 1).map(tag => (
          <Badge key={tag} variant="secondary" className="text-[9px] shrink-0 hidden lg:inline-flex">{tag}</Badge>
        ))}
        {task.campanha_id && (() => { const c = getCampaigns().find(x => x.id === task.campanha_id); return c ? <Badge variant="outline" className="text-[9px] shrink-0 hidden xl:inline-flex border-gold/30 text-gold gap-0.5"><span>⚡</span>{c.title.split("—")[0].trim()}</Badge> : null; })()}
        {(() => {
          const linkCount = (task.attachments || []).filter(a => a.type === "link" || a.url).length;
          const fileCount = (task.attachments || []).filter(a => a.type !== "link" && !a.url && a.data).length;
          return (
            <>
              {linkCount > 0 && <span className="inline-flex items-center gap-0.5 text-[10px] text-gold shrink-0">🔗{linkCount}</span>}
              {fileCount > 0 && <Paperclip className="w-3 h-3 text-gold shrink-0" />}
            </>
          );
        })()}
        <div className="hidden sm:flex -space-x-1">
          {task.responsible.slice(0, 3).map(r => (
            <div key={r} className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-gold">{r.charAt(0)}</div>
          ))}
        </div>
        <Select value={task.status} onValueChange={(v) => { onStatusChange(v as TaskStatus); }}>
          <SelectTrigger className="w-[90px] sm:w-[120px] h-7 text-[10px] bg-transparent border-none p-0 px-1" onClick={e => e.stopPropagation()}>
            <span style={{ color: STATUS_COLORS[task.status] }} className="truncate">{STATUS_LABELS[task.status]}</span>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
              <SelectItem key={s} value={s}><span style={{ color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
              {task.detail && <p className="text-sm text-muted-foreground">{task.detail}</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Notas</label>
                  <textarea className="w-full bg-secondary/40 border border-border rounded-md p-2 text-sm resize-none h-16 focus:border-gold/50 focus:outline-none"
                    defaultValue={task.notes} onBlur={e => onNotesChange(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Decisão registrada</label>
                  <Separator className="mb-2" />
                  <input className="w-full bg-secondary/40 border border-border rounded-md p-2 text-sm focus:border-gold/50 focus:outline-none"
                    defaultValue={task.decision || ""} onBlur={e => onDecisionChange(e.target.value)} />
                  {task.decision && <Badge className="mt-1 bg-gold/10 text-gold border-gold/20 text-[10px]">{task.decision}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {task.dueDate && <span>Vencimento: <span className="font-mono" style={due ? { color: due.color } : {}}>{task.dueDate}{due && due.label !== task.dueDate ? ` (${due.label})` : ""}</span></span>}
                {task.dependencies.length > 0 && <span>Deps: {task.dependencies.map(d => <span key={d} className="font-mono text-gold">#{d} </span>)}</span>}
              </div>
              <div className="flex gap-2">
                <Tooltip><TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={onEdit} className="text-xs text-muted-foreground"><Pencil className="w-3 h-3 mr-1" />Editar</Button>
                </TooltipTrigger><TooltipContent>Editar tarefa</TooltipContent></Tooltip>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Task Form Dialog
// ═══════════════════════════════════════════════════
export function TaskFormDialog({ open, onOpenChange, task, onSave, defaultDueDate, defaultResponsible }: {
  open: boolean; onOpenChange: (b: boolean) => void; task?: Task; onSave: (d: Partial<Task>) => void;
  defaultDueDate?: string; defaultResponsible?: string[];
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [responsible, setResponsible] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [area, setArea] = useState("Comercial");
  const [status, setStatus] = useState<TaskStatus>("pendente");
  const [dueDate, setDueDate] = useState("");
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title); setDetail(task.detail); setResponsible(task.responsible);
      setPriority(task.priority); setArea(task.area); setStatus(task.status);
      setDueDate(task.dueDate || ""); setDecision(task.decision || ""); setNotes(task.notes);
      setTags(task.tags || []); setAttachments(task.attachments || []);
    } else {
      setTitle(""); setDetail(""); setResponsible(defaultResponsible || []); setPriority("media");
      setArea("Comercial"); setStatus("pendente"); setDueDate(defaultDueDate || ""); setDecision(""); setNotes("");
      setTags([]); setAttachments([]);
    }
  }, [task, open, defaultDueDate, defaultResponsible]);

  const toggleMember = (m: string) => {
    setResponsible(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments(prev => [...prev, { name: file.name, data: reader.result as string, type: file.type }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold">{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título (min. 3 caracteres)" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary/40" />
          <Textarea placeholder="Descrição detalhada" value={detail} onChange={e => setDetail(e.target.value)} className="bg-secondary/40 min-h-[60px]" />
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Responsáveis</label>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_MEMBERS.map(m => (
                <button key={m} onClick={() => toggleMember(m)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-all ${responsible.includes(m) ? "border-gold/50 text-gold bg-accent/40" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Prioridade</label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(p => (
                    <SelectItem key={p} value={p}><span style={{ color: PRIORITY_COLORS[p] }}>{PRIORITY_LABELS[p]}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Área</label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AREAS.map(a => <SelectItem key={a} value={a}><span style={{ color: AREA_COLORS[a] }}>{a}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
              <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
                    <SelectItem key={s} value={s}><span style={{ color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Vencimento</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-secondary/40" />
            </div>
          </div>
          <Input placeholder="Decisão registrada" value={decision} onChange={e => setDecision(e.target.value)} className="bg-secondary/40" />
          <Textarea placeholder="Notas" value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary/40 min-h-[50px]" />
          
          {/* Tags */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tags</label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                  {tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Adicionar tag (Enter)"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              className="bg-secondary/40 h-7 text-xs"
              onKeyDown={e => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  setTags([...tags, tagInput.trim()]);
                  setTagInput("");
                }
              }}
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Documentos</label>
            {attachments.filter(a => a.type !== "link").map((att, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="truncate flex-1">{att.name}</span>
                <button onClick={() => setAttachments(attachments.filter(a => a !== att))} className="text-destructive"><X className="w-3 h-3" /></button>
              </div>
            ))}
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" /> Anexar documento
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleFileAttach} />
            </label>
          </div>

          {/* Link Attachments */}
          <LinkAttachmentsEditor attachments={attachments} setAttachments={setAttachments} />

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => onSave({ title, detail, responsible, priority, area, status, dueDate: dueDate || null, decision: decision || null, notes, tags, attachments })}
              disabled={title.trim().length < 3} className="gradient-gold text-primary-foreground font-semibold">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Link attachments inline editor
function LinkAttachmentsEditor({ attachments, setAttachments }: { attachments: TaskAttachment[]; setAttachments: (a: TaskAttachment[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const links = attachments.filter(a => a.type === "link" || a.url);

  const handleAdd = () => {
    if (!label.trim() || !url.trim()) return;
    setAttachments([...attachments, { name: label.trim(), data: "", type: "link", label: label.trim(), url: url.trim() }]);
    setLabel(""); setUrl(""); setAdding(false);
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">Anexos (Links)</label>
      {links.map((att, i) => (
        <div key={i} className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1.5 mb-1">
          <span className="shrink-0">🔗</span>
          <span className="truncate flex-1 text-gold">{att.label || att.name}</span>
          <button onClick={() => setAttachments(attachments.filter(a => a !== att))} className="text-destructive"><X className="w-3 h-3" /></button>
        </div>
      ))}
      {adding ? (
        <div className="space-y-1.5 p-2 bg-secondary/20 rounded-md border border-border">
          <Input placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} className="bg-secondary/40 h-7 text-xs" />
          <Input placeholder="URL (https://...)" value={url} onChange={e => setUrl(e.target.value)} className="bg-secondary/40 h-7 text-xs" />
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleAdd} disabled={!label.trim() || !url.trim()} className="h-6 text-[10px] gradient-gold text-primary-foreground">Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setLabel(""); setUrl(""); }} className="h-6 text-[10px]">Cancelar</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all">
          <Plus className="w-3.5 h-3.5" /> Adicionar Link
        </button>
      )}
    </div>
  );
}

export default TasksPage;
