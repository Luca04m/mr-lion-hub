/**
 * Barrel dos componentes "pro" do design system Mr. Lion Hub.
 * Import: import { MetricCard, AreaChartCard, StatusPill } from "@/components/pro";
 */
export { Sparkline, type SparklineProps } from "./Sparkline";
export { MetricCard, type MetricCardProps, type MetricAccent } from "./MetricCard";
export { AreaChartCard, type AreaChartCardProps, type AreaChartDatum } from "./AreaChartCard";
export { StatusPill, type StatusPillProps, type StatusTone } from "./StatusPill";
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from "./SegmentedControl";
export { AIPanel, type AIPanelProps } from "./AIPanel";
export { ThemeToggle, type ThemeToggleProps } from "./ThemeToggle";
export {
  initTheme,
  applyTheme,
  setTheme,
  getStoredTheme,
  THEME_STORAGE_KEY,
  type HubTheme,
} from "./theme";
