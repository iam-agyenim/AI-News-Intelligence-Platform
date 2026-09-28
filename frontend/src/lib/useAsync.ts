import { useCallback, useEffect, useRef, useState } from 'react'

/** Run an async loader whenever `deps` change; exposes data/error/loading and a manual reload. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)

  const run = useCallback(() => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    fn()
      .then(d => { if (id === seq.current) setData(d) })
      .catch(e => { if (id === seq.current) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (id === seq.current) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(run, [run])
  return { data, error, loading, reload: run }
}
