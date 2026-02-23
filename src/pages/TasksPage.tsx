import { useState, useEffect, useCallback } from "react";
import { getTasks, getUser, updateTask, deleteTask, createTask, logActivity } from "@/lib/store";
import { Task, TaskStatus, TaskPriority, TEAM_MEMBERS, AREAS, AREA_COLORS, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, X, ChevronDown, ChevronRight, Trash2, Check, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [myTasks, setMyTasks] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const userName = getUser() || "";

  const reload = useCallback(() => setTasks(getTasks()), []);
  useEffect(() => { reload(); }, [reload]);

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (areaFilter !== "all" && t.area !== areaFilter) return false;
    if (responsibleFilter !== "all" && !t.responsible.includes(responsibleFilter)) return false;
    if (myTasks && !t.responsible.includes(userName)) return false;
    return true;
  });

  const hasFilters = search || statusFilter !== "all" || areaFilter !== "all" || responsibleFilter !== "all" || myTasks;
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
        createdBy: userName, isOriginal: false,
      });
      logActivity({ taskId: t.id, taskTitle: t.title, userName, action: "task_created", oldValue: null, newValue: t.title });
      toast.success("Tarefa criada");
    }
    setEditingTask(undefined);
    setDialogOpen(false);
    reload();
  };

  const handleInlineNotes = (id: number, notes: string) => {
    updateTask(id, { notes });
    reload();
  };

  const handleInlineDecision = (id: number, decision: string) => {
    updateTask(id, { decision: decision || null });
    reload();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setAreaFilter("all");
    setResponsibleFilter("all");
    setMyTasks(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setEditingTask(undefined);
        setDialogOpen(true);
      }
      if (e.key === "Escape") setDialogOpen(false);
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        document.getElementById("task-search")?.focus();
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
          <Button onClick={() => { setEditingTask(undefined); setDialogOpen(true); }} className="gradient-gold text-primary-foreground font-semibold glow-pulse" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
          </Button>
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
            <button
              key={s.key}
              onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                statusFilter === s.key ? "border-current opacity-100" : "border-transparent opacity-60 hover:opacity-80"
              }`}
              style={{ color: s.color }}
            >
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
              onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
              onToggleComplete={() => handleToggleComplete(task)}
              onStatusChange={(s) => handleStatusChange(task.id, s)}
              onDelete={() => handleDelete(task.id)}
              onEdit={() => { setEditingTask(task); setDialogOpen(true); }}
              onNotesChange={(n) => handleInlineNotes(task.id, n)}
              onDecisionChange={(d) => handleInlineDecision(task.id, d)}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma tarefa encontrada</div>
        )}
      </div>

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} onSave={handleSave} />
    </div>
  );
};

// Task Row Component
function TaskRow({ task, expanded, onToggleExpand, onToggleComplete, onStatusChange, onDelete, onEdit, onNotesChange, onDecisionChange }: {
  task: Task; expanded: boolean;
  onToggleExpand: () => void; onToggleComplete: () => void;
  onStatusChange: (s: TaskStatus) => void; onDelete: () => void; onEdit: () => void;
  onNotesChange: (n: string) => void; onDecisionChange: (d: string) => void;
}) {
  const isDone = task.status === "concluida";
  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      className="bg-card rounded-lg border border-border hover:border-gold/20 transition-all"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={onToggleExpand}>
        <button onClick={e => { e.stopPropagation(); onToggleComplete(); }}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isDone ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-gold/60"}`}>
          {isDone && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className="font-mono text-xs text-gold shrink-0">#{task.id}</span>
        <span className={`text-sm font-medium flex-1 truncate ${isDone ? "line-through opacity-50" : ""}`}>{task.title}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${PRIORITY_COLORS[task.priority]}15`, color: PRIORITY_COLORS[task.priority] }}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium hidden sm:inline" style={{ backgroundColor: `${AREA_COLORS[task.area] || "#888"}15`, color: AREA_COLORS[task.area] || "#888" }}>
          {task.area}
        </span>
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
                  <input className="w-full bg-secondary/40 border border-border rounded-md p-2 text-sm focus:border-gold/50 focus:outline-none"
                    defaultValue={task.decision || ""} onBlur={e => onDecisionChange(e.target.value)} />
                  {task.decision && <span className="inline-block mt-1 text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded">{task.decision}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {task.dueDate && <span>Vencimento: <span className="font-mono text-foreground">{task.dueDate}</span></span>}
                {task.dependencies.length > 0 && <span>Deps: {task.dependencies.map(d => <span key={d} className="font-mono text-gold">#{d} </span>)}</span>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={onEdit} className="text-xs text-muted-foreground">Editar</Button>
                <Button size="sm" variant="ghost" onClick={onDelete} className="text-xs text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Task Form Dialog
function TaskFormDialog({ open, onOpenChange, task, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void; task?: Task; onSave: (d: Partial<Task>) => void;
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

  useEffect(() => {
    if (task) {
      setTitle(task.title); setDetail(task.detail); setResponsible(task.responsible);
      setPriority(task.priority); setArea(task.area); setStatus(task.status);
      setDueDate(task.dueDate || ""); setDecision(task.decision || ""); setNotes(task.notes);
    } else {
      setTitle(""); setDetail(""); setResponsible([]); setPriority("media");
      setArea("Comercial"); setStatus("pendente"); setDueDate(""); setDecision(""); setNotes("");
    }
  }, [task, open]);

  const toggleMember = (m: string) => {
    setResponsible(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold">{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary/40" />
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
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => onSave({ title, detail, responsible, priority, area, status, dueDate: dueDate || null, decision: decision || null, notes })}
              disabled={!title.trim()} className="gradient-gold text-primary-foreground font-semibold">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TasksPage;
