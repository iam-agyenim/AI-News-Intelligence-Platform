import type { Entity } from '../services/api'

// Fixed group → categorical slot (identity); rarer groups share a neutral tint.
const GROUP_SLOT: Record<string, string> = {
  Person: 'var(--series-1)', Organization: 'var(--series-2)', Location: 'var(--series-3)', Date: 'var(--series-4)',
  Money: 'var(--series-5)',
}
export const entityColor = (group: string) => GROUP_SLOT[group] ?? 'var(--neu)'

/** Article text with entities highlighted; each highlight carries its type label so colour is never the only cue. */
export function EntityText({ text, entities }: { text: string; entities: Entity[] }) {
  const sorted = [...entities].sort((a, b) => a.start - b.start)
  const parts: React.ReactNode[] = []
  let cursor = 0
  sorted.forEach((e, i) => {
    if (e.start < cursor) return // overlapping span
    parts.push(text.slice(cursor, e.start))
    const c = entityColor(e.group)
    parts.push(
      <mark
        key={i}
        title={`${e.group} (${e.label})`}
        className="rounded px-1 py-0.5 text-ink"
        style={{ background: `color-mix(in srgb, ${c} 18%, transparent)`, boxShadow: `inset 0 -2px 0 ${c}` }}
      >
        {text.slice(e.start, e.end)}
        <span className="ml-1 align-middle text-[10px] font-semibold uppercase tracking-wide text-ink-2">{e.label}</span>
      </mark>,
    )
    cursor = e.end
  })
  parts.push(text.slice(cursor))
  return <p className="whitespace-pre-line text-[15px] leading-8 text-ink">{parts}</p>
}

export function EntityGroups({ summary }: { summary: Record<string, { text: string; count: number }[]> }) {
  const groups = Object.entries(summary).sort((a, b) => b[1].length - a[1].length)
  if (!groups.length) return <p className="text-sm text-muted">No entities found.</p>
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map(([group, items]) => (
        <div key={group}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
            <span className="size-2 rounded-sm" style={{ background: entityColor(group) }} />
            {group} <span className="font-normal text-muted">{items.length}</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {items.map(it => (
              <span key={it.text} className="rounded-md bg-surface-2 px-2 py-0.5 text-sm text-ink">
                {it.text}{it.count > 1 && <span className="tabular ml-1 text-xs text-muted">×{it.count}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
