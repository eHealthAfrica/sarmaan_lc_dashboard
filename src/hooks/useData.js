import { useState, useEffect, useCallback } from 'react'

const BASE = import.meta.env.BASE_URL

export function useData(dataFile = 'data/data.json') {
  const [raw, setRaw]             = useState([])
  const [fetchedAt, setFetchedAt] = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BASE}${dataFile}?t=${Date.now()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRaw(json.rows || [])
      setFetchedAt(json.fetched_at || '')
      setLastRefresh(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [dataFile])

  useEffect(() => {
    setRaw([])
    load()
    const interval = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  return { raw, fetchedAt, loading, error, refresh: load, lastRefresh }
}
