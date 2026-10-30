export type Metric = 'posts' | 'replies' | 'followersGain' | 'impressions'

export type Period = 'today' | 'yesterday' | '7d'

export interface Account {
  handle: string
  name: string
  avatar: string
  verified: boolean
  bio?: string
  category?: string
  followers: number
  posts: number
  replies: number
  followersGain: number
  impressions: number
  likes?: number
  retweets?: number
}

export interface Tweet {
  id: string
  handle: string
  name: string
  avatar: string
  verified: boolean
  text: string
  url: string
  impressions: number
  likes: number
  replies: number
  retweets: number
  createdAt: string
}

export interface DayData {
  schemaVersion: number
  date: string
  generatedAt: string
  source: string
  accounts: Account[]
  tweets: Tweet[]
}

export interface Champion {
  handle: string
  name: string
  avatar: string
  verified: boolean
  value: number
}

export interface Totals {
  accounts: number
  posts: number
  replies: number
  followersGain: number
  impressions: number
}

export interface HistoryRow {
  date: string
  totals: Totals
  champions: Partial<Record<Metric, Champion>>
}

export interface SeriesEntry {
  name: string
  avatar: string
  verified: boolean
  bio?: string
  category?: string
  followers: number
  posts: number[]
  replies: number[]
  followersGain: number[]
  impressions: number[]
}

export interface RecordEntry {
  value: number
  handle: string
  name: string
  avatar: string
  verified: boolean
  date: string
  previousValue: number | null
  previousHandle: string | null
  previousDate: string | null
}

export interface IndexData {
  schemaVersion: number
  latest: string
  generatedAt: string
  source: string
  dates: string[]
  totals: Totals
  records: Partial<Record<Metric, RecordEntry>>
  history: HistoryRow[]
  series: Record<string, SeriesEntry>
}
