import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, CalendarClock, Crown, Flame, Trophy } from 'lucide-react'
import { useData } from '../lib/data'
import { daysBetween, fmtCompact, fullDate, METRICS, METRIC_META, monthDay } from '../lib/format'
import { recordTimeline } from '../lib/metrics'
import type { Metric } from '../lib/types'
import {
  Avatar,
  EmptyState,
  MetricIcon,
  PageHeader,
  RankNumber,
  Seg,
  Verified,
} from '../components/ui'

export function RecordsPage() {
  const { index, openProfile } = useData()
  const [metric, setMetric] = useState<Metric>('impressions')

  const topDays = useMemo(() => {
    if (!index) return []
    const rows: { handle: string; name: string; avatar: string; verified: boolean; date: string; value: number }[] = []
    for (const [handle, entry] of Object.entries(index.series)) {
      const values = entry[metric] || []
      values.forEach((value, position) => {
        if (value > 0 && index.dates[position]) {
          rows.push({
            handle,
            name: entry.name,
            avatar: entry.avatar,
            verified: entry.verified,
            date: index.dates[position],
            value,
          })
        }
      })
    }
    return rows.sort((a, b) => b.value - a.value).slice(0, 10)
  }, [index, metric])

  const timeline = useMemo(
    () => (index ? recordTimeline(index.history, metric) : []),
    [index, metric],
  )

  if (!index) return null

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="HALL OF RECORDS"
        title={
          <>
            纪录殿堂 <span className="gradient-text">· 每一个历史第一</span>
          </>
        }
        description={`收录 ${index.dates.length} 天完整数据，记录发帖、评论、涨粉与曝光的单日历史最高。纪录只在被真正打破时才会改写。`}
      >
        <div className="flex items-center gap-2 self-start rounded-full border border-amber-500/25 bg-amber-500/8 px-3.5 py-2 text-[11px] text-amber-700 dark:text-amber-300 md:self-auto">
          <Trophy size={13} /> 截至 {fullDate(index.latest)}
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((item) => {
          const record = index.records[item]
          const meta = METRIC_META[item]
          if (!record) return null
          const held = daysBetween(record.date, index.latest)
          const isNew = held <= 1
          return (
            <article
              key={item}
              className="card relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div
                className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-xl"
                style={{ background: meta.color }}
              />
              <div className="flex items-center justify-between">
                <span
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold"
                  style={{ background: `${meta.color}15`, color: meta.color }}
                >
                  <MetricIcon metric={item} size={11} /> {meta.label}纪录
                </span>
                <span className="text-lg">🏆</span>
              </div>
              <button
                type="button"
                onClick={() => openProfile(record.handle)}
                className="mt-3 flex w-full items-center gap-2.5 text-left"
              >
                <Avatar src={record.avatar} name={record.name} handle={record.handle} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[12.5px] font-semibold text-ink">
                    {record.name} {record.verified ? <Verified size={11} /> : null}
                  </p>
                  <p className="truncate text-[10px] text-faint">@{record.handle}</p>
                </div>
                <ArrowUpRight size={13} className="text-faint" />
              </button>
              <div className="mt-3 flex items-end justify-between">
                <p className="num text-[30px] font-extrabold leading-none tracking-tight" style={{ color: meta.color }}>
                  {fmtCompact(record.value)}
                  <span className="ml-1 text-[10px] font-medium text-faint">{meta.unit}</span>
                </p>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    isNew
                      ? 'bg-rose-500/10 text-rose-500'
                      : 'bg-[var(--surface-3)] text-muted'
                  }`}
                >
                  {isNew ? '刚刚刷新' : `保持 ${held} 天`}
                </span>
              </div>
              <div className="mt-3 border-t border-line pt-2 text-[9.5px] text-faint">
                <p>{fullDate(record.date)} 创造</p>
                {record.previousValue ? (
                  <p className="mt-0.5">
                    此前纪录 {fmtCompact(record.previousValue)} · {monthDay(record.previousDate || '')}
                  </p>
                ) : (
                  <p className="mt-0.5">首个收录纪录</p>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[16px] font-bold tracking-tight text-ink">
          <Crown size={16} className="text-amber-500" /> 纪录时间线
        </h2>
        <Seg
          value={metric}
          onChange={setMetric}
          options={METRICS.map((item) => ({ value: item, label: METRIC_META[item].label }))}
          ghost
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-[12.5px] font-bold text-ink">
              {METRIC_META[metric].label}纪录是怎么被打破的
            </h3>
            <p className="mt-0.5 text-[10px] text-faint">共 {timeline.length} 次改写 · 按时间倒序</p>
          </div>
          {timeline.length === 0 ? (
            <div className="p-4">
              <EmptyState title="暂无纪录" />
            </div>
          ) : (
            <div className="max-h-[620px] overflow-y-auto">
              {timeline.map((event, position) => (
                <button
                  key={`${event.date}-${event.champion.handle}`}
                  type="button"
                  onClick={() => openProfile(event.champion.handle)}
                  className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-[var(--surface-2)]"
                >
                  <div className="relative">
                    <Avatar
                      src={event.champion.avatar}
                      name={event.champion.name}
                      handle={event.champion.handle}
                      size={32}
                    />
                    {position === 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px]">
                        ★
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[11.5px] font-semibold text-ink">
                        {event.champion.name}
                      </span>
                      {event.champion.verified ? <Verified size={10} /> : null}
                      {position === 0 ? (
                        <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[8px] font-semibold text-amber-600 dark:text-amber-400">
                          当前纪录
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[9.5px] text-faint">{fullDate(event.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="num text-[13px] font-bold" style={{ color: METRIC_META[metric].color }}>
                      {fmtCompact(event.champion.value)}
                    </p>
                    <p className="text-[9px] text-faint">
                      {event.previous ? `+${fmtCompact(event.champion.value - event.previous)}` : '首次记录'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h3 className="text-[12.5px] font-bold text-ink">
                历史单日 Top 10 · {METRIC_META[metric].label}
              </h3>
              <p className="mt-0.5 text-[10px] text-faint">所有账号在所有日期中的最高值</p>
            </div>
            <CalendarClock size={15} className="text-faint" />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[480px]">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th>创作者</th>
                  <th>日期</th>
                  <th className="text-right">数值</th>
                </tr>
              </thead>
              <tbody>
                {topDays.map((row, position) => (
                  <tr
                    key={`${row.handle}-${row.date}`}
                    onClick={() => openProfile(row.handle)}
                    className="cursor-pointer"
                  >
                    <td className="text-center">
                      <RankNumber rank={position + 1} size="sm" />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar src={row.avatar} name={row.name} handle={row.handle} size={24} />
                        <span className="max-w-[130px] truncate text-[11.5px] font-medium text-ink">
                          {row.name}
                        </span>
                        {row.verified ? <Verified size={10} /> : null}
                      </div>
                    </td>
                    <td className="num text-[10.5px] text-muted">{monthDay(row.date)}</td>
                    <td className="num text-right text-[11.5px] font-semibold" style={{ color: METRIC_META[metric].color }}>
                      {fmtCompact(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[10px] text-faint">
            <span className="flex items-center gap-1">
              <Flame size={11} className="text-orange-500" /> 同一账号可多次上榜
            </span>
            <a href="#/history" className="flex items-center gap-1 text-brand-500 hover:underline">
              每日冠军 <ArrowRight size={10} />
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
