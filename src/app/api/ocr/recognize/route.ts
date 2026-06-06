import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl, storagePath, userId } = body

    if (!imageUrl) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Create OCR result record if needed
    let ocrId = body.ocrId
    if (!ocrId) {
      if (!userId) return NextResponse.json({ error: '缺少userId' }, { status: 400 })
      const { data: newOcr, error: createErr } = await supabase.from('ocr_results').insert({
        user_id: userId,
        original_image: imageUrl,
        storage_path: storagePath || '',
      }).select('id').single()
      if (createErr || !newOcr) throw new Error('创建OCR记录失败')
      ocrId = newOcr.id
    }

    // Download image & convert to base64
    const imageRes = await fetch(imageUrl)
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    const imageBase64 = imageBuffer.toString('base64')

    // Call Baidu OCR
    const { recognizeTable } = await import('@/lib/ai/baidu-ocr')
    let recognizedData: { tables?: unknown; text?: string[] }

    try {
      const result = await recognizeTable(imageBase64)
      recognizedData = { tables: result.tables }

      if (result.excelBase64 && userId) {
        const excelBuffer = Buffer.from(result.excelBase64, 'base64')
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
    } catch (ocrErr: unknown) {
      const msg = ocrErr instanceof Error ? ocrErr.message : 'OCR识别失败'
      console.error('OCR error:', msg)
      const { recognizeText } = await import('@/lib/ai/baidu-ocr')
      const textResult = await recognizeText(imageBase64)
      recognizedData = { text: textResult.words }
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
