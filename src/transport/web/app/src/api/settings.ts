import { apiFetchJSON } from './client'

export interface AppSettings {
  telegramChatId?: string
}

export async function fetchSettings(): Promise<AppSettings> {
  return apiFetchJSON('/api/settings')
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return apiFetchJSON('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
