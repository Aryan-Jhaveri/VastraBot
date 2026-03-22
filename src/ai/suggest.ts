import { ai, VISION_MODEL } from './client.js'
import { parseGeminiJSON } from './parse.js'
import type { WeatherData, Item, OutfitSuggestion } from '../types/index.js'

export async function suggestOutfits(
  weather: WeatherData,
  closetItems: Item[],
): Promise<OutfitSuggestion[]> {
  const itemSummary = closetItems.map(i => ({
    id: i.id,
    category: i.category,
    subcategory: i.subcategory,
    primaryColor: i.primaryColor,
    material: i.material,
    season: JSON.parse(i.season ?? '[]'),
    tags: JSON.parse(i.tags ?? '[]'),
    occasion: JSON.parse(i.occasion ?? '[]'),
  }))

  const prompt = `Today's weather: ${weather.temperature}°C, ${weather.condition}, ${weather.precipitation}mm rain expected, wind ${weather.windSpeed}km/h.

From the wardrobe below, suggest 2 outfit combinations appropriate for this weather.
Return ONLY a valid JSON array with no markdown:
[
  {
    "item_ids": ["id1", "id2", "id3"],
    "name": "Outfit name",
    "occasion": "casual|work|outdoor|formal",
    "reasoning": "1 sentence why this works for the weather"
  }
]

Wardrobe items:
${JSON.stringify(itemSummary, null, 2)}`

  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: prompt,
  })

  return parseGeminiJSON<OutfitSuggestion[]>(response.text)
}
