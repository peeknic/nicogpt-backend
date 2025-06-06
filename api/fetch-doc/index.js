import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pubhtml';

  try {
    const response = await fetch(sheetURL);
    if (!response.ok) {
      throw new Error('Failed to fetch sheet');
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const rows = [...document.querySelectorAll('table tr')];

    const headers = [...rows[0].querySelectorAll('td')].map(td => td.textContent.trim().toLowerCase());
    const data = rows.slice(1).map(row => {
      const cells = [...row.querySelectorAll('td')];
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
