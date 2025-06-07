import { NextApiRequest, NextApiResponse } from "next"
import fetch from "node-fetch"
import Papa from "papaparse"

// URL of your published Google Sheet (the Index)
const INDEX_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Fetch the content index
    const indexResponse = await fetch(INDEX_URL)
    const indexCsv = await indexResponse.text()
    const parsedIndex = Papa.parse(indexCsv, { header: true }).data as any[]

    // 2. Function to fetch and parse a Google Sheet CSV doc
    const fetchAndParseDoc = async (docUrl: string): Promise<any> => {
      try {
        const response = await fetch(docUrl)
        const csv = await response.text()
        const parsed = Papa.parse(csv, { header: true }).data
        return parsed
      } catch (err) {
        return { error: `Failed to fetch or parse: ${err}` }
      }
    }

    // 3. Build the full merged object
    const mergedContent: Record<string, any> = {}

    await Promise.all(
      parsedIndex.map(async (entry) => {
        const title = entry.title || entry.id || "untitled"
        const docUrl = entry.docUrl
        if (!docUrl) return

        const data = await fetchAndParseDoc(docUrl)
        mergedContent[title] = data
      })
    )

    // 4. Return everything as one unified object
    res.status(200).json({
      success: true,
      data: mergedContent
    })
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Unknown error"
    })
  }
}
