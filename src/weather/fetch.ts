import { getWeatherLabel, getWeatherIcon } from './wmo.js'
import type { WeatherData } from '../types/index.js'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    weather_code: number
    precipitation: number
    wind_speed_10m: number
  }
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,precipitation,wind_speed_10m&temperature_unit=celsius`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status} ${res.statusText}`)
  const data = await res.json() as OpenMeteoResponse
  const c = data.current
  return {
    temperature: c.temperature_2m,
    weatherCode: c.weather_code,
    condition: getWeatherLabel(c.weather_code),
    precipitation: c.precipitation,
    windSpeed: c.wind_speed_10m,
    icon: getWeatherIcon(c.weather_code),
  }
}
