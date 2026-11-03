import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { db } from './db'
import { seedProducts } from './db/seed'
import { authRouter, ensureAdminFromEnvironment } from './auth/routes'
import { requireAdmin, requireCsrf } from './auth/middleware'
import { adminRouter } from './routes/admin'
import { publicOrdersRouter } from './routes/public-orders'
import { HttpError } from './services/store'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const seededProducts = seedProducts()

ensureAdminFromEnvironment()

app.disable('x-powered-by')
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})
app.use(express.json({ limit: '100kb' }))
app.set('trust proxy', 1)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, products: seededProducts })
})

app.use('/api/orders', publicOrdersRouter)
app.use('/api/admin', authRouter)
app.use('/api/admin', requireAdmin, requireCsrf, adminRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Rota de API não encontrada.' })
})

const distPath = path.resolve('dist')

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'), (error) => {
        if (error) {
          next(error)
        }
      })
      return
    }

    next()
  })
}

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message })
    return
  }

  console.error(error)
  res.status(500).json({ message: 'Erro interno do servidor.' })
})

const server = app.listen(port, () => {
  console.log(`API Nahla Aya disponível em http://localhost:${port}`)
  console.log(`Produtos sincronizados no SQLite: ${seededProducts}`)
})

function shutdown(): void {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
