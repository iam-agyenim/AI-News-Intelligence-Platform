import { pct, titleCase } from '../lib/format'

/** Class probabilities as thin bars; the winning class is emphasised, the rest recede. */
export function ProbabilityBars({ probabilities }: { probabilities: Record<string, number> }) {
  const entries = Object.entries(probabilities).sort((a, b) => b[1] - a[1])
  return (
    <ul className="space-y-2">
      {entries.map(([cls, p], i) => (
        <li key={cls} className="grid grid-cols-[5.5rem_minmax(3rem,1fr)_3rem] items-center gap-2 text-sm" title={`${cls}: ${pct(p, 1)}`}>
          <span className={i === 0 ? 'font-medium text-ink' : 'text-ink-2'}>{titleCase(cls)}</span>
          <span className="h-1.5 rounded-full bg-surface-2">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(1, p * 100)}%`, background: i === 0 ? 'var(--series-1)' : 'var(--neu)' }}
            />
          </span>
          <span className="tabular text-right text-xs text-ink-2">{pct(p, 1)}</span>
        </li>
      ))}
    </ul>
  )
}
