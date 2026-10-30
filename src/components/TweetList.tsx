import { ArrowUpRight, Flame, Heart, MessageCircle, Repeat2 } from 'lucide-react'
import type { Tweet } from '../lib/types'
import { fmtCompact, relativeTime } from '../lib/format'
import { Avatar, Verified } from './ui'

export function TweetList({
  tweets,
  limit = 8,
  title = '24 小时最火推文',
  live = true,
}: {
  tweets: Tweet[]
  limit?: number
  title?: string
  live?: boolean
}) {
  const rows = tweets.slice(0, limit)
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Flame size={15} className="text-orange-500" />
          <h3 className="text-[13px] font-bold text-ink">{title}</h3>
          {live ? (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-500">
              <span className="ticker h-1 w-1 rounded-full bg-rose-500" />
              实时
            </span>
          ) : null}
        </div>
        <a href="#/posts" className="text-[11px] text-faint transition hover:text-brand-500">
          完整榜单
        </a>
      </header>
      <div className="divide-y divide-[var(--border)]">
        {rows.map((tweet, index) => (
          <a
            key={tweet.id}
            href={tweet.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex gap-2.5 px-4 py-3 transition hover:bg-[var(--surface-2)]"
          >
            <span
              className={`num w-4 shrink-0 pt-0.5 text-right text-[13px] font-bold ${
                index === 0
                  ? 'text-brand-500'
                  : index < 3
                    ? 'text-soft'
                    : 'text-faint'
              }`}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="tweet-text text-[12.5px] leading-[1.55] text-soft group-hover:text-ink">
                {tweet.text}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Avatar
                  src={tweet.avatar}
                  name={tweet.name}
                  handle={tweet.handle}
                  size={16}
                />
                <span className="truncate text-[10.5px] text-faint">@{tweet.handle}</span>
                {tweet.verified ? <Verified size={10} /> : null}
                <span className="text-faint">·</span>
                <span className="shrink-0 text-[10px] text-faint">
                  {relativeTime(tweet.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[9.5px] text-faint">
                <span className="flex items-center gap-0.5">
                  <Heart size={10} /> {fmtCompact(tweet.likes)}
                </span>
                <span className="flex items-center gap-0.5">
                  <Repeat2 size={10} /> {fmtCompact(tweet.retweets)}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle size={10} /> {fmtCompact(tweet.replies)}
                </span>
                <ArrowUpRight
                  size={10}
                  className="ml-auto opacity-0 transition group-hover:opacity-100"
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="num text-[13px] font-bold text-ink">{fmtCompact(tweet.impressions)}</p>
              <p className="mt-0.5 text-[9px] text-faint">曝光</p>
            </div>
          </a>
        ))}
        {rows.length === 0 ? <p className="px-4 py-10 text-center text-xs text-faint">暂无推文数据</p> : null}
      </div>
    </section>
  )
}
