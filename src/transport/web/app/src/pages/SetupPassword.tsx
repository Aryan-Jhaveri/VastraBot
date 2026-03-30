import { useState, type FormEvent } from 'react'

interface SetupPasswordProps {
  onSetup: (token: string) => void
}

export function SetupPassword({ onSetup }: SetupPasswordProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json() as { error: string }
        setError(msg)
        return
      }
      const { token } = await res.json() as { token: string }
      onSetup(token)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="border-2 border-[#111] w-full max-w-sm p-8 flex flex-col gap-6">
        <div className="border-b-2 border-[#111] pb-4">
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.12em] mb-1">First Run</p>
          <h1 className="text-2xl font-bold">My Closet</h1>
          <p className="text-[11px] font-mono text-[#555] mt-2">Create a password to protect your closet.</p>
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
              minLength={8}
              className="border-2 border-[#111] px-3 py-2.5 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888]">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
              className="border-2 border-[#111] px-3 py-2.5 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111] text-white border-2 border-[#111] py-2.5 text-[10px] font-bold font-mono uppercase tracking-[0.1em] hover:bg-[#333] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Setting up…' : 'Create Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
