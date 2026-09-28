import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Sentiment } from '../services/api'
import { titleCase } from '../lib/format'

export function Card({ title, subtitle, action, children, className = '' }: {
  title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="tabular mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-2">{hint}</div>}
    </div>
  )
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  )
}

const SENT_CLASS: Record<Sentiment, string> = { positive: 'bg-pos', neutral: 'bg-neu', negative: 'bg-neg' }

/** Sentiment is always shown as dot + word, never colour alone. */
export function SentimentBadge({ label, score }: { label: Sentiment | null; score?: number | null }) {
  if (!label) return <span className="text-xs text-muted">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2">
      <span className={`size-2 rounded-full ${SENT_CLASS[label]}`} aria-hidden />
      {titleCase(label)}
      {score != null && <span className="tabular text-muted">{score > 0 ? '+' : ''}{score.toFixed(2)}</span>}
    </span>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  const cls = tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-2'
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  const v = {
    primary: 'bg-accent text-white hover:opacity-90',
    secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
    ghost: 'text-ink-2 hover:bg-surface-2',
  }[variant]
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}
    />
  )
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map(o => (
        <button
          key={String(o.value)} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
      <p>{message}</p>
      {onRetry && <button className="mt-2 font-medium underline" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>
}
