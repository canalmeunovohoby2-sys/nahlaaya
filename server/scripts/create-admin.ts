import 'dotenv/config'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { db } from '../db'
import { hashPassword } from '../auth/password'

const upsertAdmin = db.prepare(`
  INSERT INTO admin_users (name, email, password_hash)
  VALUES (?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    password_hash = excluded.password_hash
`)

async function main(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout })

  try {
    const name =
      process.env.ADMIN_NAME?.trim() ||
      (await rl.question('Nome do administrador: ')).trim()
    const email =
      process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
      (await rl.question('E-mail do administrador: ')).trim().toLowerCase()
    const password =
      process.env.ADMIN_PASSWORD ||
      (await rl.question('Senha (mínimo 10 caracteres): ')).trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('E-mail inválido.')
    }

    if (password.length < 10) {
      throw new Error('A senha deve ter pelo menos 10 caracteres.')
    }

    upsertAdmin.run(name || 'Administrador', email, hashPassword(password))
    console.log(`Administrador cadastrado/atualizado: ${email}`)
  } finally {
    rl.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
