import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, DATA_DIR } from './client.js'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

mkdirSync(DATA_DIR, { recursive: true })

const migrationsFolder = join(__dirname, 'migrations')

migrate(db, { migrationsFolder })

console.log('Migrations applied successfully')
