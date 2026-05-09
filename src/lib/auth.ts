import { createHmac, randomBytes } from 'crypto'

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

function secret() {
  if (!process.env.MAGIC_LINK_SECRET) throw new Error('MAGIC_LINK_SECRET not set')
  return process.env.MAGIC_LINK_SECRET
}

export function generateToken(): string {
  const ts = Date.now().toString()
  const nonce = randomBytes(8).toString('hex')
  const payload = `${ts}.${nonce}`
  const sig = createHmac('sha256', secret()).update(payload).digest('hex')
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

export function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split('.')
    if (parts.length !== 3) return false
    const [ts, nonce, sig] = parts
    const payload = `${ts}.${nonce}`
    const expected = createHmac('sha256', secret()).update(payload).digest('hex')
    if (sig !== expected) return false
    if (Date.now() - parseInt(ts) > TOKEN_TTL_MS) return false
    return true
  } catch {
    return false
  }
}
