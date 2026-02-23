import { useState, useEffect } from "react";
import { getTasks } from "@/lib/store";
import { Task, STATUS_COLORS, AREA_COLORS, PRIORITY_LABELS } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CalendarPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => { setTasks(getTasks()); }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart); // 0=Sun

  const tasksWithDue = tasks.filter(t => t.dueDate);

  const getTasksForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return tasksWithDue.filter(t => t.dueDate === dateStr);
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
            {s === "pendente" ? "Pendente" : s === "em-andamento" ? "Em Andamento" : s === "concluida" ? "Concluída" : "Atrasada"}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-2 border-b border-border">{d}</div>
          ))}
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-border bg-secondary/20" />
          ))}
          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className={`min-h-[80px] border-b border-r border-border p-1.5 ${today ? "bg-gold/5" : ""}`}>
                <span className={`text-xs font-mono ${today ? "text-gold font-bold" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, 3).map(t => (
                    <Tooltip key={t.id}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate cursor-pointer hover:bg-secondary/50"
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
    </div>
  );
};

export default CalendarPage;
