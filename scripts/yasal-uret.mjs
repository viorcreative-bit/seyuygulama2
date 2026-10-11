// Yasal metinlerden internet sayfaları üretir: npm run yasal
// Kaynak: src/yasal/metinler.json  ->  Çıktı: yasal-web/*.html
// App Store ve Google Play, gizlilik politikası için bir internet adresi ister; bu sayfalar o adrese yüklenebilir.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(fileURLToPath(import.meta.url), '..', '..');
const veri = JSON.parse(readFileSync(join(kok, 'src', 'yasal', 'metinler.json'), 'utf8'));
const cikti = join(kok, 'yasal-web');
mkdirSync(cikti, { recursive: true });

const kos = (m) => m.replace(/\{\{(\w+)\}\}/g, (_, k) => veri.bilgiler[k] ?? '');
const kac = (m) => m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function govde(metin) {
  const satirlar = kos(metin).split('\n');
  const parcalar = [];
  let liste = [];
  const listeyiKapat = () => {
    if (liste.length) parcalar.push(`<ul>${liste.map((x) => `<li>${kac(x)}</li>`).join('')}</ul>`);
    liste = [];
  };
  for (const s of satirlar) {
    if (s.startsWith('• ')) liste.push(s.slice(2));
    else {
      listeyiKapat();
      if (s.trim()) parcalar.push(`<p>${kac(s)}</p>`);
    }
  }
  listeyiKapat();
  return parcalar.join('\n');
}

const sayfa = (baslik, icerik) => `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${kac(baslik)} · Aşçım Gelsin</title>
<style>
  :root { --zemin:#160606; --yuzey:#2A1010; --cizgi:#4D2626; --metin:#FFF8E7; --soluk:#BFA99A; --sari:#FEC010; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--zemin); color:var(--metin); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height:1.65; }
  header { padding:20px 16px; text-align:center; border-bottom:1px solid var(--cizgi); }
  header img { width:72px; height:72px; border-radius:50%; }
  main { max-width:760px; margin:0 auto; padding:24px 16px 64px; }
  h1 { font-size:30px; margin:8px 0 4px; }
  h2 { color:var(--sari); font-size:19px; margin:28px 0 6px; }
  .tarih { color:var(--soluk); font-size:14px; }
  a { color:var(--sari); }
  ul { padding-left:22px; }
  nav { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; margin-top:8px; font-size:14px; }
</style>
</head>
<body>
<header><img src="logo.png" alt="Aşçım Gelsin" /><nav>
<a href="gizlilik.html">Gizlilik Politikası</a><a href="kvkk.html">KVKK Aydınlatma Metni</a><a href="kosullar.html">Kullanım Koşulları</a>
</nav></header>
<main>
${icerik}
</main>
</body>
</html>
`;

for (const [anahtar, b] of Object.entries(veri.belgeler)) {
  const icerik =
    `<h1>${kac(b.baslik)}</h1>\n<div class="tarih">Son güncelleme: ${kac(b.guncelleme)}</div>\n` +
    b.bolumler.map((x) => `<h2>${kac(x.baslik)}</h2>\n${govde(x.metin)}`).join('\n');
  writeFileSync(join(cikti, `${anahtar}.html`), sayfa(b.baslik, icerik));
}
writeFileSync(
  join(cikti, 'index.html'),
  sayfa('Yasal Metinler', `<h1>Yasal Metinler</h1>\n<ul>${Object.entries(veri.belgeler).map(([a, b]) => `<li><a href="${a}.html">${kac(b.baslik)}</a></li>`).join('')}</ul>`),
);

const eksik = Object.entries(veri.bilgiler).filter(([, v]) => v.includes('['));
console.log('Yasal sayfalar üretildi: yasal-web/');
if (eksik.length) {
  console.log('\nDİKKAT: Şu şirket bilgileri hâlâ boş, src/yasal/metinler.json içinde doldurup bu komutu tekrar çalıştır:');
  for (const [k, v] of eksik) console.log(`  - ${k}  (şu an: ${v})`);
}
