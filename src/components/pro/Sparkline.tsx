/**
 * Sparkline — micro line+area chart em SVG inline puro (sem libs externas).
 * Determinístico (mesmo input => mesmo path). Usado dentro de MetricCard ou inline.
 *
 * Uso:
 *   <Sparkline data={[3,5,4,8,7,12]} color="hsl(var(--gold))" height={36} />
 *   <Sparkline data={revenue} color="hsl(var(--success))" fillOpacity={0.18} />
 */
import { useId } from "react";

export interface SparklineProps {
  /** Série numérica a plotar. >= 2 pontos para desenhar linha. */
  data: number[];
  /** Cor da linha + base do gradiente de área. Default = gold token. */
  color?: string;
  height?: number;
  width?: number;
  /** Opacidade do topo do fill da área (sutil). Default 0.10. */
  fillOpacity?: number;
  className?: string;
  /** Espessura da linha (fina). Default 1.5. */
  strokeWidth?: number;
}

export function Sparkline({
  data,
  color = "hsl(var(--gold))",
  height = 36,
  width = 120,
  fillOpacity = 0.1,
  className,
  strokeWidth = 1.5,
}: SparklineProps) {
  const gradId = useId();

  if (!data || data.length === 0) {
    return <svg width={width} height={height} className={className} aria-hidden />;
  }

  const pad = strokeWidth; // headroom para não cortar o stroke
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;

  const x = (i: number) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);

  const linePath = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L${x(n - 1).toFixed(2)} ${height} L${x(0).toFixed(
    2,
  )} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
