import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, ErrorBox, PageHeader, Segmented, Spinner } from '../components/ui'
import { pct } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { api } from '../services/api'

export default function Topics() {
  const [n, setN] = useState(5)
  const [method, setMethod] = useState<'nmf' | 'lda'>('nmf')
  const { data, error, loading, reload } = useAsync(() => api.topics(n, method), [n, method])

  return (
    <>
      <PageHeader
        title="Topic modeling"
        description="Unsupervised discovery of the hidden themes in the corpus. Each topic is a weighted set of words; every article is assigned its dominant topic."
      />
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Segmented<'nmf' | 'lda'> label="Algorithm" value={method} onChange={setMethod}
          options={[{ value: 'nmf', label: 'NMF' }, { value: 'lda', label: 'LDA' }]} />
        <label className="flex items-center gap-3 text-sm text-ink-2">
          Topics
          <input type="range" min={2} max={12} value={n} onChange={e => setN(Number(e.target.value))} className="accent-[var(--accent)]" />
          <span className="tabular w-5 font-medium text-ink">{n}</span>
        </label>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Spinner label="Discovering topics…" /> : (
        <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
          {data.topics.map(t => {
            const max = t.words[0]?.weight ?? 1
            return (
              <Card key={t.id} title={`Topic ${t.id + 1}`} subtitle={`${t.article_count} articles · ${pct(t.prevalence)} prevalence`}
                action={<Link className="text-xs text-accent hover:underline" to={`/articles?topic=${t.id}`}>Browse</Link>}>
                <p className="-mt-2 mb-4 text-base font-medium text-ink">{t.label}</p>
                <ul className="space-y-1.5">
                  {t.words.map(w => (
                    <li key={w.word} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm" title={`${w.word}: weight ${w.weight}`}>
                      <span className="truncate text-ink-2">{w.word}</span>
                      <span className="h-1.5 rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-[var(--series-1)]" style={{ width: `${(w.weight / max) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
                {t.examples.length > 0 && (
                  <div className="mt-4 border-t border-line pt-3">
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Most representative</h3>
                    <ul className="space-y-1 text-sm">
                      {t.examples.map(e => (
                        <li key={e.id}><Link className="line-clamp-1 text-ink hover:text-accent" to={`/articles/${e.id}`}>{e.title}</Link></li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
