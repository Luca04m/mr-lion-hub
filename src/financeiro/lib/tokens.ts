// Tokens do design system do Hub (espelho do src/index.css) para uso em SVG.
// RESKIN SÓBRIO: aponta para os tokens CANÔNICOS do Hub
// (--gold / --success / --danger / --warning / --info / --muted-foreground).
// hsl(var(--x)) cascateia para SVG, então mantém paridade exata com o tema
// (light default + .theme-dark). SEM neon, SEM glow.
export const T = {
  gold: 'hsl(var(--gold))',
  goldBright: 'hsl(var(--gold))',        // sóbrio: bright == gold (sem brilho neon)
  goldDim: 'hsl(var(--muted-foreground))',
  goldDeep: 'hsl(var(--gold))',
  ok: 'hsl(var(--success))',
  warn: 'hsl(var(--warning))',
  crit: 'hsl(var(--danger))',
  info: 'hsl(var(--info))',
  neutral: 'hsl(var(--muted-foreground))',
  text: 'hsl(var(--foreground))',
  text2: 'hsl(var(--muted-foreground))',
  muted: 'hsl(var(--muted-foreground))',
  surface: 'hsl(var(--card))',
  overlay: 'hsl(var(--muted))',
  plot: 'hsl(var(--muted))',
  grid: 'hsl(var(--border) / 0.9)',
  goldA: (a: number) => `hsl(var(--gold) / ${a})`,
  critA: (a: number) => `hsl(var(--danger) / ${a})`,
  okA: (a: number) => `hsl(var(--success) / ${a})`,
}
