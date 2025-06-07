import { parse } from 'csv-parse/sync';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv';

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Failed to fetch CSV');
    const csvText = await response.text();
    const records = parse(csvText, { columns: true, skip_empty_lines: true });

    // Helper to normalize column headers
    const firstRow = records[0] || {};
    const getKey = (name) => Object.keys(firstRow).find(k => k.trim().toLowerCase() === name.toLowerCase());

    const data = [];
    for (const row of records) {
      const title = row[getKey('Title')]?.trim();
      const category = row[getKey('Category')]?.trim();
      const summary = row[getKey('Content')]?.trim();
      const docUrl = row[getKey('DocURL')]?.trim();

      let docContent = '';
      if (docUrl) {
        try {
          const docRes = await fetch(docUrl);
          const html = await docRes.text();
          const $ = cheerio.load(html);
          // Try to extract all text from Google's published doc
          // Most content is inside <div id="contents">, fallback to body
          docContent =
            $('#contents').text().trim() ||
            $('body').text().trim() ||
            '';
        } catch (err) {
          docContent = '[Failed to load document]';
        }
      }

      if (title) {
        data.push({
          Title: title,
          Category: category || '',
          Summary: summary || '',
          DocURL: docUrl || '',
          DocContent: docContent,
        });
      }
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
