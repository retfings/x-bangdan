import type {
  Account,
  Champion,
  DayData,
  HistoryRow,
  IndexData,
  Metric,
  Period,
  Tweet,
} from './types'
import { METRICS } from './format'

export function rankAccounts(accounts: Account[], metric: Metric): Account[] {
  return [...accounts].sort((a, b) => {
    const diff = (b[metric] || 0) - (a[metric] || 0)
    if (diff !== 0) return diff
    return a.handle.localeCompare(b.handle)
  })
}

export function championsOf(accounts: Account[]): Partial<Record<Metric, Champion>> {
  const result: Partial<Record<Metric, Champion>> = {}
  for (const metric of METRICS) {
    const best = rankAccounts(accounts, metric)[0]
    if (!best) continue
    result[metric] = {
      handle: best.handle,
      name: best.name,
      avatar: best.avatar,
      verified: best.verified,
      value: best[metric] || 0,
    }
  }
  return result
}

export function aggregateDays(days: DayData[]): Account[] {
  if (!days.length) return []
  const divisor = days.length
  const map = new Map<string, Account>()
  for (const day of days) {
    for (const account of day.accounts) {
      const existing = map.get(account.handle)
      if (!existing) {
        map.set(account.handle, {
          ...account,
          posts: account.posts / divisor,
          replies: account.replies / divisor,
          followersGain: account.followersGain / divisor,
          impressions: account.impressions / divisor,
          likes: (account.likes || 0) / divisor,
          retweets: (account.retweets || 0) / divisor,
        })
      } else {
        existing.posts += account.posts / divisor
        existing.replies += account.replies / divisor
        existing.followersGain += account.followersGain / divisor
        existing.impressions += account.impressions / divisor
        existing.likes = (existing.likes || 0) + (account.likes || 0) / divisor
        existing.retweets = (existing.retweets || 0) + (account.retweets || 0) / divisor
        existing.followers = account.followers
        existing.name = account.name
        existing.avatar = account.avatar
        existing.bio = account.bio || existing.bio
        existing.category = account.category || existing.category
      }
    }
  }
  return [...map.values()]
}

export function periodDates(index: IndexData, period: Period): string[] {
  const dates = index.dates
  if (!dates.length) return []
  if (period === 'today') return [dates[dates.length - 1]]
  if (period === 'yesterday') {
    return dates.length > 1 ? [dates[dates.length - 2]] : [dates[dates.length - 1]]
  }
  return dates.slice(-7)
}

export function periodLabel(period: Period): string {
  if (period === 'today') return '今日'
  if (period === 'yesterday') return '昨日'
  return '近 7 天'
}

export function streakFor(
  history: HistoryRow[],
  date: string,
  metric: Metric,
  handle: string,
): number {
  const index = history.findIndex((row) => row.date === date)
  if (index < 0) return 0
  let count = 0
  for (let i = index; i >= 0; i -= 1) {
    const champion = history[i].champions[metric]
    if (!champion || champion.handle !== handle) break
    count += 1
  }
  return count
}

export function isRecord(
  index: IndexData,
  date: string,
  metric: Metric,
  handle: string,
  value: number,
): boolean {
  const record = index.records[metric]
  return Boolean(record && record.handle === handle && record.value === value && record.date === date)
}

export function bestRank(
  index: IndexData,
  date: string,
  metric: Metric,
  handle: string,
): number | null {
  const row = index.history.find((item) => item.date === date)
  if (!row?.champions[metric]) return null
  const entry = index.series[handle]
  if (!entry) return null
  const position = index.dates.indexOf(date)
  if (position < 0) return null
  const values = entry[metric]
  const value = values?.[position] || 0
  if (!value) return null
  let rank = 1
  for (const [otherHandle, other] of Object.entries(index.series)) {
    if (otherHandle === handle) continue
    if ((other[metric]?.[position] || 0) > value) rank += 1
  }
  return rank
}

export function topTweetsOf(days: DayData[], limit = 10): Tweet[] {
  const seen = new Set<string>()
  const seenText = new Set<string>()
  const tweets: Tweet[] = []
  for (const day of days) {
    for (const tweet of day.tweets || []) {
      if (seen.has(tweet.id) || seenText.has(tweet.text)) continue
      seen.add(tweet.id)
      seenText.add(tweet.text)
      tweets.push(tweet)
    }
  }
  return tweets.sort((a, b) => b.impressions - a.impressions).slice(0, limit)
}

export function sumTotals(days: DayData[]) {
  return days.reduce(
    (acc, day) => {
      for (const account of day.accounts) {
        acc.posts += account.posts
        acc.replies += account.replies
        acc.followersGain += account.followersGain
        acc.impressions += account.impressions
      }
      acc.accounts = Math.max(acc.accounts, day.accounts.length)
      return acc
    },
    { accounts: 0, posts: 0, replies: 0, followersGain: 0, impressions: 0 },
  )
}

export function recordTimeline(history: HistoryRow[], metric: Metric) {
  let best = 0
  const events: { date: string; champion: Champion; previous: number }[] = []
  for (const row of history) {
    const champion = row.champions[metric]
    if (!champion) continue
    if (champion.value > best) {
      events.push({ date: row.date, champion, previous: best })
      best = champion.value
    }
  }
  return events.reverse()
}
