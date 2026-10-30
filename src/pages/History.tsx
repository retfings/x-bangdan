import { useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, Database, History as HistoryIcon, Trophy } from 'lucide-react'
import { useData } from '../lib/data'
import { fmtCompact, fmtInt, fullDate, METRICS, METRIC_META, monthDay, weekday } from '../lib/format'
import type { HistoryRow, Metric } from '../lib/types'
import { Avatar, EmptyState, PageHeader, Verified } from '../components/ui'

export function HistoryPage() {
  const { index, openProfile } = useData()
  const [month, setMonth] = useState('全部')

  const months = useMemo(() => {
    if (!index) return []
    const unique = [...new Set(index.dates.map((date) => date.slice(0, 7)))].sort().reverse()
    return ['全部', ...unique]
  }, [index])

  const rows = useMemo(() => {
    if (!index) return []
    return [...index.history]
      .filter((row) => month === '全部' || row.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [index, month])

  if (!index) return null

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="DAILY ARCHIVE"
        title={
          <>
            历史榜单 <span className="gradient-text">· 每一天的冠军</span>
          </>
        }
        description="完整保留每天四个维度的冠军与数据总量。榜单可追溯，才能看见真正的长期趋势。"
      >
        <div className="flex items-center gap-2 self-start rounded-full border border-line bg-surface px-3.5 py-2 text-[11px] text-muted md:self-auto">
          <Database size={13} className="text-brand-500" />
          {fullDate(index.dates[0])} 起 · 共 <strong className="text-ink">{index.dates.length}</strong> 天
        </div>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="收录天数" value={fmtInt(index.dates.length)} hint="连续自然日" />
        <Summary label="首个记录" value={monthDay(index.dates[0] || '')} hint={index.dates[0] ? weekday(index.dates[0]) : ''} />
        <Summary label="最新记录" value={monthDay(index.latest)} hint={weekday(index.latest)} />
        <Summary
          label="日均发帖"
          value={fmtCompact(
            index.history.reduce((sum, row) => sum + row.totals.posts, 0) / Math.max(1, index.history.length),
          )}
          hint="全部收录账号"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {months.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMonth(item)}
            data-active={month === item}
            className="tab tab-ghost border border-line bg-surface"
          >
            {item === '全部' ? '全部' : item.replace('-', ' 年 ') + ' 月'}
          </button>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <HistoryIcon size={14} className="text-brand-500" />
            <h2 className="text-[13px] font-bold text-ink">每日冠军</h2>
            <span className="text-[10px] text-faint">{rows.length} 天</span>
          </div>
          <span className="hidden items-center gap-1 text-[10px] text-faint sm:flex">
            <Trophy size={11} className="text-amber-500" /> 奖杯表示当日刷新历史纪录
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="这个月还没有数据" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[880px]">
              <thead>
                <tr>
                  <th className="w-[130px]">日期</th>
                  {METRICS.map((metric) => (
                    <th key={metric}>{METRIC_META[metric].label}冠军</th>
                  ))}
                  <th className="hidden text-right xl:table-cell">当日曝光</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--surface-3)]">
                          <span className="num text-[11px] font-bold leading-none text-ink">
                            {Number(row.date.slice(8, 10))}
                          </span>
                          <span className="mt-0.5 text-[7px] leading-none text-faint">
                            {weekday(row.date).replace('周', '')}
                          </span>
                        </span>
                        <div>
                          <p className="num text-[11.5px] font-semibold text-soft">{monthDay(row.date)}</p>
                          <p className="text-[9px] text-faint">{row.date.slice(0, 4)}</p>
                        </div>
                      </div>
                    </td>
                    {METRICS.map((metric) => (
                      <ChampionCell
                        key={metric}
                        metric={metric}
                        row={row}
                        onSelect={openProfile}
                        isRecord={
                          index.records[metric]?.date === row.date &&
                          index.records[metric]?.handle === row.champions[metric]?.handle
                        }
                      />
                    ))}
                    <td className="hidden text-right xl:table-cell">
                      <span className="num text-[11px] text-muted">{fmtCompact(row.totals.impressions)}</span>
                    </td>
                    <td>
                      <ChevronRight size={13} className="text-faint" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[10px] text-faint">
          <span className="flex items-center gap-1">
            <CalendarDays size={11} /> 按自然日 00:00 - 24:00（UTC+8）统计
          </span>
          <span>点击账号查看完整趋势</span>
        </div>
      </section>
    </div>
  )
}

function ChampionCell({
  metric,
  row,
  onSelect,
  isRecord,
}: {
  metric: Metric
  row: HistoryRow
  onSelect: (handle: string) => void
  isRecord: boolean
}) {
  const champion = row.champions[metric]
  if (!champion) {
    return (
      <td>
        <span className="text-[10px] text-faint">—</span>
      </td>
    )
  }
  return (
    <td>
      <button type="button" onClick={() => onSelect(champion.handle)} className="flex items-center gap-1.5 text-left">
        <Avatar src={champion.avatar} name={champion.name} handle={champion.handle} size={22} />
        <span className="min-w-0">
          <span className="flex items-center gap-1">
            <span className="max-w-[92px] truncate text-[10.5px] font-medium text-soft">{champion.name}</span>
            {champion.verified ? <Verified size={9} /> : null}
            {isRecord ? <span className="text-[9px]">🏆</span> : null}
          </span>
          <span className="num block text-[10px] font-semibold" style={{ color: METRIC_META[metric].color }}>
            {metric === 'followersGain' && !champion.value ? '—' : fmtCompact(champion.value)}
            {!champion.value ? null : (
              <span className="ml-0.5 text-[8px] font-normal text-faint">{METRIC_META[metric].unit}</span>
            )}
          </span>
        </span>
      </button>
    </td>
  )
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card-flat rounded-xl px-3.5 py-3">
      <p className="text-[10.5px] text-faint">{label}</p>
      <p className="num mt-1 text-xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] text-faint">{hint}</p>
    </div>
  )
}
