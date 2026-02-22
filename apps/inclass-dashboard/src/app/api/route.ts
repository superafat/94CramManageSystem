import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    message: '🐝 BeeClass API v1.0',
    status: 'running',
    timestamp: new Date().toISOString()
  })
}
