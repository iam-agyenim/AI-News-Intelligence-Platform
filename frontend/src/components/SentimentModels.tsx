import type { SentimentModel } from '../services/api'
import { SentimentBadge } from './ui'

/** Diverging score scale (−1 … +1) per model with a neutral midpoint. */
export function SentimentModels({ models }: { models: SentimentModel[] }) {
  return (
    <ul className="space-y-4">
      {models.map(m => {
        const pos = Math.max(-1, Math.min(1, m.score))
        const color = m.label === 'positive' ? 'var(--pos)' : m.label === 'negative' ? 'var(--neg)' : 'var(--neu)'
        return (
          <li key={m.model}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{m.model}</span>
              <SentimentBadge label={m.label} score={m.score} />
            </div>
            <div className="relative h-2 rounded-full bg-surface-2" title={`${m.model}: ${m.score.toFixed(3)}`}>
              <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line" aria-hidden />
              <span
                className="absolute inset-y-0 rounded-full"
                style={{
                  background: color,
                  left: pos >= 0 ? '50%' : `${50 + pos * 50}%`,
                  width: `${Math.max(1, Math.abs(pos) * 50)}%`,
                }}
              />
            </div>
            {m.subjectivity != null && (
              <p className="mt-1 text-xs text-muted">Subjectivity {m.subjectivity.toFixed(2)}</p>
            )}
            {m.breakdown && (
              <p className="tabular mt-1 text-xs text-muted">
                pos {m.breakdown.pos} · neu {m.breakdown.neu} · neg {m.breakdown.neg}
              </p>
            )}
          </li>
        )
      })}
      <li className="flex justify-between text-[11px] text-muted"><span>−1 negative</span><span>0</span><span>positive +1</span></li>
    </ul>
  )
}
