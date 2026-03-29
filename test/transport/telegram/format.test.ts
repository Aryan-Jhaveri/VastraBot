import { describe, it, expect } from 'vitest'
import { formatItem, formatOutfit, formatWeather, formatItemClassification } from '../../../src/transport/telegram/format.js'
import type { Item, Outfit, WeatherData } from '../../../src/types/index.js'

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'test-id',
    imageUri: 'images/items/test.jpg',
    category: 'tops',
    subcategory: 'T-Shirt',
    primaryColor: 'white',
    colors: '["white","grey"]',
    material: 'cotton',
    careInstructions: '[]',
    brand: 'Nike',
    size: 'M',
    season: '["summer","spring"]',
    tags: '["casual","sporty"]',
    occasion: '["casual"]',
    aiDescription: 'A crisp white t-shirt.',
    tagImageUri: null,
    timesWorn: 3,
    lastWornAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('formatItem', () => {
  it('includes subcategory and key fields', () => {
    const result = formatItem(makeItem())
    expect(result).toContain('T-Shirt')
    expect(result).toContain('white')
    expect(result).toContain('Nike')
    expect(result).toContain('M')
    expect(result).toContain('test-id')
  })

  it('includes AI description', () => {
    const result = formatItem(makeItem())
    expect(result).toContain('crisp white t-shirt')
  })

  it('falls back to category when no subcategory', () => {
    const result = formatItem(makeItem({ subcategory: null }))
    expect(result).toContain('tops')
  })

  it('shows season tags', () => {
    const result = formatItem(makeItem())
    expect(result).toContain('summer')
    expect(result).toContain('spring')
  })

  it('handles missing optional fields gracefully', () => {
    const item = makeItem({ brand: null, size: null, material: null, aiDescription: null })
    const result = formatItem(item)
    expect(result).toContain('T-Shirt')
    expect(result).not.toContain('Brand:')
  })
})

describe('formatWeather', () => {
  const weather: WeatherData = {
    temperature: 18,
    weatherCode: 1,
    condition: 'Mainly Clear',
    precipitation: 0,
    windSpeed: 12,
    icon: '🌤',
  }

  it('includes temperature and condition', () => {
    const result = formatWeather(weather)
    expect(result).toContain('18°C')
    expect(result).toContain('Mainly Clear')
    expect(result).toContain('🌤')
  })

  it('includes wind speed', () => {
    const result = formatWeather(weather)
    expect(result).toContain('12 km/h')
  })
})

describe('formatItemClassification', () => {
  const cls = {
    category: 'tops',
    subcategory: 'Hoodie',
    primary_color: 'black',
    colors: ['black', 'grey'],
    material: 'fleece',
    season: ['fall', 'winter'],
    ai_description: 'A cozy black hoodie.',
    suggested_tags: ['casual', 'streetwear'],
  }

  it('includes subcategory and category', () => {
    const result = formatItemClassification(cls)
    expect(result).toContain('Hoodie')
    expect(result).toContain('tops')
  })

  it('includes material and season', () => {
    const result = formatItemClassification(cls)
    expect(result).toContain('fleece')
    expect(result).toContain('fall')
  })

  it('includes AI description', () => {
    const result = formatItemClassification(cls)
    expect(result).toContain('cozy black hoodie')
  })
})

describe('formatOutfit', () => {
  it('includes outfit name and item list', () => {
    const outfit: Outfit = {
      id: 'o1',
      name: 'Casual Friday',
      itemIds: '["i1","i2"]',
      occasion: 'casual',
      season: '["spring"]',
      notes: 'Light layers.',
      aiGenerated: 1,
      weatherContext: null,
      timesWorn: 0,
      lastWornAt: null,
      createdAt: Date.now(),
    }
    const items = [makeItem({ id: 'i1' }), makeItem({ id: 'i2', subcategory: 'Jeans' })]
    const result = formatOutfit(outfit, items)
    expect(result).toContain('Casual Friday')
    expect(result).toContain('T-Shirt')
    expect(result).toContain('Jeans')
    expect(result).toContain('Light layers.')
  })
})
