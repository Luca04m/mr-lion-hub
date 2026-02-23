import { useState, useEffect } from "react";
import { getActivities } from "@/lib/store";
import { Activity, TEAM_MEMBERS } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ArrowRight, CheckCircle, Pencil, Trash2, FileText, Activity as ActivityIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

const ActivityPage = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [personFilter, setPersonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    setActivities(getActivities());
    setLoading(false);
  }, []);

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

  if (loading) {
    return (
      <div><Skeleton className="h-8 w-40 mb-4" />
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Atividade</h1>
        <div className="flex gap-2">
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
      </div>

      <div className="space-y-1">
        {filtered.map(a => {
          const Icon = getActionIcon(a.action);
          const badge = getActionBadge(a.action);
          return (
            <div key={a.id} className="bg-card rounded-lg border border-border px-3 py-2.5 flex items-start gap-2.5 hover:border-gold/20 transition-all">
              <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-gold shrink-0 mt-0.5">
                {a.userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="text-gold font-medium">{a.userName}</span>{" "}
                  <span className="text-muted-foreground">{formatAction(a)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
};

export default ActivityPage;
