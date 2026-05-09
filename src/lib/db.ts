import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaLibSql({ url })
  return new PrismaClient({ adapter })
}

let _db: PrismaClient | undefined

export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!_db) _db = createDb()
    return (_db as unknown as Record<string | symbol, unknown>)[prop]
  },
})
