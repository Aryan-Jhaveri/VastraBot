import { getCurrentWeather, geocodeCity } from '../../../tools/weather.js'
import { formatWeather } from '../format.js'
import type { BotContext } from '../context.js'

export async function handleWeather(ctx: BotContext): Promise<void> {
  const { lat, lon } = ctx.session

  if (lat === undefined || lon === undefined) {
    ctx.session.awaitingLocation = true
    await ctx.reply(
      'Where are you? Type a city name (e.g. "Toronto") or tap Share my location on mobile:',
      {
        reply_markup: {
          keyboard: [[{ text: '📍 Share my location', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    )
    return
  }

  try {
    const weather = await getCurrentWeather(lat, lon)
    await ctx.reply(formatWeather(weather), { parse_mode: 'Markdown' })
  } catch (err) {
    await ctx.reply('Could not fetch weather. Try again.')
  }
}

export async function handleCityText(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text?.trim()
  if (!text) return

  ctx.session.awaitingLocation = false

  try {
    const geo = await geocodeCity(text)
    ctx.session.lat = geo.lat
    ctx.session.lon = geo.lon
    ctx.session.locationName = geo.name
    const weather = await getCurrentWeather(geo.lat, geo.lon)
    await ctx.reply(
      `📍 Location set to *${geo.name}*\n\n${formatWeather(weather)}`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } },
    )
  } catch {
    await ctx.reply(`Could not find "${text}". Try a different city name.`)
  }
}

export async function handleLocationMessage(ctx: BotContext): Promise<void> {
  const location = ctx.message?.location
  if (!location) return

  ctx.session.lat = location.latitude
  ctx.session.lon = location.longitude
  ctx.session.awaitingLocation = false

  try {
    const weather = await getCurrentWeather(location.latitude, location.longitude)
    await ctx.reply(
      `Location saved!\n\n${formatWeather(weather)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      },
    )
  } catch {
    await ctx.reply('Location saved. Could not fetch weather right now.')
  }
}
