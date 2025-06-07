import { NextResponse } from 'next/server'; // If you are using Vercel's new Next.js edge functions
import fetch from 'node-fetch';

// For Vercel Serverless Functions (not Next.js), you can use (req, res)
export default async function handler(req, res) {
  // API Key check
  const serverKey = process.env.NICO_GPT_API_KEY;
  const clientKey =
    req.headers['x-api-key'] ||
    req.headers['X-API-KEY'] ||
    req.headers['X-Api-Key'];
  if (!clientKey || clientKey !== serverKey) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Your content index CSV URL
  const csvUrl =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv';

  try {
    // Fetch the CSV index
    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) throw new Error('Failed to fetch CSV');
    const csvText = await csvRes.text();

    // Parse CSV (simple, but robust)
    const rows = csvText
      .split('\n')
      .map((line) => line.split(','))
      .filter((arr) => arr.length >= 4 && arr[1] && arr[3]);

    // Remove the header
    rows.shift();

    // Fetch each published Google Doc and clean the text
    const docs = await Promise.all(
      rows.map(async ([category, title, summary, docUrl]) => {
        try {
          const docRes = await fetch(docUrl);
          if (!docRes.ok) throw new Error('Failed to fetch doc');
          const docHtml = await docRes.text();

          // Remove formatting/junk HTML, just extract visible text
          const textOnly = docHtml
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          return {
            Title: title,
            Category: category,
            Summary: summary,
            DocURL: docUrl,
            DocContent: textOnly,
          };
        } catch (err) {
          return {
            Title: title,
            Category: category,
            Summary: summary,
            DocURL: docUrl,
            DocContent: '',
            error: `Failed to fetch or parse doc: ${err.message}`,
          };
        }
      })
    );

    // Return everything
    res.status(200).json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// To support Vercel's default export for API routes:
export const config = {
  api: {
    bodyParser: false,
  },
};
