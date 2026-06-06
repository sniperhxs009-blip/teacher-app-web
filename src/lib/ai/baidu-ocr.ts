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

interface TableCell {
  row: [number, number]
  col: [number, number]
  word: string
}

interface TableResult {
  cells: Array<Array<{ text: string }>>
  excelBase64?: string
}

export async function recognizeTable(imageBase64: string): Promise<TableResult> {
  const token = await getAccessToken()

  const res = await axios.post(
    `https://aip.baidubce.com/rest/2.0/solution/v1/table_ocr/request?access_token=${token}`,
    new URLSearchParams({ image: imageBase64, is_sync: 'true' }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 },
  )

  const result = res.data

  if (result.error_code && result.error_code !== 0) {
    throw new Error(`百度OCR表格识别错误 (${result.error_code}): ${result.error_msg}`)
  }

  const tablesData = result.tables_result || []

  if (tablesData.length === 0) {
    throw new Error('未识别到表格，请确保图片中有清晰表格')
  }

  // Convert cells to grid: find max row/col, build 2D array
  const table = tablesData[0]
  const rawCells: TableCell[] = table.cells || table.body || []

  if (rawCells.length === 0) {
    throw new Error('未识别到表格内容')
  }

  // Find grid dimensions
  let maxRow = 0
  let maxCol = 0
  for (const cell of rawCells) {
    const endRow = Array.isArray(cell.row) ? cell.row[1] : cell.row
    const endCol = Array.isArray(cell.col) ? cell.col[1] : cell.col
    if (endRow > maxRow) maxRow = endRow
    if (endCol > maxCol) maxCol = endCol
  }

  // Build grid (1-indexed from Baidu OCR, convert to 0-indexed)
  const grid: string[][] = Array.from({ length: maxRow }, () => Array.from({ length: maxCol }, () => ''))

  for (const cell of rawCells) {
    const rowStart = (Array.isArray(cell.row) ? cell.row[0] : cell.row) - 1
    const colStart = (Array.isArray(cell.col) ? cell.col[0] : cell.col) - 1

    if (rowStart >= 0 && colStart >= 0 && rowStart < grid.length && colStart < grid[0].length) {
      grid[rowStart][colStart] = cell.word || ''
    }
  }

  const cells = grid.map(row => row.map(text => ({ text })))

  return {
    cells,
    excelBase64: result.excel_file || tablesData[0]?.excel_file || undefined,
  }
}

export async function recognizeText(imageBase64: string): Promise<{ words: string[] }> {
  const token = await getAccessToken()
  const res = await axios.post(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`,
    new URLSearchParams({ image: imageBase64 }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 },
  )
  const result = res.data
  if (result.error_code) {
    throw new Error(`百度OCR错误 (${result.error_code}): ${result.error_msg}`)
  }
  return { words: (result.words_result || []).map((w: { words: string }) => w.words) }
}
