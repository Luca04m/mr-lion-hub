/**
 * StatusPill — tag tintada dessaturada (bg cor/12 + texto cor + borda cor/30).
 * Radius rounded-sub (~6px, retangular — NÃO pill). Nunca cor chapada.
 *
 * Uso:
 *   <StatusPill label="Ativo" tone="success" />
 *   <StatusPill label="Pausado" tone="warning" />
 *   <StatusPill label="Premium" tone="gold" />
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "gold";

export interface StatusPillProps {
  label: string;
  tone: StatusTone;
  className?: string;
  /** Ponto colorido à esquerda. Default true. */
  dot?: boolean;
}

const TONE: Record<StatusTone, string> = {
  success: "bg-success/[0.12] text-success border-success/30",
  danger: "bg-danger/[0.12] text-danger border-danger/30",
  warning: "bg-warning/[0.12] text-warning border-warning/30",
  info: "bg-info/[0.12] text-info border-info/30",
  gold: "bg-gold/[0.12] text-gold border-gold/30",
  neutral: "bg-muted/40 text-muted-foreground border-border",
};

const DOT: Record<StatusTone, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
  gold: "bg-gold",
  neutral: "bg-muted-foreground",
};

export function StatusPill({ label, tone, className, dot = true }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sub border px-2 py-0.5 text-[11px] font-medium leading-tight",
        TONE[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-[2px]", DOT[tone])} />}
      {label}
    </span>
  );
}

export default StatusPill;
