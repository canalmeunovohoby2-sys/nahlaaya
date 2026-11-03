import 'dotenv/config'
import { seedProducts } from '../db/seed'
import { ensureAdminFromEnvironment } from '../auth/routes'

const count = seedProducts()
ensureAdminFromEnvironment()
console.log(`Banco preparado com ${count} produtos.`)
