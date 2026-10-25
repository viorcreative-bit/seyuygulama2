// Kareleri headless Chromium ile çizer.
// Kullanım: node render.js <çıktı_klasörü> [saniye,saniye,...]
// İkinci argüman verilirse yalnızca o anların karelerini PNG olarak üretir (önizleme).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const FPS = 30;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, rel === '/' ? 'story.html' : rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const outDir = process.argv[2] || path.join(ROOT, 'out', 'frames');
  const only = process.argv[3];
  fs.mkdirSync(outDir, { recursive: true });
  const cfgFile = path.join(ROOT, 'config.json');
  const cfg = fs.existsSync(cfgFile) ? JSON.stringify(JSON.parse(fs.readFileSync(cfgFile, 'utf8'))) : '{}';

  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/story.html?cfg=${encodeURIComponent(cfg)}`;
  const browser = await chromium.launch();

  const probe = await browser.newPage();
  await probe.goto(url);
  const duration = await probe.evaluate(async () => { await window.ready; return window.DURATION; });
  await probe.close();

  let frames = [...Array(Math.round(duration * FPS)).keys()];
  if (only) frames = only.split(',').map(s => Math.round(parseFloat(s) * FPS));
  const workers = Math.min(4, frames.length);
  let next = 0, done = 0;
  const t0 = Date.now();

  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    page.on('pageerror', e => { console.error('pageerror:', e.message); process.exitCode = 1; });
    await page.goto(url);
    await page.evaluate(() => window.ready);
    const canvas = page.locator('#c');
    while (next < frames.length) {
      const f = frames[next++];
      await page.evaluate(t => window.renderFrame(t), f / FPS);
      const name = only ? `t_${(f / FPS).toFixed(2)}.png` : `f_${String(f).padStart(4, '0')}.jpg`;
      const buf = await canvas.screenshot(only ? { type: 'png' } : { type: 'jpeg', quality: 95 });
      fs.writeFileSync(path.join(outDir, name), buf);
      if (++done % 30 === 0) console.log(`${done}/${frames.length} kare (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
    }
    await page.close();
  }));

  await browser.close();
  srv.close();
  console.log(`bitti: ${done} kare → ${outDir}`);
})();
