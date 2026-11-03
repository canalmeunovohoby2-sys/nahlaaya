import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createVisitSessionId,
  getOrCreateVisitSession,
  hasVisitBeenRecorded,
  markVisitRecorded,
  VISIT_RECORDED_STORAGE_KEY,
  VISIT_SESSION_STORAGE_KEY,
} from '../src/lib/visit-session.ts'
import { enforceVisitRateLimit } from '../supabase/functions/_shared/rate-limit.ts'
import type { VisitSessionStorage } from '../src/lib/visit-session.ts'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createStorage(initial: Record<string, string> = {}): VisitSessionStorage {
  const values = new Map(Object.entries(initial))

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

test('cria um identificador de sessão em formato UUID v4', () => {
  assert.match(createVisitSessionId(), uuidPattern)
})

test('reutiliza a sessão depois de atualizar a página', () => {
  const storage = createStorage()
  const first = getOrCreateVisitSession(storage)
  const afterReload = getOrCreateVisitSession(storage)

  assert.ok(first)
  assert.equal(afterReload, first)
  assert.equal(hasVisitBeenRecorded(storage), false)
})

test('marca a visita apenas uma vez na mesma sessão', () => {
  const storage = createStorage()
  const session = getOrCreateVisitSession(storage)

  assert.ok(session)
  markVisitRecorded(storage)
  assert.equal(hasVisitBeenRecorded(storage), true)
  assert.equal(getOrCreateVisitSession(storage), session)
})

test('uma nova sessão recebe outro identificador e pode registrar outra visita', () => {
  const firstStorage = createStorage()
  const first = getOrCreateVisitSession(firstStorage)
  assert.ok(first)
  markVisitRecorded(firstStorage)

  const secondStorage = createStorage()
  const second = getOrCreateVisitSession(secondStorage)

  assert.ok(second)
  assert.notEqual(second, first)
  assert.equal(hasVisitBeenRecorded(secondStorage), false)
})

test('descarta identificador inválido e libera o marcador de registro', () => {
  const storage = createStorage({
    [VISIT_SESSION_STORAGE_KEY]: 'sessao-invalida',
    [VISIT_RECORDED_STORAGE_KEY]: '1',
  })
  const session = getOrCreateVisitSession(storage)

  assert.ok(session)
  assert.match(session, uuidPattern)
  assert.equal(hasVisitBeenRecorded(storage), false)
})

test('não registra sem um armazenamento de sessão disponível', () => {
  assert.equal(getOrCreateVisitSession(null), null)
  assert.equal(hasVisitBeenRecorded(null), false)
})

test('limita requisições repetidas para o mesmo endereço de rede', async () => {
  const request = new Request('http://localhost/register-visit', {
    headers: { 'x-forwarded-for': '203.0.113.10' },
  })

  await enforceVisitRateLimit(request, 2, 60_000)
  await enforceVisitRateLimit(request, 2, 60_000)
  await assert.rejects(
    () => enforceVisitRateLimit(request, 2, 60_000),
    /Muitas tentativas/,
  )
})
