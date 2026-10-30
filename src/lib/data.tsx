import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { DayData, IndexData } from './types'

interface DataContextValue {
  index: IndexData | null
  error: string | null
  loading: boolean
  loadDay: (date: string) => Promise<DayData>
  profileHandle: string | null
  openProfile: (handle: string) => void
  closeProfile: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

const baseUrl = () => new URL('.', document.baseURI)

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(new URL(path, baseUrl()), { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`${path} 加载失败（HTTP ${response.status}）`)
  }
  return (await response.json()) as T
}

let indexPromise: Promise<IndexData> | null = null

function loadIndex(): Promise<IndexData> {
  if (!indexPromise) {
    indexPromise = fetchJson<IndexData>('data/index.json').catch((error) => {
      indexPromise = null
      throw error
    })
  }
  return indexPromise
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<IndexData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileHandle, setProfileHandle] = useState<string | null>(null)
  const cache = useRef(new Map<string, Promise<DayData>>())

  useEffect(() => {
    let active = true
    loadIndex()
      .then((data) => {
        if (active) {
          setIndex(data)
          setError(null)
        }
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const loadDay = useCallback((date: string) => {
    const cached = cache.current.get(date)
    if (cached) return cached
    const promise = fetchJson<DayData>(`data/daily/${date}.json`).catch((error) => {
      cache.current.delete(date)
      throw error
    })
    cache.current.set(date, promise)
    return promise
  }, [])

  const openProfile = useCallback((handle: string) => setProfileHandle(handle), [])
  const closeProfile = useCallback(() => setProfileHandle(null), [])

  const value = useMemo(
    () => ({
      index,
      error,
      loading,
      loadDay,
      profileHandle,
      openProfile,
      closeProfile,
    }),
    [index, error, loading, loadDay, profileHandle, openProfile, closeProfile],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}

export function useDay(date: string | null | undefined) {
  const { loadDay } = useData()
  const [day, setDay] = useState<DayData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(date))

  useEffect(() => {
    if (!date) {
      setDay(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    loadDay(date)
      .then((data) => {
        if (active) setDay(data)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [date, loadDay])

  return { day, loading, error }
}

export function useDays(dates: string[]) {
  const { loadDay } = useData()
  const [days, setDays] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const key = dates.join(',')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    Promise.all(dates.map((date) => loadDay(date)))
      .then((data) => {
        if (active) setDays(data)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loadDay])

  return { days, loading, error }
}
