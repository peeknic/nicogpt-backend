import { NextApiRequest, NextApiResponse } from "next"
import fetch from "node-fetch"
import Papa from "papaparse"

// URL to your published index CSV (already public & accessible)
const INDEX_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // STEP 1 — Fetch the index file
    const indexRes = await fetch(INDEX_URL)
    if (!indexRes.ok) throw new Error(`Failed to fetch index: ${indexRes.status}`)

    const indexCsv = await indexRes.text()
    const parsedIndex = Papa.parse(indexCsv, { header: true }).data as any[]

    // STEP 2 — Function to fetch each document safely
    const fetchAndParseDoc = async (title: string, docUrl: string) => {
      try {
        const res = await fetch(docUrl)
        if (!res.ok) throw new Error(`Status ${res.status} on ${title}`)
        const csv = await res.text()
        const parsed = Papa.parse(csv, { header: true }).data
        return parsed
      } catch (err) {
        console.error(`[ERROR] ${title}: ${err}`)
        return { error: `${(err as Error).message}` }
      }
    }

    // STEP 3 — Build the merged object with throttled fetching
    const mergedContent: Record<string, any> = {}

    for (const entry of parsedIndex) {
      const title = entry.title?.trim() || entry.id?.trim() || "Untitled"
      const docUrl = entry.docUrl?.trim()
      if (!docUrl) {
        mergedContent[title] = { error: "Missing docUrl" }
        continue
      }

      console.log(`[FETCHING] ${title}`)
      const data = await fetchAndParseDoc(title, docUrl)
      mergedContent[title] = data
    }

    // STEP 4 — Return full object
    res.status(200).json({ success: true, data: mergedContent })

  } catch (err: any) {
    console.error("[FATAL] Failed in /api/all-docs:", err)
    res.status(500).json({
      success: false,
      error: err.message || "Unknown server error"
    })
  }
}
