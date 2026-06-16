/**
 * AreaChartCard — card com area chart (recharts) fill gradiente MUITO sutil + linha fina gold.
 * Header com title + slot opcional (ex: SegmentedControl). Tooltip neutro sóbrio.
 *
 * Uso:
 *   <AreaChartCard
 *     title="Receita por dia"
 *     data={[{ label: "Seg", value: 1200 }, { label: "Ter", value: 1800 }]}
 *     footer={<span className="text-muted-foreground">Últimos 7 dias</span>}
 *     action={<SegmentedControl value={p} onChange={setP} options={opts} />}
 *   />
 */
import * as React from "react";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AreaChartDatum {
  label: string;
  value: number;
}

export interface AreaChartCardProps {
  title: string;
  data: AreaChartDatum[];
  height?: number;
  /** Cor da linha + base do gradiente. Default = gold token. */
  color?: string;
  footer?: React.ReactNode;
  /** Slot no header à direita (ex: SegmentedControl). */
  action?: React.ReactNode;
  className?: string;
  /** Formata o valor no eixo Y e tooltip. Default = toLocaleString pt-BR. */
  valueFormatter?: (value: number) => string;
  /** Texto do empty-state quando a série está toda zerada/vazia. */
  emptyLabel?: string;
}

const defaultFormatter = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-sub border border-border bg-popover px-3 py-2 shadow-elevated">
      <div className="mb-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="tnum text-sm font-semibold text-foreground">
        {formatter(payload[0].value)}
      </div>
    </div>
  );
}

export function AreaChartCard({
  title,
  data,
  height = 220,
  color = "hsl(var(--gold))",
  footer,
  action,
  className,
  valueFormatter = defaultFormatter,
  emptyLabel = "Sem dados no período",
}: AreaChartCardProps) {
  const gradId = useId();
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);

  return (
    <div
      className={cn(
        "flex flex-col rounded-card border border-border bg-card p-5 shadow-soft",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>

      <div style={{ width: "100%", height }}>
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-sub border border-dashed border-border/60 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{emptyLabel}</p>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={valueFormatter}
            />
            <Tooltip
              cursor={{ stroke: color, strokeOpacity: 0.4, strokeDasharray: "3 3" }}
              content={<ChartTooltip formatter={valueFormatter} />}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 3, fill: color, stroke: "hsl(var(--card))", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

      {footer && <div className="mt-4 text-xs">{footer}</div>}
    </div>
  );
}

export default AreaChartCard;
