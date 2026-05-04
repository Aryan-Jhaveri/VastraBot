import { useState, type FormEvent } from 'react'
import { setToken } from '../api/client'

interface LoginProps {
  onLogin: () => void
}

export function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setError('Wrong password'); return }
      const { token } = await res.json() as { ok: boolean; token: string }
      setToken(token)
      onLogin()
    } catch {
      setError('Wrong password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="border-2 border-[#111] w-full max-w-sm p-8 flex flex-col gap-6">
        <div className="border-b-2 border-[#111] pb-4">
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.12em] mb-1">Personal</p>
          <h1 className="text-2xl font-bold">My Closet</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888]">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              className="border-2 border-[#111] px-3 py-2.5 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111] text-white border-2 border-[#111] py-2.5 text-[10px] font-bold font-mono uppercase tracking-[0.1em] hover:bg-[#333] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
