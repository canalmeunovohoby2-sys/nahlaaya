import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const databasePath = path.resolve(
  process.env.DATABASE_PATH ?? 'server/data/nahla-aya.sqlite',
)
const outputDir = path.resolve('migration/export')

if (!fs.existsSync(databasePath)) {
  console.error(`Banco não encontrado: ${databasePath}`)
  process.exit(1)
}

const db = new DatabaseSync(databasePath, { readOnly: true })
const tableNames = [
  'products',
  'customers',
  'addresses',
  'orders',
  'order_items',
]

const tables = {}

for (const table of tableNames) {
  tables[table] = db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()
}

tables.admin_users = db
  .prepare('SELECT id, name, email, created_at FROM admin_users ORDER BY id')
  .all()

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outputPath = path.join(outputDir, `nahla-aya-${timestamp}.json`)
fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      source: databasePath,
      exportedAt: new Date().toISOString(),
      tables,
    },
    null,
    2,
  ),
)

console.log(`Exportação criada: ${outputPath}`)
for (const table of [...tableNames, 'admin_users']) {
  console.log(`${table}: ${tables[table].length}`)
}

db.close()
