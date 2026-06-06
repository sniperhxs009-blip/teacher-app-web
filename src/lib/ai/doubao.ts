import axios, { isAxiosError } from 'axios'

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || ''
const DOUBAO_MODEL_ID = process.env.DOUBAO_MODEL_ID || process.env.DOUBAO_ENDPOINT_ID || ''
const DOUBAO_BASE_URL = (process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '')

function validateConfig() {
  if (!DOUBAO_API_KEY) throw new Error('未配置豆包 API Key，请设置环境变量 DOUBAO_API_KEY')
  if (!DOUBAO_MODEL_ID) throw new Error('未配置豆包推理接入点，请设置环境变量 DOUBAO_MODEL_ID（ep- 开头）')
}

function parseDoubaoError(err: unknown): Error {
  if (isAxiosError(err)) {
    const status = err.response?.status
    const data = err.response?.data as { error?: { message?: string }; message?: string } | undefined
    const apiMsg = data?.error?.message || data?.message || err.message
    if (err.code === 'ECONNABORTED') return new Error('AI分析超时，请拍近一点或只拍部分题目后重试')
    if (status === 404) return new Error('豆包推理接入点不存在，请检查 DOUBAO_MODEL_ID')
    if (status === 401 || status === 403) return new Error(`豆包 API 认证失败，请检查 DOUBAO_API_KEY`)
    if (status === 429) return new Error('AI调用频率超限，请稍后重试')
    return new Error(`豆包 API 失败${status ? ` (${status})` : ''}: ${apiMsg}`)
  }
  if (err instanceof Error) return err
  return new Error('AI解题失败')
}

export interface SolveResult {
  analysis: string
  steps: string[]
  answer: string
  subject: string
  knowledgePoints: string[]
}

export async function solveImage(imageBase64: string): Promise<SolveResult[]> {
  validateConfig()

  const prompt = `快速识别图中题目并解答。每题极简：分析1句、步骤最多2条、答案、科目、知识点。最多8题。只返回JSON：
{"questions":[{"analysis":"...","steps":["..."],"answer":"...","subject":"数学","knowledgePoints":["..."]}]}`

  try {
    const res = await axios.post(
      `${DOUBAO_BASE_URL}/chat/completions`,
      {
        model: DOUBAO_MODEL_ID,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: 'text', text: prompt },
          ],
        }],
        temperature: 0,
        max_tokens: 1800,
      },
      {
        headers: { Authorization: `Bearer ${DOUBAO_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 55000,
      },
    )

    const content = res.data.choices?.[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI返回格式错误，请重试')

    const parsed = JSON.parse(jsonMatch[0])
    const list: SolveResult[] = parsed.questions && Array.isArray(parsed.questions)
      ? parsed.questions.slice(0, 8)
      : [parsed]
    return list
  } catch (err: unknown) {
    throw parseDoubaoError(err)
  }
}
