import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { getToken, apiFetchJSON } from './api/client'
import { Home } from './pages/Home'
import { Closet } from './pages/Closet'
import { TryOn } from './pages/TryOn'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Spinner } from './components/ui/Spinner'

function BottomNav() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors ${
      isActive ? 'text-stone-900' : 'text-stone-400'
    }`

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-100 flex justify-around safe-area-inset-bottom">
      <NavLink to="/home" className={navClass}><span>🏠</span>Home</NavLink>
      <NavLink to="/closet" className={navClass}><span>👔</span>Closet</NavLink>
      <NavLink to="/tryon" className={navClass}><span>✨</span>Try On</NavLink>
      <NavLink to="/settings" className={navClass}><span>⚙️</span>Settings</NavLink>
    </nav>
  )
}

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkAuth() {
      // Inside Telegram Mini App — auto-authenticate via initData
      const tg = (window as Record<string, unknown>).Telegram as { WebApp?: { initData: string; ready(): void; expand(): void } } | undefined
      if (tg?.WebApp?.initData) {
        tg.WebApp.ready()
        tg.WebApp.expand()
        try {
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.WebApp.initData }),
          })
          if (res.ok) {
            const { token } = await res.json() as { token: string }
            setToken(token)
            setAuthed(true)
            return
          }
        } catch { /* fall through to password auth */ }
      }

      // Normal browser — verify stored token
      const token = getToken()
      if (!token) { setAuthed(false); return }
      apiFetchJSON('/api/items?limit=1')
        .then(() => setAuthed(true))
        .catch(() => setAuthed(false))
    }
    void checkAuth()
  }, [])

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Spinner />
      </div>
    )
  }

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/closet" element={<Closet />} />
          <Route path="/tryon" element={<TryOn />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  )
}
