// kaptan-ark/ klasöründen tek başına açılabilen tek bir HTML dosyası üretir:
//   node tools/build-single.mjs   →   dist/kaptan-ark.html
// Görseller, stiller, kod ve klinik ayarları dosyanın içine gömülür. Yapay zeka ara katmanı
// (chat.php) tek dosyada çalışamayacağı için bu sürüm hazır cevaplarla çalışır; ayarlardaki
// "ai.endpoint" alanına bir Cloudflare Worker adresi yazılırsa yapay zeka da devreye girer.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => path.join(root, 'kaptan-ark', p);
const text = (p) => readFile(src(p), 'utf8');

async function dataUri(p, type) {
  return `data:${type};base64,${(await readFile(src(p))).toString('base64')}`;
}

/** ES modülünü kendi kapsamına sarar; import satırlarını önceki modüllerden alır. */
function wrapModule(name, code) {
  const exported = [...code.matchAll(/^export (?:async )?(?:function|const|let|class) (\w+)/gm)].map((m) => m[1]);
  const body = code
    .replace(/^import \{([^}]+)\} from '\.\/(\w+)\.js';$/gm, (_, names, mod) => `const {${names}} = __${mod};`)
    .replace(/^export /gm, '');
  if (/^\s*(import|export)\b/m.test(body)) throw new Error(`${name}: dönüştürülemeyen import/export satırı var`);
  return `const __${name} = (() => {\n${body}\nreturn { ${exported.join(', ')} };\n})();\n`;
}

function appModule(code) {
  const body = code.replace(/^import \{([^}]+)\} from '\.\/(\w+)\.js';$/gm, (_, names, mod) => `const {${names}} = __${mod};`);
  if (/^\s*(import|export)\b/m.test(body)) throw new Error('app.js: dönüştürülemeyen import/export satırı var');
  return body;
}

const [html, css, time, booking, faq, app, clinicRaw, body, glove, avatar] = await Promise.all([
  text('index.html'),
  text('styles.css'),
  text('js/time.js'),
  text('js/booking.js'),
  text('js/faq.js'),
  text('js/app.js'),
  text('clinic.json'),
  dataUri('img/mascot-body.webp', 'image/webp'),
  dataUri('img/mascot-glove.webp', 'image/webp'),
  dataUri('img/mascot-avatar.webp', 'image/webp'),
]);

const clinic = JSON.parse(clinicRaw);
clinic.ai = {
  endpoint: '',
  _not: 'Tek dosyalık sürüm hazır cevaplarla çalışır. Cloudflare Worker kurarsanız adresini buraya yazın.',
};
const configJson = JSON.stringify(clinic, null, 2).replace(/<\//g, '<\\/');

const script = [wrapModule('time', time), wrapModule('booking', booking), wrapModule('faq', faq), appModule(app)].join('\n');

const styles = css
  .replaceAll('url("img/mascot-body.webp")', `url("${body}")`)
  .replaceAll('url("img/mascot-avatar.webp")', `url("${avatar}")`);

const replace = (str, from, to) => {
  if (!str.includes(from)) throw new Error(`index.html içinde bulunamadı: ${from}`);
  return str.replace(from, () => to);
};

let out = html;
out = replace(out, '<link rel="icon" type="image/webp" href="img/mascot-avatar.webp">', `<link rel="icon" type="image/webp" href="${avatar}">`);
out = replace(out, '  <link rel="preload" as="image" href="img/mascot-body.webp">\n', '');
out = replace(out, '<link rel="stylesheet" href="styles.css">', `<style>\n${styles}\n</style>`);
out = replace(out, 'src="img/mascot-body.webp"', `src="${body}"`);
out = replace(out, 'src="img/mascot-glove.webp"', `src="${glove}"`);
out = replace(
  out,
  '  <script src="js/app.js" type="module"></script>',
  `  <!--
    KLİNİK AYARLARI: Telefon, WhatsApp numarası, adres, çalışma saatleri, hizmetler ve
    sık sorulan soruları aşağıdaki bölümden düzenleyebilirsiniz. "whatsapp" alanına
    ülke koduyla numaranızı yazın, ör. "905321234567".
  -->
  <script type="application/json" id="clinic-config">
${configJson}
  </script>

  <script type="module">
${script}
  </script>`,
);

await mkdir(path.join(root, 'dist'), { recursive: true });
const file = path.join(root, 'dist', 'kaptan-ark.html');
await writeFile(file, out);
console.log(`${path.relative(root, file)} hazır (${Math.round(out.length / 1024)} KB)`);
