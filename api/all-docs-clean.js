import { parse } from 'csv-parse/sync'
import fetch from 'node-fetch'

// ✅ Your live public CSV index URL
const INDEX_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv'

export default async function handler(req, res) {
  try {
    const indexRes = await fetch(INDEX_URL)
    if (!indexRes.ok) {
      return res.status(500).json({ success: false, error: `Failed to fetch index: ${indexRes.status}` })
    }

    const indexCsv = await indexRes.text()
    const parsedIndex = parse(indexCsv, {
      columns: true,
      skip_empty_lines: true
    })

    const results = {}

    for (const row of parsedIndex) {
      const title = row.Title?.trim()
      const docUrl = row.DocURL?.trim()

      if (!docUrl || !title) {
        results[title || 'Untitled'] = { error: 'Missing docUrl or title' }
        continue
      }

      try {
        const textUrl = docUrl.replace(/\/pub.*$/, '/export?format=txt')
        const docRes = await fetch(textUrl)

        if (!docRes.ok) {
          results[title] = { error: `Fetch failed: ${docRes.status}` }
          continue
        }

        let text = await docRes.text()
        // Remove Google Docs footer artifacts
        text = text
          .replace(/Mit Google Docs veröffentlicht.*$/, '')
          .replace(/Missbrauch melden.*$/, '')
          .replace(/Weitere Informationen.*$/, '')
          .replace(/Automatisch alle .*$/, '')
          .trim()

        results[title] = text
      } catch (err) {
        results[title] = { error: err.message }
      }
    }

    return res.status(200).json({ success: true, data: results })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
