import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
const root = path.resolve('dist');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.ogg':'audio/ogg', '.ttf':'font/ttf', '.woff2':'font/woff2' };
http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // Reproduce Netlify's observed HTML normalization, including precache redirects.
    if (pathname === '/games/battlecity/BattleCity.html') {
      res.writeHead(301, { Location: '/games/battlecity/battlecity' }); res.end(); return;
    }
    if (pathname === '/games/battlecity/battlecity') pathname = '/games/battlecity/BattleCity.html';
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) { file = path.join(file, 'index.html'); info = await stat(file).catch(() => null); }
    if (!info) file = path.join(root, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(500); res.end(); }
}).listen(4173, '127.0.0.1');
