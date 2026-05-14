import { randomBytes } from 'crypto'
import { db } from './db'

const KEY = 'session_token'

export async function getSessionToken(): Promise<string> {
  const row = await db.appSettings.findUnique({ where: { key: KEY } })
  if (row) return row.value
  // First run — create one
  const token = randomBytes(32).toString('hex')
  await db.appSettings.create({ data: { key: KEY, value: token } })
  return token
}

export async function rotateSessionToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await db.appSettings.upsert({
    where: { key: KEY },
    update: { value: token },
    create: { key: KEY, value: token },
  })
  return token
}
