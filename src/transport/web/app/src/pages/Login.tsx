import { useState, type FormEvent } from 'react'
import { setToken, apiFetchJSON } from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

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

    // Store the token first, then verify by hitting a protected endpoint
    setToken(password)

    try {
      // Also set the httpOnly cookie for image requests
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      // Verify the token works
      await apiFetchJSON('/api/items?limit=1')
      onLogin()
    } catch {
      setError('Wrong password')
      setToken('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8 flex flex-col gap-6">
        <div className="text-center">
          <span className="text-5xl">👗</span>
          <h1 className="mt-3 text-2xl font-semibold text-stone-900">My Closet</h1>
          <p className="text-sm text-stone-400 mt-1">Enter your access password</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Enter
          </Button>
        </form>
      </div>
    </div>
  )
}
