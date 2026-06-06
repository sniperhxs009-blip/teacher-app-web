import axios from 'axios'
import * as XLSX from 'xlsx'

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

interface TableCell {
  row_start: number
  row_end: number
  col_start: number
  col_end: number
  words: string
}

/**
 * 百度表格文字识别V2 — 使用 rest/2.0/ocr/v1/table 端点
 * 和小程序版本完全一致，返回纯二维数组
 */
export async function recognizeTable(imageBase64: string): Promise<{
  grid: string[][]
  excelBase64?: string
}> {
  const token = await getAccessToken()

  const res = await axios.post(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/table?access_token=${token}`,
    `image=${encodeURIComponent(imageBase64)}`,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    },
  )

  const ocrData = res.data
  if (ocrData.error_code && ocrData.error_code !== 0) {
    throw new Error(`百度OCR表格识别错误 (${ocrData.error_code}): ${ocrData.error_msg}`)
  }

  const cells: TableCell[] = ocrData.tables_result?.[0]?.body || []

  if (cells.length === 0) {
    throw new Error('未识别到表格，请确保图片中有清晰的表格线')
  }

  // 0-based坐标, 和小程序一致
  let maxRow = 0
  let maxCol = 0
  cells.forEach(c => {
    maxRow = Math.max(maxRow, c.row_end)
    maxCol = Math.max(maxCol, c.col_end)
  })

  // 构建二维数组，空单元格填空字符串
  const grid: string[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(''))
  cells.forEach(c => {
    const r = c.row_start
    const col = c.col_start
    if (r <= maxRow && col <= maxCol) {
      grid[r][col] = c.words || ''
    }
  })

  // 用 xlsx 生成真正的 Excel 文件
  let excelBase64: string | undefined
  try {
    const ws = XLSX.utils.aoa_to_sheet(grid)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    excelBase64 = excelBuffer.toString('base64')
  } catch {
    // Excel生成失败不阻塞OCR结果
  }

  return { grid, excelBase64 }
}

/**
 * 百度通用文字识别 — 作为表格识别失败时的降级方案
 */
export async function recognizeText(imageBase64: string): Promise<{ words: string[] }> {
  const token = await getAccessToken()
  const res = await axios.post(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`,
    `image=${encodeURIComponent(imageBase64)}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 },
  )
  const result = res.data
  if (result.error_code) {
    throw new Error(`百度OCR通用识别错误 (${result.error_code}): ${result.error_msg}`)
  }
  return { words: (result.words_result || []).map((w: { words: string }) => w.words) }
}
