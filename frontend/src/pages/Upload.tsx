import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, ErrorBox, PageHeader, inputCls } from '../components/ui'
import { titleCase } from '../lib/format'
import { api } from '../services/api'

const CATEGORIES = ['business', 'entertainment', 'politics', 'sport', 'tech']

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [retrain, setRetrain] = useState(true)
  const [busy, setBusy] = useState<'csv' | 'one' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: React.ReactNode } | null>(null)
  const [form, setForm] = useState({ title: '', content: '', category: '', source: '' })

  const upload = async () => {
    if (!file) return
    setBusy('csv'); setMsg(null)
    try {
      const r = await api.upload(file, retrain)
      setMsg({ ok: true, text: `Imported ${r.inserted} articles${r.trained ? `; classifiers retrained (best: ${r.best_model?.replace('_', ' ')})` : ''}.` })
      setFile(null)
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }) } finally { setBusy(null) }
  }

  const addOne = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy('one'); setMsg(null)
    try {
      const a = await api.createArticle({ title: form.title, content: form.content, category: form.category || undefined, source: form.source || undefined })
      setMsg({ ok: true, text: <>Added and analyzed: <Link className="underline" to={`/articles/${a.id}`}>{a.title}</Link> → {a.predicted_category ? titleCase(a.predicted_category) : 'unclassified'}</> })
      setForm({ title: '', content: '', category: '', source: '' })
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) }) } finally { setBusy(null) }
  }

  return (
    <>
      <PageHeader title="Add data" description="Import a dataset or add a single article. Every new article is cleaned, analyzed, classified, indexed for search and assigned a topic." />
      {msg && (
        <div className="mb-4">
          {msg.ok ? <div className="rounded-lg border border-line bg-accent-soft p-4 text-sm text-ink">{msg.text}</div> : <ErrorBox message={String(msg.text)} />}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Upload CSV dataset" subtitle="Needs a text column (content / text / article). Optional: title, category, date, source, url.">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface-2 px-4 py-10 text-center hover:border-accent">
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <span className="text-sm font-medium text-ink">{file ? file.name : 'Choose a CSV file'}</span>
            <span className="mt-1 text-xs text-muted">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Articles without dates are spread over the last 30 days'}</span>
          </label>
          <label className="mt-4 flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={retrain} onChange={e => setRetrain(e.target.checked)} className="accent-[var(--accent)]" />
            Retrain classifiers on labelled data after import
          </label>
          <Button className="mt-4 w-full" disabled={!file || busy !== null} onClick={upload}>
            {busy === 'csv' ? 'Importing & analyzing…' : 'Import dataset'}
          </Button>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs text-ink-2">{`title,content,category,date
"Bank profits rise","Northwind Bank reported…",business,2026-09-01`}</pre>
        </Card>

        <Card title="Add a single article">
          <form className="space-y-3" onSubmit={addOne}>
            <input className={inputCls} placeholder="Headline" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} aria-label="Headline" />
            <textarea className={`${inputCls} min-h-44`} placeholder="Article text" required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} aria-label="Article text" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} aria-label="Category">
                <option value="">Category (optional — AI predicts)</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{titleCase(c)}</option>)}
              </select>
              <input className={inputCls} placeholder="Source (optional)" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} aria-label="Source" />
            </div>
            <Button type="submit" className="w-full" disabled={busy !== null}>{busy === 'one' ? 'Analyzing…' : 'Add & analyze'}</Button>
          </form>
        </Card>
      </div>
    </>
  )
}
