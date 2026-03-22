import { render, screen } from '@testing-library/react'
import { WeatherCard } from './WeatherCard'
import type { WeatherData } from '../api/outfits'

const mockWeather: WeatherData = {
  temperature: 22,
  weatherCode: 0,
  condition: 'Clear sky',
  precipitation: 0,
  windSpeed: 15,
  icon: '☀️',
}

describe('WeatherCard', () => {
  it('shows loading state', () => {
    render(<WeatherCard loading />)
    expect(screen.getByText(/Fetching weather/i)).toBeInTheDocument()
  })

  it('shows placeholder when no weather', () => {
    render(<WeatherCard />)
    expect(screen.getByText(/Set a location/i)).toBeInTheDocument()
  })

  it('renders temperature and condition', () => {
    render(<WeatherCard weather={mockWeather} locationName="Toronto" />)
    expect(screen.getByText(/22°/)).toBeInTheDocument()
    expect(screen.getByText('Clear sky')).toBeInTheDocument()
    expect(screen.getByText('Toronto')).toBeInTheDocument()
  })

  it('renders precipitation and wind', () => {
    render(<WeatherCard weather={mockWeather} />)
    expect(screen.getByText(/0 mm/)).toBeInTheDocument()
    expect(screen.getByText(/15 km\/h/)).toBeInTheDocument()
  })
})
