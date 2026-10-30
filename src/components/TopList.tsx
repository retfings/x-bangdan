import { ArrowRight } from 'lucide-react'
import type { Account, Metric } from '../lib/types'
import { fmtCompact, METRIC_META } from '../lib/format'
import { Avatar, MetricIcon, RankNumber, Verified } from './ui'

export function TopList({
  metric,
  accounts,
  period,
  onSelect,
}: {
  metric: Metric
  accounts: Account[]
  period: 'today' | 'yesterday' | '7d'
  onSelect?: (handle: string) => void
}) {
  const meta = METRIC_META[metric]
  const rows = accounts.slice(1, 5)
  const weekly = period === '7d'
  const unit = weekly ? `${meta.unit}/天` : meta.unit
  const noGainData = metric === 'followersGain' && rows.length > 0 && rows.every((account) => !account.followersGain)

  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span style={{ color: meta.color }}>
            <MetricIcon metric={metric} size={14} />
          </span>
          <h3 className="truncate text-[13px] font-semibold text-soft">
            {meta.label}榜 <span className="text-faint">2-5 名</span>
          </h3>
        </div>
        <a
          href={`#/accounts?metric=${metric}&period=${period}`}
          className="flex shrink-0 items-center gap-0.5 text-[11px] text-faint transition hover:text-brand-500"
        >
          更多 <ArrowRight size={11} />
        </a>
      </div>
      <div className="space-y-0.5">
        {rows.length === 0 ? (
          <p className="px-1 py-4 text-xs text-faint">暂无数据</p>
        ) : noGainData ? (
          <p className="px-1 py-4 text-[11px] leading-relaxed text-faint">
            首日收录，明日开始统计涨粉
          </p>
        ) : (
          rows.map((account, index) => (
            <button
              key={account.handle}
              type="button"
              onClick={() => onSelect?.(account.handle)}
              className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-[var(--surface-2)]"
            >
              <RankNumber rank={index + 2} size="sm" />
              <Avatar
                src={account.avatar}
                name={account.name}
                handle={account.handle}
                size={26}
              />
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="truncate text-[12px] font-medium text-soft group-hover:text-ink">
                  {account.name}
                </span>
                {account.verified ? <Verified size={11} /> : null}
              </span>
              <span className="num shrink-0 text-[12px] font-bold" style={{ color: meta.color }}>
                {metric === 'followersGain' && account.followersGain > 0 ? '+' : ''}
                {fmtCompact(account[metric])}
                <span className="ml-0.5 text-[9px] font-normal text-faint">{unit}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}
