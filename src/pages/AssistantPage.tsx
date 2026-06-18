import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { AIPanel } from "@/components/pro";
import { buildInsights, type InsightTone } from "@/lib/assistant";
import { useRealtime } from "@/hooks/use-realtime";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<InsightTone, string> = {
  gold: "text-gold",
  success: "text-success",
  danger: "text-danger",
  neutral: "text-foreground",
};

export default function AssistantPage() {
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick(t => t + 1), []);
  useRealtime(reload);
  useEffect(() => { reload(); }, [reload]);

  // recomputa os insights a cada sync de dados
  const insights = useMemo(() => buildInsights(), [tick]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-sub border border-gold/30 bg-gold/[0.08] text-gold">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Assistente Mr. Lion</h1>
          <p className="text-sm text-muted-foreground">Insights do painel + chat com IA (Cloudflare Workers AI)</p>
        </div>
      </div>

      {/* Insights derivados dos dados do Hub */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {insights.map(ins => (
          <div key={ins.label} className="rounded-card border border-border bg-card p-4 shadow-soft">
            <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{ins.label}</div>
            <div className={cn("tnum mt-2 text-2xl font-bold leading-none", TONE_CLASS[ins.tone])}>{ins.value}</div>
            {ins.hint && <div className="mt-1.5 text-[11px] text-muted-foreground">{ins.hint}</div>}
          </div>
        ))}
      </motion.div>

      {/* Chat */}
      <AIPanel className="h-[calc(100vh-20rem)] min-h-[440px]" />
    </div>
  );
}
