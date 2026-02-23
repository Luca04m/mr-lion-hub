import { Task, STATUS_LABELS, TaskStatus } from "@/lib/types";
import { motion } from "framer-motion";

interface StatsBarProps {
  tasks: Task[];
}

export const StatsBar = ({ tasks }: StatsBarProps) => {
  const stats: { key: TaskStatus; label: string; count: number; className: string }[] = [
    { key: "pendente", label: STATUS_LABELS.pendente, count: tasks.filter(t => t.status === "pendente").length, className: "status-pendente" },
    { key: "em-andamento", label: STATUS_LABELS["em-andamento"], count: tasks.filter(t => t.status === "em-andamento").length, className: "status-em-andamento" },
    { key: "concluida", label: STATUS_LABELS.concluida, count: tasks.filter(t => t.status === "concluida").length, className: "status-concluida" },
    { key: "atrasada", label: STATUS_LABELS.atrasada, count: tasks.filter(t => t.status === "atrasada").length, className: "status-atrasada" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`rounded-lg border p-4 ${s.className}`}
        >
          <div className="text-2xl font-bold">{s.count}</div>
          <div className="text-xs opacity-80">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
};
