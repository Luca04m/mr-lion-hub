import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getTasks, getUser, updateTask, deleteTask, createTask, logActivity, exportTasksMarkdown } from "@/lib/store";
import { Task, TaskStatus, TaskPriority, TEAM_MEMBERS, AREAS, AREA_COLORS, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, TaskAttachment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, X, ChevronDown, ChevronRight, Trash2, Check, Download, Pencil, Paperclip, FileText, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { TaskSidePanel } from "@/components/TaskSidePanel";

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
  const userName = getUser() || "";
  const [searchParams] = useSearchParams();

  const reload = useCallback(() => setTasks(getTasks()), []);
  useEffect(() => { reload(); }, [reload]);

  // Handle URL params
  useEffect(() => {
    const status = searchParams.get("status");
    if (status) setStatusFilter(status);
    const highlight = searchParams.get("highlight");
    if (highlight) {
      const id = Number(highlight);
      setHighlightId(id);
      setTimeout(() => {
        document.getElementById(`task-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightId(null), 3000);
      }, 300);
    }
  }, [searchParams]);

  // Get all unique tags
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
    const newStatus: TaskStatus = task.status === "concluida" ? "pendente" : "concluida";
    updateTask(task.id, { status: newStatus });
    logActivity({ taskId: task.id, taskTitle: task.title, userName, action: "status_change", oldValue: task.status, newValue: newStatus });
    if (newStatus === "concluida") {
      confetti({ particleCount: 80, spread: 60, colors: ["#D4A843", "#F5D77A", "#22C55E", "#6366F1"], origin: { y: 0.7 } });
      toast.success(`"${task.title}" concluída! 🎉`);
    }
    reload();
  };

  const handleStatusChange = (id: number, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    updateTask(id, { status });
    logActivity({ taskId: id, taskTitle: task.title, userName, action: "status_change", oldValue: task.status, newValue: status });
    if (status === "concluida") {
      confetti({ particleCount: 80, spread: 60, colors: ["#D4A843", "#F5D77A", "#22C55E", "#6366F1"], origin: { y: 0.7 } });
      toast.success(`"${task.title}" concluída! 🎉`);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm pb-4 -mx-4 px-4 md:-mx-6 md:px-6 pt-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Tarefas</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">{doneCount}/{tasks.length} concluídas</span>
              <div className="w-24 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div className="h-full rounded-full gradient-gold transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-mono text-gold">{progress}%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExport} className="text-xs gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Exportar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar tarefas em Markdown</TooltipContent>
            </Tooltip>
            <Button onClick={() => { setEditingTask(undefined); setDialogOpen(true); }} className="gradient-gold text-primary-foreground font-semibold glow-pulse" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[
            { key: "all", label: "Total", count: tasks.length, color: "hsl(var(--gold))" },
            { key: "pendente", label: "Pendentes", count: tasks.filter(t => t.status === "pendente").length, color: STATUS_COLORS.pendente },
            { key: "em-andamento", label: "Em Andamento", count: tasks.filter(t => t.status === "em-andamento").length, color: STATUS_COLORS["em-andamento"] },
            { key: "concluida", label: "Concluídas", count: tasks.filter(t => t.status === "concluida").length, color: STATUS_COLORS.concluida },
            { key: "atrasada", label: "Atrasadas", count: tasks.filter(t => t.status === "atrasada").length, color: STATUS_COLORS.atrasada },
          ].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${statusFilter === s.key ? "border-current opacity-100" : "border-transparent opacity-60 hover:opacity-80"}`}
              style={{ color: s.color }}>
              {s.label} <span className="font-mono">{s.count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input id="task-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar... ( / )" className="pl-8 h-8 text-sm bg-secondary/40" />
          </div>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {allTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[110px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas tags</SelectItem>
                {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
          {filtered.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              expanded={expandedId === task.id}
              highlighted={highlightId === task.id}
              onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
              onToggleComplete={() => handleToggleComplete(task)}
              onStatusChange={(s) => handleStatusChange(task.id, s)}
              onDelete={() => handleDelete(task.id)}
              onEdit={() => { setEditingTask(task); setDialogOpen(true); }}
              onNotesChange={(n) => handleInlineNotes(task.id, n)}
              onDecisionChange={(d) => handleInlineDecision(task.id, d)}
              onTitleClick={() => { setSidePanelTask(task); }}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-gold hover:underline mt-2">Limpar filtros</button>
            )}
          </div>
        )}
      </div>

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} onSave={handleSave} />
      <TaskSidePanel task={sidePanelTask} open={!!sidePanelTask} onOpenChange={b => { if (!b) setSidePanelTask(null); }} onUpdate={() => { reload(); if (sidePanelTask) setSidePanelTask(getTasks().find(t => t.id === sidePanelTask.id) || null); }} />
    </div>
  );
};

// Task Row Component
function TaskRow({ task, expanded, highlighted, onToggleExpand, onToggleComplete, onStatusChange, onDelete, onEdit, onNotesChange, onDecisionChange, onTitleClick }: {
  task: Task; expanded: boolean; highlighted?: boolean;
  onToggleExpand: () => void; onToggleComplete: () => void;
  onStatusChange: (s: TaskStatus) => void; onDelete: () => void; onEdit: () => void;
  onNotesChange: (n: string) => void; onDecisionChange: (d: string) => void; onTitleClick: () => void;
}) {
  const isDone = task.status === "concluida";
  return (
    <motion.div id={`task-${task.id}`} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      className={`bg-card rounded-lg border transition-all ${highlighted ? "border-gold/50 ring-1 ring-gold/20" : "border-border hover:border-gold/20"}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={onToggleExpand}>
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
          <SelectTrigger className="w-[120px] h-7 text-[10px] bg-transparent border-none p-0 px-1.5" onClick={e => e.stopPropagation()}>
            <span style={{ color: STATUS_COLORS[task.status] }}>{STATUS_LABELS[task.status]}</span>
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
                {task.dueDate && <span>Vencimento: <span className="font-mono text-foreground">{task.dueDate}</span></span>}
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

// Task Form Dialog
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

// Link attachments inline editor for TaskFormDialog
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
