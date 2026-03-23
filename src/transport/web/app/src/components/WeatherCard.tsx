import type { WeatherData } from '../api/outfits'
import { Spinner } from './ui/Spinner'

interface WeatherCardProps {
  weather?: WeatherData | null
  loading?: boolean
  locationName?: string
}

export function WeatherCard({ weather, loading, locationName }: WeatherCardProps) {
  if (loading) {
    return (
      <div className="border-2 border-[#111] p-4 flex items-center gap-2">
        <Spinner size={16} />
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#888]">Fetching weather…</span>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="border-2 border-[#111] p-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#888]">Set a location to see weather.</p>
      </div>
    )
  }

  return (
    <div className="border-2 border-[#111] p-3 relative">
      <div className="absolute top-3 right-3 border-2 border-[#111] px-1.5 py-0.5">
        <span className="text-[8px] font-bold font-mono uppercase tracking-[0.1em]">{weather.condition}</span>
      </div>
      <div className="text-[40px] font-bold leading-none">{Math.round(weather.temperature)}°</div>
      <div className="text-[9px] font-mono text-[#888] mt-0.5 uppercase">
        <span>{locationName ?? 'Current location'}</span>
        {' — '}
        {weather.precipitation > 0 ? 'Rain expected' : 'No rain'}
      </div>
      <div className="mt-2 flex gap-4 text-[8px] font-mono text-[#888] uppercase tracking-[0.06em]">
        <span>Rain {weather.precipitation} mm</span>
        <span>Wind {weather.windSpeed} km/h</span>
      </div>
    </div>
  )
}
