import { ai, VISION_MODEL } from './client.js'
import { parseGeminiJSON } from './parse.js'
import type { TagData } from '../types/index.js'

const SCAN_TAG_PROMPT = `Extract all information from this clothing care label image. Return ONLY valid JSON with no markdown:
{
  "brand": "brand name or null",
  "size": "size value or null",
  "material_composition": "e.g. 100% Cotton or null",
  "care_instructions": ["Machine wash cold", "Do not bleach"],
  "country_of_origin": "country or null"
}`

export async function scanTag(imageBase64: string): Promise<TagData> {
  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: SCAN_TAG_PROMPT },
        ],
      },
    ],
  })

  return parseGeminiJSON<TagData>(response.text)
}
