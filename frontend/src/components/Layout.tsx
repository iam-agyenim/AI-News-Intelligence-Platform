import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTheme, type ThemeChoice } from '../lib/theme'

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z' },
  { to: '/articles', label: 'Articles', icon: 'M4 5h16M4 10h16M4 15h10M4 20h7' },
  { to: '/analyze', label: 'Analyzer', icon: 'M9 3h6M10 3v6L4.5 18.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3' },
  { to: '/search', label: 'Semantic search', icon: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35' },
  { to: '/topics', label: 'Topics', icon: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { to: '/models', label: 'Models', icon: 'M4 20V10m6 10V4m6 16v-7m4 7H2' },
  { to: '/upload', label: 'Add data', icon: 'M12 16V4m0 0-5 5m5-5 5 5M4 20h16' },
]

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

function ThemeSwitch() {
  const { choice, setChoice } = useTheme()
  const opts: ThemeChoice[] = ['light', 'system', 'dark']
  return (
    <div className="flex rounded-lg border border-line bg-surface-2 p-0.5" role="radiogroup" aria-label="Theme">
      {opts.map(o => (
        <button key={o} role="radio" aria-checked={choice === o} onClick={() => setChoice(o)}
          className={`flex-1 rounded-md px-2 py-1 text-xs capitalize ${choice === o ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

export function Layout() {
  const [open, setOpen] = useState(false)
  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(n => (
        <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-accent-soft font-medium text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}>
          <Icon d={n.icon} />{n.label}
        </NavLink>
      ))}
    </nav>
  )
  const brand = (
    <div className="flex items-center gap-2.5 px-3">
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-white">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 18V6l12 12V6" /></svg>
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-ink">News Intelligence</div>
        <div className="text-[11px] text-muted">NLP analytics platform</div>
      </div>
    </div>
  )
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-line bg-surface py-5 lg:flex">
        {brand}
        <div className="flex-1 px-3">{nav}</div>
        <div className="px-3"><ThemeSwitch /></div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        {brand}
        <button onClick={() => setOpen(o => !o)} aria-label="Menu" aria-expanded={open} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2">
          <Icon d={open ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[57px] z-10 space-y-4 border-b border-line bg-surface p-4 shadow-lg lg:hidden">
          {nav}<ThemeSwitch />
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
