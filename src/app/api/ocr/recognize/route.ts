import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  try {
    const body = await req.json()
    const { imageUrl, storagePath } = body

    if (!imageUrl) {
      return NextResponse.json({ error: '缺少图片参数' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const userId = auth.user.id

    let ocrId = body.ocrId
    if (!ocrId) {
      const { data: newOcr, error: createErr } = await supabase.from('ocr_results').insert({
        user_id: userId,
        original_image: imageUrl,
        storage_path: storagePath || '',
      }).select('id').single()
      if (createErr || !newOcr) throw new Error('创建OCR记录失败')
      ocrId = newOcr.id
    }

    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      return NextResponse.json({ error: '无法读取上传的图片' }, { status: 400 })
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    const imageBase64 = imageBuffer.toString('base64')

    const { recognizeTable, recognizeText } = await import('@/lib/ai/baidu-ocr')

    let recognizedData: { tables: Array<{ cells: Array<Array<{ text: string }>> }>; text?: string[] }
    let excelBase64: string | undefined

    try {
      const tableResult = await recognizeTable(imageBase64)
      recognizedData = { tables: [{ cells: tableResult.cells }] }
      excelBase64 = tableResult.excelBase64

      if (excelBase64) {
        const excelBuffer = Buffer.from(excelBase64, 'base64')
        const excelPath = `${userId}/ocr-${ocrId}.xlsx`
        await supabase.storage.from('ocr').upload(excelPath, excelBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        })
        const { data: excelUrlData } = supabase.storage.from('ocr').getPublicUrl(excelPath)

        await supabase.from('ocr_results').update({
          recognized_data: recognizedData as Record<string, unknown>,
          excel_file: excelUrlData.publicUrl,
          excel_storage_path: excelPath,
          status: 'pending_review',
          updated_at: new Date().toISOString(),
        }).eq('id', ocrId)

        return NextResponse.json({ data: { id: ocrId } })
      }
    } catch (tableErr: unknown) {
      console.error('Table OCR error, falling back to text:', tableErr)
      const textResult = await recognizeText(imageBase64)
      recognizedData = { tables: [], text: textResult.words }
    }

    await supabase.from('ocr_results').update({
      recognized_data: recognizedData as Record<string, unknown>,
      status: 'pending_review',
      updated_at: new Date().toISOString(),
    }).eq('id', ocrId)

    return NextResponse.json({ data: { id: ocrId } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '处理失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
