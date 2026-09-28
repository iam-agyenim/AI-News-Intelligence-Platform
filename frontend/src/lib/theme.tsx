import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

/** Resolved color tokens (read from CSS custom properties) for canvas-based charts. */
export interface Tokens {
  surface: string; grid: string; text: string; text2: string; muted: string; border: string
  series: string[]; pos: string; neu: string; neg: string; seqLow: string; seqHigh: string
}

function readTokens(): Tokens {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim()
  return {
    surface: v('--surface'), grid: v('--grid'), text: v('--text'), text2: v('--text-2'), muted: v('--muted'),
    border: v('--border'),
    series: [1, 2, 3, 4, 5].map(i => v(`--series-${i}`)),
    pos: v('--pos'), neu: v('--neu'), neg: v('--neg'), seqLow: v('--seq-100'), seqHigh: v('--seq-700'),
  }
}

const Ctx = createContext<{ choice: ThemeChoice; setChoice: (c: ThemeChoice) => void; tokens: Tokens } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => {
    try { return (localStorage.getItem('theme') as ThemeChoice) || 'system' } catch { return 'system' }
  })
  const [tokens, setTokens] = useState<Tokens>(readTokens)

  const setChoice = useCallback((c: ThemeChoice) => {
    const root = document.documentElement
    if (c === 'system') delete root.dataset.theme
    else root.dataset.theme = c
    try { if (c === 'system') localStorage.removeItem('theme'); else localStorage.setItem('theme', c) } catch { /* storage blocked */ }
    setChoiceState(c)
    setTokens(readTokens())
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setTokens(readTokens())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return <Ctx.Provider value={{ choice, setChoice, tokens }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
