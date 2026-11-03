import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { schemaSql } from './schema'

const databasePath = path.resolve(
  process.env.DATABASE_PATH ?? 'server/data/nahla-aya.sqlite',
)

fs.mkdirSync(path.dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)

db.exec('PRAGMA foreign_keys = ON;')
db.exec('PRAGMA journal_mode = WAL;')
db.exec(schemaSql)

export { databasePath }
