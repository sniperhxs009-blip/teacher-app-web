import axios from 'axios'

const BAIDU_API_KEY = process.env.BAIDU_API_KEY || ''
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY || ''

let accessToken = ''
let tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken

  const res = await axios.post('https://aip.baidubce.com/oauth/2.0/token', null, {
    params: { grant_type: 'client_credentials', client_id: BAIDU_API_KEY, client_secret: BAIDU_SECRET_KEY },
  })
  accessToken = res.data.access_token
  tokenExpiry = Date.now() + (res.data.expires_in - 300) * 1000
  return accessToken
}

export async function recognizeTable(imageBase64: string): Promise<{ tables: Record<string, unknown>[] | null; excelBase64?: string }> {
  const token = await getAccessToken()
  const res = await axios.post(
    `https://aip.baidubce.com/rest/2.0/solution/v1/form_ocr/request?access_token=${token}`,
    new URLSearchParams({ image: imageBase64, is_sync: 'true' }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )
  const result = res.data
  if (result.error_code) {
    throw new Error(`百度OCR错误: ${result.error_msg}`)
  }
  return {
    tables: result.forms_result?.tables || [],
    excelBase64: result.forms_result?.ret ? result.forms_result.excel_file : undefined,
  }
}

export async function recognizeText(imageBase64: string): Promise<{ words: string[] }> {
  const token = await getAccessToken()
  const res = await axios.post(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`,
    new URLSearchParams({ image: imageBase64 }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )
  const result = res.data
  if (result.error_code) {
    throw new Error(`百度OCR错误: ${result.error_msg}`)
  }
  return { words: (result.words_result || []).map((w: { words: string }) => w.words) }
}
