export default async function handler(req, res) {
  try {
    const { docUrl } = req.query;

    if (!docUrl || !docUrl.includes("docs.google.com/document")) {
      return res.status(400).json({ error: "Invalid or missing Google Docs URL" });
    }

    // Convert editable doc URL to exportable plain text URL
    const docId = docUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (!docId) {
      return res.status(400).json({ error: "Could not extract document ID from URL" });
    }

    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch Google Doc content");
    }

    const text = await response.text();

    return res.status(200).json({ status: "ok", content: text });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
