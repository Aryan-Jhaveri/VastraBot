import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WeatherData, Item } from '../types/index.js'

const mockWeather: WeatherData = {
  temperature: 15,
  weatherCode: 2,
  condition: 'Partly cloudy',
  precipitation: 0,
  windSpeed: 10,
  icon: '⛅',
}

const mockItems: Item[] = [
  {
    id: 'top1', imageUri: 'images/items/top1.jpg', tagImageUri: null,
    category: 'tops', subcategory: 't-shirt', primaryColor: 'white',
    colors: '["white"]', material: 'cotton', careInstructions: '[]',
    brand: null, size: 'M', season: '["spring","summer"]', tags: '["casual"]',
    aiDescription: 'A white cotton t-shirt.', occasion: '["casual"]',
    timesWorn: 0, lastWornAt: null, createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'bot1', imageUri: 'images/items/bot1.jpg', tagImageUri: null,
    category: 'bottoms', subcategory: 'jeans', primaryColor: 'navy',
    colors: '["navy"]', material: 'denim', careInstructions: '[]',
    brand: 'Levi\'s', size: '32x30', season: '["spring","fall"]', tags: '["casual"]',
    aiDescription: 'Classic navy denim jeans.', occasion: '["casual","work"]',
    timesWorn: 2, lastWornAt: null, createdAt: Date.now(), updatedAt: Date.now(),
  },
]

describe('suggestOutfits', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns outfit suggestions from a valid Gemini response', async () => {
    vi.doMock('./client.js', () => ({
      ai: {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify([
              {
                item_ids: ['top1', 'bot1'],
                name: 'Spring Casual',
                occasion: 'casual',
                reasoning: 'Light layers work well for partly cloudy 15°C weather.',
              },
            ]),
          }),
        },
      },
      VISION_MODEL: 'gemini-2.0-flash',
      IMAGE_GEN_MODEL: 'gemini-2.0-flash-preview-image-generation',
    }))

    const { suggestOutfits } = await import('./suggest.js')
    const results = await suggestOutfits(mockWeather, mockItems)
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Spring Casual')
    expect(results[0].item_ids).toContain('top1')
  })

  it('handles markdown-wrapped JSON', async () => {
    vi.doMock('./client.js', () => ({
      ai: {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: '```json\n[{"item_ids":["top1"],"name":"Minimalist","occasion":"casual","reasoning":"Simple and clean."}]\n```',
          }),
        },
      },
      VISION_MODEL: 'gemini-2.0-flash',
    }))

    const { suggestOutfits } = await import('./suggest.js')
    const results = await suggestOutfits(mockWeather, mockItems)
    expect(results[0].name).toBe('Minimalist')
  })
})

describe('generateTryOn', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('saves the result image and returns a relative path', async () => {
    vi.doMock('./client.js', () => ({
      ai: {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            candidates: [{
              content: {
                parts: [{ inlineData: { data: 'ZmFrZWltYWdlZGF0YQ==', mimeType: 'image/jpeg' } }],
              },
            }],
          }),
        },
      },
      IMAGE_GEN_MODEL: 'gemini-2.0-flash-preview-image-generation',
    }))
    vi.doMock('../storage/images.js', () => ({
      saveImageFromBase64: vi.fn().mockResolvedValue('images/tryon/mock-result.jpg'),
    }))

    const { generateTryOn } = await import('./tryon.js')
    const result = await generateTryOn('userbase64', ['item1base64'])
    expect(result).toMatch(/^images\/tryon\/.+\.jpg$/)
  })

  it('throws when Gemini returns no image', async () => {
    vi.doMock('./client.js', () => ({
      ai: {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            candidates: [{
              content: { parts: [{ text: 'I cannot generate that image.' }] },
            }],
          }),
        },
      },
      IMAGE_GEN_MODEL: 'gemini-2.0-flash-preview-image-generation',
    }))

    const { generateTryOn } = await import('./tryon.js')
    await expect(generateTryOn('userbase64', ['item1base64'])).rejects.toThrow('No image data')
  })
})
