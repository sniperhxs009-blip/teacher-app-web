import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')

  const from = (page - 1) * limit
  const { data, count } = await supabase.from('admin_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + limit - 1)

  return NextResponse.json({ data: data || [], count: count || 0 })
}
