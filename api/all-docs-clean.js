import { parse } from 'csv-parse/sync'

// Live Google Sheets CSV export URL
const INDEX_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv'

export default async function handler(req: Request): Promise<Response> {
  try {
    const indexRes = await fetch(INDEX_URL)
    if (!indexRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch index: ${indexRes.status}`,
        }),
        { status: 500 }
      )
    }

    const csvText = await indexRes.text()
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    })

    const results: Record<string, any> = {}

    for (const row of records) {
      const { Title, DocURL } = row

      if (!Title || !DocURL) continue

      try {
        const docRes = await fetch(DocURL)
        if (!docRes.ok) {
          results[Title] = { error: `Failed to fetch doc: ${docRes.status}` }
          continue
        }

        const text = await docRes.text()

        // Remove common Google Docs header/footer system noise
        const cleanText = text.replace(
          /^(Mit Google Docs veröffentlicht|Missbrauch melden|Weitere Informationen)[^\n]*\n?/gm,
          ''
        )

        results[Title] = cleanText.trim()
      } catch (err) {
        results[Title] = {
          error: `Fetch error: ${(err as Error).message}`,
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: (err as Error).message || 'Unexpected error',
      }),
      { status: 500 }
    )
  }
}
