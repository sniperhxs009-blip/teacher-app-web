import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const subject = searchParams.get('subject') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  let query = supabase.from('sheets').select('*', { count: 'exact' }).eq('user_id', auth.user.id)

  if (subject) query = query.eq('subject', subject)
  if (search) {
    query = query.or(`title.ilike.%${search}%,keywords.ilike.%${search}%,subject.ilike.%${search}%`)
  }

  const from = (page - 1) * limit
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, limit })
}

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const contentType = req.headers.get('content-type') || ''

  // JSON body: create sheet from OCR table data (headers + rows)
  if (contentType.includes('application/json')) {
    const body = await req.json()
    const { title, headers, rows } = body
    if (!title || !headers || !rows) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const csvContent = [headers.join(','), ...rows.map((row: string[]) => row.join(','))].join('\n')
    const fileName = `${Date.now()}-ocr-table.csv`
    const storagePath = `${auth.user.id}/${fileName}`
    const buffer = Buffer.from('﻿' + csvContent, 'utf-8')

    const { error: uploadError } = await supabase.storage.from('sheets').upload(storagePath, buffer, {
      contentType: 'text/csv',
      upsert: false,
    })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from('sheets').getPublicUrl(storagePath)

    const { data: sheet, error: dbError } = await supabase.from('sheets').insert({
      user_id: auth.user.id,
      title,
      file_url: urlData.publicUrl,
      storage_path: storagePath,
      file_type: 'csv',
      file_size: buffer.length,
      subject: '',
      grade: '',
      exam_type: '',
      keywords: '',
    }).select().single()

    if (dbError) {
      await supabase.storage.from('sheets').remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }
    return NextResponse.json({ data: sheet })
  }

  // FormData: file upload
  const form = await req.formData()
  const file = form.get('file') as File | null
  const title = form.get('title') as string
  const subject = form.get('subject') as string
  const grade = form.get('grade') as string
  const examType = form.get('examType') as string
  const examDate = form.get('examDate') as string
  const keywords = form.get('keywords') as string

  if (!file || !title) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'xlsx'
  const storagePath = `${auth.user.id}/${Date.now()}-${file.name}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from('sheets').upload(storagePath, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('sheets').getPublicUrl(storagePath)

  const { data: sheet, error: dbError } = await supabase.from('sheets').insert({
    user_id: auth.user.id,
    title,
    file_url: urlData.publicUrl,
    storage_path: storagePath,
    file_type: ext,
    file_size: file.size,
    subject: subject || '',
    grade: grade || '',
    exam_type: examType || '',
    exam_date: examDate || null,
    keywords: keywords || '',
  }).select().single()

  if (dbError) {
    await supabase.storage.from('sheets').remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ data: sheet })
}
