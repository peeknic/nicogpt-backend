import { parse } from 'csv-parse/sync';

export default async function handler(req, res) {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv';

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Failed to fetch CSV');

    const csvText = await response.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true
    });

    // Dynamically find the Title and Content columns (case and whitespace insensitive)
    const firstRow = records[0] || {};
    const keys = Object.keys(firstRow).map(k => k.trim().toLowerCase());
    const titleKey = Object.keys(firstRow).find(
      k => k.trim().toLowerCase() === 'title'
    );
    const contentKey = Object.keys(firstRow).find(
      k => k.trim().toLowerCase() === 'content'
    );

    const data = {};
    for (const row of records) {
      const title = row[titleKey]?.trim();
      if (title) {
        data[title] = {
          content: row[contentKey]?.trim() ?? ''
        };
      }
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
