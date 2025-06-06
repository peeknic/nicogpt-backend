export default async function handler(req, res) {
  try {
    const { docUrl } = req.query;

    if (!docUrl || !docUrl.includes('docs.google.com/document')) {
      return res.status(400).json({
        status: 'error',
        message: "Missing or invalid 'docUrl' parameter"
      });
    }

    // Extract Google Doc ID from the URL
    const match = docUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const docId = match?.[1];

    if (!docId) {
      return res.status(400).json({
        status: 'error',
        message: 'Could not extract document ID from URL'
      });
    }

    // Build export URL to fetch plain text content
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const text = await response.text();

    return res.status(200).json({
      status: 'ok',
      content: text
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}
