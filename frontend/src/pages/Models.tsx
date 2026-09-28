import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Badge, Button, Card, ErrorBox, PageHeader, Segmented, Spinner } from '../components/ui'
import { barStyle, baseOptions } from '../lib/charts'
import { pct, titleCase } from '../lib/format'
import { useTheme } from '../lib/theme'
import { useAsync } from '../lib/useAsync'
import { api, type ModelMetrics } from '../services/api'

function ConfusionMatrix({ classes, matrix }: { classes: string[]; matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat())
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left font-normal text-muted">actual ↓ / predicted →</th>
            {classes.map(c => <th key={c} className="p-1 font-medium text-ink-2">{titleCase(c).slice(0, 5)}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={classes[i]}>
              <th className="p-1 pr-3 text-left font-medium text-ink-2">{titleCase(classes[i])}</th>
              {row.map((v, j) => {
                const share = v / max
                return (
                  <td key={j} className="p-[1px]">
                    <div
                      title={`Actual ${classes[i]}, predicted ${classes[j]}: ${v}`}
                      className={`tabular grid size-12 place-items-center rounded-md ${share > 0.55 ? 'text-white' : 'text-ink'} ${i === j ? 'font-semibold' : ''}`}
                      style={{ background: v ? `color-mix(in oklab, var(--seq-700) ${Math.round(12 + share * 88)}%, var(--seq-100))` : 'var(--surface-2)' }}
                    >
                      {v}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Models() {
  const { tokens: t } = useTheme()
  const { data, error, loading, reload } = useAsync(() => api.models(), [])
  const [selected, setSelected] = useState<string | null>(null)
  const [training, setTraining] = useState(false)
  const [trainError, setTrainError] = useState<string | null>(null)

  if (loading && !data) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return null

  const retrain = async () => {
    setTraining(true); setTrainError(null)
    try { await api.train(); reload() } catch (e) { setTrainError(e instanceof Error ? e.message : String(e)) } finally { setTraining(false) }
  }
  const action = <Button onClick={retrain} disabled={training}>{training ? 'Training…' : 'Retrain models'}</Button>

  const m = data.metrics
  if (!m) return (
    <>
      <PageHeader title="Classification models" action={action} />
      {trainError && <ErrorBox message={trainError} />}
      <Card><p className="text-sm text-ink-2">No models trained yet. Add labelled articles and click Retrain.</p></Card>
    </>
  )

  const keys = Object.keys(m.models)
  const current = selected ?? m.best_model
  const cm: ModelMetrics = m.models[current]
  const metricsLabels = ['Accuracy', 'Macro F1']

  return (
    <>
      <PageHeader
        title="Classification models"
        description={`Logistic Regression, Naive Bayes and a linear SVM on TF-IDF (1–2 grams). Evaluated on a stratified hold-out of ${m.n_test} articles, then refit on all ${m.n_samples}.`}
        action={action}
      />
      {trainError && <div className="mb-4"><ErrorBox message={trainError} /></div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card title="Model comparison" subtitle={`Trained ${new Date(m.trained_at).toLocaleString()}`}>
          <div className="h-60">
            <Bar
              options={{ ...baseOptions(t, { legend: true }), scales: { ...baseOptions(t).scales, y: { ...baseOptions(t).scales!.y, max: 1, ticks: { color: t.muted, callback: v => pct(Number(v)) } } } }}
              data={{
                labels: metricsLabels,
                datasets: keys.map((k, i) => ({
                  label: m.models[k].name,
                  data: [m.models[k].accuracy, m.models[k].f1_macro],
                  backgroundColor: t.series[i], ...barStyle(t), borderColor: t.surface, borderWidth: { left: 1, right: 1 }, borderSkipped: 'start' as const,
                })),
              }}
            />
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-1.5 text-left font-medium">Model</th><th className="text-right font-medium">Accuracy</th><th className="text-right font-medium">Macro F1</th></tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k} className="border-t border-line">
                  <td className="py-2 text-ink">{m.models[k].name} {k === m.best_model && <Badge tone="accent">best</Badge>}</td>
                  <td className="tabular text-right text-ink-2">{pct(m.models[k].accuracy, 1)}</td>
                  <td className="tabular text-right text-ink-2">{pct(m.models[k].f1_macro, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Confusion matrix" subtitle="Hold-out predictions; the diagonal is correct"
          action={<Segmented label="Model" value={current} onChange={setSelected}
            options={keys.map(k => ({ value: k, label: k === 'logistic_regression' ? 'LogReg' : k === 'naive_bayes' ? 'NB' : 'SVM' }))} />}>
          <ConfusionMatrix classes={m.classes} matrix={cm.confusion_matrix} />
          <table className="mt-5 w-full text-sm">
            <thead className="text-xs text-muted">
              <tr><th className="py-1.5 text-left font-medium">Class</th><th className="text-right font-medium">Precision</th><th className="text-right font-medium">Recall</th><th className="text-right font-medium">F1</th><th className="text-right font-medium">Support</th></tr>
            </thead>
            <tbody>
              {m.classes.map(c => {
                const r = cm.report[c]
                if (typeof r !== 'object') return null
                return (
                  <tr key={c} className="tabular border-t border-line text-ink-2">
                    <td className="py-1.5 text-ink">{titleCase(c)}</td>
                    <td className="text-right">{r.precision.toFixed(2)}</td>
                    <td className="text-right">{r.recall.toFixed(2)}</td>
                    <td className="text-right">{r['f1-score'].toFixed(2)}</td>
                    <td className="text-right">{r.support}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
      {m.n_samples < 200 && (
        <p className="mt-4 text-xs text-muted">
          Trained on a small sample corpus — metrics are noisy. Load the full BBC News dataset (2,225 articles) for meaningful numbers: see README.
        </p>
      )}
    </>
  )
}
