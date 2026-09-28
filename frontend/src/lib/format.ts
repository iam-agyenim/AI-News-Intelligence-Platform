export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
export const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`
