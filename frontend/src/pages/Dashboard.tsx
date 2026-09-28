import type { ChartOptions } from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { Link, useNavigate } from 'react-router-dom'
import { Card, ErrorBox, PageHeader, Spinner, StatTile } from '../components/ui'
import { RankList } from '../components/RankList'
import { barStyle, baseOptions } from '../lib/charts'
import { pct, titleCase } from '../lib/format'
import { useTheme } from '../lib/theme'
import { useAsync } from '../lib/useAsync'
import { api, type Sentiment } from '../services/api'

const SENTS: Sentiment[] = ['negative', 'neutral', 'positive']

export default function Dashboard() {
  const { tokens: t } = useTheme()
  const nav = useNavigate()
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.trends(10), api.models(), api.health()]), [],
  )

  if (loading && !data) return <Spinner label="Crunching the news…" />
  if (error) return <ErrorBox message={`Could not reach the API: ${error}. Is the backend running on :8000?`} onRetry={reload} />
  if (!data) return null
  const [tr, models, health] = data
  const total = tr.total_articles
  const pos = tr.sentiment.positive ?? 0
  const neg = tr.sentiment.negative ?? 0
  const best = models.metrics ? models.metrics.models[models.metrics.best_model] : null
  const dayLabels = tr.daily.map(d => new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))

  const volumeOpts = baseOptions(t)
  const sentimentOpts = {
    ...baseOptions(t),
    interaction: { mode: 'index', intersect: false },
    scales: {
      ...baseOptions(t).scales,
      y: { ...baseOptions(t).scales!.y, beginAtZero: false, suggestedMin: -0.3, suggestedMax: 0.3,
        grid: { color: (c: { tick: { value: number } }) => (c.tick.value === 0 ? t.muted : t.grid) } },
    },
  } as unknown as ChartOptions<'line'>

  const cats = tr.categories
  const catOpts: ChartOptions<'bar'> = {
    ...baseOptions(t, { horizontal: true }),
    onClick: (_e, els) => { if (els[0]) nav(`/articles?category=${cats[els[0].index].name}`) },
    onHover: (e, els) => {
      const el = e.native?.target as HTMLElement | undefined
      if (el) el.style.cursor = els.length ? 'pointer' : 'default'
    },
  }

  const catNames = Object.keys(tr.category_sentiment).sort()
  const sentCatOpts = baseOptions(t, { horizontal: true, legend: true, stacked: true })
  sentCatOpts.scales!.x = { ...sentCatOpts.scales!.x, max: 100, ticks: { color: t.muted, callback: v => `${v}%` } }
  sentCatOpts.plugins!.tooltip = { ...sentCatOpts.plugins!.tooltip, callbacks: { label: c => ` ${c.dataset.label}: ${(c.raw as number).toFixed(0)}%` } }
  const sentColor = { negative: t.neg, neutral: t.neu, positive: t.pos }

  return (
    <>
      <PageHeader
        title="News intelligence dashboard"
        description="Entities, sentiment, categories and keywords extracted automatically from every article in the corpus."
        action={<span className="text-xs text-muted">Search: {health.search_backend.toUpperCase()} · Transformers {health.transformers_enabled ? 'on' : 'off'}</span>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Articles analyzed" value={total.toLocaleString()} hint={`${tr.daily.length} days of coverage`} />
        <StatTile label="Positive coverage" value={total ? pct(pos / total) : '—'} hint={`${neg} negative · ${tr.sentiment.neutral ?? 0} neutral`} />
        <StatTile label="Top category" value={cats[0] ? titleCase(cats[0].name) : '—'} hint={cats[0] ? `${cats[0].count} of ${total} articles` : undefined} />
        <StatTile
          label="Classifier macro F1"
          value={best ? best.f1_macro.toFixed(2) : '—'}
          hint={best ? <Link className="hover:underline" to="/models">{best.name}</Link> : 'Not trained'}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Articles per day" subtitle="Publishing volume across the corpus">
          <div className="h-56">
            <Bar options={volumeOpts} data={{ labels: dayLabels, datasets: [{ label: 'Articles', data: tr.daily.map(d => d.articles), backgroundColor: t.series[0], ...barStyle(t) }] }} />
          </div>
        </Card>
        <Card title="Average sentiment per day" subtitle="Mean consensus score, −1 (negative) to +1 (positive)">
          <div className="h-56">
            <Line options={sentimentOpts} data={{
              labels: dayLabels,
              datasets: [{
                label: 'Avg sentiment', data: tr.daily.map(d => d.avg_sentiment), borderColor: t.series[0], borderWidth: 2,
                pointRadius: 0, pointHoverRadius: 5, pointHoverBorderColor: t.surface, pointHoverBorderWidth: 2,
                pointBackgroundColor: t.series[0], cubicInterpolationMode: 'monotone', spanGaps: true,
              }],
            }} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Articles by category" subtitle="Labelled or predicted category · click a bar to browse">
          <div className="h-60">
            <Bar options={catOpts} data={{ labels: cats.map(c => titleCase(c.name)), datasets: [{ label: 'Articles', data: cats.map(c => c.count), backgroundColor: t.series[0], ...barStyle(t) }] }} />
          </div>
        </Card>
        <Card title="Sentiment mix by category" subtitle="Share of articles in each sentiment class">
          <div className="h-60">
            <Bar options={sentCatOpts} data={{
              labels: catNames.map(titleCase),
              datasets: SENTS.map(s => ({
                label: titleCase(s),
                data: catNames.map(c => {
                  const row = tr.category_sentiment[c]
                  const sum = SENTS.reduce((a, k) => a + (row[k] ?? 0), 0) || 1
                  return ((row[s] ?? 0) / sum) * 100
                }),
                backgroundColor: sentColor[s], borderColor: t.surface, borderWidth: { right: 2 }, borderSkipped: false,
                borderRadius: 0, maxBarThickness: 22,
              })),
            }} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Most mentioned people" subtitle="Articles mentioning each person">
          <RankList items={tr.people} linkTo={n => `/articles?q=${encodeURIComponent(n)}`} />
        </Card>
        <Card title="Top organizations">
          <RankList items={tr.organizations} linkTo={n => `/articles?q=${encodeURIComponent(n)}`} />
        </Card>
        <Card title="Top locations">
          <RankList items={tr.locations} linkTo={n => `/articles?q=${encodeURIComponent(n)}`} />
        </Card>
        <Card title="Frequent keywords" subtitle="Top-5 TF-IDF keywords per article">
          <RankList items={tr.keywords} linkTo={n => `/search?q=${encodeURIComponent(n)}`} />
        </Card>
      </div>
    </>
  )
}
