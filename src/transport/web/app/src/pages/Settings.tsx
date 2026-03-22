import { useState } from 'react'
import { useLocation } from '../hooks/useLocation'
import { getToken, setToken } from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function Settings() {
  const { location, geocode, clearLocation } = useLocation()
  const [password, setPassword] = useState(getToken())
  const [cityInput, setCityInput] = useState(location?.name ?? '')
  const [geoLoading, setGeoLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSavePassword() {
    setToken(password)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="font-semibold text-stone-900">Settings</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">Authentication</h2>
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter access password"
        />
        <Button variant="secondary" onClick={handleSavePassword} className="self-start">
          {saved ? 'Saved ✓' : 'Save password'}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">Location</h2>
        {location && (
          <div className="rounded-xl bg-stone-50 p-3 text-sm">
            <p className="font-medium text-stone-800">{location.name}</p>
            <p className="text-stone-400">{location.lat.toFixed(4)}, {location.lon.toFixed(4)}</p>
          </div>
        )}
        <form onSubmit={handleUpdateCity} className="flex gap-2">
          <input
            value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            placeholder="Update city…"
            className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
          />
          <Button type="submit" variant="secondary" loading={geoLoading}>Update</Button>
        </form>
        {location && (
          <Button variant="ghost" onClick={clearLocation} className="self-start text-stone-400">
            Clear location
          </Button>
        )}
      </section>
    </div>
  )
}
