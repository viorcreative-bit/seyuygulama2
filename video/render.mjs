// Kullanım:
//   node render.mjs --format 16x9            -> out/guclu-group-tanitim-16x9.mp4
//   node render.mjs --format 9x16            -> out/guclu-group-tanitim-9x16.mp4 (Reels / TikTok / Shorts)
//   node render.mjs --kare 3,8,14            -> out/kareler/ altına belirtilen saniyelerin PNG görüntüsü
//   ek seçenekler: --fps 30  --sessiz  --isci 4  --config baska-config.json
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.dirname(fileURLToPath(import.meta.url));
const FORMATLAR = { '16x9': [1920, 1080], '9x16': [1080, 1920] };
const TURLER = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2',
};

function argumanlar() {
  const a = process.argv.slice(2);
  const al = (ad, varsayilan) => {
    const i = a.indexOf(`--${ad}`);
    return i >= 0 ? a[i + 1] : varsayilan;
  };
  return {
    format: al('format', '16x9'),
    fps: Number(al('fps', 30)),
    kare: al('kare', null),
    sessiz: a.includes('--sessiz'),
    isci: Number(al('isci', 4)),
    config: al('config', path.join(KOK, 'config.json')),
  };
}

// Görseller ve yazı tipi canvas'a "temiz" (cross-origin olmayan) yüklensin diye klasörü yerelde sunar.
async function sunucuBaslat() {
  const sunucu = http.createServer(async (istek, yanit) => {
    const yol = path.join(KOK, decodeURIComponent(new URL(istek.url, 'http://x').pathname));
    if (!yol.startsWith(KOK)) return yanit.writeHead(403).end();
    try {
      if (!(await stat(yol)).isFile()) throw new Error();
      yanit.writeHead(200, { 'Content-Type': TURLER[path.extname(yol)] ?? 'application/octet-stream' });
      createReadStream(yol).pipe(yanit);
    } catch {
      yanit.writeHead(404).end();
    }
  });
  sunucu.listen(0, '127.0.0.1');
  await once(sunucu, 'listening');
  return sunucu;
}

const arg = argumanlar();
if (!FORMATLAR[arg.format]) throw new Error(`Bilinmeyen format: ${arg.format} (16x9 veya 9x16)`);
const [W, H] = FORMATLAR[arg.format];
const config = JSON.parse(await readFile(arg.config, 'utf8'));
const cikisDizini = path.join(KOK, 'out');
await mkdir(cikisDizini, { recursive: true });

const sunucu = await sunucuBaslat();
const adres = `http://127.0.0.1:${sunucu.address().port}/sahne.html`;
const tarayici = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });

async function sayfaAc() {
  const sayfa = await tarayici.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  sayfa.on('pageerror', (e) => console.error('Sayfa hatası:', e.message));
  await sayfa.addInitScript(([k, f]) => {
    window.VIDEO_CONFIG = k;
    window.VIDEO_FORMAT = f;
  }, [config, { width: W, height: H }]);
  await sayfa.goto(adres);
  await sayfa.evaluate(() => window.hazirla());
  return sayfa;
}

async function kareAl(sayfa, t) {
  const url = await sayfa.evaluate((t) => {
    window.cizKare(t);
    return document.getElementById('c').toDataURL('image/png');
  }, t);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

try {
  const ilkSayfa = await sayfaAc();
  const cizelge = await ilkSayfa.evaluate(() => window.zamanCizelgesi());
  const cizelgeDosyasi = path.join(cikisDizini, 'zamanlama.json');
  await writeFile(cizelgeDosyasi, JSON.stringify(cizelge, null, 1));
  if (arg.kare) {
    const dizin = path.join(cikisDizini, 'kareler');
    await mkdir(dizin, { recursive: true });
    for (const s of arg.kare.split(',').map(Number)) {
      const dosya = path.join(dizin, `${arg.format}-${s.toFixed(2)}s.png`);
      await writeFile(dosya, await kareAl(ilkSayfa, s));
      console.log(dosya);
    }
  } else {
    const muzik = path.join(cikisDizini, 'muzik.wav');
    if (!arg.sessiz) {
      const m = spawnSync('python3', [path.join(KOK, 'muzik.py'), cizelgeDosyasi], { stdio: 'inherit' });
      if (m.status !== 0) throw new Error('Müzik üretilemedi (python3 muzik.py)');
    }
    const cikti = path.join(cikisDizini, `guclu-group-tanitim-${arg.format}.mp4`);
    const ffmpeg = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(arg.fps), '-c:v', 'png', '-i', '-',
      ...(arg.sessiz ? [] : ['-i', muzik]),
      // hafif gürültü azaltma: her karede değişen gren dosya boyutunu ikiye katlıyor, görüntü farkı yok
      '-vf', 'hqdn3d=1.5:1.5:4:4', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
      ...(arg.sessiz ? [] : ['-c:a', 'aac', '-b:a', '192k', '-shortest']),
      '-movflags', '+faststart', cikti,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffmpegBitti = once(ffmpeg, 'close');

    const sayfalar = [ilkSayfa, ...(await Promise.all(Array.from({ length: arg.isci - 1 }, sayfaAc)))];
    const toplam = Math.round(cizelge.toplam * arg.fps);
    const baslangic = Date.now();
    for (let i = 0; i < toplam; i += sayfalar.length) {
      const grup = sayfalar
        .map((s, k) => (i + k < toplam ? kareAl(s, (i + k) / arg.fps) : null))
        .filter(Boolean);
      for (const kare of await Promise.all(grup)) {
        if (!ffmpeg.stdin.write(kare)) await once(ffmpeg.stdin, 'drain');
      }
      if ((i / sayfalar.length) % 60 === 0) {
        process.stdout.write(`\r${Math.min(i + sayfalar.length, toplam)}/${toplam} kare`);
      }
    }
    ffmpeg.stdin.end();
    const [kod] = await ffmpegBitti;
    if (kod !== 0) throw new Error(`ffmpeg ${kod} koduyla çıktı`);
    console.log(`\n${cikti} (${cizelge.toplam.toFixed(1)} sn video, ${((Date.now() - baslangic) / 1000).toFixed(0)} sn'de üretildi)`);
  }
} finally {
  await tarayici.close();
  sunucu.close();
}
