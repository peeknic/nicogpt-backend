import Papa from 'papaparse'

const INDEX_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  try {
    const indexRes = await fetch(INDEX_URL)
    if (!indexRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch index: ${indexRes.status}` }),
        { status: 500 }
      )
    }

    const indexCsv = await indexRes.text()
    const parsedIndexRaw = Papa.parse(indexCsv, { header: true }).data as any[]

    const parsedIndex = parsedIndexRaw.filter((row) => {
      const title = row["Title"]?.trim()
      const docUrl = row["DocURL"]?.trim()
      return title && docUrl
    })

    const mergedContent: Record<string, any> = {}

    for (const entry of parsedIndex) {
      const title = entry["Title"].trim()
      const docUrl = entry["DocURL"].trim()

      try {
        const docRes = await fetch(docUrl)
        if (!docRes.ok) throw new Error(`Failed to fetch ${title}: ${docRes.status}`)
        const text = await docRes.text()
        mergedContent[title] = text
      } catch (err) {
        mergedContent[title] = { error: (err as Error).message }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: mergedContent }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Unknown server error' }),
      { status: 500 }
    )
  }
}
