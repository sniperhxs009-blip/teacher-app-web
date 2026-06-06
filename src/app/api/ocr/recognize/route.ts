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

    // 创建OCR记录
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

    // 下载图片转base64
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      return NextResponse.json({ error: '无法读取上传的图片' }, { status: 400 })
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    const imageBase64 = imageBuffer.toString('base64')

    const { recognizeTable, recognizeText } = await import('@/lib/ai/baidu-ocr')

    let grid: string[][]
    let excelBase64: string | undefined

    // 优先表格识别，失败降级到通用文字识别
    try {
      const result = await recognizeTable(imageBase64)
      grid = result.grid
      excelBase64 = result.excelBase64
    } catch {
      const textResult = await recognizeText(imageBase64)
      // 降级：每行一个词
      grid = textResult.words.map(w => [w])
    }

    // 上传Excel到Supabase Storage
    let excelUrl = ''
    if (excelBase64) {
      const excelBuffer = Buffer.from(excelBase64, 'base64')
      const excelPath = `${userId}/ocr-${ocrId}.xlsx`
      await supabase.storage.from('ocr').upload(excelPath, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })
      const { data: urlData } = supabase.storage.from('ocr').getPublicUrl(excelPath)
      excelUrl = urlData.publicUrl
    }

    // 更新记录：grid作为二维数组存储（和小程序一致）
    await supabase.from('ocr_results').update({
      recognized_data: grid,               // 纯二维数组
      excel_file: excelUrl || null,
      excel_storage_path: excelUrl ? `${userId}/ocr-${ocrId}.xlsx` : null,
      row_count: grid.length,
      col_count: grid[0]?.length || 0,
      status: 'pending_review',
      updated_at: new Date().toISOString(),
    }).eq('id', ocrId)

    return NextResponse.json({ data: { id: ocrId } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '处理失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
