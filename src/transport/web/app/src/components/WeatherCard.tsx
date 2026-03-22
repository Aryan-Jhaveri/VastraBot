import type { WeatherData } from '../api/outfits'
import { Card } from './ui/Card'
import { Spinner } from './ui/Spinner'

interface WeatherCardProps {
  weather?: WeatherData | null
  loading?: boolean
  locationName?: string
}

export function WeatherCard({ weather, loading, locationName }: WeatherCardProps) {
  if (loading) {
    return (
      <Card className="p-4 flex items-center justify-center gap-2 text-stone-400 text-sm">
        <Spinner size={16} />
        Fetching weather…
      </Card>
    )
  }

  if (!weather) {
    return (
      <Card className="p-4 text-stone-400 text-sm">
        Set a location to see weather.
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">{locationName ?? 'Current location'}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-light text-stone-900">{Math.round(weather.temperature)}°</span>
            <span className="text-sm text-stone-500">{weather.condition}</span>
          </div>
        </div>
        <span className="text-5xl" aria-label={weather.condition}>{weather.icon}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-stone-400">
        <span>💧 {weather.precipitation} mm</span>
        <span>💨 {weather.windSpeed} km/h</span>
      </div>
    </Card>
  )
}
