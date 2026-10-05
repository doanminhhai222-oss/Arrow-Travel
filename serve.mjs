// Server tĩnh tối giản, không cần cài thư viện. Chạy: npm start
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const port = process.env.PORT || 3000;

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/') { res.writeHead(302, { Location: '/web/' }).end(); return; }
  const rel = normalize(path.endsWith('/') ? path + 'index.html' : path);
  if (rel.includes('..')) { res.writeHead(400).end(); return; }
  try {
    const body = await readFile(join(root, rel));
    res.writeHead(200, { 'Content-Type': types[extname(rel)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, () => console.log(`Arrow Travel: http://localhost:${port}`));
