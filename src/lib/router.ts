import { useEffect, useState } from 'react'

export interface Route {
  path: string
  params: URLSearchParams
  hash: string
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, search = ''] = raw.split('?')
  return {
    path: path || '/',
    params: new URLSearchParams(search),
    hash: raw,
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export function navigate(to: string) {
  const target = to.startsWith('#') ? to : `#${to}`
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = target
  }
}
