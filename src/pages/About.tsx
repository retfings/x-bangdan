import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  Clipboard,
  Cloud,
  Code2,
  Database,
  GitPullRequest,
  Globe2,
  KeyRound,
  Layers,
  Scale,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useData } from '../lib/data'
import { fmtCompact, fmtInt } from '../lib/format'
import { GITHUB_REPO, GITHUB_URL } from '../config'
import { GithubLogo, PageHeader } from '../components/ui'

const BADGES = [
  { file: 'badge-accounts.json', label: 'tracked creators', color: '#6d5ef5' },
  { file: 'badge-updated.json', label: 'updated', color: '#22c55e' },
  { file: 'badge-posts.json', label: 'posts today', color: '#3b82f6' },
  { file: 'badge-impressions.json', label: 'impressions today', color: '#a855f7' },
]

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/data`

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[9.5px] font-medium text-muted transition hover:text-ink"
    >
      {copied ? <Check size={10} className="text-emerald-500" /> : <Clipboard size={10} />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-[#0b1020] text-[#dbe3ff]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="text-[9px] font-medium uppercase tracking-wider text-white/35">{language}</span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-3.5 text-[10.5px] leading-[1.75]">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function AboutPage() {
  const { index } = useData()
  const accountCount = index ? Object.keys(index.series).length : 0

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="OPEN SOURCE"
        title={
          <>
            开源、可复现的 <span className="gradient-text">X 数据榜单</span>
          </>
        }
        description="从采集、清洗、聚合到发布，整条数据链路都在一个公开仓库里。你可以在自己的 GitHub 账号上复刻一套完全相同的榜单。"
      >
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-10 items-center gap-1.5 self-start rounded-full bg-[#111] px-4 text-[12px] font-semibold text-white transition hover:bg-[#333] dark:bg-white dark:text-[#111] md:self-auto"
        >
          <GithubLogo size={15} /> 查看源码
        </a>
      </PageHeader>

      <section className="card relative mb-6 overflow-hidden p-5 md:p-7">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={11} /> MIT License · 每日自动更新
            </div>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight text-ink md:text-2xl">
              不依赖任何私有后端
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              网站是纯静态的 GitHub Pages。Kaggle Notebook 每天定时运行采集脚本，把标准化后的 JSON
              直接提交回仓库，GitHub Actions 随即重新构建并发布。数据、代码、口径全部透明。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="收录创作者" value={fmtInt(accountCount)} />
              <MiniStat label="历史天数" value={fmtInt(index?.dates.length || 0)} />
              <MiniStat label="最新数据" value={index?.latest?.slice(5) || '—'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            <Pill icon={<Database size={12} />} title="数据格式" value="JSON · 每日快照" />
            <Pill icon={<Cloud size={12} />} title="采集环境" value="Kaggle Notebook" />
            <Pill icon={<ServerCog size={12} />} title="发布方式" value="GitHub Pages" />
            <Pill icon={<Code2 size={12} />} title="前端" value="React + Vite" />
          </div>
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle icon={<Layers size={16} />} title="数据是怎么流动的" subtitle="五个环节，每天自动完成" />
        <div className="grid gap-2.5 md:grid-cols-5">
          {[
            { icon: <KeyRound size={16} />, step: '01', title: 'Kaggle 定时任务', text: '按 Schedule 每天启动 Notebook，读取 Secrets。' },
            { icon: <Database size={16} />, step: '02', title: '采集与清洗', text: '抓取账号、推文与互动数据，按统一口径聚合。' },
            { icon: <GitPullRequest size={16} />, step: '03', title: '提交回仓库', text: '通过 GitHub API 原子提交 daily JSON 与索引。' },
            { icon: <ServerCog size={16} />, step: '04', title: '自动构建', text: 'Actions 校验数据并构建静态站点。' },
            { icon: <Globe2 size={16} />, step: '05', title: 'GitHub Pages', text: '发布到全球 CDN，读者实时看到最新榜单。' },
          ].map((item, position) => (
            <div key={item.step} className="relative card-flat rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-600 dark:text-brand-300">
                  {item.icon}
                </span>
                <span className="num text-[10px] font-bold text-faint">{item.step}</span>
              </div>
              <h3 className="mt-2.5 text-[11.5px] font-bold text-ink">{item.title}</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">{item.text}</p>
              {position < 4 ? (
                <ArrowRight
                  size={13}
                  className="absolute -right-[9px] top-1/2 z-10 hidden -translate-y-1/2 text-[var(--border-strong)] md:block"
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section id="badge" className="mb-10 scroll-mt-24">
        <SectionTitle
          icon={<BadgeCheck size={16} />}
          title="自动更新的数据徽章"
          subtitle="放在 README 里，每天跟随 Kaggle 任务自动变化"
        />
        <div className="card p-4 md:p-5">
          <div className="mb-4 flex flex-wrap gap-2.5">
            {BADGES.map((badge) => {
              const message =
                badge.file === 'badge-accounts.json'
                  ? fmtInt(accountCount)
                  : badge.file === 'badge-updated.json'
                    ? index?.latest || 'pending'
                    : badge.file === 'badge-posts.json'
                      ? fmtInt(index?.totals.posts || 0)
                      : fmtCompact(index?.totals.impressions || 0)
              return (
                <span key={badge.file} className="inline-flex overflow-hidden rounded-md text-[10px] font-semibold shadow-sm">
                  <span className="bg-[#555] px-2 py-1 text-white">{badge.label}</span>
                  <span className="px-2 py-1 text-white" style={{ background: badge.color }}>
                    {message}
                  </span>
                </span>
              )
            })}
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-muted">
            徽章使用 shields.io 的 endpoint 格式，读取仓库里的 <code className="rounded bg-[var(--surface-3)] px-1 py-0.5 text-[10px]">public/data/badge-*.json</code>。
            把下面这段放进 README，即可获得实时更新的统计标签：
          </p>
          <CodeBlock
            language="markdown"
            code={`![Tracked creators](https://img.shields.io/endpoint?url=${encodeURIComponent(`${RAW_BASE}/badge-accounts.json`)})
![Updated](https://img.shields.io/endpoint?url=${encodeURIComponent(`${RAW_BASE}/badge-updated.json`)})
![Posts today](https://img.shields.io/endpoint?url=${encodeURIComponent(`${RAW_BASE}/badge-posts.json`)})
![Impressions today](https://img.shields.io/endpoint?url=${encodeURIComponent(`${RAW_BASE}/badge-impressions.json`)})`}
          />
          <div className="mt-3 flex items-center gap-2 text-[10px] text-faint">
            <Sparkles size={11} className="text-brand-500" />
            徽章由采集脚本写入，无需手动维护；仓库 fork 后把 <code>{GITHUB_REPO}</code> 换成自己的即可。
          </div>
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle icon={<BookOpen size={16} />} title="数据口径" subtitle="四个维度，只统计公开可见的数据" />
        <div className="card overflow-hidden">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>维度</th>
                <th>定义</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-[11.5px] font-semibold text-ink">发帖</td>
                <td className="text-[11px] text-muted">当日发布的原创推文数量</td>
                <td className="text-[10.5px] text-faint">不包含转推与回复；引用推文计为发帖。</td>
              </tr>
              <tr>
                <td className="text-[11.5px] font-semibold text-ink">评论</td>
                <td className="text-[11px] text-muted">当日发出的回复数量</td>
                <td className="text-[10.5px] text-faint">以推文的 in_reply_to 关系判定。</td>
              </tr>
              <tr>
                <td className="text-[11.5px] font-semibold text-ink">涨粉</td>
                <td className="text-[11px] text-muted">当日新增粉丝数</td>
                <td className="text-[10.5px] text-faint">由前后两天的粉丝快照相减得出。</td>
              </tr>
              <tr>
                <td className="text-[11.5px] font-semibold text-ink">曝光</td>
                <td className="text-[11px] text-muted">当日推文被查看的次数</td>
                <td className="text-[10.5px] text-faint">以 X 公开的 viewCount 为准；抓取失败时显示 —。</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-faint">
          注：X 的公开接口不保证返回每一条推文的曝光数。不同采集方式（twscrape / X API）的口径可能略有差异，
          站点会在页脚标注当前数据源。演示数据全部为合成数据，仅用于展示产品形态。
        </p>
      </section>

      <section className="mb-10 grid gap-5 lg:grid-cols-2">
        <div>
          <SectionTitle icon={<GithubLogo size={16} />} title="在自己的仓库复刻" subtitle="10 分钟完成部署" />
          <div className="space-y-3">
            <Step index={1} title="Fork 或克隆仓库">
              新建一个公开仓库，把代码推送到 <code>main</code> 分支。
            </Step>
            <Step index={2} title="开启 GitHub Pages">
              Settings → Pages → Source 选择 <strong>GitHub Actions</strong>，推送到 main 即自动发布。
            </Step>
            <Step index={3} title="配置 Kaggle Secrets">
              在 Kaggle Notebook 中添加 <code>GITHUB_TOKEN</code>、<code>GITHUB_REPO</code>、<code>X_ACCOUNTS</code> 等 Secret。
            </Step>
            <Step index={4} title="设置每日调度">
              在 Kaggle Notebook 的 Schedule 中设为每天运行，时区建议 UTC。
            </Step>
            <Step index={5} title="等待第一次提交">
              任务成功后，<code>public/data</code> 会出现新的日期文件，Pages 自动更新。
            </Step>
          </div>
        </div>
        <div className="space-y-3">
          <CodeBlock
            language="bash"
            code={`# 本地开发
npm install
npm run dev

# 生成演示数据（无需任何密钥）
python scripts/generate_demo.py

# 构建静态站点
npm run build`}
          />
          <CodeBlock
            language="text"
            code={`# Kaggle Secrets
GITHUB_TOKEN      GitHub Fine-grained PAT (Contents: Read/Write)
GITHUB_REPO       retfings/x-bangdan
GITHUB_BRANCH     main
X_ACCOUNTS        [{ "username": "...", "cookies": "..." }]
X_BEARER_TOKEN    (可选) X API v2 Bearer Token
XB_SOURCE         auto | twscrape | x_api | demo`}
          />
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle icon={<Scale size={16} />} title="合规与免责声明" subtitle="请在使用前阅读" />
        <div className="card space-y-2.5 p-4 text-[11px] leading-relaxed text-muted">
          <p>· 本项目仅聚合 X 上公开可见的数据，不采集私密信息，也不存储用户密码。</p>
          <p>· 请遵守 X 的服务条款与 robots 规则，控制采集频率；因使用本项目产生的任何责任由使用者自行承担。</p>
          <p>· 榜单数据仅供参考，可能存在延迟、缺失或统计误差，不构成投资建议，也不代表对任何账号的评价。</p>
          <p>· 本项目与 X Corp. 无任何关联，X、Twitter 是其各自权利人的商标。</p>
          <p>· 如需移除自己的账号，请提交 Issue，我们会在下一次数据更新中处理。</p>
        </div>
      </section>

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-line bg-[var(--surface-2)] px-5 py-4 sm:flex-row">
        <p className="text-[11px] text-muted">
          项目地址：<a href={GITHUB_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-500 hover:underline">{GITHUB_REPO}</a>
          <span className="ml-2 text-faint">MIT License</span>
        </p>
        <div className="flex gap-2">
          <a
            href={`${GITHUB_URL}/issues/new?title=${encodeURIComponent('申请收录账号')}`}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10.5px] font-medium text-muted transition hover:text-ink"
          >
            申请收录
          </a>
          <a
            href={`${GITHUB_URL}/issues/new?title=${encodeURIComponent('申请移除账号')}`}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10.5px] font-medium text-muted transition hover:text-ink"
          >
            申请移除
          </a>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-2.5 py-2 text-center">
      <p className="num text-[17px] font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[9px] text-faint">{label}</p>
    </div>
  )
}

function Pill({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-[var(--surface-2)] px-3 py-2.5">
      <span className="text-brand-500">{icon}</span>
      <div>
        <p className="text-[9px] text-faint">{title}</p>
        <p className="text-[10.5px] font-semibold text-soft">{value}</p>
      </div>
    </div>
  )
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-600 dark:text-brand-300">
        {icon}
      </span>
      <div>
        <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
        <p className="text-[10px] text-faint">{subtitle}</p>
      </div>
    </div>
  )
}

function Step({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-[var(--surface-2)] p-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-[10px] font-bold text-white">
        {index}
      </span>
      <div>
        <p className="text-[11.5px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted [&_code]:rounded [&_code]:bg-[var(--surface-3)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[9.5px]">
          {children}
        </p>
      </div>
    </div>
  )
}
