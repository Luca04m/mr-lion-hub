// ─── Formatação BR canônica (portada do covil) ───────────────────────────
// R$ 1.234,56 · R$ 1,4 mi · R$ 890 mil · deltas +12,4% / −3,1%
// Minus tipográfico (−, U+2212) para alinhar em tabular-nums.

const MINUS = '−'

function brNum(v: number, dec = 0): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

/** R$ completo: R$ 1.234,56 */
export function brl(v: number, dec = 2): string {
  const s = brNum(Math.abs(v), dec)
  return `${v < 0 ? MINUS : ''}R$ ${s}`
}

/** R$ compacto: R$ 1,4 mi · R$ 890 mil · R$ 540 */
export function brlCompact(v: number): string {
  const a = Math.abs(v)
  const sign = v < 0 ? MINUS : ''
  if (a >= 1_000_000) return `${sign}R$ ${brNum(a / 1_000_000, 1)} mi`
  if (a >= 1_000) return `${sign}R$ ${brNum(Math.round(a / 1_000))} mil`
  return `${sign}R$ ${brNum(a)}`
}

/** valor em milhares, sem símbolo: 74,1 */
export function mil(v: number, dec = 1): string {
  const sign = v < 0 ? MINUS : ''
  return `${sign}${brNum(Math.abs(v) / 1_000, dec)}`
}

/** percentual: 18,4% */
export function pct(v: number, dec = 1): string {
  const sign = v < 0 ? MINUS : ''
  return `${sign}${brNum(Math.abs(v), dec)}%`
}

/** delta com sinal explícito: +12,4% / −3,1% */
export function deltaPct(v: number, dec = 1): string {
  const sign = v < 0 ? MINUS : '+'
  return `${sign}${brNum(Math.abs(v), dec)}%`
}

/** delta monetário com sinal: +R$ 3,4 mil / −R$ 2,3 mil */
export function deltaBrl(v: number): string {
  const sign = v < 0 ? MINUS : '+'
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${sign}R$ ${brNum(a / 1_000_000, 1)} mi`
  if (a >= 1_000) return `${sign}R$ ${brNum(Math.round(a / 1_000))} mil`
  return `${sign}R$ ${brNum(a)}`
}

/** número simples BR */
export function num(v: number, dec = 0): string {
  const sign = v < 0 ? MINUS : ''
  return `${sign}${brNum(Math.abs(v), dec)}`
}

/** multiplicador: 4,9× */
export function mult(v: number, dec = 1): string {
  return `${brNum(v, dec)}×`
}

/** razão: 3,4 : 1 */
export function ratio(v: number, dec = 1): string {
  return `${brNum(v, dec)} : 1`
}

export { MINUS }
