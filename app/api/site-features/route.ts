import { NextRequest, NextResponse } from 'next/server'
import { readSiteFeatures, writeSiteFeatures } from '@/lib/site-features-server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function verifyStaff(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!res.ok) return false
    const user = await res.json()
    return user.is_staff === true
  } catch {
    return false
  }
}

export async function GET() {
  const config = await readSiteFeatures()
  return NextResponse.json(config)
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace(/^Token\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const isStaff = await verifyStaff(token)
  if (!isStaff) {
    return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    if (!body.sections || !body.searchCategories) {
      return NextResponse.json({ error: 'Invalid config shape' }, { status: 400 })
    }
    await writeSiteFeatures(body)
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
}
