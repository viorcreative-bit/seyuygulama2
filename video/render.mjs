// Kullanım:
//   node render.mjs --format 16x9            -> out/guclu-insaat-tanitim-16x9.mp4
//   node render.mjs --format 9x16            -> out/guclu-insaat-tanitim-9x16.mp4 (Reels / TikTok / Shorts)
//   node render.mjs --kare 3,8,14            -> out/kareler/ altına belirtilen saniyelerin PNG görüntüsü
//   ek seçenekler: --fps 30  --sessiz  --isci 4  --config baska-config.json
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KOK = path.dirname(fileURLToPath(import.meta.url));
const FORMATLAR = { '16x9': [1920, 1080], '9x16': [1080, 1920] };

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

const arg = argumanlar();
if (!FORMATLAR[arg.format]) throw new Error(`Bilinmeyen format: ${arg.format} (16x9 veya 9x16)`);
const [W, H] = FORMATLAR[arg.format];
const config = JSON.parse(await readFile(arg.config, 'utf8'));
const sure = config.zamanlama.bitis;
const cikisDizini = path.join(KOK, 'out');
await mkdir(cikisDizini, { recursive: true });

const tarayici = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });

async function sayfaAc() {
  const sayfa = await tarayici.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  sayfa.on('pageerror', (e) => console.error('Sayfa hatası:', e.message));
  await sayfa.addInitScript(([k, f]) => {
    window.VIDEO_CONFIG = k;
    window.VIDEO_FORMAT = f;
  }, [config, { width: W, height: H }]);
  await sayfa.goto(pathToFileURL(path.join(KOK, 'sahne.html')).href);
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
  if (arg.kare) {
    const { writeFile } = await import('node:fs/promises');
    const dizin = path.join(cikisDizini, 'kareler');
    await mkdir(dizin, { recursive: true });
    const sayfa = await sayfaAc();
    for (const s of arg.kare.split(',').map(Number)) {
      const dosya = path.join(dizin, `${arg.format}-${s.toFixed(2)}s.png`);
      await writeFile(dosya, await kareAl(sayfa, s));
      console.log(dosya);
    }
  } else {
    const muzik = path.join(cikisDizini, 'muzik.wav');
    if (!arg.sessiz) {
      const m = spawnSync('python3', [path.join(KOK, 'muzik.py')], { stdio: 'inherit' });
      if (m.status !== 0) throw new Error('Müzik üretilemedi (python3 muzik.py)');
    }
    const cikti = path.join(cikisDizini, `guclu-insaat-tanitim-${arg.format}.mp4`);
    const ffmpeg = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(arg.fps), '-c:v', 'png', '-i', '-',
      ...(arg.sessiz ? [] : ['-i', muzik]),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
      ...(arg.sessiz ? [] : ['-c:a', 'aac', '-b:a', '192k', '-shortest']),
      '-movflags', '+faststart', cikti,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffmpegBitti = once(ffmpeg, 'close');

    const sayfalar = await Promise.all(Array.from({ length: arg.isci }, sayfaAc));
    const toplam = Math.round(sure * arg.fps);
    const baslangic = Date.now();
    for (let i = 0; i < toplam; i += sayfalar.length) {
      const grup = sayfalar
        .map((s, k) => (i + k < toplam ? kareAl(s, (i + k) / arg.fps) : null))
        .filter(Boolean);
      for (const kare of await Promise.all(grup)) {
        if (!ffmpeg.stdin.write(kare)) await once(ffmpeg.stdin, 'drain');
      }
      if ((i / sayfalar.length) % 30 === 0) {
        process.stdout.write(`\r${Math.min(i + sayfalar.length, toplam)}/${toplam} kare`);
      }
    }
    ffmpeg.stdin.end();
    const [kod] = await ffmpegBitti;
    if (kod !== 0) throw new Error(`ffmpeg ${kod} koduyla çıktı`);
    console.log(`\n${cikti} (${((Date.now() - baslangic) / 1000).toFixed(0)} sn)`);
  }
} finally {
  await tarayici.close();
}
