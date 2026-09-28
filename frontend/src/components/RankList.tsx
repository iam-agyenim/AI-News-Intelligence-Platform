import { Link } from 'react-router-dom'
import type { Named } from '../services/api'
import { Empty } from './ui'

/** Ranked horizontal bars in plain HTML: label, thin bar, value. Hover shows the exact count. */
export function RankList({ items, unit = 'articles', linkTo }: {
  items: Named[]; unit?: string; linkTo?: (name: string) => string
}) {
  if (!items.length) return <Empty>No data yet</Empty>
  const max = Math.max(...items.map(i => i.count))
  return (
    <ol className="space-y-2.5">
      {items.map(i => {
        const label = linkTo
          ? <Link to={linkTo(i.name)} className="truncate hover:text-accent hover:underline">{i.name}</Link>
          : <span className="truncate">{i.name}</span>
        return (
          <li key={i.name} className="group" title={`${i.name}: ${i.count} ${unit}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm text-ink">
              {label}
              <span className="tabular shrink-0 text-xs text-ink-2">{i.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-[var(--series-1)] transition-opacity group-hover:opacity-80"
                style={{ width: `${Math.max(3, (i.count / max) * 100)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
