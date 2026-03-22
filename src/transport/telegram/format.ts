import type { Item, Outfit, WeatherData } from '../../types/index.js'

export function formatItem(item: Item): string {
  const colors: string[] = JSON.parse(item.colors ?? '[]')
  const tags: string[] = JSON.parse(item.tags ?? '[]')
  const season: string[] = JSON.parse(item.season ?? '[]')

  const lines: string[] = [
    `*${item.subcategory ?? item.category}*`,
  ]

  if (item.primaryColor) lines.push(`Color: ${item.primaryColor}`)
  if (colors.length > 1) lines.push(`Colors: ${colors.join(', ')}`)
  if (item.brand) lines.push(`Brand: ${item.brand}`)
  if (item.size) lines.push(`Size: ${item.size}`)
  if (item.material) lines.push(`Material: ${item.material}`)
  if (season.length) lines.push(`Season: ${season.join(', ')}`)
  if (tags.length) lines.push(`Tags: ${tags.join(', ')}`)
  if (item.aiDescription) lines.push(`\n_${item.aiDescription}_`)
  lines.push(`\nID: \`${item.id}\``)

  return lines.join('\n')
}

export function formatOutfit(outfit: Outfit, items: Item[]): string {
  const itemLines = items.map(i => `  • ${i.subcategory ?? i.category} (${i.primaryColor ?? ''})`).join('\n')
  const lines = [
    `*${outfit.name}*`,
    outfit.occasion ? `Occasion: ${outfit.occasion}` : '',
    `Items:\n${itemLines}`,
    outfit.notes ? `\n_${outfit.notes}_` : '',
  ].filter(Boolean)

  return lines.join('\n')
}

export function formatWeather(w: WeatherData): string {
  return [
    `${w.icon} *${w.condition}*`,
    `🌡 ${w.temperature}°C`,
    `💧 ${w.precipitation}mm rain`,
    `💨 ${w.windSpeed} km/h wind`,
  ].join('\n')
}

export function formatItemClassification(c: {
  category: string
  subcategory: string
  primary_color: string
  colors: string[]
  material: string
  season: string[]
  ai_description: string
  suggested_tags: string[]
}): string {
  return [
    `*${c.subcategory}* (${c.category})`,
    `Color: ${c.primary_color}`,
    `Material: ${c.material}`,
    `Season: ${c.season.join(', ')}`,
    `Tags: ${c.suggested_tags.join(', ')}`,
    `\n_${c.ai_description}_`,
  ].join('\n')
}
