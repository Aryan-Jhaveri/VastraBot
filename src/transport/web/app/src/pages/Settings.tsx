import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from '../hooks/useLocation'
import { Button } from '../components/ui/Button'
import { apiFetch, setToken, clearToken } from '../api/client'
import { useSettings } from '../hooks/useSettings'

export function Settings({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate()
  const { location, geocode, clearLocation } = useLocation()
  const [cityInput, setCityInput] = useState(location?.name ?? '')
  const [geoLoading, setGeoLoading] = useState(false)
  const { settings, update: updateSettings } = useSettings()
  const [chatIdInput, setChatIdInput] = useState<string | null>(null)
  const [chatIdSaving, setChatIdSaving] = useState(false)
  const [chatIdSuccess, setChatIdSuccess] = useState(false)

  // Password change — hidden until user taps "Change Password"
  const [showPwForm, setShowPwForm] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleUpdateCity(e: React.FormEvent) {
    e.preventDefault()
    if (!cityInput.trim()) return
    setGeoLoading(true)
    try {
      await geocode(cityInput.trim())
    } finally {
      setGeoLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (pwNew !== pwConfirm) { setPwError('New passwords do not match'); return }
    setPwLoading(true)
    try {
      const res = await apiFetch('/api/settings/password', {
        method: 'POST',
        body: JSON.stringify({ current: pwCurrent, newPassword: pwNew }),
      })
      const body = await res.json() as { token?: string; error?: string }
      if (!res.ok) { setPwError(body.error ?? 'Failed to update password'); return }
      // Server sets a fresh httpOnly cookie; store new session token for Bearer auth
      setToken(body.token!)
      setPwCurrent(''); setPwNew(''); setPwConfirm('')
      setPwSuccess(true)
      setShowPwForm(false)
    } catch {
      setPwError('Something went wrong')
    } finally {
      setPwLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    clearToken()
    onLogout()
  }

  return (
    <div className="flex flex-col p-4 pb-24">
      <h1 className="text-[22px] font-bold leading-none mb-6">Settings.</h1>

      {/* Location section */}
      <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] mt-6 mb-2 pb-1 border-b border-[#e0e0e0]">Location</p>
      {location && (
        <div className="border-b border-[#f0f0f0] py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{location.name}</p>
            <p className="text-[9px] font-mono text-[#888] mt-0.5">{location.lat.toFixed(4)}, {location.lon.toFixed(4)}</p>
          </div>
          <button
            onClick={clearLocation}
            className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111]"
          >
            Clear
          </button>
        </div>
      )}
      <form onSubmit={handleUpdateCity} className="py-3 flex gap-2">
        <input
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          placeholder="Update city…"
          className="flex-1 border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
        />
        <Button type="submit" variant="secondary" loading={geoLoading}>Update</Button>
      </form>

      {/* Telegram Notifications */}
      <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] mt-6 mb-2 pb-1 border-b border-[#e0e0e0]">Telegram Notifications</p>
      <div className="border-b border-[#f0f0f0] py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Chat ID</p>
          {settings.telegramChatId && chatIdInput === null && (
            <span className="text-[10px] font-mono text-[#555]">{settings.telegramChatId}</span>
          )}
        </div>
        {chatIdInput !== null ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setChatIdSaving(true)
              setChatIdSuccess(false)
              try {
                await updateSettings({ telegramChatId: chatIdInput.trim() || undefined })
                setChatIdSuccess(true)
                setChatIdInput(null)
              } finally {
                setChatIdSaving(false)
              }
            }}
            className="flex gap-2"
          >
            <input
              value={chatIdInput}
              onChange={e => setChatIdInput(e.target.value)}
              placeholder="e.g. 123456789"
              className="flex-1 border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
              autoFocus
            />
            <Button type="submit" variant="secondary" loading={chatIdSaving}>Save</Button>
            <button
              type="button"
              onClick={() => setChatIdInput(null)}
              className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111] px-2"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => { setChatIdInput(settings.telegramChatId ?? ''); setChatIdSuccess(false) }}
            className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111] text-left"
          >
            {settings.telegramChatId ? 'Edit' : 'Set Chat ID'}
          </button>
        )}
        {chatIdSuccess && (
          <p className="text-[9px] font-mono text-green-600">Saved</p>
        )}
        <p className="text-[9px] font-mono text-[#aaa]">
          Message @userinfobot on Telegram to find your Chat ID. Used for outfit reminders.
        </p>
      </div>

      {/* Scheduled jobs */}
      <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] mt-6 mb-2 pb-1 border-b border-[#e0e0e0]">Automation</p>
      <button
        onClick={() => navigate('/jobs')}
        className="border-b border-[#f0f0f0] py-3 flex items-center justify-between w-full text-left hover:bg-[#f8f8f8] transition-colors"
      >
        <p className="text-sm font-medium">Scheduled Jobs</p>
        <span className="text-[9px] font-mono text-[#888]">→</span>
      </button>

      {/* Security section */}
      <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] mt-6 mb-2 pb-1 border-b border-[#e0e0e0]">Security</p>

      {/* Change password — collapsed by default */}
      {!showPwForm ? (
        <button
          onClick={() => setShowPwForm(true)}
          className="border-b border-[#f0f0f0] py-3 flex items-center justify-between w-full text-left hover:bg-[#f8f8f8] transition-colors"
        >
          <p className="text-sm font-medium">Change Password</p>
          <span className="text-[9px] font-mono text-[#888]">→</span>
        </button>
      ) : (
        <form onSubmit={handleChangePassword} className="py-3 flex flex-col gap-3 border-b border-[#f0f0f0]">
          {pwError && (
            <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="border-2 border-[#111] bg-[#111] text-white px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">Password updated</div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888]">Current Password</label>
            <input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} required
              className="border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888]">New Password</label>
            <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} required minLength={8}
              className="border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888]">Confirm New Password</label>
            <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} required minLength={8}
              className="border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" loading={pwLoading}>Save</Button>
            <button
              type="button"
              onClick={() => { setShowPwForm(false); setPwCurrent(''); setPwNew(''); setPwConfirm(''); setPwError(null) }}
              className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111] px-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Log out */}
      <button
        onClick={handleLogout}
        className="border-b border-[#f0f0f0] py-3 flex items-center justify-between w-full text-left hover:bg-[#f8f8f8] transition-colors"
      >
        <p className="text-sm font-medium">Log Out</p>
        <span className="text-[9px] font-mono text-[#888]">→</span>
      </button>

      {/* About section */}
      <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] mt-6 mb-2 pb-1 border-b border-[#e0e0e0]">About</p>
      <div className="py-3 flex items-center justify-between border-b border-[#f0f0f0]">
        <p className="text-sm font-medium">My Closet</p>
        <p className="text-[9px] font-mono text-[#888]">v1.0.0</p>
      </div>
    </div>
  )
}
