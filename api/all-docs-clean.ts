import Papa from 'papaparse'

const INDEX_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  try {
    const indexRes = await fetch(INDEX_URL)
    if (!indexRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Failed to fetch index: ${indexRes.status}` }), { status: 500 })
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
        const html = await docRes.text()

        // crude but effective text extraction from <body>
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        const rawBody = bodyMatch?.[1] || ''
        const cleanedText = rawBody
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<\/?(?!p|br|h1|h2|h3|h4|h5|h6|ul|li|b|strong|i|em)[a-z][^>]*?>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]*>/g, '') // strip any remaining tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        mergedContent[title] = cleanedText

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
