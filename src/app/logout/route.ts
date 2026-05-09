import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const jar = await cookies()
  jar.delete('www_auth')
  return NextResponse.redirect(process.env.APP_URL + '/login')
}
