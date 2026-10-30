import { useEffect, useId, useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Eye,
  MessageCircle,
  Minus,
  PenLine,
  UserPlus,
} from 'lucide-react'
import type { Metric } from '../lib/types'
import { assetUrl, METRIC_META } from '../lib/format'

export function Avatar({
  src,
  name,
  handle,
  size = 40,
  className = '',
  ring = false,
}: {
  src?: string
  name: string
  handle: string
  size?: number
  className?: string
  ring?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const url = assetUrl(src)

  useEffect(() => {
    setFailed(false)
  }, [src])

  let hash = 0
  for (let i = 0; i < handle.length; i += 1) hash = (hash * 31 + handle.charCodeAt(i)) % 360
  const initial = (name || handle || '?').trim().slice(0, 1).toUpperCase()
  const ringClass = ring ? 'ring-2 ring-white/25 ring-offset-2 ring-offset-[var(--surface)]' : ''

  if (!url || failed) {
    return (
      <span
        className={`avatar-initial shrink-0 rounded-full ${ringClass} ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(11, size * 0.4),
          background: `linear-gradient(135deg, hsl(${hash} 72% 58%), hsl(${(hash + 48) % 360} 68% 42%))`,
        }}
        aria-hidden="true"
      >
        {initial}
      </span>
    )
  }

  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-[var(--surface-3)] object-cover ${ringClass} ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function Verified({ size = 14 }: { size?: number }) {
  return (
    <BadgeCheck
      size={size}
      className="shrink-0 text-sky-500"
      strokeWidth={2.4}
      aria-label="已认证"
    />
  )
}

export function XLogo({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  )
}

export function GithubLogo({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.73.5.99 5.24.99 11.52c0 4.87 3.16 9 7.54 10.46.55.1.75-.24.75-.53 0-.26-.01-1.13-.02-2.05-3.07.67-3.72-1.3-3.72-1.3-.5-1.28-1.23-1.62-1.23-1.62-1-.69.08-.68.08-.68 1.11.08 1.69 1.14 1.69 1.14.99 1.69 2.59 1.2 3.22.92.1-.72.39-1.2.7-1.48-2.45-.28-5.03-1.23-5.03-5.46 0-1.21.43-2.2 1.14-2.97-.12-.28-.5-1.4.1-2.92 0 0 .93-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.12-1.44 3.04-1.14 3.04-1.14.61 1.52.23 2.64.11 2.92.71.77 1.14 1.76 1.14 2.97 0 4.24-2.59 5.18-5.05 5.45.4.34.75 1.02.75 2.06 0 1.49-.01 2.69-.01 3.06 0 .29.2.64.76.53a10.53 10.53 0 0 0 7.53-10.46C23.01 5.24 18.27.5 12 .5Z" />
    </svg>
  )
}

export function MetricIcon({
  metric,
  size = 15,
  className = '',
}: {
  metric: Metric
  size?: number
  className?: string
}) {
  const props = { size, className, strokeWidth: 2.1 }
  if (metric === 'posts') return <PenLine {...props} />
  if (metric === 'replies') return <MessageCircle {...props} />
  if (metric === 'followersGain') return <UserPlus {...props} />
  return <Eye {...props} />
}

export function MetricPill({ metric, compact = false }: { metric: Metric; compact?: boolean }) {
  const meta = METRIC_META[metric]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ background: `${meta.color}18`, color: meta.color }}
    >
      <MetricIcon metric={metric} size={compact ? 12 : 13} />
      {meta.label}
    </span>
  )
}

export function Sparkline({
  values,
  color = 'var(--brand)',
  width = 104,
  height = 32,
  className = '',
}: {
  values: number[]
  color?: string
  width?: number
  height?: number
  className?: string
}) {
  const rawId = useId()
  const id = `spark-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  if (!values.length) {
    return <div style={{ width, height }} className={className} aria-hidden="true" />
  }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = values.length > 1 ? width / (values.length - 1) : width
  const points = values.map((value, index) => {
    const x = values.length > 1 ? index * step : width / 2
    const y = height - 2 - ((value - min) / span) * (height - 4)
    return [x, y] as const
  })
  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function RankNumber({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-xs' : 'text-sm'
  const colorClass =
    rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : 'text-faint'
  return (
    <span className={`num inline-block font-extrabold ${sizeClass} ${colorClass}`}>
      {String(rank).padStart(2, '0')}
    </span>
  )
}

export function Trend({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-[11px] text-faint">—</span>
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-faint">
        <Minus size={11} /> 持平
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-emerald-500' : 'text-rose-500'}`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(delta)}
    </span>
  )
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  ghost = false,
  className = '',
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  ghost?: boolean
  className?: string
}) {
  return (
    <div className={`seg ${className}`} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          data-active={value === option.value}
          className={`tab ${ghost ? 'tab-ghost' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function SectionHeading({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon ? <span className="text-brand-500">{icon}</span> : null}
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-3)] text-xl">
        ◌
      </div>
      <p className="text-sm font-semibold text-soft">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: ReactNode
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-brand-500">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-[30px]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}
