import type { Account, Champion, Metric } from './types'
import { assetUrl, fmtCompact, METRIC_META, monthDay } from './format'

const THEME: Record<Metric, { bg: [string, string]; glow: string; accent: string }> = {
  posts: { bg: ['#172554', '#0a0f1c'], glow: 'rgba(96,165,250,.42)', accent: '#60a5fa' },
  replies: { bg: ['#431407', '#0d0908'], glow: 'rgba(251,146,60,.4)', accent: '#fb923c' },
  followersGain: { bg: ['#052e2b', '#070f0e'], glow: 'rgba(52,211,153,.36)', accent: '#34d399' },
  impressions: { bg: ['#3b0764', '#0d0814'], glow: 'rgba(232,121,249,.4)', accent: '#e879f9' },
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

async function drawAvatar(
  ctx: CanvasRenderingContext2D,
  account: { avatar: string; name: string; handle: string },
  x: number,
  y: number,
  radius: number,
) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.clip()
  const image = await loadImage(assetUrl(account.avatar))
  if (image) {
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2)
  } else {
    let hash = 0
    for (let i = 0; i < account.handle.length; i += 1) {
      hash = (hash * 31 + account.handle.charCodeAt(i)) % 360
    }
    const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius)
    gradient.addColorStop(0, `hsl(${hash} 72% 58%)`)
    gradient.addColorStop(1, `hsl(${(hash + 48) % 360} 68% 42%)`)
    ctx.fillStyle = gradient
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${Math.round(radius * 0.9)}px "PingFang SC","Microsoft YaHei",sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText((account.name || account.handle).slice(0, 1), x, y + 2)
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,.35)'
  ctx.lineWidth = 3
  ctx.stroke()
}

function drawCardBackdrop(
  ctx: CanvasRenderingContext2D,
  metric: Metric,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const theme = THEME[metric]
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height)
  gradient.addColorStop(0, theme.bg[0])
  gradient.addColorStop(1, theme.bg[1])
  roundRect(ctx, x, y, width, height, 30)
  ctx.fillStyle = gradient
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + width * 0.86, y + height * 0.1, height * 0.7, 0, Math.PI * 2)
  const glow = ctx.createRadialGradient(
    x + width * 0.86,
    y + height * 0.1,
    0,
    x + width * 0.86,
    y + height * 0.1,
    height * 0.7,
  )
  glow.addColorStop(0, theme.glow)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fill()
  ctx.restore()
  roundRect(ctx, x, y, width, height, 30)
  ctx.strokeStyle = 'rgba(255,255,255,.1)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function secondaryFor(metric: Metric, account: Account | undefined): { label: string; value: string }[] {
  if (!account) return []
  const all = [
    { key: 'posts' as Metric, label: '发帖' },
    { key: 'replies' as Metric, label: '评论' },
    { key: 'followersGain' as Metric, label: '涨粉' },
    { key: 'impressions' as Metric, label: '曝光' },
  ].filter((item) => item.key !== metric)
  return all.map((item) => ({ label: item.label, value: fmtCompact(account[item.key] as number) }))
}

export async function exportChampionCard({
  metric,
  champion,
  account,
  date,
  periodLabel,
}: {
  metric: Metric
  champion: Champion
  account?: Account
  date: string
  periodLabel: string
}) {
  const width = 900
  const height = 1200
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#070a12'
  ctx.fillRect(0, 0, width, height)
  drawCardBackdrop(ctx, metric, 36, 36, width - 72, height - 72)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.font = '600 28px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(`X榜单 · ${periodLabel}${METRIC_META[metric].label}冠军`, 88, 120)

  ctx.textAlign = 'right'
  ctx.fillText(monthDay(date), width - 88, 120)

  await drawAvatar(ctx, { avatar: champion.avatar, name: champion.name, handle: champion.handle }, width / 2, 340, 88)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.font = '700 48px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(champion.name, width / 2, 494)

  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.font = '400 28px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(`@${champion.handle}`, width / 2, 540)

  ctx.fillStyle = '#fff'
  ctx.font = '800 168px "Inter","PingFang SC","Microsoft YaHei",sans-serif'
  const valueText = fmtCompact(champion.value)
  const unit = metric === 'impressions' ? '' : METRIC_META[metric].unit
  const valueWidth = ctx.measureText(valueText).width
  const unitWidth = unit ? 54 : 0
  const totalWidth = valueWidth + unitWidth
  ctx.textAlign = 'left'
  ctx.fillText(valueText, width / 2 - totalWidth / 2, 750)
  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.font = '600 36px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(unit, width / 2 - totalWidth / 2 + valueWidth + 12, 748)

  const lineGradient = ctx.createLinearGradient(120, 0, width - 120, 0)
  lineGradient.addColorStop(0, 'rgba(255,255,255,0)')
  lineGradient.addColorStop(0.5, 'rgba(255,255,255,.18)')
  lineGradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = lineGradient
  ctx.fillRect(120, 810, width - 240, 1)

  const stats = secondaryFor(metric, account)
  stats.forEach((stat, index) => {
    const center = width / 2 + (index - 1) * 250
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.font = '700 40px "Inter","PingFang SC","Microsoft YaHei",sans-serif'
    ctx.fillText(stat.value, center, 900)
    ctx.fillStyle = 'rgba(255,255,255,.45)'
    ctx.font = '400 24px "PingFang SC","Microsoft YaHei",sans-serif'
    ctx.fillText(stat.label, center, 938)
  })

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.font = '700 30px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText('X榜单', 88, height - 96)
  ctx.fillStyle = 'rgba(255,255,255,.35)'
  ctx.font = '400 22px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText('中文区创作者数据榜单 · 每日自动更新', 88, height - 60)
  ctx.textAlign = 'right'
  ctx.fillText(new Date().toLocaleDateString('zh-CN'), width - 88, height - 60)

  download(canvas, `x-bangdan-${metric}-${date}.png`)
}

