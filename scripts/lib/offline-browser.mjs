import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

// Uses an installed browser; never downloads a runtime or contacts an AI endpoint.
export async function withOfflinePage(test) {
  const require = createRequire(import.meta.url);
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  const browser = await chromium.launch({
    headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})
  });
  const root = path.resolve('.');
  const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
    '.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
  const server = http.createServer((req,res) => {
    let target;
    try { target = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
    catch { res.writeHead(400); res.end(); return; }
    if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    try {
      const bytes = fs.readFileSync(target);
      res.writeHead(200, {'Content-Type':mime[path.extname(target)] || 'application/octet-stream'});
      res.end(bytes);
    } catch { res.writeHead(404); res.end(); }
  });
  try {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const context = await browser.newContext({serviceWorkers:'block'});
    // All external telemetry, updates and API calls are blocked.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    const page = await context.newPage();
    await test(page, origin);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
