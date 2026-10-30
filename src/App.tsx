import { useEffect } from 'react'
import { DataProvider } from './lib/data'
import { useRoute } from './lib/router'
import { Footer, Header } from './components/Layout'
import { ProfileDrawer } from './components/ProfileDrawer'
import { HomePage } from './pages/Home'
import { AccountsPage } from './pages/Accounts'
import { PostsPage } from './pages/Posts'
import { RecordsPage } from './pages/Records'
import { HistoryPage } from './pages/History'
import { AboutPage } from './pages/About'
import { EmptyState } from './components/ui'

function Shell() {
  const route = useRoute()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [route.path])

  let page
  switch (route.path) {
    case '/':
      page = <HomePage />
      break
    case '/accounts':
      page = <AccountsPage />
      break
    case '/posts':
      page = <PostsPage />
      break
    case '/records':
      page = <RecordsPage />
      break
    case '/history':
      page = <HistoryPage />
      break
    case '/about':
      page = <AboutPage />
      break
    default:
      page = (
        <div className="mx-auto max-w-2xl px-4 py-24">
          <EmptyState title="页面不存在" hint="检查一下链接，或者回到首页看看今天的榜单。" />
          <div className="mt-4 text-center">
            <a href="#/" className="text-[12px] font-semibold text-brand-500 hover:underline">
              返回首页
            </a>
          </div>
        </div>
      )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{page}</main>
      <Footer />
      <ProfileDrawer />
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  )
}
