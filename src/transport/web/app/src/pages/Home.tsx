import { useState } from 'react'
import { useLocation } from '../hooks/useLocation'
import { useOutfits } from '../hooks/useOutfits'
import { WeatherCard } from '../components/WeatherCard'
import { OutfitCard } from '../components/OutfitCard'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { createOutfit } from '../api/outfits'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good\nmorning.'
  if (h < 17) return 'Good\nafternoon.'
  return 'Good\nevening.'
}

function getDateStr() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).toUpperCase()
}

export function Home() {
  const { location, loading: locLoading, geocode, requestBrowserLocation } = useLocation()
  const { result, loading: outfitLoading, suggest } = useOutfits()
  const [cityInput, setCityInput] = useState('')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleGeocode(e: React.FormEvent) {
    e.preventDefault()
    if (!cityInput.trim()) return
    try { await geocode(cityInput.trim()) }
    catch { /* error shown in WeatherCard */ }
  }

  async function handleGPS() {
    try { await requestBrowserLocation() }
    catch { /* user denied */ }
  }

  async function handleSuggest() {
    if (location) void suggest(location.lat, location.lon)
  }

  async function handleSave(suggestion: NonNullable<typeof result>['suggestions'][number]) {
    setSavingId(suggestion.name)
    setSaveError(null)
    try {
      await createOutfit({
        name: suggestion.name,
        itemIds: suggestion.item_ids,
        occasion: suggestion.occasion,
        aiGenerated: true,
        weatherContext: result?.weather ? {
          temperature: result.weather.temperature,
          condition: result.weather.condition,
        } : undefined,
      })
      setSavedIds(prev => new Set([...prev, suggestion.name]))
    } catch (err) {
      setSaveError(String(err))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-[22px] font-bold leading-tight whitespace-pre-line">{getGreeting()}</h1>
        <div className="text-right mt-1">
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em]">{getDateStr()}</p>
        </div>
      </div>

      {/* Weather */}
      <WeatherCard
        weather={result?.weather}
        loading={outfitLoading}
        locationName={location?.name}
      />

      {/* City input */}
      <form onSubmit={handleGeocode} className="flex gap-2">
        <input
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          placeholder="Enter city…"
          className="flex-1 border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
        />
        <Button type="submit" variant="secondary" loading={locLoading}>Go</Button>
        <button
          type="button"
          onClick={handleGPS}
          title="Use my location"
          className="border-2 border-[#111] px-3 py-2 text-sm hover:bg-[#f0f0f0] transition-colors"
        >
          📍
        </button>
      </form>

      {/* Outfit section header */}
      <div className="flex items-center justify-between border-b-2 border-[#111] pb-2">
        <span className="text-[10px] font-bold font-mono uppercase tracking-[0.1em]">Today's Outfit</span>
        {location && (
          <button
            onClick={handleSuggest}
            disabled={outfitLoading}
            className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111] disabled:opacity-40"
          >
            {outfitLoading ? 'Loading…' : result ? 'Refresh' : 'Suggest'}
          </button>
        )}
      </div>

      {!location && !outfitLoading && (
        <p className="text-[10px] font-mono text-[#888] uppercase tracking-[0.06em] text-center py-6">
          Set a location to get outfit suggestions.
        </p>
      )}

      {location && !result && !outfitLoading && (
        <p className="text-[10px] font-mono text-[#888] uppercase tracking-[0.06em] text-center py-6">
          Tap Suggest to get today's outfit.
        </p>
      )}

      {outfitLoading && !result && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {saveError && (
        <p className="text-[10px] font-mono text-red-600 uppercase tracking-[0.06em]">
          Failed to save outfit: {saveError}
        </p>
      )}

      {result?.suggestions.map((s, i) => (
        <OutfitCard
          key={s.name}
          suggestion={{ ...s, name: s.name || `Outfit #${String(i + 1).padStart(2, '0')}` }}
          onSave={savedIds.has(s.name) ? undefined : () => handleSave(s)}
          saving={savingId === s.name}
        />
      ))}

      {result && result.suggestions.length === 0 && (
        <p className="text-[10px] font-mono text-[#888] uppercase tracking-[0.06em] text-center py-6">
          Add more items to get suggestions.
        </p>
      )}
    </div>
  )
}
