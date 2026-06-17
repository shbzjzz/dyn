// proxy.js — Brazilian HTTP forward proxy for YouTube Innertube
// Run: node proxy.js   (Node 18+)
// Set env vars: PROXY_TOKEN (required), PORT (default 8787)

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 8787;
const PROXY_TOKEN = process.env.PROXY_TOKEN || 'change-me-please';

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Auth check
  const auth = req.headers['x-proxy-auth'];
  if (auth !== PROXY_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('Unauthorized');
    return;
  }

  // Target URL comes from ?target= query
  const target = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('target');
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing ?target=');
    return;
  }

  // Read body
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);

  // Forward headers (strip hop-by-hop + auth)
  const fwdHeaders = { ...req.headers };
  delete fwdHeaders['host'];
  delete fwdHeaders['x-proxy-auth'];
  delete fwdHeaders['connection'];
  delete fwdHeaders['content-length'];
  fwdHeaders['host'] = new URL(target).host;

  try {
    const resp = await fetch(target, {
      method: req.method,
      headers: fwdHeaders,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });
    const buf = Buffer.from(await resp.arrayBuffer());
    const outHeaders = { ...Object.fromEntries(resp.headers.entries()) };
    delete outHeaders['content-encoding']; // already decoded by fetch
    delete outHeaders['content-length'];
    res.writeHead(resp.status, outHeaders);
    res.end(buf);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Brazilian YouTube proxy listening on :${PORT}`);
});
