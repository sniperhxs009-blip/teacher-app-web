import axios, { isAxiosError } from 'axios'

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || ''
const DOUBAO_MODEL_ID = process.env.DOUBAO_MODEL_ID || process.env.DOUBAO_ENDPOINT_ID || ''
const DOUBAO_BASE_URL = (process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '')

function validateConfig() {
  if (!DOUBAO_API_KEY) {
    throw new Error('未配置豆包 API Key，请设置环境变量 DOUBAO_API_KEY')
  }
  if (!DOUBAO_MODEL_ID) {
    throw new Error(
      '未配置豆包推理接入点，请设置环境变量 DOUBAO_MODEL_ID。\n' +
      '在火山方舟控制台 → 在线推理 → 推理接入点管理 创建视觉模型接入点，复制 Endpoint ID（ep- 开头）填入。',
    )
  }
}

function parseDoubaoError(err: unknown): Error {
  if (isAxiosError(err)) {
    const status = err.response?.status
    const data = err.response?.data as { error?: { message?: string; code?: string }; message?: string } | undefined
    const apiMsg = data?.error?.message || data?.message || err.message

    if (status === 404) {
      return new Error(
        '豆包 API 返回 404：推理接入点不存在或已停用。\n' +
        '请确认 DOUBAO_MODEL_ID 填写的是火山方舟「推理接入点」的 Endpoint ID（ep- 开头），不是模型名称。\n' +
        '控制台：console.volcengine.com/ark → 在线推理 → 推理接入点管理',
      )
    }
    if (status === 401 || status === 403) {
      return new Error(`豆包 API 认证失败，请检查 DOUBAO_API_KEY 是否正确。${apiMsg ? `(${apiMsg})` : ''}`)
    }
    if (status === 429) {
      return new Error('豆包 API 调用频率超限，请稍后重试')
    }
    return new Error(`豆包 API 调用失败${status ? ` (${status})` : ''}: ${apiMsg}`)
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

  const prompt = `识别图中所有题目并快速解答。每题只给1-2句简短分析、关键步骤、答案、科目、知识点。返回JSON（只要JSON）：
{"questions":[{"analysis":"简析","steps":["关键步骤"],"answer":"答案","subject":"数学","knowledgePoints":["知识点"]}]}`

  try {
    const res = await axios.post(
      `${DOUBAO_BASE_URL}/chat/completions`,
      {
        model: DOUBAO_MODEL_ID,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${DOUBAO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 90000,
      },
    )

    const content = res.data.choices?.[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI返回格式错误，请重试')

    const parsed = JSON.parse(jsonMatch[0])
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions
    }
    return [parsed]
  } catch (err: unknown) {
    throw parseDoubaoError(err)
  }
}
