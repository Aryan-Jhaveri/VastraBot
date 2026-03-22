import { fetchWeather } from '../weather/fetch.js'
import type { WeatherData } from '../types/index.js'

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  return fetchWeather(lat, lon)
}
