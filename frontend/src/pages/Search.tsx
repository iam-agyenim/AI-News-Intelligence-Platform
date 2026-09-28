import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Empty, ErrorBox, PageHeader, SentimentBadge, Spinner, inputCls } from '../components/ui'
import { titleCase } from '../lib/format'
import { api, type Article } from '../services/api'

const EXAMPLES = ['economic slowdown and job losses', 'artificial intelligence regulation', 'football championship victory', 'award-winning movies']

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const [state, setState] = useState<{ loading: boolean; error: string | null; backend?: string; results: { score: number; article: Article }[] | null }>(
    { loading: false, error: null, results: null })

  useEffect(() => {
    setDraft(q)
    if (!q) { setState({ loading: false, error: null, results: null }); return }
    let live = true
    setState(s => ({ ...s, loading: true, error: null }))
    api.search(q, 12)
      .then(r => live && setState({ loading: false, error: null, backend: r.backend, results: r.results }))
      .catch(e => live && setState({ loading: false, error: String(e.message ?? e), results: null }))
    return () => { live = false }
  }, [q])

  return (
    <>
      <PageHeader title="Semantic search" description="Search by meaning, not exact words. Queries are embedded into the same vector space as the articles and ranked by cosine similarity." />
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (draft.trim()) setParams({ q: draft.trim() }) }}>
        <input className={inputCls} value={draft} onChange={e => setDraft(e.target.value)} placeholder="e.g. companies cutting staff" aria-label="Search query" autoFocus />
        <Button type="submit" disabled={!draft.trim()}>Search</Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        Try:
        {EXAMPLES.map(e => <button key={e} className="rounded-md border border-line px-2 py-0.5 text-ink-2 hover:border-accent hover:text-accent" onClick={() => setParams({ q: e })}>{e}</button>)}
      </div>

      <div className="mt-6">
        {state.error && <ErrorBox message={state.error} />}
        {state.loading && <Spinner label="Searching…" />}
        {state.results && !state.loading && (
          <Card title={`${state.results.length} results for “${q}”`} subtitle={`Backend: ${state.backend === 'lsa' ? 'Latent Semantic Analysis (TF-IDF + SVD)' : state.backend}`}>
            {!state.results.length ? <Empty>No semantically similar articles found.</Empty> : (
              <ul className="divide-y divide-line">
                {state.results.map(({ score, article: a }) => (
                  <li key={a.id} className="grid grid-cols-[1fr_auto] gap-4 py-4 first:pt-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {(a.category ?? a.predicted_category) && <Badge tone="accent">{titleCase((a.category ?? a.predicted_category)!)}</Badge>}
                        <SentimentBadge label={a.sentiment_label} />
                      </div>
                      <Link to={`/articles/${a.id}`} className="mt-1.5 block font-medium text-ink hover:text-accent">{a.title}</Link>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-2">{a.summary}</p>
                    </div>
                    <div className="w-20 text-right" title={`Cosine similarity ${score.toFixed(3)}`}>
                      <div className="tabular text-sm font-medium text-ink">{score.toFixed(2)}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-[var(--series-1)]" style={{ width: `${Math.min(100, score * 100)}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-muted">similarity</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  )
}
