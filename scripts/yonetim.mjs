// Yönetici web panelini yerel bilgisayarda başlatır: npm run yonetim
// .env dosyasındaki Supabase bilgilerinden yonetim-web/config.js dosyasını üretir.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(fileURLToPath(import.meta.url), '..', '..');
const klasor = join(kok, 'yonetim-web');
const envYolu = join(kok, '.env');

if (!existsSync(envYolu)) {
  console.error('HATA: .env dosyası bulunamadı. Önce Supabase bilgilerini .env dosyasına yaz.');
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(envYolu, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#') && s.includes('='))
    .map((s) => [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)]),
);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anahtar = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anahtar) {
  console.error('HATA: .env içinde EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY olmalı.');
  process.exit(1);
}
writeFileSync(join(klasor, 'config.js'), `window.AYAR = ${JSON.stringify({ url, anahtar })};\n`);

const turler = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const port = Number(process.env.PORT) || 5174;

createServer((istek, yanit) => {
  const yol = normalize(decodeURIComponent(new URL(istek.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const dosya = join(klasor, yol === '/' || yol === '\\' ? 'index.html' : yol);
  if (!dosya.startsWith(klasor) || !existsSync(dosya)) {
    yanit.writeHead(404).end('Bulunamadı');
    return;
  }
  yanit.writeHead(200, { 'Content-Type': turler[extname(dosya)] ?? 'application/octet-stream' });
  yanit.end(readFileSync(dosya));
}).listen(port, '127.0.0.1', () => {
  console.log(`\nYönetici paneli hazır: http://localhost:${port}\nKapatmak için Ctrl + C\n`);
});
