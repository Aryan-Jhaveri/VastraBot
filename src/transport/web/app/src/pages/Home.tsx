import { useState } from 'react'
import { useLocation } from '../hooks/useLocation'
import { useOutfits } from '../hooks/useOutfits'
import { WeatherCard } from '../components/WeatherCard'
import { OutfitCard } from '../components/OutfitCard'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { createOutfit } from '../api/outfits'

export function Home() {
  const { location, loading: locLoading, geocode, requestBrowserLocation } = useLocation()
  const { result, loading: outfitLoading, suggest } = useOutfits()
  const [cityInput, setCityInput] = useState('')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)

  async function handleGeocode(e: React.FormEvent) {
    e.preventDefault()
    if (!cityInput.trim()) return
    try {
      const loc = await geocode(cityInput.trim())
      void suggest(loc.lat, loc.lon)
    } catch { /* error shown in WeatherCard */ }
  }

  async function handleGPS() {
    try {
      const loc = await requestBrowserLocation()
      void suggest(loc.lat, loc.lon)
    } catch { /* user denied */ }
  }

  async function handleRefresh() {
    if (location) void suggest(location.lat, location.lon)
  }

  async function handleSave(suggestion: NonNullable<typeof result>['suggestions'][number]) {
    setSavingId(suggestion.name)
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
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <WeatherCard
        weather={result?.weather}
        loading={outfitLoading}
        locationName={location?.name}
      />

      <form onSubmit={handleGeocode} className="flex gap-2">
        <input
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          placeholder="Enter a city…"
          className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
        />
        <Button type="submit" variant="secondary" loading={locLoading}>Go</Button>
        <Button type="button" variant="ghost" onClick={handleGPS} title="Use my location">📍</Button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">Today's Outfit</h2>
        {location && (
          <Button variant="ghost" onClick={handleRefresh} loading={outfitLoading}>
            Refresh
          </Button>
        )}
      </div>

      {!location && !outfitLoading && (
        <p className="text-sm text-stone-400 text-center py-8">Set a location to get outfit suggestions.</p>
      )}

      {outfitLoading && !result && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {result?.suggestions.map(s => (
        <OutfitCard
          key={s.name}
          suggestion={s}
          onSave={savedIds.has(s.name) ? undefined : () => handleSave(s)}
          saving={savingId === s.name}
        />
      ))}

      {result && result.suggestions.length === 0 && (
        <p className="text-sm text-stone-400 text-center py-8">
          Add more items to your closet to get suggestions.
        </p>
      )}
    </div>
  )
}
