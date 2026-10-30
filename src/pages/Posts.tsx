import { useMemo, useState } from 'react'
import { ArrowUpRight, Eye, Heart, MessageCircle, Repeat2, Search } from 'lucide-react'
import { useData, useDays } from '../lib/data'
import { fmtCompact, fmtInt, monthDay, relativeTime } from '../lib/format'
import { periodDates, topTweetsOf } from '../lib/metrics'
import type { Period, Tweet } from '../lib/types'
import { navigate, useRoute } from '../lib/router'
import {
  Avatar,
  EmptyState,
  PageHeader,
  RankNumber,
  Seg,
  Skeleton,
  Verified,
} from '../components/ui'

type SortKey = 'impressions' | 'likes' | 'retweets' | 'replies'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'impressions', label: '曝光' },
  { value: 'likes', label: '点赞' },
  { value: 'retweets', label: '转发' },
  { value: 'replies', label: '评论' },
]

function parsePeriod(value: string | null): Period {
  return value === 'yesterday' || value === '7d' ? value : 'today'
}

export function PostsPage() {
  const route = useRoute()
  const { index, openProfile } = useData()
  const period = parsePeriod(route.params.get('period'))
  const sort = (SORTS.some((item) => item.value === route.params.get('sort'))
    ? route.params.get('sort')
    : 'impressions') as SortKey
  const [query, setQuery] = useState('')
  const dates = index ? periodDates(index, period) : []
  const { days, loading, error } = useDays(dates)

  const tweets = useMemo(() => {
    const list = topTweetsOf(days, 200)
    const needle = query.trim().toLowerCase()
    return list
      .filter(
        (tweet) =>
          !needle ||
          tweet.text.toLowerCase().includes(needle) ||
          tweet.name.toLowerCase().includes(needle) ||
          tweet.handle.toLowerCase().includes(needle),
      )
      .sort((a, b) => (b[sort] || 0) - (a[sort] || 0))
  }, [days, query, sort])

  const totalImpressions = tweets.reduce((sum, tweet) => sum + tweet.impressions, 0)
  const updateRoute = (nextPeriod: Period, nextSort: SortKey) => {
    navigate(`/posts?period=${nextPeriod}&sort=${nextSort}`)
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="POST LEADERBOARD"
        title={
          <>
            推文榜 <span className="gradient-text">· 什么内容正在被看见</span>
          </>
        }
        description="聚合中文区创作者的高曝光原创推文。按曝光、点赞、转发与评论排序，找到真正跑出来的内容。"
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="收录推文" value={fmtInt(tweets.length)} hint={period === '7d' ? '近 7 天' : '当前周期'} />
        <MiniStat label="累计曝光" value={fmtCompact(totalImpressions)} hint="榜单内推文" />
        <MiniStat label="平均曝光" value={fmtCompact(tweets.length ? totalImpressions / tweets.length : 0)} hint="单条推文" />
        <MiniStat label="更新日期" value={dates.length ? monthDay(dates[dates.length - 1]) : '—'} hint="每日自动更新" />
      </div>

      <div className="card mb-5 flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:p-4">
        <Seg
          value={period}
          onChange={(value) => updateRoute(value, sort)}
          options={[
            { value: 'today', label: '今日' },
            { value: 'yesterday', label: '昨日' },
            { value: '7d', label: '近 7 天' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Seg
            value={sort}
            onChange={(value) => updateRoute(period, value)}
            options={SORTS}
            ghost
          />
          <div className="relative min-w-[180px] flex-1 md:flex-none">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索推文内容 / 作者"
              className="h-8 w-full rounded-full border border-line bg-[var(--surface-2)] pl-8 pr-3 text-[11.5px] text-ink outline-none placeholder:text-faint focus:border-brand-400"
            />
          </div>
        </div>
      </div>

      {error ? (
        <EmptyState title="推文加载失败" hint={error} />
      ) : loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      ) : tweets.length === 0 ? (
        <EmptyState title="没有匹配的推文" hint="换个关键词试试，或切换到近 7 天。" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tweets.map((tweet, index) => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              rank={index + 1}
              sort={sort}
              onAuthor={() => openProfile(tweet.handle)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TweetCard({
  tweet,
  rank,
  sort,
  onAuthor,
}: {
  tweet: Tweet
  rank: number
  sort: SortKey
  onAuthor: () => void
}) {
  const metrics: { key: SortKey; icon: typeof Eye; value: number }[] = [
    { key: 'impressions', icon: Eye, value: tweet.impressions },
    { key: 'likes', icon: Heart, value: tweet.likes },
    { key: 'retweets', icon: Repeat2, value: tweet.retweets },
    { key: 'replies', icon: MessageCircle, value: tweet.replies },
  ]

  return (
    <article className="card group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
      {rank <= 3 ? (
        <span className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-r from-brand-500 to-violet-500 px-2 py-1 text-[9px] font-bold text-white">
          TOP {rank}
        </span>
      ) : null}
      <div className="flex items-start gap-2.5">
        <RankNumber rank={rank} size="lg" />
        <button type="button" onClick={onAuthor} className="flex min-w-0 items-center gap-2 text-left">
          <Avatar src={tweet.avatar} name={tweet.name} handle={tweet.handle} size={34} />
          <span className="min-w-0">
            <span className="flex items-center gap-1">
              <span className="max-w-[160px] truncate text-[12.5px] font-semibold text-ink">
                {tweet.name}
              </span>
              {tweet.verified ? <Verified size={11} /> : null}
            </span>
            <span className="block truncate text-[10.5px] text-faint">
              @{tweet.handle} · {relativeTime(tweet.createdAt)}
            </span>
          </span>
        </button>
      </div>

      <a
        href={tweet.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 block"
      >
        <p className="line-clamp-3 min-h-[54px] text-[13px] leading-[1.7] text-soft transition group-hover:text-ink">
          {tweet.text}
        </p>
      </a>

      <div className="mt-3 flex items-end justify-between border-t border-line pt-2.5">
        <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-muted">
          {metrics.map((item) => {
            const Icon = item.icon
            const active = item.key === sort
            return (
              <span
                key={item.key}
                className={`flex items-center gap-1 ${active ? 'font-semibold text-brand-500' : ''}`}
              >
                <Icon size={11} /> {fmtCompact(item.value)}
              </span>
            )
          })}
        </div>
        <a
          href={tweet.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1 text-[10px] font-medium text-faint transition hover:text-brand-500"
        >
          查看 <ArrowUpRight size={11} />
        </a>
      </div>
    </article>
  )
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card-flat rounded-xl px-3.5 py-3">
      <p className="text-[10.5px] text-faint">{label}</p>
      <p className="num mt-1 text-xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] text-faint">{hint}</p>
    </div>
  )
}
