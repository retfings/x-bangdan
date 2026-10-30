import type { Metric } from './types'

export const METRICS: Metric[] = ['posts', 'replies', 'followersGain', 'impressions']

export const METRIC_META: Record<
  Metric,
  { label: string; unit: string; short: string; color: string; gradient: string }
> = {
  posts: {
    label: '发帖',
    unit: '帖',
    short: '发帖',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg,#60a5fa,#3b82f6)',
  },
  replies: {
    label: '评论',
    unit: '条',
    short: '评论',
    color: '#f97316',
    gradient: 'linear-gradient(135deg,#fbbf24,#f97316)',
  },
  followersGain: {
    label: '涨粉',
    unit: '粉',
    short: '涨粉',
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#34d399,#10b981)',
  },
  impressions: {
    label: '曝光',
    unit: '次',
    short: '曝光',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg,#e879f9,#a855f7)',
  },
}

export function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Math.round(value).toLocaleString('en-US')
}

export function fmtCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 100_000_000) return trimZero(value / 100_000_000) + '亿'
  if (abs >= 10_000_000) return Math.round(value / 10_000).toLocaleString('en-US') + '万'
  if (abs >= 10_000) return trimZero(value / 10_000) + '万'
  return Math.round(value).toLocaleString('en-US')
}

function trimZero(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function fmtSigned(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return sign + fmtCompact(value)
}

export function fmtMetric(metric: Metric, value: number, period: 'day' | '7d' = 'day'): string {
  if (metric === 'impressions') return fmtCompact(value)
  return fmtCompact(value)
}

export function metricUnit(metric: Metric): string {
  if (metric === 'impressions') return ''
  return METRIC_META[metric].unit
}

export function monthDay(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

export function weekday(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
}

export function fullDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime()
  const b = new Date(`${to}T12:00:00`).getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

export function relativeTime(iso: string): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const diff = Math.max(0, Date.now() - time)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return iso.slice(0, 10)
}

export function assetUrl(src: string | undefined): string {
  if (!src) return ''
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src
  return `./${src.replace(/^\.?\//, '')}`
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
