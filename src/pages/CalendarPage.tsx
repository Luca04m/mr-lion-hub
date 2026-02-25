import { useState, useEffect, useCallback } from "react";
import { getTasks, createTask, logActivity, getUser } from "@/lib/store";
import { Task, STATUS_COLORS, AREA_COLORS, PRIORITY_LABELS, TaskStatus, STATUS_LABELS } from "@/lib/types";
import { useRealtime } from "@/hooks/use-realtime";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskFormDialog } from "@/pages/TasksPage";
import { TaskSidePanel } from "@/components/TaskSidePanel";

const CalendarPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const userName = getUser() || "";

  const reload = useCallback(() => setTasks(getTasks()), []);
  useEffect(() => { reload(); }, [reload]);
  useRealtime(reload);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const tasksWithDue = tasks.filter(t => t.dueDate);

  const getTasksForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return tasksWithDue.filter(t => t.dueDate === dateStr);
  };

  const handleDayClick = (day: Date) => {
    const dayTasks = getTasksForDay(day);
    if (dayTasks.length === 0) {
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

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Calendário</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs text-gold border-gold/30 h-7">
            Hoje
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3">
        {(["pendente", "em-andamento", "concluida", "atrasada"] as const).map(s => (
          <div key={s} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
            {STATUS_LABELS[s]}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-7">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-2 border-b border-border">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-border bg-secondary/20" />
          ))}
          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            const today = isToday(day);
            const isEmpty = dayTasks.length === 0;
            return (
              <div key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`min-h-[80px] border-b border-r border-border p-1.5 transition-colors ${today ? "bg-gold/5 border-gold/20" : ""} ${isEmpty ? "cursor-pointer hover:bg-secondary/30" : ""}`}
              >
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-mono ${today ? "text-gold font-bold" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  {today && <span className="text-[8px] font-mono text-gold uppercase">hoje</span>}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, 3).map(t => (
                    <Tooltip key={t.id}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate cursor-pointer hover:bg-secondary/50"
                          style={{ backgroundColor: `${STATUS_COLORS[t.status]}10`, color: STATUS_COLORS[t.status] }}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[t.status] }} />
                          <span className="truncate">{t.title}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover border-border text-xs">
                        <p className="font-medium">{t.title}</p>
                        <p className="text-muted-foreground">{t.responsible.join(", ")} · {PRIORITY_LABELS[t.priority]}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} defaultDueDate={selectedDate} />
      <TaskSidePanel task={selectedTask} open={!!selectedTask} onOpenChange={b => { if (!b) setSelectedTask(null); }} onUpdate={reload} />
    </div>
  );
};

export default CalendarPage;
