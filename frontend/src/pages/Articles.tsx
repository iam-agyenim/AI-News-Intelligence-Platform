import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Empty, ErrorBox, PageHeader, SentimentBadge, Spinner, inputCls } from '../components/ui'
import { fmtDate, titleCase } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { api } from '../services/api'

const CATEGORIES = ['business', 'entertainment', 'politics', 'sport', 'tech']
const PAGE_SIZE = 15

export default function Articles() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const sentiment = params.get('sentiment') ?? ''
  const topic = params.get('topic')
  const page = Number(params.get('page') ?? 1)
  const [draft, setDraft] = useState(q)
  useEffect(() => setDraft(q), [q])

  const { data, error, loading, reload } = useAsync(
    () => api.articles({ q, category, sentiment, topic: topic ? Number(topic) : null, page, page_size: PAGE_SIZE }),
    [q, category, sentiment, topic, page],
  )

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    if (k !== 'page') next.delete('page')
    setParams(next)
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <>
      <PageHeader title="Articles" description="Every article with its predicted category, consensus sentiment and extractive summary." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="min-w-[14rem] flex-1" onSubmit={e => { e.preventDefault(); set('q', draft.trim()) }}>
          <input className={inputCls} placeholder="Filter by keyword in title or text…" value={draft} onChange={e => setDraft(e.target.value)} aria-label="Keyword filter" />
        </form>
        <select className={`${inputCls} w-auto`} value={category} onChange={e => set('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{titleCase(c)}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={sentiment} onChange={e => set('sentiment', e.target.value)} aria-label="Sentiment">
          <option value="">Any sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
        {topic && <Button variant="secondary" onClick={() => set('topic', '')}>Topic {Number(topic) + 1} ✕</Button>}
      </div>

      <Card>
        {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data?.items.length ? (
          <Empty>No articles match these filters.</Empty>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">{data.total} articles</p>
            <ul className={`divide-y divide-line ${loading ? 'opacity-60' : ''}`}>
              {data.items.map(a => {
                const cat = a.category ?? a.predicted_category
                return (
                  <li key={a.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {cat && <Badge tone="accent">{titleCase(cat)}</Badge>}
                      <SentimentBadge label={a.sentiment_label} score={a.sentiment_score} />
                      <span>{fmtDate(a.published_at)}</span>
                      {a.source && <span>{a.source}</span>}
                    </div>
                    <Link to={`/articles/${a.id}`} className="mt-1.5 block text-base font-medium text-ink hover:text-accent">{a.title}</Link>
                    {a.summary && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{a.summary}</p>}
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
              <Button variant="secondary" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Previous</Button>
              <span className="tabular text-ink-2">Page {page} of {pages}</span>
              <Button variant="secondary" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Next</Button>
            </div>
          </>
        )}
      </Card>
    </>
  )
}
