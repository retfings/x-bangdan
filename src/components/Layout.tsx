import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { GITHUB_URL, SITE_NAME } from '../config'
import { useData } from '../lib/data'
import { fmtCompact, fullDate } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { Avatar, GithubLogo, Verified, XLogo } from './ui'

const NAV = [
  { path: '/', label: '首页' },
  { path: '/accounts', label: '账号' },
  { path: '/posts', label: '推文' },
  { path: '/records', label: '纪录' },
  { path: '/history', label: '历史' },
  { path: '/about', label: '关于' },
]

function Logo() {
  return (
    <a href="#/" className="flex shrink-0 items-center gap-2.5" aria-label="X榜单首页">
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-[0_8px_20px_-8px_rgba(109,94,245,.9)]">
        <XLogo size={18} />
        <span className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-white/25" />
      </span>
      <span className="leading-none">
        <span className="flex items-baseline gap-1">
          <span className="text-[17px] font-extrabold tracking-tight text-ink">X榜单</span>
          <span className="rounded bg-[var(--surface-3)] px-1 py-0.5 text-[8px] font-semibold text-muted">
            BETA
          </span>
        </span>
        <span className="mt-1 block text-[9px] font-medium tracking-wide text-faint">
          中文区创作者数据门户
        </span>
      </span>
    </a>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('xb-theme', next ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:border-line-strong hover:text-ink"
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}

function GlobalSearch() {
  const { index, openProfile } = useData()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!index || !needle) return []
    return Object.entries(index.series)
      .map(([handle, entry]) => ({ handle, ...entry }))
      .filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.handle.toLowerCase().includes(needle) ||
          (item.bio || '').toLowerCase().includes(needle) ||
          (item.category || '').toLowerCase().includes(needle),
      )
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 6)
  }, [index, query])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    setOpen(false)
    navigate(`/accounts?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div ref={wrapRef} className="relative hidden w-[260px] md:block xl:w-[330px]">
      <form onSubmit={submit}>
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
          placeholder="搜索账号、分类"
          className="h-9 w-full rounded-full border border-line bg-surface pl-9 pr-16 text-[12.5px] text-ink outline-none transition placeholder:text-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10"
          aria-label="搜索账号"
        />
        <button
          type="submit"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-500 to-violet-500 px-3 py-1.5 text-[10.5px] font-semibold text-white shadow-sm"
        >
          搜索
        </button>
      </form>

      {open && query.trim() ? (
        <div className="pop-in absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <p className="border-b border-line px-3 py-2 text-[10px] font-semibold tracking-wide text-faint">
            账号 · {results.length} 个结果
          </p>
          {results.length ? (
            results.map((item) => (
              <button
                key={item.handle}
                type="button"
                onClick={() => {
                  setOpen(false)
                  openProfile(item.handle)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-[var(--surface-2)]"
              >
                <Avatar src={item.avatar} name={item.name} handle={item.handle} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="truncate text-[12px] font-medium text-ink">{item.name}</span>
                    {item.verified ? <Verified size={11} /> : null}
                  </span>
                  <span className="block truncate text-[10px] text-faint">
                    @{item.handle} · {fmtCompact(item.followers)} 粉丝
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-[11px] text-faint">没有找到匹配的账号</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function Header() {
  const route = useRoute()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [route.hash])

  const isActive = (path: string) =>
    path === '/' ? route.path === '/' : route.path.startsWith(path)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-5 px-4 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              data-active={isActive(item.path)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                isActive(item.path)
                  ? 'bg-brand-soft text-brand-600 dark:text-brand-300'
                  : 'text-muted hover:bg-[var(--surface-3)] hover:text-ink'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />
          <ThemeToggle />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub 开源仓库"
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:border-line-strong hover:text-ink sm:flex"
          >
            <GithubLogo size={15} />
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="打开菜单"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted lg:hidden"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      <div
        className={`mx-auto max-w-[1440px] items-center gap-1 overflow-x-auto px-4 pb-3 lg:hidden ${
          mobileOpen ? 'flex' : 'hidden'
        }`}
      >
        {NAV.map((item) => (
          <a
            key={item.path}
            href={`#${item.path}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${
              isActive(item.path)
                ? 'bg-brand-soft text-brand-600 dark:text-brand-300'
                : 'text-muted'
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </header>
  )
}

export function Footer() {
  const { index } = useData()
  return (
    <footer className="mt-16 border-t border-line bg-[var(--surface)]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-muted">
            每天自动收录中文区 X（Twitter）创作者的发帖、评论、涨粉与曝光数据，生成可追溯的榜单与历史记录。
          </p>
          <p className="mt-3 text-[10.5px] text-faint">
            开源项目 · MIT License · 与 X Corp. 无关联
          </p>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-wide text-ink">榜单</p>
          <ul className="space-y-2 text-[12px] text-muted">
            <li><a href="#/accounts" className="hover:text-brand-500">账号榜</a></li>
            <li><a href="#/posts" className="hover:text-brand-500">推文榜</a></li>
            <li><a href="#/records" className="hover:text-brand-500">纪录殿堂</a></li>
            <li><a href="#/history" className="hover:text-brand-500">历史榜单</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-wide text-ink">项目</p>
          <ul className="space-y-2 text-[12px] text-muted">
            <li>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand-500">
                GitHub <ArrowUpRight size={11} />
              </a>
            </li>
            <li><a href="#/about" className="hover:text-brand-500">数据说明</a></li>
            <li><a href="#/about" className="hover:text-brand-500">数据徽章</a></li>
            <li><a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer" className="hover:text-brand-500">反馈问题</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink">
            <BarChart3 size={12} /> 数据状态
          </p>
          <ul className="space-y-2 text-[11.5px] text-muted">
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              每日自动更新
            </li>
            <li>最新：{index?.latest ? fullDate(index.latest) : '—'}</li>
            <li>
              来源：
              {index?.source === 'demo' ? (
                <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  演示数据
                </span>
              ) : (
                'Kaggle 采集'
              )}
            </li>
            <li className="pt-1">
              <a href="#/about" className="text-brand-500 hover:underline">了解数据口径 ›</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-[10.5px] text-faint">
        © {new Date().getFullYear()} {SITE_NAME} · 数据仅供参考，不构成任何投资建议
      </div>
    </footer>
  )
}
