import { parse } from 'csv-parse/sync';

export default async function handler(req, res) {
  try {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1LXFjLzJzMfSpllA3iuvtQ3tqQMMniu88H0-QHb6w_bM/gviz/tq?tqx=out:csv';
    const response = await fetch(sheetUrl);
    const csv = await response.text();

    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    res.status(200).json({ status: 'ok', data: records });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.toString() });
  }
}
