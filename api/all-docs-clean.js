import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

const INDEX_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGOzsnwFKlUzKvJpVeMFyfLTtLEODPQmGXUu4A0LT_KmEbtD5hRS_Rg6MkXmpM_/pub?output=csv';

export default async function handler(req, res) {
  try {
    const indexRes = await fetch(INDEX_URL);
    if (!indexRes.ok) {
      return res.status(500).json({ success: false, error: `Failed to fetch index: ${indexRes.status}` });
    }

    const csv = await indexRes.text();
    const index = parse(csv, {
      columns: true,
      skip_empty_lines: true
    });

    const results = {};

    for (const row of index) {
      const { Title, DocURL } = row;

      if (!DocURL) {
        results[Title || 'Untitled'] = { error: 'Missing docUrl' };
        continue;
      }

      try {
        const docRes = await fetch(DocURL.replace('/pub', '/export?format=txt'));
        if (!docRes.ok) {
          results[Title || 'Untitled'] = { error: `Failed to fetch doc: ${docRes.status}` };
          continue;
        }

        let text = await docRes.text();
        // Remove auto-injected header junk
        text = text.replace(/Mit Google Docs veröffentlicht.*?Automatisch alle 5 Minuten aktualisiert\n?/gi, '');
        results[Title || 'Untitled'] = text.trim();
      } catch (err) {
        results[Title || 'Untitled'] = { error: err.message };
      }
    }

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
