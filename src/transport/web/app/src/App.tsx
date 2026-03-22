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
    const token = getToken()
    if (!token) {
      setAuthed(false)
      return
    }
    // Verify token is still valid
    apiFetchJSON('/api/items?limit=1')
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
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
