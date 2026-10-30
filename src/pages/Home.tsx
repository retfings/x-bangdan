import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  Download,
  History,
  Info,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useData, useDays } from '../lib/data'
import {
  fmtCompact,
  fmtInt,
  fullDate,
  METRICS,
  METRIC_META,
  monthDay,
  weekday,
} from '../lib/format'
import {
  aggregateDays,
  championsOf,
  isRecord,
  periodDates,
  periodLabel,
  rankAccounts,
  streakFor,
  sumTotals,
  topTweetsOf,
} from '../lib/metrics'
import type { Account, Champion, Metric, Period } from '../lib/types'
import { exportChampionCard, exportPoster } from '../lib/exportImage'
import { GITHUB_REPO, GITHUB_URL } from '../config'
import { ChampionCard } from '../components/ChampionCard'
import { TopList } from '../components/TopList'
import { TweetList } from '../components/TweetList'
import { Avatar, EmptyState, GithubLogo, MetricIcon, Seg, Skeleton } from '../components/ui'
import { useRoute } from '../lib/router'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: '今日榜' },
  { value: 'yesterday', label: '昨日榜' },
  { value: '7d', label: '7 天榜' },
]

export function HomePage() {
  const { index, error, loading: indexLoading, openProfile } = useData()
  const route = useRoute()
  const [period, setPeriod] = useState<Period>(() => {
    const value = route.params.get('period')
    return value === 'yesterday' || value === '7d' ? value : 'today'
  })
  const dates = index ? periodDates(index, period) : []
  const { days, loading } = useDays(dates)

  const accounts = useMemo(() => {
    if (days.length === 1) return days[0].accounts
    return aggregateDays(days)
  }, [days])

  const ranked = useMemo(
    () => Object.fromEntries(METRICS.map((metric) => [metric, rankAccounts(accounts, metric)])) as Record<Metric, Account[]>,
    [accounts],
  )

  const champions = useMemo(() => championsOf(accounts), [accounts])
  const latestDay = days[days.length - 1]
  const displayDate = dates[dates.length - 1] || index?.latest || ''
  const tweets = useMemo(() => topTweetsOf(days, 8), [days])
  const totals = useMemo(() => sumTotals(days), [days])
  const weekly = period === '7d'
  const firstDay = Boolean(index && index.dates.length < 2)

  const exportOne = async (metric: Metric) => {
    const champion = champions[metric]
    if (!champion) return
    await exportChampionCard({
      metric,
      champion,
      account: accounts.find((account) => account.handle === champion.handle),
      date: displayDate,
      periodLabel: periodLabel(period),
    })
  }

  const exportAll = async () => {
    const list: { metric: Metric; champion: Champion }[] = []
    for (const metric of METRICS) {
      const champion = champions[metric]
      if (champion) list.push({ metric, champion })
    }
    await exportPoster({
      date: displayDate,
      periodLabel: periodLabel(period),
      champions: list,
      accounts,
    })
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="数据加载失败"
          hint={`${error}。请确认 public/data/index.json 已由 Kaggle 任务生成并推送。`}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-4 pt-6 md:px-6">
      {index?.source === 'demo' ? (
        <a
          href="#/about"
          className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2 text-[11.5px] text-amber-700 transition hover:bg-amber-500/12 dark:text-amber-300"
        >
          <Info size={13} className="shrink-0" />
          <span>
            当前展示的是<strong className="font-semibold">演示数据</strong>。完成 Kaggle
            采集配置后，每天会自动替换为真实榜单。
          </span>
          <span className="ml-auto hidden shrink-0 items-center gap-0.5 font-semibold sm:flex">
            查看接入指南 <ArrowRight size={11} />
          </span>
        </a>
      ) : null}

      <Hero
        date={displayDate}
        accounts={index ? Object.keys(index.series).length : 0}
        totals={totals}
        weekly={weekly}
        source={index?.source}
        loading={indexLoading || loading}
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0">
          <section className="card p-3.5 md:p-5">
            <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm">
                  <Trophy size={17} />
                </span>
                <div>
                  <h2 className="text-[19px] font-extrabold tracking-tight text-ink">冠军榜</h2>
                  <p className="text-[10.5px] text-muted">
                    发帖 · 评论 · 涨粉 · 曝光
                    <span className="ml-1.5 text-faint">
                      {weekly ? `${monthDay(dates[0] || '')} - ${monthDay(displayDate)} · 日均` : `${weekday(displayDate)} · ${monthDay(displayDate)}`}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Seg
                  value={period}
                  onChange={setPeriod}
                  options={PERIOD_OPTIONS}
                  className="scale-[0.97]"
                />
                <a
                  href="#/records"
                  className="tab hidden border border-line bg-surface text-[11px] sm:inline-flex"
                >
                  纪录殿堂
                </a>
                <a
                  href="#/history"
                  className="tab hidden border border-line bg-surface text-[11px] md:inline-flex"
                >
                  历史榜单
                </a>
                <button
                  type="button"
                  onClick={exportAll}
                  disabled={!accounts.length}
                  className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-medium text-soft transition hover:border-line-strong hover:text-ink disabled:opacity-40"
                >
                  <Download size={12} /> 生成榜单图
                </button>
              </div>
            </header>

            {loading || indexLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {METRICS.map((metric) => (
                  <Skeleton key={metric} className="h-[336px] rounded-[22px]" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {METRICS.map((metric, cardIndex) => {
                  const champion = champions[metric]
                  const account = accounts.find((item) => item.handle === champion?.handle)
                  if (!champion) return null
                  const streak =
                    !weekly && index
                      ? streakFor(index.history, displayDate, metric, champion.handle)
                      : 0
                  return (
                    <ChampionCard
                      key={metric}
                      metric={metric}
                      champion={champion}
                      account={account}
                      date={displayDate}
                      periodLabel={periodLabel(period)}
                      streak={streak}
                      record={
                        !weekly &&
                        Boolean(index) &&
                        isRecord(index!, displayDate, metric, champion.handle, champion.value)
                      }
                      placeholder={
                        metric === 'followersGain' && firstDay
                          ? { title: '首日收录', hint: '明日开始统计涨粉' }
                          : undefined
                      }
                      onExport={() => exportOne(metric)}
                      delay={cardIndex * 60}
                    />
                  )
                })}
              </div>
            )}

            <div className="mt-6 grid gap-x-6 gap-y-5 border-t border-line pt-5 sm:grid-cols-2 xl:grid-cols-4">
              {METRICS.map((metric) => (
                <TopList
                  key={metric}
                  metric={metric}
                  accounts={ranked[metric]}
                  period={period}
                  onSelect={openProfile}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[10px] text-faint">
              <span>
                {weekly ? '近 7 天数据按日均值排序' : '单日数据按自然日统计'} · 共 {accounts.length} 位创作者
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {index?.generatedAt ? `更新于 ${new Date(index.generatedAt).toLocaleString('zh-CN')}` : '每日自动更新'}
              </span>
            </div>
          </section>

          <RecordsStrip />
          <HistoryStrip onSelect={openProfile} />
        </div>

        <aside className="min-w-0 space-y-4">
          <TweetList tweets={tweets} limit={8} />

          <section className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                <Sparkles size={14} className="text-brand-500" /> {weekly ? '近 7 天概览' : '今日概览'}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
              {METRICS.map((metric) => (
                <div key={metric} className="bg-surface px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-faint">
                    <span style={{ color: METRIC_META[metric].color }}>
                      <MetricIcon metric={metric} size={12} />
                    </span>
                    {weekly ? '日均' : ''}
                    {METRIC_META[metric].label}
                  </div>
                  <p className="num mt-1 text-[17px] font-extrabold tracking-tight text-ink">
                    {fmtCompact(totals[metric] / (weekly ? 7 : 1))}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[10px] text-faint">
              <span>{weekly ? '按 7 天日均计算' : '全部收录账号合计'}</span>
              <a href={`#/accounts?period=${period}`} className="text-brand-500 hover:underline">
                查看账号榜
              </a>
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-3)] text-ink">
                <GithubLogo size={15} />
              </span>
              <div>
                <h3 className="text-[12.5px] font-bold text-ink">开源 · 每天自动更新</h3>
                <p className="text-[10px] text-faint">{GITHUB_REPO}</p>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              Kaggle 每日采集数据并推送回 GitHub，GitHub Pages 自动发布。数据、代码与榜单口径全部公开。
            </p>
            <div className="mt-3 flex gap-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--surface-3)] px-2 py-2 text-[10.5px] font-semibold text-soft transition hover:bg-[var(--border)]"
              >
                <GithubLogo size={11} /> Star 项目
              </a>
              <a
                href="#/about"
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line px-2 py-2 text-[10.5px] font-semibold text-muted transition hover:text-ink"
              >
                数据说明 <ArrowUpRight size={10} />
              </a>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-4 text-white">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/5" />
            <p className="text-[10px] font-semibold tracking-widest text-white/60">OPEN DATA</p>
            <h3 className="mt-1 text-[15px] font-bold">用数据，讲好你的增长故事</h3>
            <p className="mt-1 text-[10.5px] leading-relaxed text-white/65">
              每个账号都有 30 天趋势、历史排名与纪录徽章。点击任意头像查看。
            </p>
            <a
              href="#/accounts"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10.5px] font-bold text-brand-700"
            >
              打开账号库 <ArrowRight size={11} />
            </a>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Hero({
  date,
  accounts,
  totals,
  weekly,
  source,
  loading,
}: {
  date: string
  accounts: number
  totals: { posts: number; impressions: number; replies: number; followersGain: number }
  weekly: boolean
  source?: string
  loading: boolean
}) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-line bg-surface px-5 py-6 md:px-8 md:py-7">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 right-1/3 h-64 w-64 rounded-full bg-fuchsia-500/8 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-soft px-2.5 py-1 text-[10.5px] font-semibold text-brand-600 dark:text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {weekly ? '近 7 天榜单' : '每日榜单'} · {fullDate(date)}
            </span>
            {source === 'demo' ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                DEMO DATA
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-[10px] text-faint">
              <span className="ticker h-1.5 w-1.5 rounded-full bg-emerald-500" />
              数据已同步
            </span>
          </div>
          <h1 className="mt-3 text-[26px] font-extrabold leading-[1.25] tracking-tight text-ink md:text-[34px]">
            中文区创作者，
            <span className="gradient-text">每天用数据说话</span>
          </h1>
          <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-muted">
            追踪发帖、评论、涨粉与曝光四个维度，记录每一个冠军、每一次破纪录。数据来自公开信息，每日自动更新。
          </p>

          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
            <HeroStat label="收录创作者" value={loading ? '—' : fmtInt(accounts)} />
            <span className="hidden h-8 w-px self-center bg-[var(--border)] sm:block" />
            <HeroStat
              label={weekly ? '近 7 天发帖' : '今日原创推文'}
              value={loading ? '—' : fmtCompact(totals.posts)}
            />
            <span className="hidden h-8 w-px self-center bg-[var(--border)] sm:block" />
            <HeroStat
              label={weekly ? '近 7 天曝光' : '今日累计曝光'}
              value={loading ? '—' : fmtCompact(totals.impressions)}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-2xl border border-line bg-[var(--surface-2)] px-4 py-3 text-center">
            <div className="num text-[26px] font-extrabold leading-none tracking-tight text-ink">
              {date ? monthDay(date) : '—'}
            </div>
            <div className="mt-1 text-[9.5px] text-faint">{date ? weekday(date) : ''}</div>
          </div>
          <div className="hidden space-y-1.5 text-[10.5px] text-muted sm:block">
            <p className="flex items-center gap-1.5">
              <CalendarRange size={11} className="text-brand-500" /> 每天 08:00 前更新
            </p>
            <p className="flex items-center gap-1.5">
              <History size={11} className="text-brand-500" /> 保留完整历史榜单
            </p>
            <a href="#/history" className="flex items-center gap-1.5 text-brand-500 hover:underline">
              <ArrowRight size={11} /> 查看历史数据
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="num text-[21px] font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] text-faint">{label}</p>
    </div>
  )
}

function RecordsStrip() {
  const { index, openProfile } = useData()
  if (!index) return null
  return (
    <section className="card mt-5 p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-amber-500" />
          <h2 className="text-[15px] font-bold tracking-tight text-ink">纪录殿堂</h2>
          <span className="hidden text-[10px] text-faint sm:inline">单日历史最高</span>
        </div>
        <a href="#/records" className="flex items-center gap-1 text-[10.5px] text-faint transition hover:text-brand-500">
          全部纪录 <ArrowRight size={11} />
        </a>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => {
          const record = index.records[metric]
          if (!record) return null
          const meta = METRIC_META[metric]
          return (
            <button
              key={metric}
              type="button"
              onClick={() => openProfile(record.handle)}
              className="group flex items-center gap-2.5 rounded-xl border border-line bg-[var(--surface-2)] p-2.5 text-left transition hover:border-line-strong hover:bg-surface"
            >
              <div className="relative">
                <Avatar src={record.avatar} name={record.name} handle={record.handle} size={34} />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px] text-white">
                  🏆
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9.5px] text-faint">{meta.label}纪录</p>
                <p className="truncate text-[11.5px] font-semibold text-ink">{record.name}</p>
                <p className="num text-[12px] font-bold" style={{ color: meta.color }}>
                  {fmtCompact(record.value)}
                  <span className="ml-0.5 text-[8px] font-normal text-faint">{meta.unit}</span>
                </p>
              </div>
              <span className="shrink-0 text-[9px] text-faint">{monthDay(record.date)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function HistoryStrip({ onSelect }: { onSelect: (handle: string) => void }) {
  const { index } = useData()
  const rows = useMemo(() => (index?.history || []).slice(-8).reverse(), [index])
  if (!index || !rows.length) return null
  return (
    <section className="card mt-5 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarRange size={14} className="text-brand-500" />
          <h2 className="text-[14px] font-bold tracking-tight text-ink">历史榜单</h2>
          <span className="text-[10px] text-faint">最近 8 天冠军</span>
        </div>
        <a href="#/history" className="flex items-center gap-1 text-[10.5px] text-faint transition hover:text-brand-500">
          完整历史 <ArrowRight size={11} />
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th className="w-20">日期</th>
              {METRICS.map((metric) => (
                <th key={metric}>{METRIC_META[metric].label}冠军</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date}>
                <td>
                  <span className="num text-[11.5px] font-semibold text-soft">{monthDay(row.date)}</span>
                  <span className="ml-1 text-[9px] text-faint">{weekday(row.date).replace('周', '')}</span>
                </td>
                {METRICS.map((metric) => {
                  const champion = row.champions[metric]
                  return (
                    <td key={metric}>
                      {champion ? (
                        <button
                          type="button"
                          onClick={() => onSelect(champion.handle)}
                          className="flex items-center gap-1.5 text-left"
                        >
                          <Avatar
                            src={champion.avatar}
                            name={champion.name}
                            handle={champion.handle}
                            size={20}
                          />
                          <span className="max-w-[100px] truncate text-[11px] text-soft">{champion.name}</span>
                          <span className="num text-[10.5px] font-semibold" style={{ color: METRIC_META[metric].color }}>
                            {metric === 'followersGain' && !champion.value ? '—' : fmtCompact(champion.value)}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-faint">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