export async function exportPoster({
  date,
  periodLabel,
  champions,
  accounts,
}: {
  date: string
  periodLabel: string
  champions: { metric: Metric; champion: Champion }[]
  accounts: Account[]
}) {
  const width = 1080
  const cardHeight = 300
  const gap = 24
  const top = 200
  const height = top + champions.length * (cardHeight + gap) + 150
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const background = ctx.createLinearGradient(0, 0, width, height)
  background.addColorStop(0, '#080b14')
  background.addColorStop(0.6, '#0b1020')
  background.addColorStop(1, '#0a0814')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.82, 60, 0, width * 0.82, 60, 520)
  glow.addColorStop(0, 'rgba(139,92,246,.22)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, 560)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#fff'
  ctx.font = '800 62px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText('X榜单', 64, 116)
  ctx.fillStyle = 'rgba(255,255,255,.5)'
  ctx.font = '400 26px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(`中文区创作者数据榜单 · ${periodLabel}`, 66, 158)
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,.75)'
  ctx.font = '600 30px "Inter","PingFang SC",sans-serif'
  ctx.fillText(date, width - 64, 116)

  for (let index = 0; index < champions.length; index += 1) {
    const { metric, champion } = champions[index]
    const y = top + index * (cardHeight + gap)
    drawCardBackdrop(ctx, metric, 48, y, width - 96, cardHeight)
    const account = accounts.find((item) => item.handle === champion.handle)
    await drawAvatar(ctx, champion, 168, y + cardHeight / 2, 62)

    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    ctx.font = '600 22px "PingFang SC","Microsoft YaHei",sans-serif'
    ctx.fillText(`${METRIC_META[metric].label}冠军`, 266, y + 84)

    ctx.fillStyle = '#fff'
    ctx.font = '700 40px "PingFang SC","Microsoft YaHei",sans-serif'
    ctx.fillText(champion.name, 266, y + 142)

    ctx.fillStyle = 'rgba(255,255,255,.48)'
    ctx.font = '400 23px "PingFang SC","Microsoft YaHei",sans-serif'
    ctx.fillText(`@${champion.handle}`, 266, y + 182)

    const stats = secondaryFor(metric, account)
    ctx.font = '400 21px "PingFang SC","Microsoft YaHei",sans-serif'
    stats.slice(0, 3).forEach((stat, statIndex) => {
      const x = 266 + statIndex * 142
      ctx.fillStyle = 'rgba(255,255,255,.4)'
      ctx.fillText(stat.label, x, y + 232)
      ctx.fillStyle = 'rgba(255,255,255,.8)'
      ctx.font = '600 22px "Inter","PingFang SC",sans-serif'
      ctx.fillText(stat.value, x + 54, y + 232)
      ctx.font = '400 21px "PingFang SC","Microsoft YaHei",sans-serif'
    })

    ctx.textAlign = 'right'
    ctx.fillStyle = '#fff'
    ctx.font = '800 92px "Inter","PingFang SC","Microsoft YaHei",sans-serif'
    const valueText = fmtCompact(champion.value)
    ctx.fillText(valueText, width - 100, y + 176)
    if (metric !== 'impressions') {
      ctx.fillStyle = 'rgba(255,255,255,.5)'
      ctx.font = '500 28px "PingFang SC","Microsoft YaHei",sans-serif'
      ctx.fillText(METRIC_META[metric].unit, width - 100, y + 218)
    }
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,.35)'
  ctx.font = '400 22px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText('数据来源 X · 每日自动更新 · 开源项目', 64, height - 54)
  ctx.textAlign = 'right'
  ctx.fillText('X榜单', width - 64, height - 54)

  download(canvas, `x-bangdan-poster-${date}.png`)
}

function download(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }, 'image/png')
}
