import { NextResponse } from 'next/server'

export async function GET() {
  const modelId = process.env.DOUBAO_MODEL_ID || process.env.DOUBAO_ENDPOINT_ID || ''
  return NextResponse.json({
    ok: true,
    ai: {
      doubaoKey: Boolean(process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY),
      doubaoModelId: modelId ? (modelId.startsWith('ep-') ? modelId : `无效: ${modelId}`) : '未配置',
      baiduOcr: Boolean(process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    },
  })
}
