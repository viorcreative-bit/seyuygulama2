'use strict';
// Güçlü Group tanıtım videosu — kare kare çizilen canvas animasyonu.
// render.mjs her kare için window.cizKare(saniye) çağırır; aynı saniye her zaman aynı görüntüyü verir.
// Sahne sırası ve içerik config.json'dan gelir; süreler vuruş (bpm) cinsindendir, böylece müzikle örtüşür.
(() => {
  const K = window.VIDEO_CONFIG;
  const { width: W, height: H } = window.VIDEO_FORMAT;
  const tuval = document.getElementById('c');
  tuval.width = W;
  tuval.height = H;
  const anaCtx = tuval.getContext('2d');
  let ctx = anaCtx;
  const DIKEY = H > W;
  const U = Math.min(W, H) / 1080;
  const R = K.renkler;
  const VURUS = 60 / K.bpm;
  const KENAR = (DIKEY ? 80 : 120) * U;
  const AILE = "'Archivo Variable', sans-serif";
  const GORSEL = {};

  // ---- yardımcılar ----
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, x) => a + (b - a) * x;
  const prog = (t, bas, sure) => clamp((t - bas) / sure);
  const eOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const eInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const iki = (n) => String(n).padStart(2, '0');
  const buyuk = (s) => s.toLocaleUpperCase('tr-TR');

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function mulberry32(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- yazı ----
  function yazi(o) {
    ctx.font = `${o.agirlik ?? 400} ${o.boyut ?? 24 * U}px ${AILE}`;
    ctx.fontStretch = o.genis ? 'expanded' : 'normal';
    ctx.letterSpacing = `${o.aralik ?? 0}px`;
  }

  function metin(s, x, y, o = {}) {
    ctx.save();
    yazi(o);
    ctx.textAlign = o.hiza ?? 'left';
    ctx.textBaseline = o.taban ?? 'alphabetic';
    ctx.fillStyle = o.renk ?? R.metin;
    if (o.alfa !== undefined) ctx.globalAlpha *= o.alfa;
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  function olc(s, o) {
    ctx.save();
    yazi(o);
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  }

  function satirla(s, maxW, o) {
    const satirlar = [];
    let satir = '';
    for (const k of s.split(' ')) {
      const deneme = satir ? `${satir} ${k}` : k;
      if (satir && olc(deneme, o) > maxW) {
        satirlar.push(satir);
        satir = k;
      } else {
        satir = deneme;
      }
    }
    if (satir) satirlar.push(satir);
    return satirlar;
  }

  // Satırların hepsi maxW içine sığacak en büyük yazı boyutu (o.boyut üst sınır).
  function sigdir(satirlar, maxW, o) {
    const enGenis = Math.max(...satirlar.map((s) => olc(s, o)));
    return Math.min(o.boyut, (o.boyut * maxW) / enGenis);
  }

  // En fazla `enCok` satıra sığana kadar küçültüp sarar.
  function sar(s, maxW, o, enCok) {
    let boyut = o.boyut;
    for (let i = 0; i < 12; i++) {
      const satirlar = satirla(s, maxW, { ...o, boyut });
      const enGenis = Math.max(...satirlar.map((x) => olc(x, { ...o, boyut })));
      if (satirlar.length <= enCok && enGenis <= maxW) return { satirlar, boyut };
      boyut *= 0.93;
    }
    return { satirlar: satirla(s, maxW, { ...o, boyut }), boyut };
  }

  // Maske içinden aşağıdan yukarı kayarak gelen satır.
  function maskeli(s, x, taban, p, o) {
    if (p <= 0) return;
    const b = o.boyut;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, taban - b * 1.05, W, b * 1.32);
    ctx.clip();
    metin(s, x, taban + (1 - eOutExpo(p)) * b * 1.4, o);
    ctx.restore();
  }

  function belir(s, x, y, p, o) {
    if (p <= 0) return;
    const e = eOutCubic(p);
    metin(s, x, y + (1 - e) * 18 * U, { ...o, alfa: (o.alfa ?? 1) * e });
  }

  function etiket(s, x, y, p, hiza = 'left') {
    if (p <= 0) return;
    const e = eOutCubic(p);
    const o = { agirlik: 600, boyut: 18 * U, genis: true, aralik: 4 * U, renk: R.vurgu, taban: 'middle' };
    const cizgi = 40 * U * e;
    ctx.save();
    ctx.globalAlpha *= e;
    ctx.fillStyle = R.vurgu;
    if (hiza === 'center') {
      const w = olc(s, o);
      metin(s, x, y, { ...o, hiza: 'center' });
      ctx.fillRect(x - w / 2 - 18 * U - cizgi, y - 1.5 * U, cizgi, 3 * U);
      ctx.fillRect(x + w / 2 + 18 * U, y - 1.5 * U, cizgi, 3 * U);
    } else {
      ctx.fillRect(x, y - 1.5 * U, cizgi, 3 * U);
      metin(s, x + 56 * U - (1 - e) * 16 * U, y, o);
    }
    ctx.restore();
  }

  // ---- görsel ----
  // Alanı dolduracak şekilde kırpar; p ile yavaşça yakınlaşır ve kayar (Ken Burns).
  function foto(ad, x, y, w, h, p, o = {}) {
    const im = GORSEL[ad];
    p = Math.max(0, p);
    const [fx, fy] = o.odak ?? [0.5, 0.5];
    const [z0, z1] = o.zoom ?? [1.04, 1.12];
    const s = Math.max(w / im.width, h / im.height) * lerp(z0, z1, p);
    const dw = im.width * s, dh = im.height * s;
    const kay = (o.pan ?? 0) * (p - 0.5) * w * 0.05;
    const dx = clamp(x + w / 2 - fx * dw + kay, x + w - dw, x);
    const dy = clamp(y + h / 2 - fy * dh, y + h - dh, y);
    ctx.save();
    if (o.alfa !== undefined) ctx.globalAlpha *= o.alfa;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(im, dx, dy, dw, dh);
    ctx.restore();
  }

  function dolgu(renk, a, x = 0, y = 0, w = W, h = H) {
    ctx.fillStyle = rgba(renk, a);
    ctx.fillRect(x, y, w, h);
  }

  // Doğrusal geçişli karartma: (x0,y0) noktasında a0, (x1,y1) noktasında a1.
  function golge(x0, y0, x1, y1, a0, a1, renk = R.lacivert) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(renk, a0));
    g.addColorStop(1, rgba(renk, a1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function zemin(t, izgara = 1) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, R.lacivertAcik);
    g.addColorStop(1, R.lacivert);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const kucuk = 40 * U, buyukAdim = 200 * U;
    const ox = (t * 6 * U) % buyukAdim, oy = (t * 2.5 * U) % buyukAdim;
    ctx.lineWidth = 1;
    for (const [adim, a] of [[kucuk, 0.03], [buyukAdim, 0.065]]) {
      ctx.beginPath();
      for (let x = -buyukAdim + ox; x < W + buyukAdim; x += adim) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, H);
      }
      for (let y = -buyukAdim + oy; y < H + buyukAdim; y += adim) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(W, Math.round(y) + 0.5);
      }
      ctx.strokeStyle = rgba(R.vurgu, a * izgara);
      ctx.stroke();
    }
  }

  // İç içe kullanılabilen ekran dışı katmanlar (saydamlıkla birleştirme ve parlama için).
  const katmanlar = [];
  let katmanDerinligi = 0;
  function katmanda(fn, alfa = 1) {
    if (!katmanlar[katmanDerinligi]) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      katmanlar[katmanDerinligi] = c;
    }
    const kat = katmanlar[katmanDerinligi++];
    const onceki = ctx;
    ctx = kat.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';
    fn();
    ctx = onceki;
    katmanDerinligi--;
    ctx.save();
    ctx.globalAlpha *= alfa;
    ctx.drawImage(kat, 0, 0);
    ctx.restore();
  }

  // Katmandaki çizimin üzerinden geçen ışık şeridi.
  function parlama(x0, x1, p) {
    if (p <= 0 || p >= 1) return;
    const bx = lerp(x0 - 200 * U, x1 + 200 * U, eInOutCubic(p));
    const g = ctx.createLinearGradient(bx - 130 * U, 0, bx + 130 * U, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function logoCiz(ad, x, y, w, alfa = 1) {
    const im = GORSEL[ad];
    const h = (w * im.height) / im.width;
    ctx.save();
    ctx.globalAlpha *= alfa;
    ctx.drawImage(im, x, y, w, h);
    ctx.restore();
    return h;
  }

  // ---- çizgi ikonlar ----
  function cember(cx, cy, r, a0, a1, adim = 32) {
    const pts = [];
    for (let i = 0; i <= adim; i++) {
      const a = lerp(a0, a1, i / adim);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }

  const IKONLAR = {
    dunya: () => {
      const elips = [];
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        elips.push([50 + Math.cos(a) * 17, 50 + Math.sin(a) * 40]);
      }
      return [cember(50, 50, 40, 0, Math.PI * 2), elips, [[10, 50], [90, 50]], [[15.4, 30], [84.6, 30]], [[15.4, 70], [84.6, 70]]];
    },
    yatirim: () => [[[12, 12], [12, 88], [88, 88]], [[24, 72], [42, 52], [56, 62], [84, 30]], [[68, 30], [84, 30], [84, 46]]],
    guven: () => [
      [[50, 8], [84, 20], [84, 48], [76, 68], [50, 92], [24, 68], [16, 48], [16, 20], [50, 8]],
      [[34, 50], [46, 62], [68, 38]],
    ],
    zaman: () => [cember(50, 50, 40, -Math.PI / 2, Math.PI * 1.5), [[50, 24], [50, 50], [68, 62]]],
    lokasyon: () => {
      const yay = cember(50, 40, 28, Math.PI * 0.8, Math.PI * 2.2);
      return [[...yay, [50, 92], yay[0]], cember(50, 40, 10, 0, Math.PI * 2, 20)];
    },
    konum: () => {
      const yay = cember(50, 38, 30, Math.PI * 0.78, Math.PI * 2.22);
      return [[...yay, [50, 96], yay[0]], cember(50, 38, 11, 0, Math.PI * 2, 16)];
    },
  };

  function kismiCizgiler(cizgiler, p) {
    const uzunluk = (pts) => pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
    let kalan = cizgiler.reduce((a, c) => a + uzunluk(c), 0) * clamp(p);
    ctx.beginPath();
    for (const pts of cizgiler) {
      if (kalan <= 0) break;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length && kalan > 0; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const seg = Math.hypot(x1 - x0, y1 - y0);
        const f = Math.min(1, kalan / seg);
        ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
        kalan -= seg;
      }
    }
    ctx.stroke();
  }

  function ikon(ad, x, y, boyut, p, renk = R.vurgu, kalinlik = 3.2) {
    const olcek = boyut / 100;
    const cizgiler = IKONLAR[ad]().map((c) => c.map(([px, py]) => [x + px * olcek, y + py * olcek]));
    ctx.save();
    ctx.strokeStyle = renk;
    ctx.lineWidth = kalinlik * U;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    kismiCizgiler(cizgiler, p);
    ctx.restore();
  }

  // ---- zaman çizelgesi ----
  // 'yumusak': çapraz geçiş; 'mavi': marka mavisine kararıp yeni sahneye açılma (bölüm geçişleri).
  const VARSAYILAN_GECIS = {
    logo: 'mavi', rakamlar: 'mavi', hakkimizda: 'yumusak', harita: 'yumusak', baskan: 'mavi',
    degerler: 'yumusak', ara: 'yumusak', kategori: 'mavi', proje: 'yumusak', yonetim: 'mavi', kapanis: 'mavi',
  };
  const GECIS_SURESI = { yumusak: 1.0, mavi: 1.4 };
  const TURE_GORE_GECIS_SURESI = { ara: 1.2 };
  const SAHNELER = [];
  {
    let saat = 0;
    const ekle = (tur, vurus, veri) => {
      const gecis = veri.gecis ?? VARSAYILAN_GECIS[tur];
      const gecisSuresi = veri.gecisSuresi ?? TURE_GORE_GECIS_SURESI[tur] ?? GECIS_SURESI[gecis];
      SAHNELER.push({ tur, bas: saat, sure: vurus * VURUS, veri, gecis, gecisSuresi });
      saat += vurus * VURUS;
    };
    let araSirasi = 0;
    for (const s of K.sahneler) {
      if (s.tur === 'kategori') {
        ekle('kategori', s.vurus ?? 4, s);
        s.projeler.forEach((p, i) => ekle('proje', p.vurus ?? 4, { kat: s, proje: p, sira: i, adet: s.projeler.length }));
      } else {
        ekle(s.tur, s.vurus, s.tur === 'ara' ? { ...s, sira: araSirasi++ } : s);
      }
    }
  }
  const TOPLAM = SAHNELER.at(-1).bas + SAHNELER.at(-1).sure;
  window.zamanCizelgesi = () => ({
    bpm: K.bpm,
    toplam: TOPLAM,
    sahneler: SAHNELER.map((s) => ({ tur: s.tur, bas: s.bas, sure: s.sure, gecis: s.gecis ?? null, gecisSuresi: s.gecisSuresi ?? 0 })),
  });

  // ---- sahneler ----
  const CIZ = {};

  CIZ.giris = (s, lt) => {
    const d = s.veri;
    foto(d.gorsel, 0, 0, W, H, lt / (s.sure + 1), { odak: d.odak, zoom: [1.0, 1.12] });
    dolgu(R.lacivert, 0.3);
    golge(0, H, 0, H * 0.3, 0.95, 0);
    const o = { agirlik: 800, genis: true };
    const boyut = sigdir(d.satirlar, DIKEY ? W - 2 * KENAR : W * 0.62, { ...o, boyut: (DIKEY ? 70 : 76) * U });
    const satirH = boyut * 1.12;
    const yEtiket = (DIKEY ? H * 0.8 : H * 0.84) - satirH * d.satirlar.length - 40 * U;
    etiket(d.etiket, KENAR, yEtiket, prog(lt, 0.25, 0.8));
    d.satirlar.forEach((sat, i) => {
      const renk = i === d.satirlar.length - 1 ? R.vurgu : R.metin;
      maskeli(sat, KENAR, yEtiket + 36 * U + boyut * 0.92 + i * satirH, prog(lt, 0.4 + i * 0.16, 1.0), { ...o, boyut, renk });
    });
  };

  CIZ.logo = (s, lt) => {
    const d = s.veri;
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, R.marka);
    g.addColorStop(1, '#141C52');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // kapaktaki gibi çapraz şeritler
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let k = 0; k < 3; k++) {
      const x = W * (0.15 + k * 0.32) + lt * (12 + k * 6) * U;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + H * 0.45, 0);
      ctx.lineTo(x + H * 0.45 + (90 + k * 50) * U, 0);
      ctx.lineTo(x + (90 + k * 50) * U, H);
      ctx.fill();
    }
    ctx.restore();

    const im = GORSEL['logo-beyaz.png'];
    const lw = (DIKEY ? 720 : 760) * U, lh = (lw * im.height) / im.width;
    const lx = (W - lw) / 2, ly = H * (DIKEY ? 0.4 : 0.4) - lh / 2;
    const p = eOutExpo(prog(lt, 0.45, 1.4));
    katmanda(() => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx - 20 * U, ly - 20 * U, (lw + 40 * U) * p, lh + 40 * U);
      ctx.clip();
      const sc = lerp(1.06, 1, p);
      ctx.translate(W / 2, ly + lh / 2);
      ctx.scale(sc, sc);
      ctx.translate(-W / 2, -(ly + lh / 2));
      ctx.drawImage(im, lx, ly, lw, lh);
      ctx.restore();
      parlama(lx, lx + lw, prog(lt, 2.1, 1.0));
    });

    const cp = eOutCubic(prog(lt, 1.4, 0.8));
    ctx.fillStyle = R.vurgu;
    ctx.fillRect(W / 2 - 70 * U * cp, ly + lh + 60 * U, 140 * U * cp, 3 * U);
    belir(d.alt, W / 2, ly + lh + 130 * U, prog(lt, 1.6, 0.9), { agirlik: 400, boyut: 36 * U, hiza: 'center' });
    const uo = { agirlik: 600, boyut: 17 * U, genis: true, aralik: 4 * U, renk: R.metinIkincil, hiza: 'center' };
    const ulkeSatirlari = DIKEY
      ? [d.ulkeler.slice(0, 3).join('  ·  '), d.ulkeler.slice(3).join('  ·  ')]
      : [d.ulkeler.join('  ·  ')];
    ulkeSatirlari.forEach((sat, i) => belir(sat, W / 2, ly + lh + 200 * U + i * 40 * U, prog(lt, 2.1 + i * 0.15, 0.9), uo));
  };

  CIZ.rakamlar = (s, lt) => {
    const d = s.veri;
    foto(d.gorsel, 0, 0, W, H, lt / s.sure, { odak: [0.5, 0.35], zoom: [1.02, 1.1] });
    dolgu(R.lacivert, 0.62);
    golge(0, 0, DIKEY ? 0 : W * 0.7, DIKEY ? H * 0.5 : 0, 0.55, 0);
    const yEt = (DIKEY ? 250 : 190) * U;
    etiket(d.etiket, KENAR, yEt, prog(lt, 0.4, 0.8));
    const bo = { agirlik: 800, genis: true };
    const bBoyut = sigdir(d.baslik, DIKEY ? W - 2 * KENAR : W * 0.6, { ...bo, boyut: (DIKEY ? 76 : 70) * U });
    d.baslik.forEach((sat, i) => maskeli(sat, KENAR, yEt + 36 * U + bBoyut * 0.92 + i * bBoyut * 1.1, prog(lt, 0.5 + i * 0.12, 1), { ...bo, boyut: bBoyut }));
    const yAlt = yEt + 36 * U + bBoyut * 0.92 + (d.baslik.length - 1) * bBoyut * 1.1 + 58 * U;
    belir(d.alt, KENAR, yAlt, prog(lt, 0.9, 0.8), { boyut: 28 * U, renk: R.metinIkincil });

    const n = d.rakamlar.length;
    const eo = { agirlik: 600, boyut: (DIKEY ? 19 : 16) * U, genis: true, aralik: 2 * U };
    d.rakamlar.forEach((r, k) => {
      const t0 = 1.3 + k * VURUS;
      const p = prog(lt, t0, 0.8);
      if (p <= 0) return;
      const e = eOutCubic(p);
      const son = r.son ?? '';
      const deger = Math.round(lerp(r.baslangic ?? 0, r.deger, eOutCubic(prog(lt, t0, 1.4))));
      const no = { agirlik: 800, genis: true };
      let x, yCizgi, sBoyut, colW, etiketX, etiketY, etiketW;
      if (!DIKEY) {
        colW = (W - 2 * KENAR) / n;
        x = KENAR + k * colW;
        yCizgi = H * 0.6;
        sBoyut = Math.min(76 * U, ((colW - 60 * U) * 76 * U) / olc(`${r.deger}${son}`, { ...no, boyut: 76 * U }));
        etiketX = x;
        etiketY = yCizgi + 40 * U + sBoyut * 0.75 + 48 * U;
        etiketW = colW - 40 * U;
      } else {
        const yUst = H * 0.4, satirH = (H * 0.9 - yUst) / n;
        colW = W - 2 * KENAR;
        x = KENAR;
        yCizgi = yUst + k * satirH;
        sBoyut = 96 * U;
        etiketX = W * 0.52;
        etiketW = W - KENAR - etiketX;
        etiketY = yCizgi + satirH / 2 - 6 * U;
      }
      ctx.save();
      ctx.globalAlpha *= e;
      ctx.fillStyle = R.vurgu;
      ctx.fillRect(x, yCizgi, (colW - 30 * U) * eOutExpo(p), 2 * U);
      const sayiY = DIKEY ? yCizgi + (H * 0.5) / n / 2 + sBoyut * 0.36 + 12 * U : yCizgi + 40 * U + sBoyut * 0.75;
      const dy = (1 - e) * 20 * U;
      metin(String(deger), x, sayiY + dy, { ...no, boyut: sBoyut });
      if (son) metin(son, x + olc(String(deger), { ...no, boyut: sBoyut }) + 4 * U, sayiY + dy, { ...no, boyut: sBoyut, renk: R.vurgu });
      const satirlar = satirla(buyuk(r.etiket), etiketW, eo);
      const lh = eo.boyut * 1.5;
      const y0 = DIKEY ? etiketY - ((satirlar.length - 1) * lh) / 2 + eo.boyut * 0.35 : etiketY;
      satirlar.forEach((sat, i) => metin(sat, etiketX, y0 + i * lh + dy, { ...eo, renk: R.metinIkincil }));
      ctx.restore();
    });
  };

  CIZ.hakkimizda = (s, lt) => {
    const d = s.veri;
    zemin(s.bas + lt, 0.7);
    const fotoH = DIKEY ? H * 0.4 : H * 0.5;
    foto(d.gorsel, 0, 0, W, fotoH, lt / s.sure, { odak: d.odak, zoom: [1.0, 1.06] });
    golge(0, fotoH - 220 * U, 0, fotoH, 0, 1, R.lacivertAcik);
    dolgu(R.lacivertAcik, 1, 0, fotoH, W, 2);
    const bo = { agirlik: 800, genis: true };
    const po = { agirlik: 400, boyut: (DIKEY ? 37 : 27) * U };
    const lh = po.boyut * 1.5;
    const mark = GORSEL['35-yil-beyaz.png'];
    if (!DIKEY) {
      const yEt = fotoH + 80 * U;
      etiket(d.etiket, KENAR, yEt, prog(lt, 0.3, 0.8));
      const bBoyut = sigdir(d.baslik, W * 0.28, { ...bo, boyut: 70 * U });
      d.baslik.forEach((sat, i) => maskeli(sat, KENAR, yEt + 36 * U + bBoyut * 0.92 + i * bBoyut * 1.08, prog(lt, 0.4 + i * 0.12, 1), { ...bo, boyut: bBoyut }));
      const mh = 100 * U;
      logoCiz('35-yil-beyaz.png', KENAR, yEt + 60 * U + bBoyut * 2.2, (mh * mark.width) / mark.height, eOutCubic(prog(lt, 0.9, 0.8)));
      const x0 = W * 0.42, genislik = W - KENAR - x0;
      let y = yEt + 10 * U;
      d.paragraflar.forEach((par, k) => {
        const satirlar = satirla(par, genislik, po);
        const p = prog(lt, 0.8 + k * 2.4, 0.9);
        satirlar.forEach((sat, i) => belir(sat, x0, y + i * lh, p, { ...po, renk: k === 0 ? R.metin : R.metinIkincil }));
        y += satirlar.length * lh + 22 * U;
      });
    } else {
      const yEt = fotoH + 80 * U;
      etiket(d.etiket, KENAR, yEt, prog(lt, 0.3, 0.8));
      const baslik = d.baslik.join(' ');
      const bBoyut = sigdir([baslik], W - 2 * KENAR - 220 * U, { ...bo, boyut: 76 * U });
      const bTaban = yEt + 36 * U + bBoyut * 0.92;
      maskeli(baslik, KENAR, bTaban, prog(lt, 0.4, 1), { ...bo, boyut: bBoyut });
      const mh = 92 * U, mw = (mh * mark.width) / mark.height;
      logoCiz('35-yil-beyaz.png', W - KENAR - mw, bTaban - mh * 0.85, mw, eOutCubic(prog(lt, 0.9, 0.8)));
      let y = bTaban + 100 * U;
      d.paragraflar.forEach((par, k) => {
        const satirlar = satirla(par, W - 2 * KENAR, po);
        const p = prog(lt, 0.8 + k * 2.4, 0.9);
        satirlar.forEach((sat, i) => belir(sat, KENAR, y + i * lh, p, { ...po, renk: k === 0 ? R.metin : R.metinIkincil }));
        y += satirlar.length * lh + 30 * U;
      });
    }
  };

  CIZ.harita = (s, lt) => {
    const d = s.veri;
    zemin(s.bas + lt);
    const im = GORSEL[d.gorsel];
    const bo = { agirlik: 800, genis: true };
    let mx, my, mw;
    if (!DIKEY) {
      const yEt = 190 * U;
      etiket(d.etiket, KENAR, yEt, prog(lt, 0.3, 0.8));
      const bBoyut = sigdir(d.baslik, W * 0.27, { ...bo, boyut: 60 * U });
      d.baslik.forEach((sat, i) => maskeli(sat, KENAR, yEt + 36 * U + bBoyut * 0.92 + i * bBoyut * 1.08, prog(lt, 0.4 + i * 0.12, 1), { ...bo, boyut: bBoyut }));
      const yS = H * 0.54;
      etiket(d.sirketlerBaslik, KENAR, yS, prog(lt, 1.6, 0.8));
      d.sirketler.forEach((ad, k) => {
        const p = prog(lt, 1.9 + k * 0.3, 0.7);
        const y = yS + 58 * U + k * 50 * U;
        belir(iki(k + 1), KENAR, y, p, { agirlik: 600, boyut: 15 * U, genis: true, renk: R.vurgu });
        belir(ad, KENAR + 50 * U, y, p, { agirlik: 600, boyut: 18 * U, genis: true });
      });
      mx = W * 0.35;
      mw = W - mx - 50 * U;
      my = H * 0.56 - (mw * im.height) / im.width / 2;
    } else {
      const yEt = H * 0.11;
      etiket(d.etiket, KENAR, yEt, prog(lt, 0.3, 0.8));
      const bBoyut = sigdir(d.baslik, W - 2 * KENAR, { ...bo, boyut: 72 * U });
      d.baslik.forEach((sat, i) => maskeli(sat, KENAR, yEt + 36 * U + bBoyut * 0.92 + i * bBoyut * 1.08, prog(lt, 0.4 + i * 0.12, 1), { ...bo, boyut: bBoyut }));
      mw = W - 50 * U;
      mx = 25 * U;
      my = H * 0.34;
      const yS = my + (mw * im.height) / im.width + 120 * U;
      etiket(d.sirketlerBaslik, KENAR, yS, prog(lt, 1.6, 0.8));
      const colW = (W - 2 * KENAR) / 2;
      d.sirketler.forEach((ad, k) => {
        const p = prog(lt, 1.9 + k * 0.3, 0.7);
        const x = KENAR + (k % 2) * colW, y = yS + 70 * U + Math.floor(k / 2) * 84 * U;
        belir(iki(k + 1), x, y - 30 * U, p, { agirlik: 600, boyut: 15 * U, genis: true, renk: R.vurgu });
        const ao = { agirlik: 600, boyut: 17 * U, genis: true };
        belir(ad, x, y, p, { ...ao, boyut: Math.min(ao.boyut, (ao.boyut * (colW - 20 * U)) / olc(ad, ao)) });
      });
    }
    const mh = (mw * im.height) / im.width;
    const ma = eOutCubic(prog(lt, 0.3, 1.0));
    const sc = lerp(0.97, 1, ma);
    ctx.save();
    ctx.globalAlpha *= ma;
    ctx.translate(mx + mw / 2, my + mh / 2);
    ctx.scale(sc, sc);
    ctx.translate(-(mx + mw / 2), -(my + mh / 2));
    ctx.drawImage(im, mx, my, mw, mh);
    ctx.restore();

    const sk = mw / im.width;
    const nokta = (p) => [mx + p.x * sk, my + p.y * sk];
    const merkez = d.pinler.find((p) => p.merkez);
    const [cx, cy] = nokta(merkez);
    const halka = (x, y, t0) => {
      if (lt < t0) return;
      for (let j = 0; j < 2; j++) {
        const f = (((lt - t0) / 1.6 + j * 0.5) % 1 + 1) % 1;
        ctx.strokeStyle = rgba(R.vurgu, 0.8 * (1 - f));
        ctx.lineWidth = 2 * U;
        ctx.beginPath();
        ctx.arc(x, y, (10 + 30 * f) * U, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    const rozet = (ad, x, y, p, sol) => {
      if (p <= 0) return;
      const e = eOutCubic(p);
      const o = { agirlik: 700, boyut: 14 * U, genis: true, aralik: 1.5 * U, taban: 'middle' };
      const w = olc(ad, o) + 22 * U, h = 30 * U;
      const bx = sol ? x - 26 * U - w : x + 26 * U, by = y - 30 * U - h / 2;
      ctx.save();
      ctx.globalAlpha *= e;
      ctx.fillStyle = rgba(R.lacivert, 0.88);
      ctx.beginPath();
      ctx.roundRect(bx, by + (1 - e) * 8 * U, w, h, 4 * U);
      ctx.fill();
      ctx.strokeStyle = rgba(R.vurgu, 0.6);
      ctx.lineWidth = 1 * U;
      ctx.stroke();
      metin(ad, bx + 11 * U, by + h / 2 + (1 - e) * 8 * U, o);
      ctx.restore();
    };
    halka(cx, cy, 0.9);
    rozet(merkez.ad, cx, cy, prog(lt, 1.0, 0.6), merkez.sol);
    d.pinler.filter((p) => !p.merkez).forEach((p, k) => {
      const t0 = 1.3 + k * 0.45;
      const ap = eInOutCubic(prog(lt, t0, 0.9));
      if (ap <= 0) return;
      const [px, py] = nokta(p);
      const kx = (cx + px) / 2, ky = Math.min(cy, py) - Math.hypot(px - cx, py - cy) * 0.35;
      const egri = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        egri.push([(1 - u) * (1 - u) * cx + 2 * (1 - u) * u * kx + u * u * px, (1 - u) * (1 - u) * cy + 2 * (1 - u) * u * ky + u * u * py]);
      }
      ctx.save();
      ctx.strokeStyle = rgba(R.vurgu, 0.9);
      ctx.lineWidth = 2 * U;
      ctx.setLineDash([7 * U, 6 * U]);
      kismiCizgiler([egri], ap);
      ctx.restore();
      halka(px, py, t0 + 0.9);
      rozet(p.ad, px, py, prog(lt, t0 + 0.7, 0.6), p.sol);
    });
  };

  CIZ.baskan = (s, lt) => {
    const d = s.veri;
    zemin(s.bas + lt, 0.6);
    const ao = { agirlik: 400, boyut: (DIKEY ? 38 : 33) * U };
    const lh = ao.boyut * 1.5;
    if (!DIKEY) {
      const px = W * 0.4;
      foto(d.gorsel, px, 0, W - px, H, lt / s.sure, { odak: d.odak, zoom: [1.02, 1.1] });
      golge(px, 0, px + 300 * U, 0, 1, 0, R.lacivertAcik);
      dolgu(R.lacivertAcik, 1, 0, 0, px + 1, H);
      zeminIzgara(px);
      const genislik = px - KENAR - 50 * U;
      etiket(d.etiket, KENAR, 200 * U, prog(lt, 0.4, 0.8));
      belir('“', KENAR - 6 * U, 400 * U, prog(lt, 0.6, 0.8), { agirlik: 800, boyut: 190 * U, renk: R.vurgu });
      const satirlar = satirla(d.alinti, genislik, ao);
      const y0 = 420 * U;
      satirlar.forEach((sat, i) => belir(sat, KENAR, y0 + i * lh, prog(lt, 1.0 + i * 0.25, 0.8), ao));
      const yAd = y0 + satirlar.length * lh + 60 * U;
      const ap = prog(lt, 1.2 + satirlar.length * 0.25, 0.8);
      ctx.fillStyle = R.vurgu;
      ctx.fillRect(KENAR, yAd - 30 * U, 50 * U * eOutCubic(ap), 3 * U);
      belir(d.ad, KENAR, yAd + 26 * U, ap, { agirlik: 700, boyut: 34 * U, genis: true });
      belir(d.unvan, KENAR, yAd + 66 * U, ap, { agirlik: 400, boyut: 22 * U, renk: R.vurgu });
    } else {
      const fotoH = H * 0.54;
      foto(d.gorsel, 0, 0, W, fotoH, lt / s.sure, { odak: d.odak, zoom: [1.02, 1.1] });
      golge(0, fotoH - 360 * U, 0, fotoH, 0, 1, R.lacivertAcik);
      const ap = prog(lt, 0.5, 0.8);
      belir(d.ad, KENAR, fotoH - 80 * U, ap, { agirlik: 700, boyut: 46 * U, genis: true });
      belir(d.unvan, KENAR, fotoH - 30 * U, ap, { agirlik: 400, boyut: 28 * U, renk: R.vurgu });
      const yEt = fotoH + 80 * U;
      etiket(d.etiket, KENAR, yEt, prog(lt, 0.7, 0.8));
      belir('“', KENAR - 6 * U, yEt + 190 * U, prog(lt, 0.8, 0.8), { agirlik: 800, boyut: 170 * U, renk: R.vurgu });
      const satirlar = satirla(d.alinti, W - 2 * KENAR, ao);
      satirlar.forEach((sat, i) => belir(sat, KENAR, yEt + 220 * U + i * lh, prog(lt, 1.1 + i * 0.25, 0.8), ao));
    }
  };

  // Düz renkli panel üzerine hafif ızgara (fotoğrafın yanında kalan alan için).
  function zeminIzgara(genislik) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, genislik, H);
    ctx.clip();
    ctx.strokeStyle = rgba(R.vurgu, 0.035);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < genislik; x += 40 * U) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = 0; y < H; y += 40 * U) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(genislik, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  CIZ.degerler = (s, lt) => {
    const d = s.veri;
    foto(d.gorsel, 0, 0, W, H, lt / s.sure, { odak: [0.6, 0.4], zoom: [1.0, 1.08] });
    dolgu(R.lacivert, 0.84);
    const bo = { agirlik: 800, genis: true };
    const yEt = (DIKEY ? 230 : 190) * U;
    etiket(d.etiket, KENAR, yEt, prog(lt, 0.3, 0.8));
    const bBoyut = sigdir([d.baslik], W - 2 * KENAR, { ...bo, boyut: (DIKEY ? 66 : 70) * U });
    maskeli(d.baslik, KENAR, yEt + 36 * U + bBoyut * 0.92, prog(lt, 0.4, 1), { ...bo, boyut: bBoyut });
    const n = d.liste.length;
    d.liste.forEach((m, k) => {
      const t0 = 0.9 + k * VURUS;
      const p = prog(lt, t0, 0.8);
      if (p <= 0) return;
      const e = eOutCubic(p);
      const dy = (1 - e) * 24 * U;
      ctx.save();
      ctx.globalAlpha *= e;
      if (!DIKEY) {
        const bosluk = 36 * U;
        const colW = (W - 2 * KENAR - (n - 1) * bosluk) / n;
        const x = KENAR + k * (colW + bosluk), y = H * 0.46 + dy;
        ctx.fillStyle = rgba(R.vurgu, 0.5);
        ctx.fillRect(x, y - 36 * U, colW * eOutExpo(p), 1.5 * U);
        ikon(m.ikon, x, y, 72 * U, eInOutCubic(prog(lt, t0 + 0.1, 1.0)));
        const to = { agirlik: 700, boyut: 20 * U, genis: true, aralik: 1 * U };
        metin(m.baslik, x, y + 140 * U, { ...to, boyut: Math.min(to.boyut, (to.boyut * colW) / olc(m.baslik, to)) });
        const mo = { agirlik: 400, boyut: 21 * U, renk: R.metinIkincil };
        satirla(m.metin, colW, mo).forEach((sat, i) => metin(sat, x, y + 184 * U + i * mo.boyut * 1.45, mo));
      } else {
        const yUst = H * 0.25, satirH = (H * 0.92 - yUst) / n;
        const y = yUst + k * satirH + dy;
        ctx.fillStyle = rgba(R.vurgu, 0.5);
        ctx.fillRect(KENAR, y, (W - 2 * KENAR) * eOutExpo(p), 1.5 * U);
        ikon(m.ikon, KENAR, y + 40 * U, 70 * U, eInOutCubic(prog(lt, t0 + 0.1, 1.0)));
        const x = KENAR + 120 * U, genislik = W - KENAR - x;
        metin(m.baslik, x, y + 74 * U, { agirlik: 700, boyut: 26 * U, genis: true, aralik: 1 * U });
        const mo = { agirlik: 400, boyut: 26 * U, renk: R.metinIkincil };
        satirla(m.metin, genislik, mo).forEach((sat, i) => metin(sat, x, y + 122 * U + i * mo.boyut * 1.42, mo));
      }
      ctx.restore();
    });
  };

  CIZ.ara = (s, lt) => {
    const d = s.veri;
    foto(d.gorsel, 0, 0, W, H, lt / (s.sure + 0.7), { odak: d.odak, zoom: [1.0, 1.1], pan: d.sira % 2 ? -1 : 1 });
    dolgu(R.lacivert, 0.2);
    golge(0, H, 0, H * 0.3, 0.94, 0);
    if (!DIKEY) golge(0, 0, W * 0.65, 0, 0.5, 0);
    const bo = { agirlik: 800, genis: true };
    const maxW = DIKEY ? W - 2 * KENAR : W * 0.62;
    const bBoyut = sigdir(d.baslik, maxW, { ...bo, boyut: (DIKEY ? 76 : 84) * U });
    const mo = { agirlik: 400, boyut: (DIKEY ? 32 : 28) * U, renk: R.metinIkincil };
    const mSatir = d.metin ? satirla(d.metin, DIKEY ? W - 2 * KENAR : W * 0.5, mo) : [];
    const mlh = mo.boyut * 1.45;
    const yAlt = DIKEY ? H * 0.86 : H - 110 * U;
    const yMetin = yAlt - (mSatir.length - 1) * mlh;
    const sonTaban = yMetin - (mSatir.length ? 64 * U : 0);
    const satirH = bBoyut * 1.08;
    const ilkTaban = sonTaban - (d.baslik.length - 1) * satirH;
    etiket(d.etiket, KENAR, ilkTaban - bBoyut * 0.92 - 36 * U, prog(lt, 0.4, 0.8));
    d.baslik.forEach((sat, i) => maskeli(sat, KENAR, ilkTaban + i * satirH, prog(lt, 0.5 + i * 0.14, 1.0), { ...bo, boyut: bBoyut }));
    mSatir.forEach((sat, i) => belir(sat, KENAR, yMetin + i * mlh, prog(lt, 1.0, 0.8), mo));
  };

  CIZ.kategori = (s, lt) => {
    const d = s.veri;
    foto(d.gorsel, 0, 0, W, H, lt / s.sure, { odak: d.odak, zoom: [1.06, 1.14] });
    dolgu(R.marka, 0.74);
    golge(0, H, 0, H * 0.4, 0.7, 0);
    const bo = { agirlik: 800, genis: true };
    const maxW = DIKEY ? W - 2 * KENAR : W * 0.64;
    const { satirlar, boyut } = sar(d.baslik, maxW, { ...bo, boyut: (DIKEY ? 86 : 104) * U }, 2);
    const satirH = boyut * 1.06;
    const so = { agirlik: 400, boyut: (DIKEY ? 30 : 28) * U, renk: R.metin };
    const sSatir = satirla(d.slogan, DIKEY ? W - 2 * KENAR : W * 0.48, so);
    const yEt = DIKEY ? H * 0.34 : H * 0.36;
    etiket(d.bolum, KENAR, yEt, prog(lt, 0.4, 0.6));
    satirlar.forEach((sat, i) => maskeli(sat, KENAR, yEt + 36 * U + boyut * 0.92 + i * satirH, prog(lt, 0.45 + i * 0.1, 0.9), { ...bo, boyut }));
    const ySlogan = yEt + 36 * U + boyut * 0.92 + (satirlar.length - 1) * satirH + 70 * U;
    sSatir.forEach((sat, i) => belir(sat, KENAR, ySlogan + i * so.boyut * 1.45, prog(lt, 0.8, 0.7), { ...so, alfa: 0.92 }));
    const adet = iki(d.projeler.length);
    const no = { agirlik: 800, genis: true, boyut: (DIKEY ? 150 : 180) * U };
    const po = { agirlik: 600, genis: true, boyut: 20 * U, aralik: 6 * U, renk: R.vurgu };
    const cp = prog(lt, 0.9, 0.7);
    if (!DIKEY) {
      belir(adet, W - KENAR, H - 150 * U, cp, { ...no, hiza: 'right', alfa: 0.95 });
      belir('PROJE', W - KENAR, H - 100 * U, cp, { ...po, hiza: 'right' });
    } else {
      const y = ySlogan + sSatir.length * so.boyut * 1.45 + 190 * U;
      belir(adet, KENAR, y, cp, no);
      belir('PROJE', KENAR + olc(adet, no) + 24 * U, y, cp, po);
    }
  };

  CIZ.proje = (s, lt) => {
    const { kat, proje: p, sira, adet } = s.veri;
    const g = p.gorseller;
    const uzun = s.sure > 5 * VURUS && g.length > 1;
    const kucukler = g.slice(uzun ? 2 : 1, uzun ? 6 : 5);
    const yon = sira % 2 ? -1 : 1;
    const fotoH = DIKEY ? H * 0.56 : H;
    if (DIKEY) zemin(s.bas + lt, 0.5);
    const fo = { zoom: [1.03, 1.12], odak: p.odak };
    foto(g[0], 0, 0, W, fotoH, lt / s.sure, { ...fo, pan: yon });
    if (uzun) {
      const a = eInOutCubic(prog(lt, s.sure / 2 - 0.35, 0.7));
      if (a > 0) foto(g[1], 0, 0, W, fotoH, lt / s.sure, { ...fo, pan: -yon, alfa: a });
    }
    if (DIKEY) {
      golge(0, fotoH - 300 * U, 0, fotoH, 0, 1, R.lacivertAcik);
    } else {
      golge(0, H, 0, H * 0.4, 0.94, 0);
      golge(0, 0, W * 0.62, 0, 0.55, 0);
    }

    const no = { agirlik: 800, genis: true };
    const ko = { agirlik: 600, boyut: (DIKEY ? 21 : 18) * U, genis: true, aralik: 2 * U };
    const notO = { agirlik: 400, boyut: (DIKEY ? 27 : 22) * U, renk: R.metinIkincil };
    const etiketMetni = `${kat.baslik}  ·  ${iki(sira + 1)} / ${iki(adet)}`;

    // küçük görseller
    const n = kucukler.length;
    let tw = 0, th = 0;
    const kucukCiz = (x, y, k) => {
      const kp = prog(lt, 0.5 + k * 0.1, 0.6);
      if (kp <= 0) return;
      const e = eOutCubic(kp);
      ctx.save();
      ctx.globalAlpha *= e;
      ctx.translate(0, (1 - e) * 30 * U);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 4 * U, y - 4 * U, tw + 8 * U, th + 8 * U);
      foto(kucukler[k], x, y, tw, th, lt / s.sure, { zoom: [1.04, 1.12] });
      ctx.restore();
    };

    const isverenCiz = (x, y) => {
      if (!p.isveren) return 0;
      const ip = prog(lt, 0.8, 0.6);
      if (ip <= 0) return 0;
      const e = eOutCubic(ip);
      metin('İŞVEREN', x, y, { agirlik: 600, boyut: 13 * U, genis: true, aralik: 3 * U, renk: R.vurgu, alfa: e });
      let lx = x;
      const lh = (DIKEY ? 84 : 80) * U;
      for (const ad of p.isveren) {
        const im = GORSEL[ad];
        const w = (lh * im.width) / im.height;
        logoCiz(ad, lx, y + 18 * U, w, e);
        lx += w + 30 * U;
      }
      return lh + 18 * U;
    };

    if (!DIKEY) {
      if (n) {
        tw = (n >= 4 ? 250 : 300) * U;
        th = tw * 0.62;
        const x = W - KENAR - tw;
        for (let k = 0; k < n; k++) kucukCiz(x, H - 100 * U - th - (n - 1 - k) * (th + 18 * U), k);
      }
      const maxW = W - 2 * KENAR - (n ? tw + 80 * U : 0) - 100 * U;
      const { satirlar, boyut } = sar(p.ad, Math.min(maxW, 1150 * U), { ...no, boyut: 56 * U }, 2);
      const satirH = boyut * 1.08;
      const notSatir = p.not ? satirla(p.not, Math.min(maxW, 900 * U), notO) : [];
      let y = H - 100 * U;
      const isverenH = p.isveren ? (80 + 18) * U : 0;
      const yIsveren = y - isverenH + 13 * U;
      if (isverenH) y -= isverenH + 30 * U;
      const yNot = y - (notSatir.length - 1) * notO.boyut * 1.45;
      if (notSatir.length) y = yNot - 46 * U;
      const yMeta = y;
      const sonTaban = yMeta - 62 * U;
      const ilkTaban = sonTaban - (satirlar.length - 1) * satirH;
      const yEt = ilkTaban - boyut * 0.92 - 34 * U;
      if (p.logo) {
        const lp = prog(lt, 0.4, 0.6);
        const im = GORSEL[p.logo];
        const lh = 96 * U;
        logoCiz(p.logo, KENAR, yEt - 40 * U - lh, (lh * im.width) / im.height, eOutCubic(lp));
      }
      etiket(etiketMetni, KENAR, yEt, prog(lt, 0.25, 0.6));
      satirlar.forEach((sat, i) => maskeli(sat, KENAR, ilkTaban + i * satirH, prog(lt, 0.3 + i * 0.1, 0.9), { ...no, boyut }));
      metaCiz(p, KENAR, yMeta, prog(lt, 0.55, 0.6), ko);
      notSatir.forEach((sat, i) => belir(sat, KENAR, yNot + i * notO.boyut * 1.45, prog(lt, 0.7, 0.6), notO));
      if (isverenH) isverenCiz(KENAR, yIsveren);
    } else {
      let y;
      if (n) {
        const bosluk = 16 * U;
        tw = Math.min(300 * U, (W - 2 * KENAR - (n - 1) * bosluk) / n);
        th = tw * 0.62;
        const toplam = n * tw + (n - 1) * bosluk;
        const ty = fotoH - th * 0.6;
        for (let k = 0; k < n; k++) kucukCiz((W - toplam) / 2 + k * (tw + bosluk), ty, k);
        y = ty + th + 90 * U;
      } else {
        y = fotoH + 60 * U;
      }
      if (p.logo) {
        const im = GORSEL[p.logo];
        const lh = 90 * U;
        logoCiz(p.logo, KENAR, y - 20 * U, (lh * im.width) / im.height, eOutCubic(prog(lt, 0.4, 0.6)));
        y += lh + 30 * U;
      }
      etiket(etiketMetni, KENAR, y, prog(lt, 0.25, 0.6));
      const { satirlar, boyut } = sar(p.ad, W - 2 * KENAR, { ...no, boyut: 58 * U }, 3);
      const satirH = boyut * 1.08;
      const ilkTaban = y + 36 * U + boyut * 0.92;
      satirlar.forEach((sat, i) => maskeli(sat, KENAR, ilkTaban + i * satirH, prog(lt, 0.3 + i * 0.1, 0.9), { ...no, boyut }));
      y = ilkTaban + (satirlar.length - 1) * satirH + 76 * U;
      metaCiz(p, KENAR, y, prog(lt, 0.55, 0.6), ko, true);
      y += 120 * U;
      if (p.not) {
        const notSatir = satirla(p.not, W - 2 * KENAR, notO);
        notSatir.forEach((sat, i) => belir(sat, KENAR, y + i * notO.boyut * 1.45, prog(lt, 0.7, 0.6), notO));
        y += notSatir.length * notO.boyut * 1.45 + 40 * U;
      }
      isverenCiz(KENAR, y);
    }
  };

  // Proje konumu ve bitiş yılı; dikey formatta alt alta.
  function metaCiz(p, x, y, ilerleme, ko, altAlta = false) {
    if (ilerleme <= 0) return;
    const e = eOutCubic(ilerleme);
    const dy = (1 - e) * 14 * U;
    ctx.save();
    ctx.globalAlpha *= e;
    const ib = ko.boyut * 1.4;
    ikon('konum', x, y - ib * 0.85 + dy, ib, 1, R.vurgu, 7);
    metin(p.konum, x + ib + 12 * U, y + dy, ko);
    const yo = { agirlik: 600, boyut: 13 * U, genis: true, aralik: 3 * U, renk: R.metinIkincil };
    const yilO = { agirlik: 700, boyut: ko.boyut * 1.35, genis: true };
    let yx = x + ib + 12 * U + olc(p.konum, ko) + 46 * U, yy = y;
    if (altAlta) {
      yx = x;
      yy = y + 56 * U;
    } else {
      ctx.fillStyle = rgba(R.metin, 0.35);
      ctx.fillRect(yx - 24 * U, y - ko.boyut, 1.5 * U, ko.boyut * 1.2);
    }
    metin('BİTİŞ', yx, yy + dy, yo);
    metin(String(p.yil), yx + olc('BİTİŞ', yo) + 14 * U, yy + dy + 2 * U, yilO);
    ctx.restore();
  }

  CIZ.yonetim = (s, lt) => {
    const d = s.veri;
    foto(d.gorsel, 0, 0, W, H, lt / s.sure, { odak: [0.5, 0.5], zoom: [1.0, 1.08] });
    dolgu(R.lacivert, 0.86);
    const bo = { agirlik: 800, genis: true };
    const yEt = (DIKEY ? 230 : 190) * U;
    etiket(d.etiket, KENAR, yEt, prog(lt, 0.4, 0.8));
    const bBoyut = sigdir([d.baslik], W - 2 * KENAR, { ...bo, boyut: (DIKEY ? 66 : 70) * U });
    maskeli(d.baslik, KENAR, yEt + 36 * U + bBoyut * 0.92, prog(lt, 0.5, 1), { ...bo, boyut: bBoyut });
    const sutun = DIKEY ? 2 : 3;
    const bosluk = 40 * U;
    const colW = (W - 2 * KENAR - (sutun - 1) * bosluk) / sutun;
    const satirlar = DIKEY ? [H * 0.33, H * 0.5, H * 0.67] : [H * 0.48, H * 0.7];
    d.kisiler.forEach((k, i) => {
      const p = prog(lt, 0.9 + i * 0.3, 0.8);
      if (p <= 0) return;
      const e = eOutCubic(p);
      const x = KENAR + (i % sutun) * (colW + bosluk), y = satirlar[Math.floor(i / sutun)] + (1 - e) * 20 * U;
      ctx.save();
      ctx.globalAlpha *= e;
      ctx.fillStyle = R.vurgu;
      ctx.fillRect(x, y, (colW - 40 * U) * eOutExpo(p), 2 * U);
      metin(iki(i + 1), x, y + 40 * U, { agirlik: 600, boyut: 16 * U, genis: true, renk: R.vurgu });
      const ao = { agirlik: 700, boyut: (DIKEY ? 27 : 28) * U, genis: true };
      metin(k.ad, x, y + 90 * U, { ...ao, boyut: Math.min(ao.boyut, (ao.boyut * (colW - 20 * U)) / olc(k.ad, ao)) });
      metin(k.unvan, x, y + 128 * U, { agirlik: 400, boyut: (DIKEY ? 24 : 21) * U, renk: R.metinIkincil });
      ctx.restore();
    });
  };

  CIZ.kapanis = (s, lt) => {
    const d = s.veri;
    foto(d.gorsel, 0, 0, W, H, lt / s.sure, { odak: [0.5, 0.5], zoom: [1.12, 1.0] });
    dolgu(R.marka, 0.5);
    golge(0, H, 0, H * 0.3, 0.8, 0);
    const im = GORSEL['logo-beyaz.png'];
    const lw = (DIKEY ? 700 : 680) * U, lh = (lw * im.height) / im.width;
    const lx = (W - lw) / 2, ly = H * (DIKEY ? 0.33 : 0.3) - lh / 2;
    const p = eOutExpo(prog(lt, 0.5, 1.3));
    katmanda(() => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(W / 2 - (lw / 2 + 20 * U) * p, ly - 20 * U, (lw + 40 * U) * p, lh + 40 * U);
      ctx.clip();
      ctx.drawImage(im, lx, ly, lw, lh);
      ctx.restore();
      parlama(lx, lx + lw, prog(lt, 2.0, 1.0));
    });
    let y = ly + lh + 70 * U;
    const cp = eOutCubic(prog(lt, 1.3, 0.8));
    ctx.fillStyle = R.vurgu;
    ctx.fillRect(W / 2 - 70 * U * cp, y, 140 * U * cp, 3 * U);
    y += 70 * U;
    belir(d.alt, W / 2, y, prog(lt, 1.5, 0.8), { agirlik: 400, boyut: 34 * U, hiza: 'center' });
    y += 90 * U;
    belir(d.web, W / 2, y, prog(lt, 1.8, 0.8), { agirlik: 600, boyut: (DIKEY ? 38 : 36) * U, genis: true, hiza: 'center' });
    y += 62 * U;
    const ao = { agirlik: 400, boyut: (DIKEY ? 26 : 22) * U, renk: R.metinIkincil, hiza: 'center' };
    for (const sat of satirla(d.adres, W - 2 * KENAR, ao)) {
      belir(sat, W / 2, y, prog(lt, 2.1, 0.8), ao);
      y += ao.boyut * 1.45;
    }
    y += 40 * U;
    belir(d.ofisler.join('  ·  '), W / 2, y, prog(lt, 2.4, 0.8), { agirlik: 600, boyut: 17 * U, genis: true, aralik: 6 * U, renk: R.vurgu, hiza: 'center' });
  };

  // ---- geçişler ve son işlem ----
  // Geçiş sahne sınırının iki yanına eşit yayılır: önceki sahnenin son yarısı + yeni sahnenin ilk yarısı.
  function gecisBul(t, i) {
    for (const j of [i, i + 1]) {
      const s = SAHNELER[j];
      if (!s || j === 0 || !s.gecis) continue;
      const p = (t - s.bas + s.gecisSuresi / 2) / s.gecisSuresi;
      if (p >= 0 && p < 1) return { yeni: j, p };
    }
    return null;
  }

  function maviPerde(p) {
    const a = eInOutCubic(1 - Math.abs(2 * p - 1));
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, rgba(R.marka, a));
    g.addColorStop(1, rgba('#141C52', a));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function olcekle(k) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(k, k);
    ctx.translate(-W / 2, -H / 2);
  }

  const DAMGASIZ = new Set(['giris', 'logo', 'kapanis']);
  function damga(i, t) {
    const s = SAHNELER[i];
    if (DAMGASIZ.has(s.tur)) return;
    const onceki = SAHNELER[i - 1];
    const a = onceki && DAMGASIZ.has(onceki.tur) ? eOutCubic(prog(t - s.bas, 0.5, 0.6)) : 1;
    const w = (DIKEY ? 150 : 170) * U;
    ctx.save();
    ctx.shadowColor = 'rgba(5,10,35,0.45)';
    ctx.shadowBlur = 18 * U;
    logoCiz('logo-beyaz.png', W - KENAR * 0.75 - w, (DIKEY ? 70 : 52) * U, w, 0.95 * a);
    ctx.restore();
  }

  const gren = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const img = g.createImageData(256, 256);
    const rnd = mulberry32(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  })();
  let grenDesen = null;

  function sonIslem(t) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    const rnd = mulberry32(Math.floor(t * 30) + 1);
    grenDesen ??= ctx.createPattern(gren, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(-Math.floor(rnd() * 256), -Math.floor(rnd() * 256));
    ctx.fillStyle = grenDesen;
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
    const kararma = Math.max(1 - prog(t, 0, 0.6), prog(t, TOPLAM - 1.0, 1.0));
    if (kararma > 0) {
      ctx.fillStyle = `rgba(0,0,0,${kararma})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function cizSahne(s, lt) {
    ctx.save();
    CIZ[s.tur](s, lt);
    ctx.restore();
  }

  window.cizKare = (t) => {
    ctx = anaCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingQuality = 'high';

    let i = SAHNELER.findIndex((s) => t < s.bas + s.sure);
    if (i < 0) i = SAHNELER.length - 1;
    const gecis = gecisBul(t, i);
    let damgaSahnesi = i;
    let maviIlerleme = null;

    if (!gecis) {
      cizSahne(SAHNELER[i], t - SAHNELER[i].bas);
    } else {
      const { yeni, p } = gecis;
      const o = SAHNELER[yeni - 1], s = SAHNELER[yeni];
      damgaSahnesi = p < 0.5 ? yeni - 1 : yeni;
      if (s.gecis === 'mavi') {
        const g = p < 0.5 ? o : s;
        cizSahne(g, t - g.bas);
        maviIlerleme = p;
      } else {
        // eski sahne hafifçe yaklaşırken yeni sahne biraz yakından gelip yerine oturur
        const e = eInOutCubic(p);
        ctx.save();
        olcekle(lerp(1, 1.025, e));
        cizSahne(o, t - o.bas);
        ctx.restore();
        katmanda(() => {
          olcekle(lerp(1.025, 1, e));
          cizSahne(s, t - s.bas);
        }, e);
      }
    }
    damga(damgaSahnesi, t);
    if (maviIlerleme !== null) maviPerde(maviIlerleme);
    sonIslem(t);
  };

  window.hazirla = async () => {
    const adlar = new Set(['logo-beyaz.png', '35-yil-beyaz.png']);
    const topla = (o) => {
      if (Array.isArray(o)) o.forEach(topla);
      else if (o && typeof o === 'object') {
        for (const [k, v] of Object.entries(o)) {
          if ((k === 'gorsel' || k === 'logo') && typeof v === 'string') adlar.add(v);
          else if (k === 'gorseller' || k === 'isveren') v.forEach((a) => adlar.add(a));
          else topla(v);
        }
      }
    };
    topla(K.sahneler);
    await Promise.all([...adlar].map((ad) => new Promise((tamam, hata) => {
      const im = new Image();
      im.onload = tamam;
      im.onerror = () => hata(new Error(`Görsel yüklenemedi: gorseller/${ad}`));
      im.src = `gorseller/${ad}`;
      GORSEL[ad] = im;
    })));
    await Promise.all([400, 600, 700, 800].map((w) => document.fonts.load(`${w} 40px 'Archivo Variable'`, 'GÜÇLÜ İŞ ğüşıöç')));
    await document.fonts.ready;
    return { toplam: TOPLAM };
  };
})();
