import { JSDOM } from 'jsdom';

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

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const table = document.querySelector('table');

    if (!table) {
      throw new Error('No table found in published sheet');
    }

    const rows = [...table.querySelectorAll('tr')];
    const headers = [...rows[0].querySelectorAll('td, th')].map(td => td.textContent.trim().toLowerCase());

    const data = rows.slice(1).map(row => {
      const cells = [...row.querySelectorAll('td, th')];
      const obj = {};
      headers.forEach((key, i) => {
        obj[key] = cells[i]?.textContent?.trim() || '';
      });
      return obj;
    });

    res.status(200).json({ status: 'ok', rows: data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
