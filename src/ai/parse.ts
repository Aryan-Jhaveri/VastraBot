/**
 * Gemini often wraps JSON responses in markdown code fences.
 * This helper strips the fences and parses the JSON safely.
 */
export function parseGeminiJSON<T = unknown>(text: string | null | undefined): T {
  if (!text) throw new Error('Empty response from Gemini')

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  try {
    return JSON.parse(stripped) as T
  } catch {
    // Fallback: extract first JSON object or array via regex
    const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (match) {
      return JSON.parse(match[1]) as T
    }
    throw new Error(`Failed to parse Gemini JSON response: ${text.slice(0, 200)}`)
  }
}

/**
 * Extract the base64 image data from a Gemini image generation response.
 * Returns { data, mimeType } or throws if no image was returned.
 */
export function extractGeminiImage(
  response: { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> }
): { data: string; mimeType: string } {
  const parts = response.candidates?.[0]?.content?.parts ?? []

  // Check for safety block
  if (!response.candidates?.length) {
    const block = (response as Record<string, unknown>)?.promptFeedback as Record<string, unknown> | undefined
    if (block?.blockReason) {
      throw new Error(`Gemini blocked the request: ${block.blockReason}`)
    }
    throw new Error('No candidates in Gemini image response')
  }

  for (const part of parts) {
    if (part.inlineData && typeof part.inlineData === 'object') {
      const { data, mimeType } = part.inlineData as { data: string; mimeType: string }
      if (data) return { data, mimeType: mimeType ?? 'image/png' }
    }
  }

  throw new Error('No image data found in Gemini response')
}
