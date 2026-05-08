import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const existing = await db.userProfile.count()
  if (!existing) {
    await db.userProfile.create({ data: {} })
    console.log('✓ Created user profile')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
