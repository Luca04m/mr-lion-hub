import { useState, useEffect, useCallback } from "react";
import { getTasks, updateTask, logActivity, getUser, createTask } from "@/lib/store";
import { Task, TaskStatus, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, AREA_COLORS } from "@/lib/types";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { GripVertical, Plus, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskSidePanel } from "@/components/TaskSidePanel";

const COLUMNS: TaskStatus[] = ["pendente", "em-andamento", "concluida", "atrasada"];

const KanbanPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [sidePanelTask, setSidePanelTask] = useState<Task | null>(null);
  const userName = getUser() || "";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const reload = useCallback(() => setTasks(getTasks()), []);
  useEffect(() => { reload(); }, [reload]);

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
      updateTask(taskId, { status: targetStatus });
      logActivity({ taskId, taskTitle: task.title, userName, action: "status_change", oldValue: task.status, newValue: targetStatus });
      if (targetStatus === "concluida") {
        confetti({ particleCount: 80, spread: 60, colors: ["#D4A843", "#F5D77A", "#22C55E", "#6366F1"], origin: { y: 0.6 } });
        toast.success(`"${task.title}" concluída! 🎉`);
      } else {
        toast.info(`Movido para ${STATUS_LABELS[targetStatus]}`);
      }
      reload();
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Kanban</h1>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {COLUMNS.map(status => {
            const columnTasks = tasks.filter(t => t.status === status);
            return <KanbanColumn key={status} status={status} tasks={columnTasks} onCardClick={t => setSidePanelTask(t)} />;
          })}
        </div>
        <DragOverlay>
          {activeTask && <KanbanCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>
      <TaskSidePanel task={sidePanelTask} open={!!sidePanelTask} onOpenChange={b => { if (!b) setSidePanelTask(null); }} onUpdate={() => { reload(); if (sidePanelTask) setSidePanelTask(getTasks().find(t => t.id === sidePanelTask.id) || null); }} />
    </div>
  );
};

function KanbanColumn({ status, tasks, onCardClick }: { status: TaskStatus; tasks: Task[]; onCardClick: (t: Task) => void }) {
  const { setNodeRef } = useSortable({ id: status });
  return (
    <div ref={setNodeRef} className="bg-card/50 rounded-lg border border-border min-h-[300px] flex flex-col"
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
  const isLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "concluida";
  return (
    <div onClick={onClick} className={`bg-card rounded-md border border-border p-2.5 cursor-grab active:cursor-grabbing hover:border-gold/20 transition-all ${isDragging ? "shadow-lg shadow-gold/10 border-gold/30" : ""}`}>
      <div className="flex items-start gap-1.5">
        <GripVertical className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
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
            {task.dueDate && (
              <span className={`text-[9px] font-mono ${isLate ? "text-red-400" : "text-muted-foreground"}`}>{task.dueDate}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KanbanPage;
