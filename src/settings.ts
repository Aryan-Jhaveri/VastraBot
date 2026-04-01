import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { DATA_DIR } from './db/client.js'

const SETTINGS_PATH = join(DATA_DIR, 'settings.json')

export interface AppSettings {
  telegramChatId?: string
}

export function getSettings(): AppSettings {
  if (!existsSync(SETTINGS_PATH)) return {}
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')) as AppSettings
  } catch {
    return {}
  }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const next = { ...current, ...patch }
  writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf-8')
  return next
}
