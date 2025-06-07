import { parse } from 'csv-parse/sync'
import fetch from 'node-fetch'

const INDEX_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMFyfLTtLEODPQmGXUu4A0LT_KmEbtD5hRS_Rg6MkXmpM_/pub?output=csv'

export default async function handler(req, res) {
  try {
    const indexRes = await fetch(INDEX_URL)
    if (!indexRes.ok) {
      return res.status(500).json({
        success: false,
        error: `Failed to fetch index: ${indexRes.status}`,
      })
    }

    const csv = await indexRes.text()
    const index = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    })

    const results = {}

    for (const row of index) {
      const title = row.Title || 'Untitled'
      const url = row.DocURL

      if (!url) {
        results[title] = { error: 'Missing docUrl' }
        continue
      }

      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()

        // Remove Google Docs boilerplate if present
        const cleaned = text
          .replace(/^Mit Google Docs veröffentlicht.*?Automatisch alle 5 Minuten aktualisiert/, '')
          .replace(/^.*?Missbrauch meldenWeitere Informationen.*?Aktualisiert/, '')
          .trim()

        results[title] = cleaned
      } catch (err) {
        results[title] = { error: err.message }
      }
    }

    res.status(200).json({ success: true, data: results })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}
