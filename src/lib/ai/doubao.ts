import axios from 'axios'

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || ''
const DOUBAO_MODEL_ID = process.env.DOUBAO_MODEL_ID || 'doubao-vision-pro-32k'

export async function solveImage(imageBase64: string): Promise<{
  analysis: string
  steps: string[]
  answer: string
  subject: string
  knowledgePoints: string[]
}> {
  const prompt = `你是一位经验丰富的教师。请分析这道题目，并按照以下JSON格式返回（只返回JSON，不要其他内容）：
{
  "analysis": "题目分析和解题思路",
  "steps": ["步骤1", "步骤2", "步骤3"],
  "answer": "最终答案",
  "subject": "科目",
  "knowledgePoints": ["知识点1", "知识点2"]
}`

  const res = await axios.post(
    'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
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
      temperature: 0.3,
    },
    {
      headers: {
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const content = res.data.choices?.[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI返回格式错误')

  return JSON.parse(jsonMatch[0])
}
