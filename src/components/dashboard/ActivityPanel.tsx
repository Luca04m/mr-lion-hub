import { Activity } from "@/lib/types";
import { Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface ActivityPanelProps {
  activities: Activity[];
}

const ACTION_LABELS: Record<string, string> = {
  status_change: "alterou status",
  notes_update: "editou notas",
  task_created: "criou tarefa",
  task_deleted: "excluiu tarefa",
};

function getActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith("field_update:")) return `editou ${action.split(":")[1]}`;
  return action;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export const ActivityPanel = ({ activities }: ActivityPanelProps) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma atividade registrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.slice(0, 50).map((act, i) => (
        <motion.div
          key={act.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.02 }}
          className="gradient-card border border-border rounded-lg p-3 flex items-center gap-3"
        >
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="text-gold font-medium">{act.userName}</span>{" "}
              <span className="text-muted-foreground">{getActionLabel(act.action)}</span>{" "}
              <span className="text-foreground font-medium">"{act.taskTitle}"</span>
            </p>
            {act.action === "status_change" && act.oldValue && act.newValue && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                {act.oldValue} <ArrowRight className="w-3 h-3" /> {act.newValue}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formatTime(act.createdAt)}</span>
        </motion.div>
      ))}
    </div>
  );
};
