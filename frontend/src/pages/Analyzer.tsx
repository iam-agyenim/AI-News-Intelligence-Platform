import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { EntityGroups, EntityText } from '../components/EntityText'
import { ProbabilityBars } from '../components/ProbabilityBars'
import { SentimentModels } from '../components/SentimentModels'
import { Badge, Button, Card, ErrorBox, PageHeader, Segmented, SentimentBadge, Spinner, inputCls } from '../components/ui'
import { barStyle, baseOptions } from '../lib/charts'
import { pct, titleCase } from '../lib/format'
import { useTheme } from '../lib/theme'
import { api, type Analysis, type Classification } from '../services/api'

const SAMPLES = [
  { label: 'Business', text: 'Shares in Harbourline Bank fell 9% on Thursday after the lender warned that profits would be lower than expected. Chief executive Martin Doyle blamed rising costs and weaker mortgage demand in London. Analysts at Greystone Research said the bank faced a difficult year ahead, although its capital position remained strong. The company will publish full results in March.' },
  { label: 'Sport', text: 'Manchester striker Ellie Carter scored a stunning late winner as her side beat Arsenal 2-1 to reach the cup final at Wembley. Carter, 23, curled a brilliant shot into the top corner in the 89th minute. Manager Rosa Kent praised her team\'s fighting spirit and said the victory was one of the proudest moments of her career.' },
  { label: 'Tech', text: 'Software company Nimbus Labs has released an open-source AI model that can translate speech between 40 languages in real time. The company said the system runs on an ordinary laptop without an internet connection. Researchers in Tokyo and Berlin tested the tool and reported impressive accuracy, though privacy groups urged caution over voice data.' },
]

type Tab = 'overview' | 'entities' | 'pos' | 'preprocessing'

