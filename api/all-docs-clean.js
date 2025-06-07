// File: /api/all-docs-clean.js

import { parse } from 'csv-parse/sync';
import fetch from 'node-fetch';

const INDEX_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv';

export default async function handler(req, res) {
  try {
    const indexRes = await fetch(INDEX_CSV_URL);
    if (!indexRes.ok) {
      return res.status(500).json({ success: false, error: `Failed to fetch index: ${indexRes.status}` });
    }

    const indexText = await indexRes.text();
    const records = parse(indexText, {
      columns: true,
      skip_empty_lines: true
    });

    const results = {};

    for (const row of records) {
      const title = row.Title || 'Untitled';
      const url = row.DocURL;

      if (!url || !url.startsWith('https://')) {
        results[title] = { error: 'Missing or invalid docUrl' };
        continue;
      }

      try {
        const docRes = await fetch(url.replace(/\/pub$/, '/export?format=txt'));
        if (!docRes.ok) {
          results[title] = { error: `Failed to fetch doc: ${docRes.status}` };
          continue;
        }
        const text = await docRes.text();
        results[title] = text.trim();
      } catch (err) {
        results[title] = { error: err.message };
      }
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
