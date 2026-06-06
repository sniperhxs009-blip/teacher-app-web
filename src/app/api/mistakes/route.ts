import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const subject = searchParams.get('subject') || ''
  const mastered = searchParams.get('mastered')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: '缺少userId' }, { status: 400 })

  let query = supabase.from('mistakes').select('*', { count: 'exact' }).eq('user_id', userId)

  if (subject) query = query.eq('subject', subject)
  if (mastered === 'true') query = query.eq('mastered', true)
  if (mastered === 'false') query = query.eq('mastered', false)
  if (search) {
    query = query.or(`keywords.ilike.%${search}%,recognized_text.ilike.%${search}%,subject.ilike.%${search}%`)
  }

  const from = (page - 1) * limit
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, limit })
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const form = await req.formData()

  const file = form.get('image') as File | null
  const userId = form.get('userId') as string
  const subject = form.get('subject') as string
  const knowledgePoints = (form.get('knowledgePoints') as string || '').split(',').filter(Boolean)
  const recognizedText = form.get('recognizedText') as string || ''
  const wrongReason = form.get('wrongReason') as string || ''
  const correctAnswer = form.get('correctAnswer') as string || ''
  const note = form.get('note') as string || ''
  const keywords = form.get('keywords') as string || ''
  const source = form.get('source') as string || 'manual'

  if (!userId) return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })

  let imageUrl = ''
  let storagePath = ''

  if (file) {
    storagePath = `${userId}/${Date.now()}-${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabase.storage.from('mistakes').upload(storagePath, buffer, {
      contentType: file.type || 'image/jpeg', upsert: false,
    })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    const { data: urlData } = supabase.storage.from('mistakes').getPublicUrl(storagePath)
    imageUrl = urlData.publicUrl
  }

  const { data: mistake, error } = await supabase.from('mistakes').insert({
    user_id: userId, image_url: imageUrl, storage_path: storagePath, subject: subject || '其他',
    knowledge_points: knowledgePoints, recognized_text: recognizedText, wrong_reason: wrongReason,
    correct_answer: correctAnswer, note, keywords, source,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: mistake })
}
