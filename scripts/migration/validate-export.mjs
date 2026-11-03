import fs from 'node:fs'
import path from 'node:path'

const exportDir = path.resolve('migration/export')
const requestedFile = process.argv[2]

function latestExportFile() {
  const files = fs
    .readdirSync(exportDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .reverse()

  return files[0] ? path.join(exportDir, files[0]) : null
}

const exportPath = requestedFile ? path.resolve(requestedFile) : latestExportFile()

if (!exportPath || !fs.existsSync(exportPath)) {
  console.error('Nenhuma exportação encontrada.')
  process.exit(1)
}

const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'))
const products = exported?.tables?.products

if (!Array.isArray(products)) {
  console.error('Exportação sem produtos.')
  process.exit(1)
}

const problems = []
const ids = new Set()
const slugs = new Set()

if (products.length !== 35) {
  problems.push(`Quantidade de produtos: ${products.length} (esperado 35).`)
}

for (const product of products) {
  if (ids.has(product.id)) problems.push(`ID duplicado: ${product.id}.`)
  if (slugs.has(product.slug)) problems.push(`Slug duplicado: ${product.slug}.`)
  ids.add(product.id)
  slugs.add(product.slug)

  for (const field of [
    'id',
    'slug',
    'name',
    'brand',
    'volume_ml',
    'concentration',
    'pix_price_cents',
    'debit_price_cents',
    'installment_total_cents',
    'stock',
  ]) {
    if (product[field] === undefined || product[field] === null) {
      problems.push(`${product.id}: campo ${field} ausente.`)
    }
  }

  const expectedPix = Math.round(product.installment_total_cents * 0.9)
  if (product.pix_price_cents !== expectedPix) {
    problems.push(
      `${product.id}: Pix ${product.pix_price_cents} diferente de ${expectedPix}.`,
    )
  }

  if (!Number.isInteger(product.stock) || product.stock < 0) {
    problems.push(`${product.id}: estoque inválido.`)
  }
}

console.log(`Exportação validada: ${exportPath}`)
console.log(`Produtos: ${products.length}`)
console.log(`Divergências: ${problems.length}`)
problems.forEach((problem) => console.log(`- ${problem}`))

if (problems.length > 0) {
  process.exitCode = 1
}
