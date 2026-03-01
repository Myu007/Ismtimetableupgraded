// pages/api/proxy.js
// Proxies requests to the ISM timetable backend to avoid CORS issues

export default async function handler(req, res) {
  const { path, ...queryParams } = req.query;

  // Build the target URL
  const pathStr = Array.isArray(path) ? path.join('/') : path || '';
  const queryString = new URLSearchParams(queryParams).toString();
  const targetUrl = `https://timetable.ism.edu.kg/${pathStr}${queryString ? '?' + queryString : ''}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Referer': 'https://timetable.ism.edu.kg/',
        'Origin': 'https://timetable.ism.edu.kg',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };

    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      // Try to parse as JSON anyway
      try {
        const data = JSON.parse(text);
        res.status(response.status).json(data);
      } catch {
        res.status(response.status).send(text);
      }
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
}
