// Typed client for the FastAPI backend (served under /api).

export type Sentiment = 'positive' | 'neutral' | 'negative'

export interface Entity { text: string; label: string; group: string; start: number; end: number }
export interface Keyword { keyword: string; score: number }
export interface SentimentModel {
  model: string; score: number; label: Sentiment
  subjectivity?: number; breakdown?: Record<string, number>; raw_label?: string
}
export interface SentimentResult { label: Sentiment; score: number; models: SentimentModel[] }
export interface Classification {
  model: string; model_name: string; category: string; confidence: number
  probabilities: Record<string, number>
}
export interface PosToken {
  text: string; lemma: string; pos: string; tag: string; dep: string; is_stop: boolean; explanation: string
}

export interface ArticleSummary {
  id: number; title: string; category: string | null; predicted_category: string | null
  category_confidence: number | null; sentiment_label: Sentiment | null; sentiment_score: number | null
  summary: string | null; source: string | null; published_at: string; topic_id: number | null
}
export interface Article extends ArticleSummary {
  content: string; url: string | null; entities: Entity[] | null; keywords: Keyword[] | null
  sentiment_detail: SentimentModel[] | null
}
export interface ArticlePage { items: ArticleSummary[]; total: number; page: number; page_size: number }

export interface Analysis {
  preprocessing: {
    original: string; cleaned: string; tokens: string[]; without_stopwords: string[]
    lemmas: string[]; stems: string[] | null; processed_text: string
  }
  entities: Entity[]
  entity_summary: Record<string, { text: string; count: number }[]>
  sentiment: SentimentResult
  keywords: Keyword[]
  summary: { method: string; summary: string; sentences: string[] }
  pos: PosToken[]
  pos_counts: Record<string, number>
  classification: Classification | null
  timings_ms: Record<string, number>
}

export interface Named { name: string; count: number }
export interface Trends {
  total_articles: number
  people: Named[]; organizations: Named[]; locations: Named[]; keywords: Named[]; categories: Named[]
  sentiment: Partial<Record<Sentiment, number>>
  category_sentiment: Record<string, Partial<Record<Sentiment, number>>>
  daily: { date: string; articles: number; avg_sentiment: number | null }[]
}

export interface Topic {
  id: number; label: string; words: { word: string; weight: number }[]
  article_count: number; prevalence: number
  examples: { id: number; title: string; confidence: number }[]
}
export interface TopicsResult { method: string; n_topics: number; topics: Topic[] }

export interface ModelMetrics {
  name: string; accuracy: number; f1_macro: number
  report: Record<string, { precision: number; recall: number; 'f1-score': number; support: number } | number>
  confusion_matrix: number[][]
}
export interface Metrics {
  trained_at: string; n_samples: number; n_train: number; n_test: number; classes: string[]
  best_model: string; models: Record<string, ModelMetrics>
}
export interface Health {
  status: string; articles: number; classifier_trained: boolean; search_backend: string; transformers_enabled: boolean
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.json()
      msg = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body)
    } catch { /* not JSON */ }
    throw new ApiError(res.status, msg)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v))
  const str = s.toString()
  return str ? `?${str}` : ''
}

export const api = {
  health: () => request<Health>('/health'),
  trends: (top_n = 10) => request<Trends>(`/trends${qs({ top_n })}`),
  articles: (p: { q?: string; category?: string; sentiment?: string; topic?: number | null; page?: number; page_size?: number }) =>
    request<ArticlePage>(`/articles${qs(p)}`),
  article: (id: number) => request<Article>(`/articles/${id}`),
  createArticle: (a: { title: string; content: string; category?: string; source?: string }) => post<Article>('/articles', a),
  deleteArticle: (id: number) => request<void>(`/articles/${id}`, { method: 'DELETE' }),
  upload: (file: File, retrain: boolean) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<{ inserted: number; trained: boolean; best_model: string | null }>(
      `/upload${qs({ retrain: String(retrain) })}`, { method: 'POST', body: fd })
  },
  analyze: (text: string) => post<Analysis>('/analyze', { text }),
  classifyAll: (text: string) => post<{ results: Classification[] }>('/classify', { text, compare: true }),
  search: (query: string, top_k = 10) =>
    post<{ backend: string; results: { score: number; article: Article }[] }>('/search', { query, top_k }),
  topics: (n_topics: number, method: 'nmf' | 'lda') => request<TopicsResult>(`/topics${qs({ n_topics, method })}`),
  models: () => request<{ trained: boolean; metrics: Metrics | null; available: Record<string, string> }>('/models'),
  train: () => post<Metrics>('/models/train', {}),
}
