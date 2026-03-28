import { getAllJobs, insertJob } from './store.js'

/**
 * Insert built-in default jobs if they don't already exist.
 * Called at startup (both web server and Telegram bot).
 */
export function seedDefaultJobs() {
  const existing = getAllJobs()
  const hasOutfitJob = existing.some(j => j.type === 'daily_outfit')
  if (!hasOutfitJob) {
    insertJob({
      name: 'Daily Outfit',
      type: 'daily_outfit',
      schedule: '0 8 * * *',
      params: {},
    })
  }
}
