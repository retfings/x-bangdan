import { useEffect, useId, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  ExternalLink,
  Flame,
  Trophy,
  X,
} from 'lucide-react'
import { useData, useDay } from '../lib/data'
import { fmtCompact, fmtSigned, METRICS, METRIC_META, monthDay } from '../lib/format'
import { bestRank } from '../lib/metrics'
import type { Metric } from '../lib/types'
import { Avatar, MetricIcon, Seg, Verified, XLogo } from './ui'

function MetricChart({ values, color }: { values: number[]; color: string }) {
  const rawId = useId()
  const id = `chart-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const width = 380
  const height = 132
  const top = 12
  const bottom = 20
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : width
  const points = values.map((value, index) => {
    const x = values.length > 1 ? index * step : width / 2
    const y = top + (1 - value / max) * (height - top - bottom)
    return [x, y] as const
  })
  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${width},${height - bottom} L0,${height - bottom} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[132px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={top + ratio * (height - top - bottom)}
            y2={top + ratio * (height - top - bottom)}
            stroke="var(--border)"
            strokeDasharray="3 5"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.length > 0 ? (
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r="3.5"
            fill={color}
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ) : null}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-faint">
        <span>{values.length > 1 ? '30 天前' : '今日'}</span>
        <span>峰值 {fmtCompact(max)}</span>
        <span>今天</span>
      </div>
    </div>
  )
}

export function ProfileDrawer() {
  const { index, profileHandle, closeProfile } = useData()
  const [metric, setMetric] = useState<Metric>('impressions')
  const entry = profileHandle ? index?.series[profileHandle] : undefined
  const { day } = useDay(index?.latest)
  const account = day?.accounts.find((item) => item.handle === profileHandle)

  useEffect(() => {
    if (!profileHandle) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeProfile()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [profileHandle, closeProfile])

  useEffect(() => {
    setMetric('impressions')
  }, [profileHandle])

  const records = useMemo(() => {
    if (!index || !profileHandle) return []
    return METRICS.filter((item) => index.records[item]?.handle === profileHandle)
  }, [index, profileHandle])

  if (!profileHandle || !index) return null

  const values = entry?.[metric]?.slice(-30) || []
  const bestValue = values.length ? Math.max(...values) : 0
  const bestIndex = values.indexOf(bestValue)
  const latestDate = index.latest
  const chartStart =
    index.dates[Math.max(0, index.dates.length - 30)] || index.dates[0] || latestDate

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="关闭"
        onClick={closeProfile}
        className="overlay-in absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <aside className="drawer-panel absolute right-0 top-0 flex h-full w-full max-w-[450px] flex-col overflow-y-auto border-l border-line bg-surface shadow-pop">
        <div className="relative h-28 shrink-0 overflow-hidden bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_0%,white,transparent_40%)]" />
          <XLogo size={160} className="absolute -right-6 -top-8 rotate-6 text-white/10" />
          <button
            type="button"
            onClick={closeProfile}
            aria-label="关闭"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white/80 backdrop-blur transition hover:bg-black/40 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative px-5 pb-8">
          <div className="-mt-9 flex items-end justify-between">
            <Avatar
              src={entry?.avatar}
              name={entry?.name || profileHandle}
              handle={profileHandle}
              size={76}
              ring
              className="ring-offset-[var(--surface)]"
            />
            <a
              href={`https://x.com/${profileHandle}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold text-soft transition hover:border-line-strong hover:text-ink"
            >
              <XLogo size={11} /> 打开主页 <ExternalLink size={10} />
            </a>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold tracking-tight text-ink">{entry?.name || profileHandle}</h2>
              {entry?.verified ? <Verified size={16} /> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
              <span>@{profileHandle}</span>
              {entry?.category ? (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:text-brand-300">
                  {entry.category}
                </span>
              ) : null}
              <span className="flex items-center gap-1 text-faint">
                <CalendarDays size={11} /> 收录 {index.dates.length} 天
              </span>
            </div>
            {entry?.bio ? (
              <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{entry.bio}</p>
            ) : null}
          </div>

          {records.length ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
              <Trophy size={15} className="shrink-0 text-amber-500" />
              <p className="text-[11.5px] text-amber-700 dark:text-amber-300">
                保持 {records.map((item) => METRIC_META[item].label).join('、')} 单日历史纪录
              </p>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="card-flat rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-faint">当前粉丝</p>
              <p className="num mt-1 text-lg font-bold text-ink">{fmtCompact(entry?.followers)}</p>
            </div>
            <div className="card-flat rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-faint">今日涨粉</p>
              <p className="num mt-1 text-lg font-bold text-emerald-500">
                {fmtSigned(account?.followersGain ?? 0)}
              </p>
            </div>
            <div className="card-flat rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-faint">今日发帖</p>
              <p className="num mt-1 text-lg font-bold text-ink">{fmtCompact(account?.posts)}</p>
            </div>
            <div className="card-flat rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-faint">今日评论</p>
              <p className="num mt-1 text-lg font-bold text-ink">{fmtCompact(account?.replies)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {METRICS.map((item) => {
              const rank = bestRank(index, index.latest, item, profileHandle)
              return (
                <div key={item} className="rounded-lg bg-[var(--surface-2)] px-1.5 py-2 text-center">
                  <span style={{ color: METRIC_META[item].color }}>
                    <MetricIcon metric={item} size={13} className="mx-auto" />
                  </span>
                  <p className="mt-1 text-[9px] text-faint">{METRIC_META[item].label}排名</p>
                  <p className="num mt-0.5 text-[12px] font-bold text-ink">
                    {rank ? `#${rank}` : '—'}
                  </p>
                </div>
              )
            })}
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink">数据趋势</h3>
              <Seg
                value={metric}
                onChange={setMetric}
                options={METRICS.map((item) => ({
                  value: item,
                  label: METRIC_META[item].label,
                }))}
                className="scale-90"
              />
            </div>
            <div className="rounded-xl border border-line bg-[var(--surface-2)] px-3 pb-2 pt-3">
              <MetricChart values={values} color={METRIC_META[metric].color} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-faint">
              <span>
                {monthDay(chartStart)} - {monthDay(latestDate)}
              </span>
              <span>
                最高 {fmtCompact(bestValue)} · {monthDay(index.dates[Math.max(0, index.dates.length - 30 + bestIndex)] || latestDate)}
              </span>
            </div>
          </section>

          {account ? (
            <section className="mt-6">
              <h3 className="mb-2 text-[13px] font-bold text-ink">今日高曝光推文</h3>
              <div className="space-y-2">
                {(day?.tweets || [])
                  .filter((tweet) => tweet.handle === profileHandle)
                  .slice(0, 3)
                  .map((tweet) => (
                    <a
                      key={tweet.id}
                      href={tweet.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block rounded-xl border border-line bg-[var(--surface-2)] p-3 transition hover:border-line-strong"
                    >
                      <p className="line-clamp-3 text-[11.5px] leading-relaxed text-soft">{tweet.text}</p>
                      <div className="mt-2 flex items-center gap-3 text-[9.5px] text-faint">
                        <span className="flex items-center gap-1">
                          <Flame size={10} className="text-orange-500" />
                          {fmtCompact(tweet.impressions)} 曝光
                        </span>
                        <span>{fmtCompact(tweet.likes)} 赞</span>
                        <ArrowUpRight size={10} className="ml-auto" />
                      </div>
                    </a>
                  ))}
                {(day?.tweets || []).every((tweet) => tweet.handle !== profileHandle) ? (
                  <p className="text-[11px] text-faint">今日暂无进入推文榜的内容</p>
                ) : null}
              </div>
            </section>
          ) : null}

          <div className="mt-6 flex items-center justify-between rounded-xl border border-line bg-[var(--surface-2)] px-3 py-2.5 text-[10.5px] text-muted">
            <span>数据每日 08:00 前更新</span>
            <span className="flex items-center gap-1 font-semibold text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 已同步
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}
