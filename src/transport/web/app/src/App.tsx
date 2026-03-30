import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { getToken, setToken, clearToken } from './api/client'
import { Home } from './pages/Home'
import { Closet } from './pages/Closet'
import { Outfits } from './pages/Outfits'
import { TryOn } from './pages/TryOn'
import { Settings } from './pages/Settings'
import { Jobs } from './pages/Jobs'
import { Login } from './pages/Login'
import { SetupPassword } from './pages/SetupPassword'
import { Spinner } from './components/ui/Spinner'

const NAV_ITEMS = [
  { to: '/home', label: 'Home' },
  { to: '/closet', label: 'Closet' },
  { to: '/outfits', label: 'Outfits' },
  { to: '/tryon', label: 'Try On' },
  { to: '/settings', label: 'Settings' },
]

function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-[#111] flex safe-area-inset-bottom">
      {NAV_ITEMS.map(({ to, label }) => (
        <NavLink key={to} to={to} className="flex-1">
          {({ isActive }) => (
            <div className="flex flex-col items-center gap-0.5 py-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-[#111]' : 'border-[1.5px] border-[#111]'
              }`} />
              <span className={`text-[7px] font-bold font-mono uppercase tracking-[0.06em] text-[#111] ${
                isActive ? 'border-b-2 border-[#111]' : ''
              }`}>
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

type AuthState = 'loading' | 'setup' | 'login' | 'authed'

export function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    async function checkAuth() {
      const tg = (window as unknown as { Telegram?: { WebApp?: { initData: string; ready(): void; expand(): void } } }).Telegram

      // Always signal ready + expand immediately — must happen before any async work
      if (tg?.WebApp) {
        tg.WebApp.ready()
        tg.WebApp.expand()

        if (tg.WebApp.initData) {
          try {
            const res = await fetch('/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: tg.WebApp.initData }),
            })
            if (res.ok) {
              const { token } = await res.json() as { token: string }
              setToken(token)
              setAuthState('authed')
              return
            }
          } catch { /* fall through */ }
        }
      }

      // Check whether a password has been configured
      try {
        const { hasPassword } = await fetch('/api/auth/status').then(r => r.json()) as { hasPassword: boolean }
        if (!hasPassword) {
          setAuthState('setup')
          return
        }
      } catch {
        setAuthState('setup')
        return
      }

      // Password exists — verify stored token
      const token = getToken()
      if (token) {
        try {
          const res = await fetch('/api/items?limit=1', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) { setAuthState('authed'); return }
        } catch { /* fall through */ }
        clearToken()
      }

      setAuthState('login')
    }
    void checkAuth()
  }, [])

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner />
      </div>
    )
  }

  if (authState === 'setup') {
    return <SetupPassword onSetup={(token) => { setToken(token); setAuthState('authed') }} />
  }

  if (authState === 'login') {
    return <Login onLogin={() => setAuthState('authed')} />
  }

  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/closet" element={<Closet />} />
          <Route path="/outfits" element={<Outfits />} />
          <Route path="/tryon" element={<TryOn />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/settings" element={<Settings onLogout={() => setAuthState('login')} />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  )
}
