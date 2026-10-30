import { Download, Flame, Trophy } from 'lucide-react'
import type { Account, Champion, Metric } from '../lib/types'
import { fmtCompact, METRIC_META, monthDay } from '../lib/format'
import { Avatar, MetricIcon, Verified } from './ui'

const SECONDARY: Record<Metric, Metric[]> = {
  posts: ['replies', 'followersGain', 'impressions'],
  replies: ['posts', 'followersGain', 'impressions'],
  followersGain: ['posts', 'replies', 'impressions'],
  impressions: ['posts', 'replies', 'followersGain'],
}

export function ChampionCard({
  metric,
  champion,
  account,
  date,
  periodLabel,
  streak = 0,
  record = false,
  placeholder,
  onExport,
  delay = 0,
}: {
  metric: Metric
  champion: Champion
  account?: Account
  date: string
  periodLabel: string
  streak?: number
  record?: boolean
  placeholder?: { title: string; hint: string }
  onExport?: () => void
  delay?: number
}) {
  const meta = METRIC_META[metric]
  const isWeekly = periodLabel.includes('7')
  const unit = metric === 'impressions' ? '' : isWeekly ? `${meta.unit}/天` : meta.unit
  const valueText = fmtCompact(champion.value)
  const valueSize = valueText.length >= 7 ? 'text-[38px]' : valueText.length >= 5 ? 'text-[46px]' : 'text-[54px]'

  return (
    <article
      className="champ fade-up group"
      data-metric={metric}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="champ-noise" />
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/85">
            <MetricIcon metric={metric} size={15} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-white/90">{meta.label}冠军</p>
            <p className="text-[10px] text-white/40">{isWeekly ? '日均数据' : '单日数据'}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[10px] font-medium text-white/75 backdrop-blur">
          {record ? (
            <>
              <Trophy size={11} className="text-amber-300" /> 新纪录
            </>
          ) : streak > 1 ? (
            <>
              <Flame size={11} className="text-orange-300" /> {streak} 连冠
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {isWeekly ? '近 7 天' : '今日'}
            </>
          )}
        </span>
      </header>

      <div className="mt-5 flex flex-col items-center text-center">
        <Avatar
          src={champion.avatar}
          name={champion.name}
          handle={champion.handle}
          size={64}
          ring
          className="shadow-lg"
        />
        <div className="mt-2.5 flex items-center gap-1">
          <span className="max-w-[150px] truncate text-[15px] font-semibold text-white">
            {champion.name}
          </span>
          {champion.verified ? <Verified size={13} /> : null}
        </div>
        <p className="mt-0.5 max-w-[170px] truncate text-[11px] text-white/45">
          @{champion.handle}
        </p>
      </div>

      {placeholder ? (
        <div className="mt-3 flex h-[54px] flex-col items-center justify-center whitespace-nowrap text-center">
          <span className="text-[20px] font-bold text-white/90">{placeholder.title}</span>
          <span className="mt-1 text-[9px] text-white/40">{placeholder.hint}</span>
        </div>
      ) : (
        <div className="mt-3 flex items-end justify-center gap-1.5 whitespace-nowrap">
          <span
            className={`num bg-gradient-to-b from-white to-white/65 bg-clip-text font-extrabold leading-none tracking-tight text-transparent ${valueSize}`}
          >
            {valueText}
          </span>
          {unit ? <span className="mb-1 text-xs font-medium text-white/45">{unit}</span> : null}
        </div>
      )}

      <div className="champ-line my-3.5 h-px" />

      <div className="grid grid-cols-3 gap-1">
        {SECONDARY[metric].map((item) => (
          <div key={item} className="text-center">
            <p className="num text-[13px] font-semibold text-white/90">
              {account ? fmtCompact(account[item]) : '—'}
            </p>
            <p className="mt-0.5 text-[10px] text-white/38">{METRIC_META[item].label}</p>
          </div>
        ))}
      </div>

      <footer className="mt-3 flex items-center justify-between">
        <span className="text-[9px] tracking-wide text-white/30">
          {periodLabel}数据 · {monthDay(date)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold tracking-widest text-white/35">X榜单</span>
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              title="下载冠军卡片"
              className="rounded-md p-1 text-white/35 opacity-60 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Download size={12} />
            </button>
          ) : null}
        </div>
      </footer>
    </article>
  )
}
