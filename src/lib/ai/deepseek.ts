import axios from 'axios'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

export async function generateSimilarQuestions(subject: string, knowledgePoints: string[], answer: string): Promise<string> {
  const res = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: `请根据以下信息生成3道同类题目：
科目：${subject}
知识点：${knowledgePoints.join('、')}
原题答案：${answer}

请按以下格式返回（JSON格式）：
{
  "questions": [
    { "question": "题目内容", "answer": "答案", "hint": "解题提示" }
  ]
}`,
        },
      ],
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const content = res.data.choices?.[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('DeepSeek返回格式错误')

  return JSON.parse(jsonMatch[0])
}
