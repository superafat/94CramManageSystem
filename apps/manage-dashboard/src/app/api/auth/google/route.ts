import { NextRequest, NextResponse } from 'next/server'

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '1015149159553'
const MANAGE_BACKEND_URL =
  process.env.MANAGE_BACKEND_URL ||
  `https://cram94-manage-backend-${GCP_PROJECT_NUMBER}.asia-east1.run.app`

export async function POST(request: NextRequest) {
  try {
    const body = await request.arrayBuffer()
    const res = await fetch(`${MANAGE_BACKEND_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const data = await res.arrayBuffer()
    const response = new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    })

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append('Set-Cookie', value)
      }
    })

    return response
  } catch {
    return NextResponse.json({ error: '無法連接後端服務' }, { status: 502 })
  }
}