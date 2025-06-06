import { parse } from 'csv-parse/sync';

export default async function handler(req, res) {
  const sheetURL = req.query.docUrl;

  if (!sheetURL || !sheetURL.includes('docs.google.com/spreadsheets')) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid Google Sheet URL' });
  }

  try {
    const response = await fetch(sheetURL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet (HTTP ${response.status})`);
    }

    const csvText = await response.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true
    });

    res.status(200).json({ status: 'ok', rows: records });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