export default function Analyzer() {
  const { tokens: t } = useTheme()
  const [text, setText] = useState(SAMPLES[0].text)
  const [result, setResult] = useState<Analysis | null>(null)
  const [compare, setCompare] = useState<Classification[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')

  const run = async () => {
    setBusy(true); setError(null); setCompare(null)
    try {
      const [r, c] = await Promise.all([api.analyze(text), api.classifyAll(text).catch(() => null)])
      setResult(r); setCompare(c?.results ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const posEntries = result ? Object.entries(result.pos_counts).slice(0, 12) : []

  return (
    <>
      <PageHeader title="Text analyzer" description="Paste any news article to run the full pipeline: preprocessing, POS tagging, NER, sentiment, keywords, classification and summarization." />

      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          Try a sample:
          {SAMPLES.map(s => (
            <button key={s.label} onClick={() => { setText(s.text); setResult(null) }} className="rounded-md border border-line px-2 py-0.5 text-ink-2 hover:border-accent hover:text-accent">{s.label}</button>
          ))}
        </div>
        <textarea className={`${inputCls} min-h-40 font-[inherit] leading-relaxed`} value={text} onChange={e => setText(e.target.value)} aria-label="Article text" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="tabular text-xs text-muted">{text.trim().split(/\s+/).filter(Boolean).length} words</span>
          <Button onClick={run} disabled={busy || !text.trim()}>{busy ? 'Analyzing…' : 'Analyze text'}</Button>
        </div>
      </Card>

      {error && <div className="mt-4"><ErrorBox message={error} /></div>}
      {busy && !result && <Spinner label="Running NLP pipeline…" />}

      {result && (
        <div className={`mt-6 ${busy ? 'opacity-60' : ''}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented<Tab> label="Result view" value={tab} onChange={setTab} options={[
              { value: 'overview', label: 'Overview' }, { value: 'entities', label: 'Entities' },
              { value: 'pos', label: 'Tokens & POS' }, { value: 'preprocessing', label: 'Preprocessing' },
            ]} />
            <span className="tabular text-xs text-muted">
              {Object.values(result.timings_ms).reduce((a, b) => a + b, 0).toFixed(0)} ms total
            </span>
          </div>

          {tab === 'overview' && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card title="Category" subtitle={result.classification?.model_name}>
                {result.classification ? (
                  <>
                    <div className="mb-4 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-ink">{titleCase(result.classification.category)}</span>
                      <span className="tabular text-sm text-ink-2">{pct(result.classification.confidence, 1)}</span>
                    </div>
                    <ProbabilityBars probabilities={result.classification.probabilities} />
                    {compare && (
                      <div className="mt-5 border-t border-line pt-4">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">All models</h3>
                        <table className="w-full text-sm">
                          <tbody>
                            {compare.map(c => (
                              <tr key={c.model} className="border-b border-line last:border-0">
                                <td className="py-1.5 text-ink-2">{c.model_name}</td>
                                <td className="px-2 py-1.5 font-medium text-ink">{titleCase(c.category)}</td>
                                <td className="tabular whitespace-nowrap py-1.5 text-right text-ink-2">{pct(c.confidence)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : <p className="text-sm text-muted">Classifier not trained yet.</p>}
              </Card>
              <Card title="Sentiment" action={<SentimentBadge label={result.sentiment.label} score={result.sentiment.score} />}>
                <SentimentModels models={result.sentiment.models} />
              </Card>
              <Card title="Summary" subtitle={`${titleCase(result.summary.method)} summarization`}>
                <p className="text-sm leading-relaxed text-ink">{result.summary.summary}</p>
                <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-2">Keywords</h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.keywords.map(k => <span key={k.keyword} title={`score ${k.score}`} className="rounded-md bg-surface-2 px-2 py-0.5 text-sm text-ink">{k.keyword}</span>)}
                </div>
              </Card>
            </div>
          )}

          {tab === 'entities' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <Card title="Highlighted text"><EntityText text={text} entities={result.entities} /></Card>
              <Card title="Entities by type"><EntityGroups summary={result.entity_summary} /></Card>
            </div>
          )}

          {tab === 'pos' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
              <Card title="Tokens" subtitle={`${result.pos.length} tokens · spaCy`}>
                <div className="max-h-[32rem] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-surface text-xs text-muted">
                      <tr><th className="py-2 font-medium">Token</th><th className="font-medium">Lemma</th><th className="font-medium">POS</th><th className="hidden font-medium sm:table-cell">Tag</th><th className="hidden font-medium md:table-cell">Dependency</th></tr>
                    </thead>
                    <tbody>
                      {result.pos.filter(p => p.pos !== 'SPACE').map((p, i) => (
                        <tr key={i} className={`border-t border-line ${p.is_stop ? 'text-muted' : 'text-ink'}`}>
                          <td className="py-1.5 font-medium">{p.text}</td>
                          <td>{p.lemma}</td>
                          <td title={p.explanation}><Badge>{p.pos}</Badge></td>
                          <td className="hidden font-mono text-xs sm:table-cell">{p.tag}</td>
                          <td className="hidden font-mono text-xs md:table-cell">{p.dep}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted">Stopwords shown in grey. Hover a POS tag for its meaning.</p>
              </Card>
              <Card title="Part-of-speech distribution">
                <div style={{ height: Math.max(180, posEntries.length * 28) }}>
                  <Bar options={baseOptions(t, { horizontal: true })} data={{
                    labels: posEntries.map(([k]) => k),
                    datasets: [{ label: 'Tokens', data: posEntries.map(([, v]) => v), backgroundColor: t.series[0], ...barStyle(t) }],
                  }} />
                </div>
              </Card>
            </div>
          )}

          {tab === 'preprocessing' && (
            <Card title="Preprocessing pipeline" subtitle="clean → tokenize → remove stopwords → lemmatize">
              <ol className="space-y-5">
                {([
                  ['Cleaned text', 'Lowercased; HTML, URLs and punctuation removed', result.preprocessing.cleaned],
                  ['Tokens', `${result.preprocessing.tokens.length} tokens (NLTK)`, result.preprocessing.tokens],
                  ['Without stopwords', `${result.preprocessing.without_stopwords.length} tokens remain`, result.preprocessing.without_stopwords],
                  ['Lemmas', 'WordNet lemmatization', result.preprocessing.lemmas],
                ] as const).map(([title, desc, value], i) => (
                  <li key={title} className="grid gap-2 sm:grid-cols-[180px_1fr]">
                    <div>
                      <div className="text-sm font-medium text-ink">{i + 1}. {title}</div>
                      <div className="text-xs text-muted">{desc}</div>
                    </div>
                    {typeof value === 'string'
                      ? <p className="rounded-lg bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink-2">{value}</p>
                      : <div className="flex flex-wrap gap-1">{value.map((tok, j) => <span key={j} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink-2">{tok}</span>)}</div>}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
