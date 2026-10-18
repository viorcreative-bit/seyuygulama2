'use strict';
// Güçlü İnşaat tanıtım videosu — kare kare çizilen canvas animasyonu.
// render.mjs her kare için window.cizKare(saniye) çağırır; aynı saniye her zaman aynı görüntüyü verir.
(() => {
  const K = window.VIDEO_CONFIG;
  const { width: W, height: H } = window.VIDEO_FORMAT;
  const canvas = document.getElementById('c');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const DIKEY = H > W;
  const U = Math.min(W, H) / 1080;
  const R = K.renkler;
  const Z = K.zamanlama;

  const F_BASLIK = "'Inter Display', 'Inter', sans-serif";
  const F_METIN = "'Inter', sans-serif";
  const F_MONO = "'DejaVu Sans Mono', monospace";
  const font = (agirlik, px, aile) => `${agirlik} ${px}px ${aile}`;

  // ---- yardımcılar ----
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, x) => a + (b - a) * x;
  const prog = (t, bas, sure) => clamp((t - bas) / sure);
  const eOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const eInCubic = (x) => x * x * x;
  const eInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const eOutBack = (x) => {
    const c1 = 1.4, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };

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

  function cizgiUzunlugu(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
  }

  // Çoklu çizgileri sırayla, toplam uzunluğun p kadarı çizilecek şekilde çizer.
  function kismiCizgiler(cizgiler, p) {
    const toplam = cizgiler.reduce((a, c) => a + cizgiUzunlugu(c), 0);
    let kalan = toplam * clamp(p);
    ctx.beginPath();
    for (const pts of cizgiler) {
      if (kalan <= 0) break;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length && kalan > 0; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const seg = Math.hypot(x1 - x0, y1 - y0);
        if (seg <= kalan) {
          ctx.lineTo(x1, y1);
          kalan -= seg;
        } else {
          const f = kalan / seg;
          ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
          kalan = 0;
        }
      }
    }
    ctx.stroke();
  }

  function cember(cx, cy, r, a0, a1, adim = 28) {
    const pts = [];
    for (let i = 0; i <= adim; i++) {
      const a = lerp(a0, a1, i / adim);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }

  function satirlaraBol(metin, maxW) {
    const kelimeler = metin.split(' ');
    const satirlar = [];
    let satir = '';
    for (const k of kelimeler) {
      const deneme = satir ? `${satir} ${k}` : k;
      if (ctx.measureText(deneme).width > maxW && satir) {
        satirlar.push(satir);
        satir = k;
      } else {
        satir = deneme;
      }
    }
    if (satir) satirlar.push(satir);
    return satirlar;
  }

  // ---- arka plan, gren, kararma ----
  function arkaPlan(t, izgaraA) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, R.arkaPlanUst);
    g.addColorStop(1, R.arkaPlanAlt);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (izgaraA <= 0) return;
    const kucuk = 40 * U, buyuk = 200 * U;
    const ox = (t * 7 * U) % buyuk, oy = (t * 3 * U) % buyuk;
    ctx.lineWidth = 1;
    for (const [adim, a] of [[kucuk, 0.035], [buyuk, 0.075]]) {
      ctx.beginPath();
      for (let x = -buyuk + ox; x < W + buyuk; x += adim) {
        const px = Math.round(x) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, H);
      }
      for (let y = -buyuk + oy; y < H + buyuk; y += adim) {
        const py = Math.round(y) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(W, py);
      }
      ctx.strokeStyle = `rgba(150,190,230,${a * izgaraA})`;
      ctx.stroke();
    }
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
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    const rnd = mulberry32(Math.floor(t * 30) + 1);
    grenDesen ??= ctx.createPattern(gren, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(-Math.floor(rnd() * 256), -Math.floor(rnd() * 256));
    ctx.fillStyle = grenDesen;
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();

    const kararma = Math.max(1 - prog(t, 0, 0.6), prog(t, Z.bitis - 0.8, 0.8));
    if (kararma > 0) {
      ctx.fillStyle = `rgba(0,0,0,${kararma})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---- ortak metin parçaları ----
  function etiketCiz(metin, x, y, p, hiza = 'left') {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.font = font(500, 22 * U, F_MONO);
    ctx.letterSpacing = `${4 * U}px`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = R.vurgu;
    const cizgi = 46 * U * eOutCubic(p);
    if (hiza === 'center') {
      const w = ctx.measureText(metin).width;
      ctx.textAlign = 'center';
      ctx.fillText(metin, x, y);
      ctx.fillRect(x - w / 2 - 20 * U - cizgi, y - 1.5 * U, cizgi, 3 * U);
      ctx.fillRect(x + w / 2 + 20 * U, y - 1.5 * U, cizgi, 3 * U);
    } else {
      ctx.fillRect(x, y - 1.5 * U, cizgi, 3 * U);
      ctx.fillText(metin, x + 62 * U - (1 - p) * 20 * U, y);
    }
    ctx.restore();
  }

  // Maske içinden aşağıdan yukarı kayarak gelen, yukarı kayarak çıkan satırlar.
  function maskeliSatir(metin, x, taban, boyut, giris, cikis, renk, hiza = 'left') {
    if (giris <= 0 || cikis >= 1) return;
    const kayma = boyut * 1.3;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, taban - boyut * 1.0, W, boyut * 1.28);
    ctx.clip();
    ctx.font = font(800, boyut, F_BASLIK);
    ctx.textAlign = hiza;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = renk;
    ctx.fillText(metin, x, taban + (1 - giris) * kayma - cikis * kayma);
    ctx.restore();
  }

  function metinBlogu(sahne, t, t0, tCikis) {
    const boyut0 = (DIKEY ? 88 : 80) * U;
    const x = DIKEY ? 90 * U : W * 0.078;
    const yEtiket = DIKEY ? H * 0.16 : H * 0.3;
    const maxW = DIKEY ? W - 180 * U : W * 0.46;
    ctx.font = font(800, boyut0, F_BASLIK);
    const enGenis = Math.max(...sahne.satirlar.map((s) => ctx.measureText(s).width));
    const boyut = Math.min(boyut0, (boyut0 * maxW) / enGenis);

    const ep = eOutExpo(prog(t, t0, 0.8)) * (1 - eInCubic(prog(t, tCikis, 0.45)));
    etiketCiz(sahne.etiket, x, yEtiket, ep);

    sahne.satirlar.forEach((s, i) => {
      const giris = eOutExpo(prog(t, t0 + 0.15 + i * 0.12, 1.0));
      const cikis = eInCubic(prog(t, tCikis + i * 0.06, 0.5));
      const taban = yEtiket + 40 * U + boyut * 0.95 + i * boyut * 1.1;
      const renk = i === sahne.satirlar.length - 1 ? R.vurgu : R.metin;
      maskeliSatir(s, x, taban, boyut, giris, cikis, renk);
    });
  }

  // ---- sahne 1–2: plan ve yükselen silüet ----
  const SILUET = DIKEY ? { cx: W * 0.5, gy: H * 0.8, s: U * 0.86 } : { cx: W * 0.7, gy: H * 0.86, s: U * 0.9 };
  const BINALAR = [
    { x0: -190, x1: 170, h: 640, kat: 16, sutun: 6, bas: 0.0 },
    { x0: -520, x1: -240, h: 370, kat: 9, sutun: 4, bas: 0.45 },
    { x0: 270, x1: 510, h: 300, kat: 7, sutun: 4, bas: 0.8 },
  ];
  const VINC_X = 220;
  const OLCU_X = 560;

  {
    const rnd = mulberry32(42);
    for (const b of BINALAR) {
      b.pencereler = [];
      for (let i = 0; i < b.kat * b.sutun; i++) {
        b.pencereler.push({
          yanik: rnd() < 0.58,
          seviye: 0.55 + rnd() * 0.45,
          gecikme: rnd() * 1.1,
          renk: rnd() < 0.7 ? '245,184,61' : '255,222,160',
        });
      }
    }
  }

  const UZAK_BINALAR = (() => {
    const rnd = mulberry32(9);
    const liste = [];
    for (let x = -1100; x < 1100; ) {
      const w = 60 + rnd() * 90;
      liste.push({ x0: x, x1: x + w, h: 110 + rnd() * 260, gecikme: rnd() * 0.8 });
      x += w + 6 + rnd() * 18;
    }
    return liste;
  })();

  function kamera(t) {
    const { cx, gy } = SILUET;
    const k = 1 + 0.06 * eInOutCubic(prog(t, 0, Z.hizmetler));
    ctx.translate(cx, gy);
    ctx.scale(k, k);
    ctx.translate(-cx, -gy);
  }

  function planCiz(t) {
    const { cx, gy, s } = SILUET;
    const t0 = Z.giris;
    const planA = 1 - 0.7 * prog(t, Z.yukselis + 1.2, 2.5);
    ctx.lineCap = 'butt';

    const zp = eOutExpo(prog(t, t0 + 0.3, 1.2));
    ctx.strokeStyle = R.vurgu;
    ctx.lineWidth = 2 * U;
    ctx.beginPath();
    ctx.moveTo(cx - 760 * s * zp, gy);
    ctx.lineTo(cx + 760 * s * zp, gy);
    ctx.stroke();

    BINALAR.forEach((b, i) => {
      const p = eInOutCubic(prog(t, t0 + 1.0 + i * 0.25, 1.6));
      if (p <= 0) return;
      const x0 = cx + b.x0 * s, x1 = cx + b.x1 * s, ust = gy - b.h * s;
      ctx.strokeStyle = rgba(R.vurgu, 0.9 * planA);
      ctx.lineWidth = 2 * U;
      kismiCizgiler([[[x0, gy], [x0, ust], [x1, ust], [x1, gy]]], p);

      const kp = prog(t, t0 + 1.6 + i * 0.25, 1.4);
      ctx.strokeStyle = `rgba(170,200,230,${0.22 * planA})`;
      ctx.lineWidth = 1 * U;
      ctx.beginPath();
      for (let f = 1; f < b.kat; f++) {
        const fp = clamp(kp * b.kat - f + 1);
        if (fp <= 0) break;
        const y = gy - (f * b.h * s) / b.kat;
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + (x1 - x0) * eOutCubic(fp), y);
      }
      // çapraz kontrol çizgileri, teknik çizim havası için
      ctx.moveTo(x0, gy);
      ctx.lineTo(lerp(x0, x1, eOutCubic(kp)), lerp(gy, ust, eOutCubic(kp)));
      ctx.stroke();
    });

    const op = eOutCubic(prog(t, t0 + 2.4, 1.0));
    if (op > 0) {
      const dx = cx + OLCU_X * s, ust = gy - 640 * s;
      ctx.strokeStyle = rgba(R.vurgu, 0.75 * planA);
      ctx.fillStyle = rgba(R.vurgu, 0.85 * planA);
      ctx.lineWidth = 1.2 * U;
      ctx.beginPath();
      ctx.moveTo(dx, gy);
      ctx.lineTo(dx, lerp(gy, ust, op));
      for (const y of [gy, ust]) {
        if (y === ust && op < 1) continue;
        ctx.moveTo(dx - 9 * U, y + 9 * U);
        ctx.lineTo(dx + 9 * U, y - 9 * U);
      }
      ctx.stroke();
      ctx.save();
      ctx.setLineDash([6 * U, 6 * U]);
      ctx.beginPath();
      const ex = lerp(dx, cx + 170 * s, op);
      ctx.moveTo(dx + 12 * U, ust);
      ctx.lineTo(ex, ust);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = op * planA;
      ctx.translate(dx + 16 * U, (gy + ust) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = font(500, 16 * U, F_MONO);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('48.00', 0, 0);
      ctx.restore();
    }
  }

  function uzakSiluet(t) {
    const { cx, gy, s } = SILUET;
    const lt = t - Z.yukselis;
    for (const b of UZAK_BINALAR) {
      const p = eInOutCubic(prog(lt, 0.2 + b.gecikme, 1.8));
      const a = 0.55 * (1 - prog(Math.abs((b.x0 + b.x1) / 2), 450, 550));
      if (p <= 0 || a <= 0) continue;
      ctx.fillStyle = `rgba(28,46,64,${a})`;
      const h = b.h * s * p * 0.9;
      ctx.fillRect(cx + b.x0 * s, gy - h, (b.x1 - b.x0) * s, h);
    }
  }

  function gunBatimi(t) {
    const { cx, gy, s } = SILUET;
    const a = eInOutCubic(prog(t, Z.yukselis - 0.5, 3));
    if (a <= 0) return;
    const g = ctx.createRadialGradient(cx, gy, 0, cx, gy, 1000 * s);
    g.addColorStop(0, rgba(R.vurgu, 0.16 * a));
    g.addColorStop(0.5, rgba(R.vurgu, 0.05 * a));
    g.addColorStop(1, rgba(R.vurgu, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function binaCiz(b, t) {
    const { cx, gy, s } = SILUET;
    const lt = t - Z.yukselis - b.bas;
    const dolum = eInOutCubic(prog(lt, 0, 2.6));
    if (dolum <= 0) return;
    const x0 = cx + b.x0 * s, x1 = cx + b.x1 * s, w = x1 - x0;
    const tamH = b.h * s, yUst = gy - tamH * dolum;

    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#1A2838');
    g.addColorStop(0.55, '#22354A');
    g.addColorStop(1, '#162332');
    ctx.fillStyle = g;
    ctx.fillRect(x0, yUst, w, gy - yUst);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, yUst, w, gy - yUst);
    ctx.clip();
    const katH = tamH / b.kat;
    const pad = w * 0.09, bosluk = w * 0.045;
    const pw = (w - 2 * pad - bosluk * (b.sutun - 1)) / b.sutun, ph = katH * 0.52;
    for (let f = 0; f < b.kat; f++) {
      const yKat = gy - (f + 1) * katH;
      if (yKat + katH < yUst) break;
      const katZamani = (f / b.kat) * 2.0;
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(x0, yKat, w, 1.5 * U);
      for (let c = 0; c < b.sutun; c++) {
        const p = b.pencereler[f * b.sutun + c];
        const px = x0 + pad + c * (pw + bosluk), py = yKat + (katH - ph) * 0.55;
        ctx.fillStyle = '#101B27';
        ctx.fillRect(px, py, pw, ph);
        if (!p.yanik) continue;
        const a = eOutCubic(prog(lt, katZamani + 0.5 + p.gecikme, 0.5)) * p.seviye;
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(${p.renk},${a})`;
        ctx.fillRect(px, py, pw, ph);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x0, yUst, 3 * U, gy - yUst);
    ctx.restore();

    if (dolum < 1) {
      ctx.save();
      ctx.shadowColor = R.vurgu;
      ctx.shadowBlur = 22 * U;
      ctx.fillStyle = R.vurguAcik;
      ctx.fillRect(x0 - 5 * U, yUst - 2 * U, w + 10 * U, 4 * U);
      ctx.restore();
    } else {
      ctx.fillStyle = '#26394F';
      ctx.fillRect(x0 - 4 * U, yUst - 8 * U, w + 8 * U, 8 * U);
    }
  }

  function vincCiz(t) {
    const lt = t - Z.yukselis;
    const kuleP = eInOutCubic(prog(lt, 0.3, 1.4));
    if (kuleP <= 0) return;
    const { cx, gy, s } = SILUET;
    const tx = cx + VINC_X * s, kw = 24 * s, kuleH = 760 * s;
    const yUst = gy - kuleH * kuleP;
    ctx.save();
    ctx.strokeStyle = R.vurgu;
    ctx.fillStyle = R.vurgu;
    ctx.lineWidth = 2.2 * U;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(tx - kw / 2, gy);
    ctx.lineTo(tx - kw / 2, yUst);
    ctx.moveTo(tx + kw / 2, gy);
    ctx.lineTo(tx + kw / 2, yUst);
    let sol = true;
    for (let y = gy; y > yUst + 0.5; y -= kw) {
      const y2 = Math.max(yUst, y - kw);
      ctx.moveTo(sol ? tx - kw / 2 : tx + kw / 2, y);
      ctx.lineTo(sol ? tx + kw / 2 : tx - kw / 2, y2);
      ctx.moveTo(tx - kw / 2, y2);
      ctx.lineTo(tx + kw / 2, y2);
      sol = !sol;
    }
    ctx.stroke();
    ctx.fillRect(tx - kw, gy - 6 * s, kw * 2, 6 * s);

    const jp = eOutCubic(prog(lt, 1.6, 1.0));
    if (jp > 0) {
      const jy = gy - kuleH, jh = 22 * s;
      const solL = 470 * s * jp, sagL = 160 * s * jp;
      const tepeY = jy - jh - 70 * s;
      ctx.beginPath();
      ctx.moveTo(tx - solL, jy);
      ctx.lineTo(tx + sagL, jy);
      ctx.moveTo(tx - solL + 30 * s * jp, jy - jh);
      ctx.lineTo(tx + sagL, jy - jh);
      for (let x = tx + sagL, i = 0; x > tx - solL + 30 * s * jp; x -= jh, i++) {
        ctx.moveTo(x, i % 2 ? jy : jy - jh);
        ctx.lineTo(Math.max(tx - solL, x - jh), i % 2 ? jy - jh : jy);
      }
      ctx.moveTo(tx - kw / 2, jy - jh);
      ctx.lineTo(tx, tepeY);
      ctx.lineTo(tx + kw / 2, jy - jh);
      ctx.moveTo(tx, tepeY);
      ctx.lineTo(tx - solL * 0.72, jy - jh);
      ctx.moveTo(tx, tepeY);
      ctx.lineTo(tx + sagL * 0.95, jy - jh);
      ctx.stroke();
      ctx.fillRect(tx - kw / 2 - 24 * s, jy, 24 * s, 20 * s);
      ctx.fillStyle = '#2A3B4E';
      ctx.fillRect(tx + sagL - 46 * s, jy, 42 * s, 34 * s);
      ctx.strokeRect(tx + sagL - 46 * s, jy, 42 * s, 34 * s);

      const yp = prog(lt, 2.4, 0.6);
      if (yp > 0) {
        const tz = lt - 2.4;
        const arabaX = tx - (110 + 260 * (0.5 - 0.5 * Math.cos(tz * 0.55))) * s;
        const halat = (120 + 90 * (0.5 - 0.5 * Math.cos(tz * 0.8))) * s * yp;
        const salinim = 0.05 * Math.sin(tz * 1.7);
        ctx.globalAlpha = yp;
        ctx.fillStyle = R.vurgu;
        ctx.fillRect(arabaX - 10 * s, jy, 20 * s, 7 * s);
        ctx.lineWidth = 1.2 * U;
        ctx.beginPath();
        ctx.moveTo(arabaX, jy + 7 * s);
        ctx.lineTo(arabaX, jy + halat);
        ctx.stroke();
        ctx.translate(arabaX, jy + halat);
        ctx.rotate(salinim);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-48 * s, 26 * s);
        ctx.moveTo(0, 0);
        ctx.lineTo(48 * s, 26 * s);
        ctx.stroke();
        ctx.fillStyle = '#C9CED4';
        ctx.fillRect(-62 * s, 26 * s, 124 * s, 5 * s);
        ctx.fillRect(-62 * s, 38 * s, 124 * s, 5 * s);
        ctx.fillRect(-4 * s, 26 * s, 8 * s, 17 * s);
      }
    }
    ctx.restore();
  }

  function siluetSahnesi(t) {
    ctx.save();
    kamera(t);
    gunBatimi(t);
    uzakSiluet(t);
    for (const b of BINALAR) binaCiz(b, t);
    planCiz(t);
    vincCiz(t);
    ctx.restore();

    metinBlogu(K.sahneler.giris, t, Z.giris + 0.9, Z.yukselis - 0.65);
    metinBlogu(K.sahneler.yukselis, t, Z.yukselis + 0.5, Z.hizmetler - 0.95);
  }

  // ---- geçiş: çapraz vurgu rengi silme ----
  function silmeGecisi(t, merkez) {
    const p = prog(t, merkez - 0.45, 0.9);
    if (p <= 0 || p >= 1) return;
    const egim = H * 0.35;
    const gen = W + 2 * egim + 200 * U;
    const bant = (x, genislik, renk) => {
      ctx.fillStyle = renk;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + egim, 0);
      ctx.lineTo(x + egim + genislik, 0);
      ctx.lineTo(x + genislik, H);
      ctx.closePath();
      ctx.fill();
    };
    const e = eInOutCubic(p);
    const x = lerp(-gen - egim, W, e);
    bant(x + 140 * U, gen, R.vurgu);
    bant(x + gen + 140 * U, 60 * U, R.vurguAcik);
    bant(x, 140 * U, '#B87700');
  }

  // ---- sahne 3: hizmetler ----
  const IKONLAR = {
    konut: () => [
      [[10, 50], [50, 14], [90, 50]],
      [[20, 42], [20, 88], [80, 88], [80, 42]],
      [[42, 88], [42, 64], [58, 64], [58, 88]],
      [[68, 32], [68, 20], [76, 20], [76, 39]],
    ],
    ticari: () => {
      const c = [
        [[8, 90], [92, 90]],
        [[28, 90], [28, 12], [72, 12], [72, 90]],
      ];
      for (let y = 25; y <= 77; y += 13) c.push([[38, y], [46, y]], [[54, y], [62, y]]);
      return c;
    },
    donusum: () => [
      [[4, 90], [96, 90]],
      [[8, 90], [8, 62], [30, 62], [30, 90]],
      [[38, 70], [56, 70]],
      [[50, 64], [56, 70], [50, 76]],
      [[64, 90], [64, 22], [92, 22], [92, 90]],
      [[72, 36], [84, 36]],
      [[72, 50], [84, 50]],
      [[72, 64], [84, 64]],
    ],
    yonetim: () => [
      [[22, 16], [78, 16], [78, 92], [22, 92], [22, 16]],
      [[38, 10], [62, 10], [62, 22], [38, 22], [38, 10]],
      [[32, 44], [38, 50], [48, 38]],
      [[56, 44], [68, 44]],
      [[32, 68], [38, 74], [48, 62]],
      [[56, 68], [68, 68]],
    ],
    baret: () => [
      cember(50, 62, 32, Math.PI, Math.PI * 2),
      [[8, 62], [92, 62], [92, 72], [8, 72], [8, 62]],
      [[50, 30], [50, 50]],
      [[36, 36], [40, 62]],
      [[64, 36], [60, 62]],
    ],
  };

  function ikonCiz(ad, x, y, boyut, p) {
    const olcek = boyut / 100;
    const cizgiler = (IKONLAR[ad] || IKONLAR.baret)().map((c) => c.map(([px, py]) => [x + px * olcek, y + py * olcek]));
    ctx.save();
    ctx.strokeStyle = R.vurgu;
    ctx.lineWidth = 3.2 * U;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    kismiCizgiler(cizgiler, p);
    ctx.restore();
  }

  function hizmetlerSahnesi(t) {
    const S = K.sahneler.hizmetler;
    const t0 = Z.hizmetler, cikis = Z.degerler - 0.7;
    const liste = S.liste;
    const n = liste.length;

    const yEtiket = DIKEY ? H * 0.2 : H * 0.19;
    const ep = eOutExpo(prog(t, t0 + 0.2, 0.8)) * (1 - eInCubic(prog(t, cikis, 0.45)));
    etiketCiz(S.etiket, W / 2, yEtiket, ep, 'center');

    const bBoyut0 = (DIKEY ? 80 : 72) * U;
    ctx.font = font(800, bBoyut0, F_BASLIK);
    const bBoyut = Math.min(bBoyut0, (bBoyut0 * W * 0.86) / ctx.measureText(S.baslik).width);
    maskeliSatir(
      S.baslik, W / 2, yEtiket + 50 * U + bBoyut * 0.8, bBoyut,
      eOutExpo(prog(t, t0 + 0.35, 1.0)), eInCubic(prog(t, cikis + 0.1, 0.5)), R.metin, 'center',
    );

    const sutun = DIKEY ? Math.min(2, n) : n;
    const satir = Math.ceil(n / sutun);
    const bosluk = (DIKEY ? 40 : 36) * U;
    const kartW = Math.min((DIKEY ? 450 : 380) * U, (W - 2 * (DIKEY ? 70 : 110) * U - (sutun - 1) * bosluk) / sutun);
    const kartH = (DIKEY ? 440 : 380) * U;
    const yUst = DIKEY ? H * 0.32 : H * 0.4;
    const pad = 40 * U;
    const ikonBoyut = 96 * U;

    liste.forEach((h, i) => {
      const kp = eOutExpo(prog(t, t0 + 0.6 + i * 0.18, 1.0));
      const kc = eInCubic(prog(t, cikis + i * 0.07, 0.5));
      const a = kp * (1 - kc);
      if (a <= 0) return;
      const r = Math.floor(i / sutun), c = i % sutun;
      const buSatirdaki = Math.min(sutun, n - r * sutun);
      const satirW = buSatirdaki * kartW + (buSatirdaki - 1) * bosluk;
      const vurgu = Math.sin(Math.PI * prog(t, t0 + 1.8 + i * 1.2, 1.2));
      const x = (W - satirW) / 2 + c * (kartW + bosluk);
      const y = yUst + r * (kartH + bosluk) + (1 - kp) * 70 * U + kc * 60 * U - vurgu * 10 * U;

      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.roundRect(x, y, kartW, kartH, 6 * U);
      ctx.fillStyle = `rgba(255,255,255,${0.035 + 0.025 * vurgu})`;
      ctx.fill();
      ctx.lineWidth = 1.5 * U;
      ctx.strokeStyle = vurgu > 0.01 ? rgba(R.vurgu, 0.15 + 0.6 * vurgu) : 'rgba(255,255,255,0.12)';
      ctx.stroke();

      const bar = eOutCubic(prog(t, t0 + 0.9 + i * 0.18, 0.8));
      ctx.fillStyle = R.vurgu;
      ctx.fillRect(x, y, kartW * bar, (4 + 3 * vurgu) * U);

      ctx.font = font(500, 18 * U, F_MONO);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(String(i + 1).padStart(2, '0'), x + kartW - pad, y + pad);

      const ix = x + pad, iy = y + 52 * U;
      ctx.beginPath();
      ctx.roundRect(ix - 16 * U, iy - 16 * U, ikonBoyut + 32 * U, ikonBoyut + 32 * U, 10 * U);
      ctx.fillStyle = rgba(R.vurgu, 0.08 + 0.08 * vurgu);
      ctx.fill();
      ikonCiz(h.ikon, ix, iy, ikonBoyut, eInOutCubic(prog(t, t0 + 1.0 + i * 0.18, 1.2)));

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = R.metin;
      const baslikBoyut = (DIKEY ? 38 : 34) * U;
      ctx.font = font(700, baslikBoyut, F_METIN);
      let ty = y + (DIKEY ? 268 : 258) * U;
      for (const sat of satirlaraBol(h.baslik, kartW - 2 * pad)) {
        ctx.fillText(sat, x + pad, ty);
        ty += baslikBoyut * 1.2;
      }
      const aciklamaBoyut = (DIKEY ? 27 : 23) * U;
      ctx.font = font(400, aciklamaBoyut, F_METIN);
      ctx.fillStyle = R.metinIkincil;
      ty += aciklamaBoyut * 0.5;
      for (const sat of satirlaraBol(h.aciklama, kartW - 2 * pad)) {
        ctx.fillText(sat, x + pad, ty);
        ty += aciklamaBoyut * 1.4;
      }
      ctx.restore();
    });
  }

  // ---- sahne 4: değerler ----
  function degerlerSahnesi(t) {
    const S = K.sahneler.degerler;
    const t0 = Z.degerler, t1 = Z.logo;
    const n = S.kelimeler.length;
    const slot = (t1 - t0) / n;
    const aktif = clamp(Math.floor((t - t0) / slot), 0, n - 1);

    const yEtiket = DIKEY ? H * 0.2 : H * 0.17;
    const ep = eOutExpo(prog(t, t0 + 0.1, 0.8)) * (1 - eInCubic(prog(t, t1 - 0.45, 0.4)));
    etiketCiz(S.etiket, W / 2, yEtiket, ep, 'center');
    if (ep > 0) {
      ctx.save();
      ctx.globalAlpha = ep * 0.7;
      ctx.font = font(500, 20 * U, F_MONO);
      ctx.fillStyle = R.metinIkincil;
      ctx.textAlign = 'center';
      ctx.fillText(`${String(aktif + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, W / 2, DIKEY ? H * 0.8 : H * 0.85);
      ctx.restore();
    }

    const lt = t - (t0 + aktif * slot);
    const kelime = S.kelimeler[aktif];
    const satirlar = DIKEY && kelime.includes(' ') ? kelime.split(' ') : [kelime];
    const boyut0 = (DIKEY ? 170 : 200) * U;
    ctx.font = font(900, boyut0, F_BASLIK);
    const enGenis = Math.max(...satirlar.map((s) => ctx.measureText(s).width));
    const boyut = Math.min(boyut0, (boyut0 * W * 0.84) / enGenis);
    const lh = boyut * 1.0, capH = boyut * 0.727;
    const blok = (satirlar.length - 1) * lh + capH;

    const parlama = Math.exp(-lt * 2.5);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
    g.addColorStop(0, rgba(R.vurgu, 0.16 * parlama));
    g.addColorStop(1, rgba(R.vurgu, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.font = font(900, boyut * 1.7, F_BASLIK);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2 * U;
    ctx.strokeStyle = `rgba(255,255,255,${0.05 * eOutCubic(prog(lt, 0, 0.6)) * (1 - prog(lt, slot - 0.3, 0.3))})`;
    ctx.strokeText(kelime, W / 2 + (lt - slot / 2) * 50 * U, H / 2);
    ctx.restore();

    const sonKelime = aktif === n - 1;
    const cikis = sonKelime ? eInCubic(prog(lt, slot - 0.45, 0.45)) : eInCubic(prog(lt, slot - 0.32, 0.32));
    ctx.font = font(900, boyut, F_BASLIK);
    const harfAdimi = Math.min(0.035, 0.36 / kelime.length);
    let harfSirasi = 0;
    satirlar.forEach((s, k) => {
      const taban = H / 2 - blok / 2 + capH + k * lh;
      const sw = ctx.measureText(s).width;
      const x0 = W / 2 - sw / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, taban - boyut * 0.98, W, boyut * 1.22);
      ctx.clip();
      ctx.fillStyle = R.metin;
      ctx.textBaseline = 'alphabetic';
      for (let j = 0; j < s.length; j++) {
        const hp = eOutExpo(prog(lt, 0.02 + harfSirasi++ * harfAdimi, 0.7));
        const ox = ctx.measureText(s.slice(0, j)).width;
        ctx.fillText(s[j], x0 + ox, taban + (1 - hp) * boyut * 1.25 - cikis * boyut * 1.25);
      }
      ctx.restore();

      if (k === satirlar.length - 1) {
        const bp = eOutExpo(prog(lt, 0.25, 0.7));
        const bw = sw * bp * (1 - cikis);
        ctx.fillStyle = R.vurgu;
        ctx.fillRect(W / 2 - bw / 2, taban + boyut * 0.3, bw, 10 * U);
      }
    });
  }

  // ---- sahne 5: logo ----
  const katman = document.createElement('canvas');
  katman.width = W;
  katman.height = H;
  const kctx = katman.getContext('2d');

  function logoSahnesi(t) {
    const lt = t - Z.logo;
    const F = K.firma;
    const M = (DIKEY ? 250 : 220) * U;

    const S1 = 0.8 * M;
    kctx.font = font(900, S1, F_BASLIK);
    const adOlcu = kctx.measureText(F.ad);
    const gW = adOlcu.width;
    const capH1 = 0.727 * S1;
    const inis = adOlcu.actualBoundingBoxDescent;
    const S2 = 0.23 * M, capH2 = 0.727 * S2;
    const altUst = capH1 + Math.max(inis + 0.07 * M, 0.17 * M);
    const markaH = altUst + capH2;

    const iletisim = [K.iletisim.web, K.iletisim.telefon, K.iletisim.adres].filter(Boolean);
    const sloganBoyut = (DIKEY ? 44 : 40) * U;
    const iletisimBoyut = (DIKEY ? 28 : 26) * U;

    let markX, markY, metinX, metinY, sloganY;
    if (DIKEY) {
      const blokH = M + 0.3 * M + markaH + 150 * U + iletisim.length * 50 * U;
      markX = (W - M) / 2;
      markY = H / 2 - blokH / 2 - 40 * U;
      metinX = (W - gW) / 2;
      metinY = markY + M + 0.3 * M;
      sloganY = metinY + markaH + 120 * U;
    } else {
      const grupW = M + 0.26 * M + gW;
      const blokH = markaH + 150 * U + (iletisim.length ? 70 * U : 0);
      markX = (W - grupW) / 2;
      markY = H / 2 - blokH / 2 - 20 * U;
      metinX = markX + M * 1.26;
      metinY = markY;
      sloganY = markY + markaH + 125 * U;
    }
    const markH = DIKEY ? M : markaH;

    const ga = eOutCubic(prog(lt, 0, 1.2)) * (1 - prog(t, Z.bitis - 0.8, 0.8));
    const gcx = DIKEY ? W / 2 : W / 2, gcy = DIKEY ? markY + M : markY + markaH / 2;
    const g = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, 760 * U);
    g.addColorStop(0, rgba(R.vurgu, 0.17 * ga));
    g.addColorStop(1, rgba(R.vurgu, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    kctx.clearRect(0, 0, W, H);

    // amblem: tabana oturan üç yükselen kule
    const tabanH = 0.08 * M;
    const tabanY = markY + markH - tabanH;
    const tp = eOutExpo(prog(lt, 0.05, 0.7));
    kctx.fillStyle = R.vurgu;
    kctx.fillRect(markX + (M * (1 - tp)) / 2, tabanY, M * tp, tabanH);
    const kuleW = 0.22 * M, kuleBosluk = 0.09 * M;
    const kuleAlt = tabanY - 0.04 * M;
    const maxKule = kuleAlt - markY;
    [0.52, 0.76, 1.0].forEach((oran, i) => {
      const p = Math.max(0, eOutBack(prog(lt, 0.35 + i * 0.14, 0.7)));
      if (p <= 0) return;
      const kh = maxKule * oran * p;
      const kx = markX + 0.08 * M + i * (kuleW + kuleBosluk);
      const kg = kctx.createLinearGradient(0, kuleAlt - maxKule * oran, 0, kuleAlt);
      kg.addColorStop(0, R.vurguAcik);
      kg.addColorStop(1, R.vurgu);
      kctx.fillStyle = kg;
      kctx.fillRect(kx, kuleAlt - kh, kuleW, kh);
      kctx.save();
      kctx.beginPath();
      kctx.rect(kx, kuleAlt - kh, kuleW, kh);
      kctx.clip();
      kctx.fillStyle = 'rgba(9,18,27,0.82)';
      const pw = 0.06 * M, ph = 0.045 * M;
      for (let y = kuleAlt - maxKule * oran + 0.09 * M; y < kuleAlt - 0.08 * M; y += 0.11 * M) {
        kctx.fillRect(kx + (kuleW - pw) / 2, y, pw, ph);
      }
      kctx.restore();
    });

    // yazı: firma adı harf harf, alt ad iki yana yaslı
    const adTaban = metinY + capH1;
    kctx.save();
    kctx.beginPath();
    kctx.rect(0, adTaban - S1 * 1.0, W, S1 * 1.0 + inis + 4 * U);
    kctx.clip();
    kctx.font = font(900, S1, F_BASLIK);
    kctx.fillStyle = R.metin;
    kctx.textBaseline = 'alphabetic';
    for (let j = 0; j < F.ad.length; j++) {
      const hp = eOutExpo(prog(lt, 0.8 + j * 0.06, 0.8));
      const ox = kctx.measureText(F.ad.slice(0, j)).width;
      kctx.fillText(F.ad[j], metinX + ox, adTaban + (1 - hp) * S1 * 1.3);
    }
    kctx.restore();

    const ap = eOutCubic(prog(lt, 1.3, 1.0));
    if (ap > 0) {
      kctx.save();
      kctx.globalAlpha = ap;
      kctx.font = font(600, S2, F_METIN);
      kctx.fillStyle = R.vurgu;
      kctx.textBaseline = 'alphabetic';
      const harfler = [...F.altAd];
      const dogal = harfler.reduce((a, h) => a + kctx.measureText(h).width, 0);
      const hedefAralik = harfler.length > 1 ? (gW - dogal) / (harfler.length - 1) : 0;
      const aralik = (hedefAralik > 0 ? hedefAralik : 0.12 * S2) + (1 - ap) * 0.4 * S2;
      const toplam = dogal + aralik * (harfler.length - 1);
      let x = metinX + (gW - toplam) / 2;
      for (const h of harfler) {
        kctx.fillText(h, x, metinY + altUst + capH2);
        x += kctx.measureText(h).width + aralik;
      }
      kctx.restore();
    }

    // parlama süpürmesi
    const sp = prog(lt, 2.3, 0.9);
    if (sp > 0 && sp < 1) {
      const solX = Math.min(markX, metinX) - 200 * U;
      const sagX = Math.max(markX + M, metinX + gW) + 200 * U;
      const bx = lerp(solX, sagX, eInOutCubic(sp));
      const sg = kctx.createLinearGradient(bx - 120 * U, 0, bx + 120 * U, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.65)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      kctx.save();
      kctx.globalCompositeOperation = 'source-atop';
      kctx.fillStyle = sg;
      kctx.fillRect(0, 0, W, H);
      kctx.restore();
    }
    ctx.drawImage(katman, 0, 0);

    const slp = eOutCubic(prog(lt, 2.0, 0.9));
    if (slp > 0) {
      ctx.save();
      ctx.globalAlpha = slp;
      ctx.fillStyle = R.vurgu;
      const cw = 80 * U * slp;
      ctx.fillRect(W / 2 - cw / 2, sloganY - sloganBoyut * 1.5, cw, 3 * U);
      ctx.font = font(400, sloganBoyut, F_METIN);
      ctx.fillStyle = R.metin;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      let y = sloganY + (1 - slp) * 20 * U;
      for (const sat of satirlaraBol(F.slogan, W - 160 * U)) {
        ctx.fillText(sat, W / 2, y);
        y += sloganBoyut * 1.3;
      }
      ctx.restore();

      const ip = eOutCubic(prog(lt, 2.5, 0.9));
      if (ip > 0 && iletisim.length) {
        ctx.save();
        ctx.globalAlpha = ip;
        ctx.font = font(500, iletisimBoyut, F_METIN);
        ctx.fillStyle = R.metinIkincil;
        ctx.textAlign = 'center';
        const satirlar = DIKEY ? iletisim : [iletisim.join('     •     ')];
        let iy = y + (DIKEY ? 30 : 20) * U + (1 - ip) * 16 * U;
        for (const sat of satirlar) {
          ctx.fillText(sat, W / 2, iy);
          iy += iletisimBoyut * 1.75;
        }
        ctx.restore();
      }
    }
  }

  // ---- ana çizim ----
  window.cizKare = (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const izgara = t < Z.hizmetler
      ? eOutCubic(prog(t, 0, 1.0)) * (1 - 0.5 * prog(t, Z.yukselis, 3))
      : t < Z.logo ? 0.8 : 0.5;
    arkaPlan(t, izgara);

    if (t < Z.hizmetler) siluetSahnesi(t);
    else if (t < Z.degerler) hizmetlerSahnesi(t);
    else if (t < Z.logo) degerlerSahnesi(t);
    else logoSahnesi(t);

    silmeGecisi(t, Z.hizmetler);
    sonIslem(t);
  };

  window.hazirla = async () => {
    await Promise.all([
      `800 80px ${F_BASLIK}`, `900 80px ${F_BASLIK}`, `400 20px ${F_METIN}`, `500 20px ${F_METIN}`,
      `600 20px ${F_METIN}`, `700 20px ${F_METIN}`, `500 20px ${F_MONO}`,
    ].map((f) => document.fonts.load(f, 'GÜÇLÜ İNŞAAT ğüşıöç')));
    await document.fonts.ready;
    return true;
  };
})();
