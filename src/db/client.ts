import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import * as schema from './schema.js'

export const DATA_DIR = process.env.CLOSET_DATA_DIR || `${process.env.HOME}/.closet`
const dbPath = `${DATA_DIR}/closet.db`

mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
