import type { NextApiRequest, NextApiResponse } from 'next'
import Papa from 'papaparse'

// Your content index published as CSV
const INDEX_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const indexRes = await fetch(INDEX_URL)
    if (!indexRes.ok) throw new Error(`Failed to fetch index: ${indexRes.status}`)

    const indexCsv = await indexRes.text()
    const parsedIndex = Papa.parse(indexCsv, { header: true }).data as any[]

    const mergedContent: Record<string, any> = {}

    for (const entry of parsedIndex) {
      const title = entry.title?.trim() || entry.id?.trim() || 'Untitled'
      const docUrl = entry.docUrl?.trim()
      if (!docUrl) {
        mergedContent[title] = { error: 'Missing docUrl' }
        continue
      }

      try {
        const docRes = await fetch(docUrl)
        if (!docRes.ok) throw new Error(`Failed to fetch ${title}: ${docRes.status}`)
        const text = await docRes.text()
        mergedContent[title] = text
      } catch (err) {
        console.error(`[ERROR] ${title}:`, err)
        mergedContent[title] = { error: (err as Error).message }
      }
    }

    res.status(200).json({ success: true, data: mergedContent })

  } catch (err: any) {
    console.error('[FATAL] Failed in /api/all-docs-clean:', err)
    res.status(500).json({
      success: false,
      error: err.message || 'Unknown server error'
    })
  }
}
