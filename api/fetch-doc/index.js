export default async function handler(req, res) {
  try {
    const { docUrl } = req.query;

    if (!docUrl || !docUrl.includes('docs.google.com/document')) {
      return res.status(400).json({ status: "error", message: "Missing or invalid 'docUrl' parameter" });
    }

    const exportUrl = docUrl.replace(/\/edit.*$/, '') + '/export?format=txt';

    const response = await fetch(exportUrl);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

    const text = await response.text();

    res.status(200).json({ status: "ok", content: text });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}
