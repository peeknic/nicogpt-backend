// /api/all-docs-with-content.js

import { parse } from 'csv-parse/sync';

const CONTENT_INDEX_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv';

// Utility: fetch and parse a Google Doc published as HTML, strip formatting to plain text
async function fetchGoogleDocContent(docUrl) {
  const res = await fetch(docUrl);
  const html = await res.text();
  // Extract only content within <body>, remove all HTML tags, decode basic entities
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;
  // Remove all tags, preserve basic line breaks and paragraphs
  body = body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/h[1-6]>/gi, '\n');
  body = body.replace(/<[^>]+>/g, '');
  // Decode HTML entities for < > & "
  body = body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Collapse multiple newlines, trim
  body = body.replace(/\n\s*\n+/g, '\n\n').trim();
  return body;
}

// Pure Node.js API route handler (Vercel Edge Function)
export default async function handler(req, res) {
  // 1. API key authentication
  const apiKey = req.headers['authorization'];
  if (!apiKey || apiKey !== `Bearer ${process.env.NICO_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Fetch and parse the content index CSV
    const csvRes = await fetch(CONTENT_INDEX_CSV_URL);
    const csvText = await csvRes.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    // 3. For each doc, fetch and clean its content
    const results = await Promise.all(
      records.map(async (row) => {
        let docContent = '';
        if (row.DocURL) {
          try {
            docContent = await fetchGoogleDocContent(row.DocURL);
          } catch (e) {
            docContent = '[Error loading document]';
          }
        }
        return {
          Title: row.Title || '',
          Category: row.Category || '',
          Summary: row.Content || '',
          DocURL: row.DocURL || '',
          DocContent: docContent,
        };
      })
    );

    // 4. Respond with clean, structured data
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
