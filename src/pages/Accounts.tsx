import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useData, useDay, useDays } from '../lib/data'
import {
  fmtCompact,
  fmtInt,
  fmtSigned,
  METRICS,
  METRIC_META,
  monthDay,
} from '../lib/format'
import { aggregateDays, periodDates } from '../lib/metrics'
import type { Metric, Period } from '../lib/types'
import { navigate, useRoute } from '../lib/router'
import { GITHUB_ISSUES_URL } from '../config'
import {
  Avatar,
  EmptyState,
  MetricIcon,
  PageHeader,
  RankNumber,
  Seg,
  Skeleton,
  Sparkline,
  Trend,
  Verified,
} from '../components/ui'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: '7d', label: '近 7 天' },
]

function isMetric(value: string | null): value is Metric {
  return Boolean(value && METRICS.includes(value as Metric))
}

function isPeriod(value: string | null): value is Period {
  return value === 'today' || value === 'yesterday' || value === '7d'
}

export function AccountsPage() {
  const route = useRoute()
  const { index, openProfile } = useData()
  const metric = isMetric(route.params.get('metric')) ? (route.params.get('metric') as Metric) : 'impressions'
  const period = isPeriod(route.params.get('period')) ? (route.params.get('period') as Period) : 'today'
  const [query, setQuery] = useState(route.params.get('q') || '')
  const [category, setCategory] = useState('全部')
  const dates = index ? periodDates(index, period) : []
  const { days, loading, error } = useDays(dates)
  const previousDate =
    index && dates.length === 1
      ? index.dates[index.dates.indexOf(dates[0]) - 1]
      : undefined
  const { day: previousDay } = useDay(previousDate)

  useEffect(() => {
    const incoming = route.params.get('q')
    if (incoming !== null) setQuery(incoming)
  }, [route.params])

  const accounts = useMemo(() => {
    if (!days.length) return []
    return days.length === 1 ? days[0].accounts : aggregateDays(days)
  }, [days])

  const categories = useMemo(() => {
    const unique = new Set<string>()
    for (const account of accounts) if (account.category) unique.add(account.category)
    return ['全部', ...[...unique].sort((a, b) => a.localeCompare(b, 'zh-CN'))]
  }, [accounts])

  const previousRanks = useMemo(() => {
    if (!previousDay) return new Map<string, number>()
    const sorted = [...previousDay.accounts].sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
    return new Map(sorted.map((account, position) => [account.handle, position + 1]))
  }, [previousDay, metric])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return accounts
      .filter((account) => {
        if (category !== '全部' && account.category !== category) return false
        if (!needle) return true
        return (
          account.name.toLowerCase().includes(needle) ||
          account.handle.toLowerCase().includes(needle) ||
          (account.bio || '').toLowerCase().includes(needle) ||
          (account.category || '').toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
  }, [accounts, query, category, metric])

  const totals = useMemo(
    () => ({
      accounts: accounts.length,
      followers: accounts.reduce((sum, account) => sum + account.followers, 0),
      impressions: accounts.reduce((sum, account) => sum + account.impressions, 0),
      posts: accounts.reduce((sum, account) => sum + account.posts, 0),
    }),
    [accounts],
  )

  const updateRoute = (nextMetric: Metric, nextPeriod: Period) => {
    navigate(`/accounts?metric=${nextMetric}&period=${nextPeriod}${query ? `&q=${encodeURIComponent(query)}` : ''}`)
  }

  const weekly = period === '7d'
  const unit = weekly ? `${METRIC_META[metric].unit}/天` : METRIC_META[metric].unit

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="ACCOUNT LEADERBOARD"
        title={
          <>
            账号榜 <span className="gradient-text">· 每一个增长都有迹可循</span>
          </>
        }
        description={`收录 ${index ? Object.keys(index.series).length : 0} 位中文区创作者，按发帖、评论、涨粉与曝光四个维度排名。${weekly ? '近 7 天数据按日均值计算。' : '榜单每日自动更新。'}`}
      >
        <a
          href={`${GITHUB_ISSUES_URL}/new?title=${encodeURIComponent('申请收录账号')}&body=${encodeURIComponent('X 账号主页链接：\n\n一句话介绍：')}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-10 items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-brand-500 to-violet-500 px-4 text-[12px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(109,94,245,.9)] transition hover:brightness-110 md:self-auto"
        >
          <Plus size={14} /> 申请收录
        </a>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="收录创作者" value={fmtInt(totals.accounts)} hint={`${index?.dates.length || 0} 天历史`} />
        <StatCard label="粉丝总量" value={fmtCompact(totals.followers)} hint="去重后合计" />
        <StatCard label={weekly ? '日均发帖' : '今日发帖'} value={fmtCompact(totals.posts)} hint={weekly ? '近 7 天日均' : '全部收录账号'} />
        <StatCard label={weekly ? '日均曝光' : '今日曝光'} value={fmtCompact(totals.impressions)} hint={weekly ? '近 7 天日均' : '全部收录账号'} />
      </div>

      <div className="card mb-4 p-3 md:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {METRICS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateRoute(item, period)}
                data-active={metric === item}
                className="tab tab-ghost"
              >
                <span style={{ color: metric === item ? undefined : METRIC_META[item].color }}>
                  <MetricIcon metric={item} size={13} />
                </span>
                {METRIC_META[item].label}榜
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Seg
              value={period}
              onChange={(value) => updateRoute(metric, value)}
              options={PERIODS}
            />
            <div className="relative min-w-[190px] flex-1 sm:flex-none">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索名称 / @handle / 简介"
                className="h-8 w-full rounded-full border border-line bg-[var(--surface-2)] pl-8 pr-3 text-[11.5px] text-ink outline-none placeholder:text-faint focus:border-brand-400"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal
                size={12}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-8 appearance-none rounded-full border border-line bg-[var(--surface-2)] pl-8 pr-7 text-[11.5px] text-soft outline-none focus:border-brand-400"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span className="font-semibold text-ink">{METRIC_META[metric].label}榜</span>
            <span>·</span>
            <span>{period === '7d' ? '近 7 天日均' : period === 'yesterday' ? '昨日' : '今日'}</span>
            <span>·</span>
            <span>共 {filtered.length} 位</span>
          </div>
          <span className="hidden text-[10.5px] text-faint sm:block">
            {dates.length ? monthDay(dates[dates.length - 1]) : ''} 更新
          </span>
        </div>

        {error ? (
          <div className="p-6">
            <EmptyState title="数据加载失败" hint={error} />
          </div>
        ) : loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="没有匹配的账号" hint="换个关键词，或清空分类筛选试试。" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[840px]">
              <thead>
                <tr>
                  <th className="w-12 text-center">排名</th>
                  <th>创作者</th>
                  <th className="hidden lg:table-cell">分类</th>
                  <th className="text-right">粉丝</th>
                  <th className="text-right">{weekly ? '日均涨粉' : '涨粉'}</th>
                  <th className="text-right">{weekly ? '日均发帖' : '发帖'}</th>
                  <th className="text-right">{weekly ? '日均评论' : '评论'}</th>
                  <th className="text-right" style={{ color: METRIC_META[metric].color }}>
                    {weekly ? '日均曝光' : '曝光'}
                  </th>
                  <th className="hidden text-center xl:table-cell">趋势</th>
                  <th className="hidden text-center md:table-cell">环比</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((account, position) => {
                  const rank = position + 1
                  const previous = previousRanks.get(account.handle)
                  const delta = previous ? previous - rank : null
                  const series = index?.series[account.handle]
                  return (
                    <tr
                      key={account.handle}
                      onClick={() => openProfile(account.handle)}
                      className="cursor-pointer"
                    >
                      <td className="text-center">
                        <RankNumber rank={rank} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar src={account.avatar} name={account.name} handle={account.handle} size={32} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="max-w-[150px] truncate text-[12.5px] font-semibold text-ink md:max-w-[220px]">
                                {account.name}
                              </span>
                              {account.verified ? <Verified size={11} /> : null}
                            </div>
                            <span className="block text-[10.5px] text-faint">@{account.handle}</span>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell">
                        {account.category ? (
                          <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] text-muted">
                            {account.category}
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="num text-right text-[12px] text-soft">{fmtCompact(account.followers)}</td>
                      <td className="num text-right text-[12px] font-medium text-emerald-500">
                        {account.followersGain === 0 && (index?.dates.length || 0) < 2
                          ? '—'
                          : fmtSigned(account.followersGain)}
                      </td>
                      <td className="num text-right text-[12px] text-soft">{fmtCompact(account.posts)}</td>
                      <td className="num text-right text-[12px] text-soft">{fmtCompact(account.replies)}</td>
                      <td
                        className="num text-right text-[12px] font-semibold"
                        style={{ color: METRIC_META[metric].color }}
                      >
                        {fmtCompact(account[metric])}
                        <span className="ml-1 hidden text-[9px] font-normal text-faint xl:inline">{unit}</span>
                      </td>
                      <td className="hidden xl:table-cell">
                        <div className="flex justify-center">
                          <Sparkline
                            values={series?.[metric]?.slice(-14) || []}
                            color={METRIC_META[metric].color}
                            width={86}
                            height={26}
                          />
                        </div>
                      </td>
                      <td className="hidden text-center md:table-cell">
                        <Trend delta={delta} />
                      </td>
                      <td>
                        <ArrowUpRight size={13} className="text-faint" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[10.5px] text-faint">
          <span>点击任意账号查看 30 天趋势与历史排名</span>
          <span>{weekly ? '每分钟更新 · 7 天日均值' : '每日 08:00 前自动更新'}</span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card-flat rounded-xl px-3.5 py-3">
      <p className="text-[10.5px] text-faint">{label}</p>
      <p className="num mt-1 text-xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] text-faint">{hint}</p>
    </div>
  )
}
