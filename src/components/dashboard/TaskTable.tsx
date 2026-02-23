import { useState } from "react";
import { Task, TaskStatus, STATUS_LABELS, PRIORITY_LABELS, AREAS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreVertical, Pencil, Trash2, StickyNote, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskTableProps {
  tasks: Task[];
  userName: string;
  onStatusChange: (id: number, status: TaskStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
  onDelete: (id: number) => void;
  onEdit: (task: Task) => void;
}

export const TaskTable = ({ tasks, userName, onStatusChange, onNotesChange, onDelete, onEdit }: TaskTableProps) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; task?: Task }>({ open: false });
  const [tempNotes, setTempNotes] = useState("");

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.detail.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterArea !== "all" && t.area !== filterArea) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const openNotes = (task: Task) => {
    setTempNotes(task.notes);
    setNotesDialog({ open: true, task });
  };

  const saveNotes = () => {
    if (notesDialog.task) {
      onNotesChange(notesDialog.task.id, tempNotes);
    }
    setNotesDialog({ open: false });
  };

  const statusColors: Record<TaskStatus, string> = {
    pendente: "status-pendente",
    "em-andamento": "status-em-andamento",
    concluida: "status-concluida",
    atrasada: "status-atrasada",
  };

  const priorityColors: Record<string, string> = {
    alta: "priority-alta",
    media: "priority-media",
    baixa: "priority-baixa",
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tarefa..."
            className="pl-9 bg-secondary/50 border-border"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] bg-secondary/50 border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[150px] bg-secondary/50 border-border">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px] bg-secondary/50 border-border">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma tarefa encontrada.
            </div>
          )}
          {filtered.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.03 }}
              className="gradient-card border border-border rounded-lg p-4 hover:border-gold/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{task.title}</h3>
                    <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {task.area}
                    </Badge>
                  </div>
                  {task.detail && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{task.detail}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      {task.responsible.map(r => (
                        <span key={r} className="text-xs bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">{r}</span>
                      ))}
                    </div>
                    {task.decision && (
                      <span className="text-xs text-gold">📋 {task.decision}</span>
                    )}
                    {task.notes && (
                      <span className="text-xs text-muted-foreground">📝 Notas</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={task.status}
                    onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}
                  >
                    <SelectTrigger className={`w-[140px] text-xs h-8 border ${statusColors[task.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openNotes(task)}>
                        <StickyNote className="w-4 h-4 mr-2" /> Notas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open} onOpenChange={(open) => setNotesDialog({ open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Notas — {notesDialog.task?.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={tempNotes}
            onChange={e => setTempNotes(e.target.value)}
            placeholder="Adicione notas..."
            className="min-h-[120px] bg-secondary/50 border-border"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNotesDialog({ open: false })}>Cancelar</Button>
            <Button onClick={saveNotes} className="gradient-gold text-primary-foreground">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
