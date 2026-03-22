import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { DATA_DIR } from '../../db/client.js'

const SESSIONS_DIR = join(DATA_DIR, 'sessions')

/**
 * Simple JSON file-based storage adapter for grammY conversations.
 * Keyed by chat ID so conversation state survives bot restarts.
 */
export class JsonFileStorage<S> {
  private path(key: string): string {
    // Sanitize key to be filesystem-safe
    return join(SESSIONS_DIR, `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`)
  }

  async read(key: string): Promise<S | undefined> {
    const p = this.path(key)
    if (!existsSync(p)) return undefined
    try {
      const raw = await readFile(p, 'utf-8')
      return JSON.parse(raw) as S
    } catch {
      return undefined
    }
  }

  async write(key: string, value: S): Promise<void> {
    await mkdir(SESSIONS_DIR, { recursive: true })
    await writeFile(this.path(key), JSON.stringify(value))
  }

  async delete(key: string): Promise<void> {
    const p = this.path(key)
    if (existsSync(p)) await unlink(p)
  }
}
