import { Link, useNavigate, useParams } from 'react-router-dom'
import { EntityGroups, EntityText } from '../components/EntityText'
import { SentimentModels } from '../components/SentimentModels'
import { Badge, Button, Card, ErrorBox, SentimentBadge, Spinner } from '../components/ui'
import { fmtDate, pct, titleCase } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { api, type Entity } from '../services/api'

function groupEntities(ents: Entity[]) {
  const out: Record<string, { text: string; count: number }[]> = {}
  for (const e of ents) {
    const list = (out[e.group] ??= [])
    const hit = list.find(x => x.text === e.text)
    if (hit) hit.count++; else list.push({ text: e.text, count: 1 })
  }
  return out
}

export default function ArticleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: a, error, loading, reload } = useAsync(() => api.article(Number(id)), [id])

  if (loading && !a) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!a) return null

  // Entities were extracted from "title. content" — shift offsets to the content body.
  const offset = a.title.length + 2
  const bodyEntities = (a.entities ?? [])
    .filter(e => e.start >= offset)
    .map(e => ({ ...e, start: e.start - offset, end: e.end - offset }))
  const predicted = a.predicted_category

  const remove = async () => {
    if (!confirm('Delete this article? This cannot be undone.')) return
    await api.deleteArticle(a.id)
    nav('/articles')
  }

  return (
    <>
      <Link to="/articles" className="text-sm text-ink-2 hover:text-accent">← All articles</Link>
      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              {a.category && <Badge tone="accent">{titleCase(a.category)}</Badge>}
              <SentimentBadge label={a.sentiment_label} score={a.sentiment_score} />
              <span>{fmtDate(a.published_at)}</span>
              {a.source && <span>{a.source}</span>}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{a.title}</h1>
            {a.summary && (
              <div className="mt-4 rounded-lg border-l-2 border-accent bg-accent-soft/60 px-4 py-3 text-sm text-ink">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-accent">AI summary</span>
                {a.summary}
              </div>
            )}
            <div className="mt-5"><EntityText text={a.content} entities={bodyEntities} /></div>
            {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-accent hover:underline">Original source ↗</a>}
          </Card>
          <Card title="Named entities" subtitle="spaCy NER, grouped by type">
            <EntityGroups summary={groupEntities(a.entities ?? [])} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Classification">
            {predicted ? (
              <>
                <div className="text-2xl font-semibold text-ink">{titleCase(predicted)}</div>
                <p className="mt-1 text-xs text-muted">
                  {a.category_confidence != null && `${pct(a.category_confidence, 1)} confidence`}
                  {a.category && (a.category === predicted ? ' · matches label' : ` · labelled ${a.category}`)}
                </p>
              </>
            ) : <p className="text-sm text-muted">Classifier not trained.</p>}
          </Card>
          <Card title="Sentiment by model">
            {a.sentiment_detail ? <SentimentModels models={a.sentiment_detail} /> : <p className="text-sm text-muted">—</p>}
          </Card>
          <Card title="Keywords">
            <div className="flex flex-wrap gap-1.5">
              {(a.keywords ?? []).map(k => (
                <Link key={k.keyword} to={`/search?q=${encodeURIComponent(k.keyword)}`} title={`TF-IDF ${k.score}`}
                  className="rounded-md bg-surface-2 px-2 py-0.5 text-sm text-ink hover:text-accent">{k.keyword}</Link>
              ))}
            </div>
          </Card>
          <Button variant="ghost" className="w-full text-danger" onClick={remove}>Delete article</Button>
        </div>
      </div>
    </>
  )
}
