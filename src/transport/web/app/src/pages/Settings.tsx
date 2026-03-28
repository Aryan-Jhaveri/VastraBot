import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from '../hooks/useLocation'
import { Button } from '../components/ui/Button'

export function Settings() {
  const navigate = useNavigate()
  const { location, geocode, clearLocation } = useLocation()
  const [cityInput, setCityInput] = useState(location?.name ?? '')
  const [geoLoading, setGeoLoading] = useState(false)

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

      {/* Scheduled jobs */}
      <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] mt-6 mb-2 pb-1 border-b border-[#e0e0e0]">Automation</p>
      <button
        onClick={() => navigate('/jobs')}
        className="border-b border-[#f0f0f0] py-3 flex items-center justify-between w-full text-left hover:bg-[#f8f8f8] transition-colors"
      >
        <p className="text-sm font-medium">Scheduled Jobs</p>
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
