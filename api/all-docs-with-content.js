import { parse } from 'csv-parse/sync';
import { load } from 'cheerio';

export default async function handler(req, res) {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO58XfLRFpTGk-gAGozsnwFKlUzKvJpVeMfyLtTLoYJcl6rN8feyuPmdZurZm7oR10LhNfz3m3VsJK/pub?output=csv';

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Failed to fetch CSV');
    const csvText = await response.text();
    const records = parse(csvText, { columns: true, skip_empty_lines: true });

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
          const $ = load(html);

          // Remove all non-visible or noise elements
          $('style, script, header, footer, nav, noscript').remove();

          // Only keep text from real document nodes
          let textParts = [];
          $('#contents, body').find('h1,h2,h3,h4,h5,h6,p,li').each((i, elem) => {
            let text = $(elem).text().replace(/\s+/g, ' ').trim();
            // Ignore truly empty or weird lines
            if (text && !/^{.*}$/.test(text) && text.length > 2) textParts.push(text);
          });

          // Final cleanup: Remove duplicate lines and excessive whitespace
          docContent = [...new Set(textParts)].join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
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
