export const SITE_NAME = 'X榜单'
export const SITE_TAGLINE = '中文区创作者数据榜单'

/** Set at build time, e.g. VITE_GITHUB_REPO=retfings/x-bangdan */
export const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'retfings/x-bangdan'
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`
export const X_SITE_URL = import.meta.env.VITE_SITE_URL || ''
export const DATA_REPO_PATH = 'public/data'
