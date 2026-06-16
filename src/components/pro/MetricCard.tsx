/**
 * MetricCard — card de KPI (o card hero do âncora "Total Revenue").
 * Sóbrio: borda + sombra neutra sutil, valor em --gold discreto. SEM glow colorido.
 *
 * Uso:
 *   <MetricCard label="Receita Total" value="R$ 21.700" accent="gold"
 *     delta={{ value: "+12,4%", direction: "up" }} sparkline={[8,9,11,10,14,17]} />
 *
 *   <MetricCard hero accent="gold" label="Faturamento 30d" value="R$ 84.200"
 *     icon={<DollarSign className="h-4 w-4" />}
 *     delta={{ value: "+8,1%", direction: "up" }} sparkline={rev} />
 */
import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

export type MetricAccent = "gold" | "cta" | "success" | "danger" | "plain";

export interface MetricCardProps {
  label: string;
  /** Valor JÁ formatado (string). Recebe .tnum automaticamente. */
  value: string;
  delta?: {
    value: string;
    direction: "up" | "down" | "flat";
  };
  sparkline?: number[];
  icon?: React.ReactNode;
  /** Cor do accent (sparkline, ícone, valor no hero). Default 'gold'. */
  accent?: MetricAccent;
  /** hero = card de destaque com borda mais marcada + valor maior em --gold. */
  hero?: boolean;
  className?: string;
}

// Accent sóbrio: cor da linha do sparkline + classe de texto do ícone.
// 'cta' deixa de ser vermelho vibrante -> neutro/gold discreto.
const ACCENT: Record<MetricAccent, { color: string; text: string }> = {
  gold: { color: "hsl(var(--gold))", text: "text-gold" },
  cta: { color: "hsl(var(--gold))", text: "text-gold" },
  success: { color: "hsl(var(--success))", text: "text-success" },
  danger: { color: "hsl(var(--danger))", text: "text-danger" },
  plain: { color: "hsl(var(--muted-foreground))", text: "text-muted-foreground" },
};

export function MetricCard({
  label,
  value,
  delta,
  sparkline,
  icon,
  accent = "gold",
  hero = false,
  className,
}: MetricCardProps) {
  const a = ACCENT[accent];

  const deltaColor =
    delta?.direction === "up"
      ? "text-success bg-success/10 border-success/30"
      : delta?.direction === "down"
        ? "text-danger bg-danger/10 border-danger/30"
        : "text-muted-foreground bg-muted/40 border-border";

  const DeltaIcon =
    delta?.direction === "up"
      ? ArrowUpRight
      : delta?.direction === "down"
        ? ArrowDownRight
        : Minus;

  // hero = destaque SÓBRIO: borda mais marcada + leve elevação. Sem box-shadow colorido.
  const heroValueClass = hero && accent !== "plain" ? "text-gold" : "text-foreground";

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-card border bg-card p-5 transition-colors",
        hero
          ? "border-gold/40 shadow-elevated"
          : "border-border shadow-soft",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className={cn("shrink-0", a.text)}>{icon}</span>}
        <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div
            className={cn(
              "tnum font-bold leading-none",
              hero ? "text-3xl" : "text-2xl",
              heroValueClass,
            )}
          >
            {value}
          </div>
          {delta && (
            <div
              className={cn(
                "tnum mt-2 inline-flex items-center gap-1 rounded-sub border px-2 py-0.5 text-[11px] font-medium",
                deltaColor,
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {delta.value}
            </div>
          )}
        </div>
      </div>

      {sparkline && sparkline.length > 1 && (
        <div className="mt-4 -mx-1">
          <Sparkline
            data={sparkline}
            color={a.color}
            width={hero ? 220 : 160}
            height={hero ? 44 : 34}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

export default MetricCard;
