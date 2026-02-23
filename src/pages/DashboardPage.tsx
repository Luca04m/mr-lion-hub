import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, clearUser, getTasks, getActivities, getMeetings, updateTask, deleteTask, createTask, logActivity, createMeeting, deleteMeeting } from "@/lib/store";
import { Task, TaskStatus, Activity, Meeting, STATUS_LABELS, PRIORITY_LABELS, AREAS, TEAM_MEMBERS } from "@/lib/types";
import { TaskTable } from "@/components/dashboard/TaskTable";
import { TaskDialog } from "@/components/dashboard/TaskDialog";
import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { MeetingsPanel } from "@/components/dashboard/MeetingsPanel";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, ListTodo, Clock, FileText } from "lucide-react";
import { useEffect } from "react";

const DashboardPage = () => {
  const navigate = useNavigate();
  const userName = getUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userName) {
      navigate("/");
      return;
    }
    reload();
  }, [userName, navigate, refreshKey]);

  const reload = useCallback(() => {
    setTasks(getTasks());
    setActivities(getActivities());
    setMeetings(getMeetings());
  }, []);

  const handleStatusChange = (id: number, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !userName) return;
    const oldStatus = task.status;
    updateTask(id, { status });
    logActivity({ taskId: id, taskTitle: task.title, userName, action: "status_change", oldValue: oldStatus, newValue: status });
    setRefreshKey(k => k + 1);
  };

  const handleNotesChange = (id: number, notes: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !userName) return;
    updateTask(id, { notes });
    logActivity({ taskId: id, taskTitle: task.title, userName, action: "notes_update", oldValue: task.notes, newValue: notes });
    setRefreshKey(k => k + 1);
  };

  const handleDelete = (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !userName) return;
    deleteTask(id);
    logActivity({ taskId: id, taskTitle: task.title, userName, action: "task_deleted", oldValue: task.title, newValue: null });
    setRefreshKey(k => k + 1);
  };

  const handleCreateOrUpdate = (data: Partial<Task>) => {
    if (!userName) return;
    if (editingTask) {
      updateTask(editingTask.id, data);
      const changedFields = Object.keys(data);
      changedFields.forEach(field => {
        logActivity({
          taskId: editingTask.id, taskTitle: data.title || editingTask.title, userName,
          action: `field_update:${field}`,
          oldValue: String((editingTask as any)[field] ?? ""),
          newValue: String((data as any)[field] ?? ""),
        });
      });
    } else {
      const newTask = createTask({
        title: data.title || "",
        detail: data.detail || "",
        responsible: data.responsible || [],
        priority: data.priority || "media",
        area: data.area || "Geral",
        status: data.status || "pendente",
        dependencies: data.dependencies || [],
        decision: data.decision || null,
        notes: data.notes || "",
        createdBy: userName,
        isOriginal: false,
      });
      logActivity({ taskId: newTask.id, taskTitle: newTask.title, userName, action: "task_created", oldValue: null, newValue: newTask.title });
    }
    setEditingTask(undefined);
    setTaskDialogOpen(false);
    setRefreshKey(k => k + 1);
  };

  const handleMeetingCreate = (data: Omit<Meeting, "id" | "createdAt">) => {
    createMeeting(data);
    setRefreshKey(k => k + 1);
  };

  const handleMeetingDelete = (id: number) => {
    deleteMeeting(id);
    setRefreshKey(k => k + 1);
  };

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  if (!userName) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">
              <span className="font-display text-gold">MR. LION</span>
              <span className="text-muted-foreground font-normal"> — Tarefas</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Olá, <span className="text-foreground font-medium">{userName}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <StatsBar tasks={tasks} />

        <Tabs defaultValue="tasks" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="tasks" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <ListTodo className="w-4 h-4 mr-1.5" /> Tarefas
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Clock className="w-4 h-4 mr-1.5" /> Atividade
              </TabsTrigger>
              <TabsTrigger value="meetings" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <FileText className="w-4 h-4 mr-1.5" /> Reuniões
              </TabsTrigger>
            </TabsList>
            <Button
              onClick={() => { setEditingTask(undefined); setTaskDialogOpen(true); }}
              className="gradient-gold text-primary-foreground font-semibold hover:opacity-90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
            </Button>
          </div>

          <TabsContent value="tasks">
            <TaskTable
              tasks={tasks}
              userName={userName}
              onStatusChange={handleStatusChange}
              onNotesChange={handleNotesChange}
              onDelete={handleDelete}
              onEdit={(task) => { setEditingTask(task); setTaskDialogOpen(true); }}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityPanel activities={activities} />
          </TabsContent>

          <TabsContent value="meetings">
            <MeetingsPanel
              meetings={meetings}
              userName={userName}
              onCreate={handleMeetingCreate}
              onDelete={handleMeetingDelete}
            />
          </TabsContent>
        </Tabs>
      </main>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        onSave={handleCreateOrUpdate}
      />
    </div>
  );
};

export default DashboardPage;
