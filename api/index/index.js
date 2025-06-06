import https from 'https';

export default async function handler(req, res) {
  const url = "https://docs.google.com/spreadsheets/d/1LXFjLzJzMfSpllA3iuvtQ3tqQMMniu88H0-QHb6w_bM/gviz/tq?tqx=out:csv";

  try {
    const data = await new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let raw = '';
        response.on('data', (chunk) => (raw += chunk));
        response.on('end', () => resolve(raw));
      }).on('error', reject);
    });

    const rows = data
      .split('\n')
      .map(row => row.split(','))
      .filter(row => row.length >= 4)
      .map(([Category, Title, Content, DocURL], i) =>
        i === 0 ? null : { Category, Title, Content, DocURL }
      )
      .filter(Boolean);

    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content index', details: err.message });
  }
}
