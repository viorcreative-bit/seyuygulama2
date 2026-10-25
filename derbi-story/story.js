'use strict';
// Galatasaray – Fenerbahçe derbi hikâyesi (1080x1920, 15 sn).
// Her kare renderFrame(t) ile deterministik olarak çizilir; render.js kareleri toplar.

const W = 1080, H = 1920, DURATION = 15;
const Q = new URLSearchParams(location.search);

const CFG = Object.assign({
  brand: '',                 // üstte görünecek mekân adı (boşsa "CANLI YAYIN" rozeti)
  brandSub: '',
  home: 'GALATASARAY', away: 'FENERBAHÇE', homeShort: 'GS', awayShort: 'FB',
  dateBig: '26 EKİM', dateSmall: 'PAZARTESİ', time: '21:30',
  league: 'SÜPER LİG · 9. HAFTA',
  hype1: 'HEYECAN', hype2: 'ZİRVEDE',
  boardLabel: 'BAŞLAMA SAATİ',
  screen1: 'DEV EKRANDA', screen2: 'CANLI',
  strobe1: 'HAZIR', strobe2: 'MISIN?',
  endTop: 'DEV EKRAN · CANLI YAYIN',
  cta1: 'YERİNİ', cta2: 'ŞİMDİDEN AYIRT',
  ctaSub: "Rezervasyon için DM'den yazın",
  ticker: ['DERBİ HEYECANI DEV EKRANDA', '26 EKİM PAZARTESİ', 'SAAT 21:30', 'YERİNİZİ ŞİMDİDEN AYIRTIN', "REZERVASYON İÇİN DM'DEN YAZIN"],
}, Q.get('cfg') ? JSON.parse(Q.get('cfg')) : {});

const COL = {
  gsRed: '#C8102E', gsRedDeep: '#5E0013', gsYellow: '#FDB912',
  fbNavy: '#0A1F66', fbNavyDeep: '#030B2E', fbYellow: '#FFE100',
};

// ---------------------------------------------------------------- utils
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOutCubic = x => 1 - Math.pow(1 - x, 3);
const eOutExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const eInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eOutBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const TAU = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(n) { // [-1, 1]
  n = Math.imul((n | 0) ^ 0x27d4eb2d, 0x9E3779B1);
  n ^= n >>> 15; n = Math.imul(n, 0x85ebca6b);
  n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295 * 2 - 1;
}
const hash01 = n => (hash(n) + 1) / 2;
function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + s * 1013), hash(i + 1 + s * 1013), u);
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

const F = {
  anton: s => `${s}px Anton`,
  barI: s => `italic 800 ${s}px "Barlow Condensed"`,
  bar: (s, w = 800) => `${w} ${s}px "Barlow Condensed"`,
};
function fitSize(g, text, fontFn, maxSize, maxW, ls = 0) {
  g.save(); g.font = fontFn(maxSize); g.letterSpacing = ls + 'px';
  const w = g.measureText(text).width; g.restore();
  return w > maxW ? maxSize * maxW / w : maxSize;
}
function text(g, str, x, y, o) {
  g.save();
  g.font = o.font; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  if (o.ls) g.letterSpacing = o.ls + 'px';
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  if (o.shadow) { g.shadowColor = o.shadow; g.shadowBlur = o.blur ?? 30; g.shadowOffsetY = o.sy ?? 10; }
  if (o.stroke) {
    g.lineJoin = 'round'; g.strokeStyle = o.stroke; g.lineWidth = o.sw || 8;
    g.strokeText(str, x, y);
    g.shadowColor = 'transparent';
  }
  g.fillStyle = typeof o.fill === 'function' ? o.fill(g) : (o.fill || '#fff');
  g.fillText(str, x, y);
  g.restore();
}
function camera(g, z, ox = 0, oy = 0, rot = 0, cx = W / 2, cy = H / 2) {
  g.translate(cx + ox, cy + oy); g.rotate(rot); g.scale(z, z); g.translate(-cx, -cy);
}
function shakeAt(t, t0, dur, amp) {
  if (t < t0 || t > t0 + dur) return [0, 0];
  const d = Math.pow(1 - (t - t0) / dur, 2) * amp;
  return [Math.sin(t * 97) * d, Math.cos(t * 71) * d];
}

// ---------------------------------------------------------------- sprites
function makeGlow(size, color, falloff = 2) {
  const c = mk(size, size), g = c.getContext('2d'), r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  const [R, G, B] = hexRgb(color);
  for (let i = 0; i <= 12; i++) { const p = i / 12; gr.addColorStop(p, `rgba(${R},${G},${B},${Math.pow(1 - p, falloff)})`); }
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}
function makeSmokeSprite(seed, size = 256) {
  const c = mk(size, size), g = c.getContext('2d'), r = mulberry32(seed);
  for (let i = 0; i < 46; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.8) * size * 0.27;
    const x = size / 2 + Math.cos(a) * d, y = size / 2 + Math.sin(a) * d;
    const rad = size * (0.07 + r() * 0.17);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,0.20)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  return c;
}
function tint(src, color) {
  const c = mk(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}

class Smoke {
  constructor(seed, n, o) {
    const r = mulberry32(seed); this.o = o; this.p = [];
    for (let i = 0; i < n; i++) {
      this.p.push({
        x: lerp(o.x0, o.x1, r()), y: o.y + (r() - 0.5) * (o.yJit || 0),
        life: lerp(o.life[0], o.life[1], r()), off: r(),
        s0: lerp(o.size[0], o.size[1], r()), rot: r() * TAU, vr: (r() - 0.5) * 0.5,
        vx: (r() - 0.5) * (o.drift || 40), spr: o.sprites[Math.floor(r() * o.sprites.length)], a: lerp(0.55, 1, r()),
      });
    }
  }
  draw(g, t, mul = 1) {
    const o = this.o, base = g.getTransform();
    g.save(); g.globalCompositeOperation = o.blend || 'source-over';
    for (const p of this.p) {
      const age = (t / p.life + p.off) % 1;
      const a = Math.sin(Math.PI * age) * o.alpha * p.a * mul;
      if (a < 0.004) continue;
      const x = p.x + p.vx * age * p.life + Math.sin(t * 0.6 + p.rot * 3) * 24;
      const y = p.y - o.rise * age * p.life;
      const s = p.s0 * (0.55 + age * (o.grow || 1));
      g.globalAlpha = a;
      g.setTransform(base); g.translate(x, y); g.rotate(p.rot + p.vr * t);
      g.drawImage(p.spr, -s / 2, -s / 2, s, s);
    }
    g.setTransform(base); g.restore();
  }
}

// ---------------------------------------------------------------- assets
const A = {};
function init() {
  const s1 = makeSmokeSprite(7), s2 = makeSmokeSprite(19), s3 = makeSmokeSprite(31);
  A.smoke = {
    red: [tint(s1, '#d8152f'), tint(s2, '#9e0b20')],
    orange: [tint(s1, '#ff8a00'), tint(s3, '#ffb000')],
    navy: [tint(s1, '#1c3596'), tint(s2, '#0b1a5c')],
    yellow: [tint(s2, '#ffe100'), tint(s3, '#f2c200')],
    grey: [tint(s1, '#a5a3ad'), tint(s3, '#6d6b75')],
  };
  A.glow = {
    white: makeGlow(256, '#ffffff', 2.4), warm: makeGlow(256, '#ffe2b0', 2),
    red: makeGlow(256, '#ff2a12', 1.5), orange: makeGlow(256, '#ff8000', 1.7),
    yellow: makeGlow(256, '#ffd84a', 1.7), blue: makeGlow(256, '#3a6bff', 1.7),
    amber: makeGlow(128, '#ffb000', 1.6), screen: makeGlow(256, '#c9ffd8', 1.6),
  };
  const S = A.smoke;
  A.smokeIntroL = new Smoke(11, 34, { x0: -250, x1: 600, y: H + 120, yJit: 120, rise: 150, size: [520, 900], life: [3, 5], alpha: 0.62, grow: 1.1, sprites: [...S.red, ...S.orange, S.red[0]] });
  A.smokeIntroR = new Smoke(12, 34, { x0: 480, x1: 1330, y: H + 120, yJit: 120, rise: 150, size: [520, 900], life: [3, 5], alpha: 0.62, grow: 1.1, sprites: [...S.navy, ...S.yellow, S.navy[0]] });
  A.smokeGs = new Smoke(13, 40, { x0: -100, x1: W + 100, y: 1050, yJit: 200, rise: 230, size: [420, 760], life: [2.5, 4], alpha: 0.5, grow: 1.3, drift: 80, sprites: [...S.red, S.grey[0], S.red[0]] });
  A.smokeFb = new Smoke(14, 40, { x0: -100, x1: W + 100, y: 1050, yJit: 200, rise: 230, size: [420, 760], life: [2.5, 4], alpha: 0.5, grow: 1.3, drift: 80, sprites: [...S.yellow, ...S.navy, S.grey[0]] });
  A.smokeEndL = new Smoke(15, 26, { x0: -250, x1: 560, y: H + 150, yJit: 100, rise: 110, size: [560, 900], life: [4, 6], alpha: 0.45, grow: 1, sprites: [...S.red, ...S.orange] });
  A.smokeEndR = new Smoke(16, 26, { x0: 520, x1: 1330, y: H + 150, yJit: 100, rise: 110, size: [560, 900], life: [4, 6], alpha: 0.45, grow: 1, sprites: [...S.navy, ...S.yellow] });
  A.haze = new Smoke(17, 18, { x0: -200, x1: W + 200, y: 1300, yJit: 900, rise: 40, size: [700, 1100], life: [6, 9], alpha: 0.16, grow: 0.6, drift: 120, sprites: S.grey });

  buildStadium();
  buildField();
  buildLed();
  buildPost();
  A.crowdGs = makeCrowd(21);
  A.crowdFb = makeCrowd(22);
  A.audience = makeAudience(23);
  A.flagCv = mk(540, 960); A.flagCtx = A.flagCv.getContext('2d'); A.flagImg = A.flagCtx.createImageData(540, 960);
  A.tvSrc = mk(1400, 720);
  A.tv = mk(920, 518);
  A.tvStands = buildTvStands(920, 96);
  A.buf = mk(W, H); A.bufCtx = A.buf.getContext('2d');
  A.small = mk(270, 480); A.smallCtx = A.small.getContext('2d');
}

// ---------------------------------------------------------------- stadium
const ST = { cx: 540, cy: 1180, ORX: 1260, ORY: 760, IRX: 760, IRY: 360 };
function buildStadium() {
  const c = mk(W, H), g = c.getContext('2d'), r = mulberry32(99);
  const { cx, cy, ORX, ORY, IRX, IRY } = ST;
  let gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#020309'); gr.addColorStop(0.4, '#0a0c1a'); gr.addColorStop(1, '#05060c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // çatı
  g.fillStyle = '#04040a';
  g.beginPath(); g.ellipse(cx, cy, ORX + 120, ORY + 150, 0, 0, TAU); g.fill();
  // tribün halkası
  g.save();
  g.beginPath(); g.ellipse(cx, cy, ORX, ORY, 0, 0, TAU); g.ellipse(cx, cy, IRX, IRY, 0, 0, TAU); g.clip('evenodd');
  gr = g.createRadialGradient(cx, cy, IRX * 0.6, cx, cy, ORX);
  gr.addColorStop(0, '#1a1824'); gr.addColorStop(1, '#09080e');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const palL = ['#c8102e', '#fdb912', '#8a0a1f', '#ff5a1a', '#f4e7c8'];
  const palR = ['#0a1f66', '#ffe100', '#1c3fae', '#f6d000', '#dfe6ff'];
  for (let i = 0; i < 16000; i++) {
    const th = r() * TAU, k = r();
    const x = cx + Math.cos(th) * lerp(IRX, ORX, k), y = cy + Math.sin(th) * lerp(IRY, ORY, k);
    if (y < 0 || y > H) continue;
    const side = x + (r() - 0.5) * 160 < cx;
    const pal = side ? palL : palR;
    const near = Math.sin(th) > 0 ? 1.7 : 1;
    const s = (1.6 + 2.6 * k) * near;
    g.globalAlpha = 0.25 + r() * 0.55;
    g.fillStyle = pal[Math.floor(r() * pal.length)];
    g.fillRect(x, y, s, s * 1.2);
  }
  g.globalAlpha = 1; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 7;
  for (const k of [0.2, 0.42, 0.66, 0.86]) { g.beginPath(); g.ellipse(cx, cy, lerp(IRX, ORX, k), lerp(IRY, ORY, k), 0, 0, TAU); g.stroke(); }
  g.restore();
  // saha
  g.save();
  g.beginPath(); g.ellipse(cx, cy, IRX, IRY, 0, 0, TAU); g.clip();
  gr = g.createRadialGradient(cx, cy, 50, cx, cy, IRX);
  gr.addColorStop(0, '#3f9a43'); gr.addColorStop(1, '#16461b');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) {
    const y0 = cy - IRY + 2 * IRY * Math.pow(i / 14, 1.3), y1 = cy - IRY + 2 * IRY * Math.pow((i + 1) / 14, 1.3);
    if (i % 2) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, y0, W, y1 - y0); }
  }
  g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 3;
  const fy = cy - 230, ny = cy + 300, fw = 520, nw = 700;
  g.beginPath(); g.moveTo(cx - fw, fy); g.lineTo(cx + fw, fy); g.lineTo(cx + nw, ny); g.lineTo(cx - nw, ny); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(cx, fy); g.lineTo(cx, ny); g.stroke();
  g.beginPath(); g.ellipse(cx, cy + 20, 120, 46, 0, 0, TAU); g.stroke();
  g.restore();
  A.stadium = c;
  // projektör noktaları
  A.lights = [];
  for (let i = 0; i <= 44; i++) {
    const th = lerp(Math.PI * 1.08, Math.PI * 1.92, i / 44);
    A.lights.push([cx + Math.cos(th) * (ORX + 40), cy + Math.sin(th) * (ORY + 60)]);
  }
  A.twinkles = [];
  for (let i = 0; i < 260; i++) {
    const th = r() * TAU, k = r();
    A.twinkles.push([cx + Math.cos(th) * lerp(IRX, ORX, k), cy + Math.sin(th) * lerp(IRY, ORY, k)]);
  }
}
function drawStadium(g, t) {
  g.drawImage(A.stadium, 0, 0);
  g.save(); g.globalCompositeOperation = 'lighter';
  const f = Math.floor(t * 15);
  A.twinkles.forEach(([x, y], i) => {
    if (hash01(i * 31 + f * 7919) > 0.93) { g.globalAlpha = 0.9; g.drawImage(A.glow.white, x - 11, y - 11, 22, 22); }
  });
  // ışık huzmeleri
  for (const [i, th] of [0.18, 0.38, 0.62, 0.82].entries()) {
    const [lx, ly] = A.lights[Math.round(th * 44)];
    const gr = g.createLinearGradient(lx, ly, ST.cx, ST.cy);
    gr.addColorStop(0, 'rgba(255,250,235,0.10)'); gr.addColorStop(1, 'rgba(255,250,235,0)');
    g.fillStyle = gr; g.globalAlpha = 0.8 + 0.2 * noise1(t * 3, i);
    g.beginPath(); g.moveTo(lx, ly); g.lineTo(ST.cx - 380 + i * 160, ST.cy + 200); g.lineTo(ST.cx - 180 + i * 160, ST.cy + 200); g.closePath(); g.fill();
  }
  A.lights.forEach(([x, y], i) => {
    g.globalAlpha = 0.85; g.drawImage(A.glow.white, x - 26, y - 26, 52, 52);
    g.globalAlpha = 0.35; g.drawImage(A.glow.warm, x - 90, y - 90, 180, 180);
  });
  for (const th of [0.18, 0.38, 0.62, 0.82]) {
    const [x, y] = A.lights[Math.round(th * 44)];
    g.globalAlpha = 0.3 + 0.05 * noise1(t * 6, th * 10); g.drawImage(A.glow.warm, x - 320, y - 320, 640, 640);
  }
  g.restore();
}

// ---------------------------------------------------------------- crowd & flares
function makeCrowd(seed) {
  const r = mulberry32(seed), rows = [];
  const spec = [
    { y: 940, s: 0.55, n: 17, arm: 0.6, scarf: 0.35 },
    { y: 1060, s: 0.78, n: 12, arm: 0.65, scarf: 0.4 },
    { y: 1230, s: 1.05, n: 8, arm: 0.6, scarf: 0.45 },
  ];
  for (const sp of spec) {
    const ps = [];
    for (let i = 0; i < sp.n; i++) {
      const x = (i + 0.5 + (r() - 0.5) * 0.7) / sp.n * (W + 160) - 80;
      const arm = r() < sp.arm ? (r() < 0.65 ? 2 : 1) : 0;
      ps.push({ x, y: sp.y + (r() - 0.5) * 30, s: sp.s * (0.88 + r() * 0.24), arm, scarf: arm === 2 && r() < sp.scarf, ph: r() * TAU });
    }
    rows.push(ps);
  }
  return rows;
}
function personPose(p, t) {
  const s = p.s, bounce = Math.max(0, Math.sin(t * Math.PI * 4 + p.ph)) * (p.arm ? 16 : 5) * s;
  const y = p.y - bounce, sway = Math.sin(t * 5 + p.ph) * 12 * s;
  return { s, y, sway };
}
function drawCrowd(g, rows, t, o) {
  rows.forEach((ps, ri) => {
    g.fillStyle = o.colors[ri]; g.strokeStyle = o.colors[ri];
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    for (const p of ps) {
      const { s, y } = personPose(p, t);
      g.moveTo(p.x + 25 * s, y - 42 * s); g.arc(p.x, y - 42 * s, 25 * s, 0, TAU);
      g.roundRect(p.x - 50 * s, y - 8 * s, 100 * s, 520 * s, [44 * s, 44 * s, 0, 0]);
    }
    g.fill();
    for (const p of ps) {
      if (!p.arm) continue;
      const { s, y, sway } = personPose(p, t);
      g.lineWidth = 18 * s;
      const pump = p.arm === 1 ? Math.sin(t * Math.PI * 4 + p.ph) * 22 * s : 0;
      const hands = [];
      for (const side of (p.arm === 2 ? [-1, 1] : [1])) {
        const hx = p.x + side * (46 * s) + sway * (p.arm === 2 ? 1 : 0.4), hy = y - 135 * s + pump;
        g.beginPath(); g.moveTo(p.x + side * 36 * s, y + 8 * s); g.lineTo(p.x + side * 62 * s + sway * 0.5, y - 58 * s); g.lineTo(hx, hy); g.stroke();
        g.beginPath(); g.arc(hx, hy, 11 * s, 0, TAU); g.fill();
        hands.push([hx, hy]);
      }
      if (p.scarf && hands.length === 2) {
        const [[xl, yl], [xr, yr]] = hands;
        for (let k = 0; k < 6; k++) {
          const a0 = k / 6, a1 = (k + 1) / 6;
          const x0 = lerp(xl - 30 * s, xr + 30 * s, a0), x1 = lerp(xl - 30 * s, xr + 30 * s, a1);
          const y0 = lerp(yl, yr, a0) + Math.sin(k * 1.3 + t * 9) * 4 * s, y1 = lerp(yl, yr, a1) + Math.sin((k + 1) * 1.3 + t * 9) * 4 * s;
          g.fillStyle = o.scarf[k % 2];
          g.beginPath(); g.moveTo(x0, y0 - 14 * s); g.lineTo(x1, y1 - 14 * s); g.lineTo(x1, y1 + 14 * s); g.lineTo(x0, y0 + 14 * s); g.closePath(); g.fill();
        }
        g.fillStyle = o.colors[ri];
      }
    }
    if (o.rim && ri === rows.length - 1) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = o.rim; g.lineWidth = 3;
      for (const p of ps) { const { s, y } = personPose(p, t); g.beginPath(); g.arc(p.x, y - 42 * s, 25 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      g.restore();
    }
  });
}
function drawFlare(g, x, y, t, seed, glow, size = 1) {
  const fl = 0.82 + 0.18 * noise1(t * 14, seed);
  g.save(); g.globalCompositeOperation = 'lighter';
  let R = 460 * fl * size; g.globalAlpha = 0.85; g.drawImage(glow, x - R, y - R, R * 2, R * 2);
  R = 150 * fl * size; g.globalAlpha = 1; g.drawImage(glow, x - R, y - R, R * 2, R * 2);
  R = 46 * fl * size; g.drawImage(A.glow.white, x - R, y - R, R * 2, R * 2);
  g.strokeStyle = '#fff3c8'; g.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const life = 0.55 + 0.4 * hash01(seed * 977 + i * 13);
    const age = ((t / life) + hash01(seed * 131 + i * 7)) % 1, tt = age * life;
    const vx = hash(seed * 51 + i * 3) * 260, vy = 380 + hash01(seed * 17 + i * 11) * 420;
    const px = x + vx * tt, py = y - vy * tt + 700 * tt * tt;
    g.globalAlpha = (1 - age) * 0.95; g.lineWidth = 3.2 * size;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px - vx * 0.03, py + (vy - 1400 * tt) * 0.03); g.stroke();
  }
  g.restore();
}
function drawPoleFlag(g, x, y, w, h, t, team, seed) {
  const wave = u => Math.sin(u * 0.018 - t * 7 + seed) * 22 * (u / w) + Math.sin(u * 0.041 - t * 11 + seed * 2) * 6 * (u / w);
  const tilt = Math.sin(t * 2.2 + seed) * 0.08;
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.strokeStyle = '#06060a'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 560); g.stroke();
  g.beginPath(); g.moveTo(0, wave(0));
  for (let u = 0; u <= w; u += 18) g.lineTo(u, wave(u));
  for (let u = w; u >= 0; u -= 18) g.lineTo(u, h + wave(u) * 1.25);
  g.closePath(); g.save(); g.clip();
  if (team === 'gs') { g.fillStyle = COL.gsYellow; g.fillRect(0, -40, w / 2, h + 80); g.fillStyle = COL.gsRed; g.fillRect(w / 2, -40, w / 2 + 40, h + 80); }
  else { for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? COL.fbNavy : COL.fbYellow; g.fillRect(k * w / 7, -40, w / 7 + 1, h + 80); } }
  for (let u = 0; u < w; u += 4) { const d = (wave(u + 2) - wave(u)) * 4.5; g.fillStyle = d > 0 ? `rgba(0,0,0,${clamp(d * 0.12, 0, 0.45)})` : `rgba(255,255,255,${clamp(-d * 0.05, 0, 0.18)})`; g.fillRect(u, -60, 4.5, h + 120); }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, -60, w, h + 120);
  g.restore(); g.restore();
}

// ---------------------------------------------------------------- waving full-screen flag
function renderFlag(t, team) {
  const d = A.flagImg.data, w = 540, h = 960;
  const c1 = team === 'gs' ? [253, 185, 18] : [255, 222, 0];
  const c2 = team === 'gs' ? [200, 16, 46] : [10, 31, 102];
  const sw = W / 6.5;
  let i = 0;
  for (let y = 0; y < h; y++) {
    const Y = y * 2;
    for (let x = 0; x < w; x++, i += 4) {
      const X = x * 2;
      const p1 = X * 0.0085 + Y * 0.0042 - t * 4.4, p2 = X * 0.016 - Y * 0.0065 - t * 6.3 + 1.3, p3 = Y * 0.011 - t * 3.1;
      const f = Math.sin(p1) + 0.45 * Math.sin(p2) + 0.25 * Math.sin(p3);
      const df = Math.cos(p1) * 0.0085 + 0.45 * Math.cos(p2) * 0.016;
      const u = X + f * 42;
      let m;
      if (team === 'gs') m = clamp(0.5 + (u - W * 0.5) / 4);
      else { m = clamp(0.5 + Math.sin(((u + 70) / sw) * Math.PI) * 6); }
      const sh = 0.8 + df * 26, spec = Math.max(0, df * 26 - 0.18) * 140;
      d[i] = clamp(lerp(c1[0], c2[0], m) * sh + spec, 0, 255);
      d[i + 1] = clamp(lerp(c1[1], c2[1], m) * sh + spec, 0, 255);
      d[i + 2] = clamp(lerp(c1[2], c2[2], m) * sh + spec, 0, 255);
      d[i + 3] = 255;
    }
  }
  A.flagCtx.putImageData(A.flagImg, 0, 0);
  return A.flagCv;
}

// ---------------------------------------------------------------- pitch (world units: 680 x 1050)
function buildField() {
  const S = 2, c = mk(880 * S, 1250 * S), g = c.getContext('2d');
  g.scale(S, S); g.translate(440, 625);
  g.fillStyle = '#245f27'; g.fillRect(-440, -625, 880, 1250);
  for (let i = -12; i < 12; i++) { g.fillStyle = i % 2 ? '#2f7d32' : '#37883a'; g.fillRect(-440, i * 52.5, 880, 52.5); }
  const r = mulberry32(5);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.04})`; g.fillRect(-440 + r() * 880, -625 + r() * 1250, 1.5, 3); }
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3.2; g.fillStyle = 'rgba(255,255,255,0.9)';
  g.strokeRect(-340, -525, 680, 1050);
  g.beginPath(); g.moveTo(-340, 0); g.lineTo(340, 0); g.stroke();
  g.beginPath(); g.arc(0, 0, 91.5, 0, TAU); g.stroke();
  g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
  for (const sg of [-1, 1]) {
    const gl = sg * 525;
    g.strokeRect(-201.5, sg < 0 ? gl : gl - 165, 403, 165);
    g.strokeRect(-91.5, sg < 0 ? gl : gl - 55, 183, 55);
    g.beginPath(); g.arc(0, gl - sg * 110, 4, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, gl - sg * 110, 91.5, sg < 0 ? 0.2 * Math.PI : 1.2 * Math.PI, sg < 0 ? 0.8 * Math.PI : 1.8 * Math.PI); g.stroke();
    g.strokeRect(-36.6, sg < 0 ? gl - 20 : gl, 73.2, 20);
  }
  A.field = c;
}
const BALL_PTS = [[-170, 300], [-90, 170], [10, 120], [110, 10], [60, -150], [-30, -250], [-10, -380]];
function ballAt(p) {
  const n = BALL_PTS.length - 1, f = clamp(p) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
  const P = k => BALL_PTS[clamp(k, 0, n)];
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
  const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}
const PLAYERS = [
  ...[[-230, 330], [-280, 120], [40, 260], [220, 170], [190, -40]].map((b, i) => ({ team: 'gs', b, i })),
  ...[[-70, -40], [90, -110], [230, -240], [-150, -230], [30, -330], [0, -490]].map((b, i) => ({ team: 'fb', b, i: i + 10 })),
];
function drawPlayer(g, x, y, team, dir) {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(7, 9, 15, 11, 0.5, 0, TAU); g.fill();
  g.rotate(dir);
  g.save(); g.beginPath(); g.ellipse(0, 0, 15, 11, 0, 0, TAU); g.clip();
  if (team === 'gs') { g.fillStyle = COL.gsYellow; g.fillRect(-16, -12, 16, 24); g.fillStyle = COL.gsRed; g.fillRect(0, -12, 16, 24); }
  else { g.fillStyle = COL.fbNavy; g.fillRect(-16, -12, 32, 24); g.fillStyle = COL.fbYellow; for (let k = -12; k < 16; k += 8) g.fillRect(k, -12, 3.5, 24); }
  g.restore();
  g.fillStyle = '#1b120d'; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill();
  g.restore();
}
function drawPitchWorld(g, t, p) {
  g.drawImage(A.field, -440, -625, 880, 1250);
  const [bx, by] = ballAt(p);
  const [qx, qy] = ballAt(p + 0.01);
  const dir = Math.atan2(qy - by, qx - bx) + Math.PI / 2;
  for (const pl of PLAYERS) {
    const x = pl.b[0] + 45 * noise1(t * 0.9, pl.i * 3 + 1) + (bx - pl.b[0]) * 0.18;
    const y = pl.b[1] + 45 * noise1(t * 0.9, pl.i * 3 + 2) + (by - pl.b[1]) * 0.18;
    drawPlayer(g, x, y, pl.team, Math.atan2(by - y, bx - x) + Math.PI / 2);
  }
  // topu süren oyuncu
  const ux = Math.cos(dir - Math.PI / 2), uy = Math.sin(dir - Math.PI / 2);
  drawPlayer(g, bx - ux * 20 + uy * 6, by - uy * 20 - ux * 6, 'gs', dir);
  for (let k = 10; k >= 1; k--) {
    const [tx, ty] = ballAt(p - k * 0.008);
    g.fillStyle = `rgba(255,255,255,${0.32 * (1 - k / 11)})`; g.beginPath(); g.arc(tx, ty, 5.5 * (1 - k / 14), 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(bx + 4, by + 5, 6, 4.5, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 6, 0, TAU); g.fill();
  g.fillStyle = '#222'; g.beginPath(); g.arc(bx + 1.5, by - 1, 2, 0, TAU); g.fill();
  return [bx, by];
}

// ---------------------------------------------------------------- LED board
function buildLed() {
  const cols = 48, rows = 20, pitch = 17, Wl = cols * pitch, Hl = rows * pitch;
  const m = mk(cols, rows), mg = m.getContext('2d');
  mg.fillStyle = '#fff'; mg.font = F.anton(19); mg.textAlign = 'center'; mg.textBaseline = 'middle';
  mg.fillText(CFG.time, cols / 2, rows / 2 + 1);
  const d = mg.getImageData(0, 0, cols, rows).data;
  const off = mk(Wl, Hl), og = off.getContext('2d'), on = mk(Wl, Hl), ng = on.getContext('2d');
  og.fillStyle = 'rgba(255,170,40,0.10)';
  const lit = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const cx = x * pitch + pitch / 2, cy = y * pitch + pitch / 2;
    og.beginPath(); og.arc(cx, cy, pitch * 0.36, 0, TAU); og.fill();
    if (d[(y * cols + x) * 4 + 3] > 100) lit.push([cx, cy]);
  }
  ng.globalCompositeOperation = 'lighter';
  for (const [x, y] of lit) { ng.globalAlpha = 0.35; ng.drawImage(A.glow.amber, x - pitch * 1.6, y - pitch * 1.6, pitch * 3.2, pitch * 3.2); }
  ng.globalCompositeOperation = 'source-over'; ng.globalAlpha = 1;
  for (const [x, y] of lit) {
    ng.fillStyle = '#ffbf1f'; ng.beginPath(); ng.arc(x, y, pitch * 0.4, 0, TAU); ng.fill();
    ng.fillStyle = '#fff2c4'; ng.beginPath(); ng.arc(x - 1, y - 1, pitch * 0.17, 0, TAU); ng.fill();
  }
  A.ledOff = off; A.ledOn = on;
}

// ---------------------------------------------------------------- TV
function buildTvStands(w, h) {
  const c = mk(w, h), g = c.getContext('2d'), r = mulberry32(77);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#07070c'); gr.addColorStop(1, '#1a1a24');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = r() * w, y = r() * (h - 22);
    g.globalAlpha = 0.3 + r() * 0.5;
    g.fillStyle = (x < w / 2 ? ['#c8102e', '#fdb912', '#e9d8c0'] : ['#0a1f66', '#ffe100', '#d8e0ff'])[Math.floor(r() * 3)];
    g.fillRect(x, y, 2, 2.4);
  }
  g.globalAlpha = 1;
  const boards = ['#1d4ed8', '#f8fafc', '#dc2626', '#0f172a', '#facc15', '#16a34a'];
  for (let x = 0, k = 0; x < w; x += 92, k++) { g.fillStyle = boards[k % boards.length]; g.fillRect(x, h - 22, 92, 22); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 10, h - 14, 50, 6); }
  return c;
}
function renderTV(t, p) {
  const src = A.tvSrc, sg = src.getContext('2d');
  const [bx, by] = ballAt(p);
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.fillStyle = '#245f27'; sg.fillRect(0, 0, src.width, src.height);
  sg.save(); sg.translate(700, 360); sg.rotate(-Math.PI / 2); sg.scale(1.05, 1.05); sg.translate(-bx * 0.7, -by * 0.7);
  drawPitchWorld(sg, t, p);
  sg.restore();
  const tv = A.tv, tg = tv.getContext('2d'), TW = tv.width, TH = tv.height, top = 96;
  tg.setTransform(1, 0, 0, 1, 0, 0);
  tg.drawImage(A.tvStands, 0, 0);
  const zn = 1, zf = 2.7;
  for (let row = 0; row < TH - top; row++) {
    const s = row / (TH - top);
    const z = 1 / lerp(1 / zf, 1 / zn, s);
    const v = (zf - z) / (zf - zn);
    const dw = TW * 1.5 * (zn / z);
    tg.drawImage(src, 0, v * (src.height - 2), src.width, 1, (TW - dw) / 2, top + row, dw, 1.6);
  }
  // skor bandı
  tg.fillStyle = 'rgba(8,10,20,0.88)'; tg.beginPath(); tg.roundRect(22, 20, 292, 46, 6); tg.fill();
  tg.fillStyle = COL.gsRed; tg.fillRect(22, 20, 8, 46); tg.fillStyle = COL.fbNavy; tg.fillRect(306, 20, 8, 46);
  tg.font = F.bar(30); tg.textBaseline = 'middle'; tg.fillStyle = '#fff'; tg.textAlign = 'center';
  tg.fillText(`${CFG.homeShort}   0 - 0   ${CFG.awayShort}`, 168, 44);
  tg.fillStyle = '#e11d2e'; tg.beginPath(); tg.roundRect(TW - 150, 20, 128, 46, 6); tg.fill();
  tg.fillStyle = '#fff'; tg.font = F.barI(30); tg.fillText(CFG.screen2, TW - 86, 44);
  const gl = tg.createLinearGradient(0, 0, TW, TH); gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)');
  tg.fillStyle = gl; tg.fillRect(0, 0, TW, TH);
  return tv;
}
function makeAudience(seed) {
  const r = mulberry32(seed), rows = [];
  for (const sp of [{ y: 1110, s: 0.95, n: 9 }, { y: 1250, s: 1.3, n: 6 }]) {
    const ps = [];
    for (let i = 0; i < sp.n; i++) ps.push({ x: (i + 0.5 + (r() - 0.5) * 0.5) / sp.n * (W + 120) - 60, y: sp.y + (r() - 0.5) * 30, s: sp.s * (0.9 + r() * 0.2), arm: r() < 0.35 ? 2 : 0, scarf: false, ph: r() * TAU });
    rows.push(ps);
  }
  return rows;
}

// ---------------------------------------------------------------- post
function buildPost() {
  const v = mk(W, H), g = v.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H * 0.45, H * 0.28, W / 2, H * 0.5, H * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  A.vignette = v;
  A.grain = [];
  const r = mulberry32(3);
  for (let k = 0; k < 4; k++) {
    const c = mk(540, 960), cg = c.getContext('2d'), id = cg.createImageData(540, 960);
    for (let i = 0; i < id.data.length; i += 4) { const n = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 255; }
    cg.putImageData(id, 0, 0); A.grain.push(c);
  }
}

// ---------------------------------------------------------------- overlay (alt bant, kayan yazı, üst logo)
function drawBadge(g, x, y, r, team) {
  g.save(); g.translate(x, y);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.shadowColor = 'transparent';
  g.save(); g.beginPath(); g.arc(0, 0, r - 7, 0, TAU); g.clip();
  if (team === 'gs') { g.fillStyle = COL.gsYellow; g.fillRect(-r, -r, r, 2 * r); g.fillStyle = COL.gsRed; g.fillRect(0, -r, r, 2 * r); }
  else { g.fillStyle = COL.fbNavy; g.fillRect(-r, -r, 2 * r, 2 * r); g.fillStyle = COL.fbYellow; for (let k = -r + r * 0.22; k < r; k += r * 0.52) g.fillRect(k, -r, r * 0.22, 2 * r); }
  const sh = g.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r);
  sh.addColorStop(0, 'rgba(255,255,255,0.25)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = sh; g.fillRect(-r, -r, 2 * r, 2 * r);
  g.restore();
  text(g, team === 'gs' ? CFG.homeShort : CFG.awayShort, 0, r * 0.05, { font: F.anton(Math.round(r * 0.9)), fill: '#fff', stroke: team === 'gs' ? COL.gsRedDeep : COL.fbNavyDeep, sw: r * 0.14 });
  g.restore();
}
function drawVs(g, x, y, size, alpha = 1) {
  g.save(); g.globalAlpha *= alpha;
  text(g, 'VS', x, y, { font: F.barI(size), fill: '#fff', shadow: 'rgba(255,255,255,0.6)', blur: size * 0.25, sy: 0 });
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,240,180,0.9)'; g.lineWidth = size * 0.05; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + size * 0.32, y - size * 0.5); g.lineTo(x - size * 0.05, y + size * 0.05); g.lineTo(x + size * 0.12, y + size * 0.05); g.lineTo(x - size * 0.3, y + size * 0.55); g.stroke();
  g.restore();
}
const OV_IN = 2.5, OV_OUT = 11.5;
function drawOverlay(g, t) {
  const a = eOutCubic(prog(t, OV_IN, OV_IN + 0.35)) * (1 - prog(t, OV_OUT - 0.06, OV_OUT));
  if (a <= 0) return;
  g.save();
  // okunabilirlik için alt karartma
  const gr = g.createLinearGradient(0, 1180, 0, 1640);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.globalAlpha = a; g.fillStyle = gr; g.fillRect(0, 1180, W, 460);
  const beat = Math.exp(-((t * 2) % 1) * 7);
  const y = 1345 + (1 - a) * 60;
  for (const [team, x, t0] of [['gs', 300, OV_IN], ['fb', 780, OV_IN + 0.08]]) {
    const s = eOutBack(prog(t, t0, t0 + 0.35)) * (1 + 0.035 * beat);
    if (s <= 0) continue;
    g.save(); g.translate(x, y); g.scale(s, s); drawBadge(g, 0, 0, 74, team); g.restore();
  }
  drawVs(g, 540, y, 96 * (1 + 0.06 * beat), clamp(prog(t, OV_IN + 0.15, OV_IN + 0.35)));
  text(g, CFG.home, 300, y + 120, { font: F.bar(44), ls: 2, fill: '#fff', shadow: 'rgba(0,0,0,0.8)', blur: 12, sy: 3 });
  text(g, CFG.away, 780, y + 120, { font: F.bar(44), ls: 2, fill: '#fff', shadow: 'rgba(0,0,0,0.8)', blur: 12, sy: 3 });
  // kayan yazı
  const ty = 1532, th = 60;
  g.fillStyle = 'rgba(0,0,0,0.62)'; g.fillRect(0, ty - th / 2, W, th);
  const lg = g.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, COL.gsRed); lg.addColorStop(0.3, COL.gsYellow); lg.addColorStop(0.7, COL.fbYellow); lg.addColorStop(1, COL.fbNavy);
  g.fillStyle = lg; g.fillRect(0, ty - th / 2 - 4, W * eOutCubic(prog(t, OV_IN, OV_IN + 0.6)), 4);
  g.font = F.bar(36, 600); g.letterSpacing = '1px'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#fff';
  const str = CFG.ticker.join('   •   ') + '   •   ';
  const tw = g.measureText(str).width;
  let x = -((t - OV_IN) * 210 % tw);
  while (x < W) { g.fillText(str, x, ty + 1); x += tw; }
  g.letterSpacing = '0px';
  drawTop(g, t, a);
  g.restore();
}
function drawTop(g, t, a) {
  g.save(); g.globalAlpha = a;
  const y = 262 - (1 - a) * 40;
  if (CFG.brand) {
    const s = fitSize(g, CFG.brand, F.anton, 96, 860, 4);
    text(g, CFG.brand, 540, y, { font: F.anton(s), ls: 4, fill: '#fff', shadow: 'rgba(0,0,0,0.7)', blur: 24, sy: 6 });
    if (CFG.brandSub) text(g, CFG.brandSub, 540, y + s * 0.62, { font: F.bar(34, 600), ls: 6, fill: 'rgba(255,255,255,0.85)', shadow: 'rgba(0,0,0,0.7)', blur: 10, sy: 2 });
  } else {
    const label = 'CANLI YAYIN';
    g.font = F.barI(42); g.letterSpacing = '4px';
    const w = g.measureText(label).width + 110;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(540 - w / 2, y - 34, w, 68, 34); g.fill(); g.stroke();
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 2));
    g.fillStyle = `rgba(239,35,50,${pulse})`; g.beginPath(); g.arc(540 - w / 2 + 40, y, 12, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, 540 - w / 2 + 66, y + 2);
  }
  g.restore();
}

// ---------------------------------------------------------------- scenes
function lightning(g, x0, y0, x1, y1, seed, t, alpha) {
  const segs = 34, k = Math.floor(t * 14);
  let nx = -(y1 - y0), ny = x1 - x0; const L = Math.hypot(nx, ny); nx /= L; ny /= L;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const p = i / segs, off = (i === 0 || i === segs) ? 0 : hash(seed * 1000 + i * 17 + k * 131) * 24;
    pts.push([lerp(x0, x1, p) + nx * off, lerp(y0, y1, p) + ny * off]);
  }
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round'; g.globalAlpha = alpha;
  for (const [w, c] of [[60, 'rgba(120,170,255,0.08)'], [22, 'rgba(170,205,255,0.22)'], [8, 'rgba(225,238,255,0.7)'], [3, '#ffffff']]) {
    g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  g.restore();
}
function slideText(g, str, y, p, from, o) {
  const x = lerp(from, 540, p);
  if (p > 0 && p < 1) {
    for (let k = 3; k >= 1; k--) text(g, str, x - Math.sign(540 - from) * k * 55 * (1 - p), y, { ...o, shadow: null, stroke: null, alpha: 0.12 });
  }
  if (p > 0) text(g, str, x, y, o);
}
function darkSpot(g, x, y, r, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
}

function sceneIntro(g, t, lt) {
  const [sx, sy] = shakeAt(t, 1.0, 0.5, 26);
  g.save(); camera(g, lerp(1.2, 1.0, eOutCubic(clamp(lt / 2.5))), sx, sy);
  drawStadium(g, t);
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = 'rgba(230,20,40,0.95)';
  g.beginPath(); g.moveTo(-200, -200); g.lineTo(W * 0.7, -200); g.lineTo(W * 0.3, H + 200); g.lineTo(-200, H + 200); g.fill();
  g.fillStyle = 'rgba(30,70,220,0.95)';
  g.beginPath(); g.moveTo(W * 0.7, -200); g.lineTo(W + 200, -200); g.lineTo(W + 200, H + 200); g.lineTo(W * 0.3, H + 200); g.fill();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.35; g.drawImage(A.glow.red, -500, 900, 1300, 1300); g.drawImage(A.glow.blue, 280, 900, 1300, 1300);
  g.restore();
  A.smokeIntroL.draw(g, t + 4); A.smokeIntroR.draw(g, t + 4);
  darkSpot(g, 540, 820, 760, 0.55);
  // arka plandaki dev "DERBİ"
  g.save(); g.translate(540 + lt * 30, 300); g.rotate(-0.16);
  g.font = F.anton(430); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = `rgba(255,255,255,${0.16 * clamp(lt / 0.4)})`; g.lineWidth = 4; g.strokeText('DERBİ', 0, 0);
  g.restore();
  if (lt >= 0.95) lightning(g, W * 0.7, -40, W * 0.3, H + 40, 3, t, lt < 1.15 ? 1 : 0.55 + 0.15 * Math.sin(t * 20));
  text(g, CFG.league, 540, 450 - 30 * (1 - eOutCubic(prog(lt, 1.2, 1.5))), { font: F.barI(52), ls: 6, fill: '#ffd400', alpha: prog(lt, 1.2, 1.5), shadow: 'rgba(0,0,0,0.8)', blur: 16, sy: 4 });
  const sH = fitSize(g, CFG.home, F.anton, 210, 960), sA = fitSize(g, CFG.away, F.anton, 210, 960);
  const gsFill = gg => { const gr = gg.createLinearGradient(0, 535, 0, 695); gr.addColorStop(0, '#ffe27a'); gr.addColorStop(1, '#ff9a00'); return gr; };
  const fbFill = gg => { const gr = gg.createLinearGradient(0, 920, 0, 1080); gr.addColorStop(0, '#fff27a'); gr.addColorStop(1, '#ffd000'); return gr; };
  slideText(g, CFG.home, 615, eOutExpo(prog(lt, 0.2, 0.5)), -760, { font: F.anton(sH), fill: gsFill, stroke: COL.gsRedDeep, sw: 14, shadow: 'rgba(0,0,0,0.7)', blur: 30, sy: 12 });
  slideText(g, CFG.away, 1000, eOutExpo(prog(lt, 0.45, 0.75)), 1840, { font: F.anton(sA), fill: fbFill, stroke: COL.fbNavyDeep, sw: 14, shadow: 'rgba(0,0,0,0.7)', blur: 30, sy: 12 });
  if (lt >= 0.85) {
    const p = eOutCubic(prog(lt, 0.85, 1.0));
    g.save(); g.translate(540, 810); g.scale(lerp(2.8, 1, p), lerp(2.8, 1, p)); g.rotate(-0.05);
    drawVs(g, 0, 0, 150, p); g.restore();
    const rp = prog(lt, 1.0, 1.45);
    if (rp > 0 && rp < 1) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,245,220,${(1 - rp) * 0.8})`; g.lineWidth = 18 * (1 - rp) + 2;
      g.beginPath(); g.arc(540, 810, 80 + eOutCubic(rp) * 700, 0, TAU); g.stroke(); g.restore();
    }
  }
  const pp = eOutExpo(prog(lt, 1.5, 1.8));
  if (pp > 0) {
    const str = `${CFG.dateBig} ${CFG.dateSmall} · ${CFG.time}`;
    g.save(); g.font = F.barI(58); g.letterSpacing = '2px';
    const w = (g.measureText(str).width + 90) * pp;
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(540 - w / 2, 1180 - 48, w, 96, 48); g.fill();
    g.shadowColor = 'transparent'; g.clip();
    g.fillStyle = '#0c0c12'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(str, 540, 1182);
    g.restore();
  }
}

function sceneFlag(team) {
  return (g, t, lt) => {
    g.save(); camera(g, lerp(1.12, 1.0, eOutCubic(lt)), 0, 0, team === 'gs' ? 0.02 : -0.02);
    g.imageSmoothingQuality = 'high'; g.drawImage(renderFlag(t, team), -20, -20, W + 40, H + 40);
    g.restore();
    A.haze.draw(g, t, 1.4);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const name = team === 'gs' ? CFG.home : CFG.away;
    const p = eOutExpo(prog(lt, 0.0, 0.3));
    g.save(); g.translate(540, 800); g.rotate(-0.08);
    const bw = 1300 * p;
    g.fillStyle = 'rgba(6,6,10,0.82)';
    g.beginPath(); g.moveTo(-bw / 2 + 40, -125); g.lineTo(bw / 2 + 40, -125); g.lineTo(bw / 2 - 40, 125); g.lineTo(-bw / 2 - 40, 125); g.fill();
    g.fillStyle = team === 'gs' ? COL.gsYellow : COL.fbYellow;
    g.fillRect(-bw / 2, -137, bw, 10); g.fillStyle = team === 'gs' ? COL.gsRed : COL.fbNavy; g.fillRect(-bw / 2, 127, bw, 10);
    const s = fitSize(g, name, F.anton, 210, 930);
    const ts = lerp(1.35, 1, eOutExpo(prog(lt, 0.05, 0.35)));
    g.scale(ts, ts);
    text(g, name, 0, 6, { font: F.anton(s), fill: '#fff', alpha: prog(lt, 0.05, 0.2), shadow: 'rgba(0,0,0,0.6)', blur: 20, sy: 6 });
    g.restore();
  };
}

function sceneTribune(team) {
  const gs = team === 'gs';
  return (g, t, lt) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    if (gs) { gr.addColorStop(0, '#120103'); gr.addColorStop(0.55, '#4a0610'); gr.addColorStop(1, '#14020a'); }
    else { gr.addColorStop(0, '#01030f'); gr.addColorStop(0.55, '#0b1c5c'); gr.addColorStop(1, '#020614'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); camera(g, lerp(1.0, 1.1, lt), 0, 0, gs ? -0.03 : 0.03);
    const glow = gs ? A.glow.red : A.glow.yellow;
    const flares = gs ? [[170, 980], [560, 900], [900, 1010]] : [[230, 920], [640, 1000], [960, 930]];
    (gs ? A.smokeGs : A.smokeFb).draw(g, t + 3, 1);
    drawPoleFlag(g, gs ? 640 : 90, 390, 380, 250, t, team, 1.3);
    drawPoleFlag(g, gs ? 60 : 700, 470, 330, 220, t, team, 2.7);
    const dark = gs ? ['#2a0408', '#160206', '#060103'] : ['#06103a', '#030822', '#010311'];
    const crowd = gs ? A.crowdGs : A.crowdFb;
    drawCrowd(g, crowd.slice(0, 1), t, { colors: dark.slice(0, 1), scarf: gs ? ['#7a1220', '#8a6a10'] : ['#0e1d55', '#8a7a10'] });
    flares.forEach(([x, y], i) => drawFlare(g, x, y, t, i + (gs ? 1 : 7), glow, 1));
    if (!gs) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.drawImage(A.glow.blue, -300, 300, 900, 900); g.drawImage(A.glow.blue, 600, 200, 900, 900); g.restore(); }
    drawCrowd(g, crowd.slice(1), t, { colors: dark.slice(1), scarf: gs ? ['#b5122b', '#d39a10'] : ['#14267a', '#d8bf00'], rim: gs ? 'rgba(255,120,60,0.55)' : 'rgba(255,220,90,0.5)' });
    g.restore();
    const word = gs ? CFG.hype1 : CFG.hype2;
    const s = fitSize(g, word, F.anton, 300, 940);
    const p = eOutExpo(prog(lt, 0, 0.3));
    g.save(); g.translate(540, 610); g.scale(lerp(0.6, 1, p), lerp(0.6, 1, p)); g.rotate(-0.05);
    text(g, word, 0, 0, { font: F.anton(s), fill: '#fff', alpha: p, shadow: gs ? 'rgba(255,40,20,0.9)' : 'rgba(255,215,0,0.85)', blur: 60, sy: 0 });
    g.restore();
  };
}

function scenePitch(g, t, lt) {
  const dur = 1.5, p = lt / dur;
  const [bx, by] = ballAt(p);
  const zoom = lerp(2.05, 1.75, eInOut(p)), rot = 0.42 + p * 0.1;
  g.fillStyle = '#245f27'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H * 0.6); g.rotate(rot); g.scale(zoom, zoom); g.translate(-bx, -(by - 40));
  drawPitchWorld(g, t, p);
  g.restore();
  let gr = g.createLinearGradient(0, 0, W, H * 0.6);
  gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createLinearGradient(0, 300, 0, 900); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 300, W, 600);
  const p1 = eOutExpo(prog(lt, 0.05, 0.4)), p2 = eOutExpo(prog(lt, 0.2, 0.55));
  text(g, CFG.dateBig, 540, 560 + 80 * (1 - p1), { font: F.anton(fitSize(g, CFG.dateBig, F.anton, 250, 960)), fill: '#fff', alpha: p1, shadow: 'rgba(0,0,0,0.7)', blur: 30, sy: 10 });
  text(g, CFG.dateSmall, 540, 730 + 60 * (1 - p2), { font: F.barI(120), ls: 10, fill: '#ffd400', alpha: p2, shadow: 'rgba(0,0,0,0.7)', blur: 24, sy: 8 });
}

function sceneBoard(g, t, lt) {
  g.save(); camera(g, lerp(1.45, 1.3, lt / 1.5), 0, 150); drawStadium(g, t); g.restore();
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, H);
  A.haze.draw(g, t, 1.2);
  const px = 70, py = 560, pw = 940, ph = 560;
  const ps = eOutBack(prog(lt, 0, 0.3));
  g.save(); g.translate(540, py + ph / 2); g.scale(ps, ps); g.translate(-540, -(py + ph / 2));
  g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 60; g.shadowOffsetY = 20;
  const pg = g.createLinearGradient(0, py, 0, py + ph); pg.addColorStop(0, '#24242c'); pg.addColorStop(1, '#0c0c10');
  g.fillStyle = pg; g.beginPath(); g.roundRect(px, py, pw, ph, 28); g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = '#050506'; g.beginPath(); g.roundRect(px + 22, py + 22, pw - 44, ph - 44, 18); g.fill();
  const lg = g.createLinearGradient(px, 0, px + pw, 0);
  lg.addColorStop(0, COL.gsRed); lg.addColorStop(0.35, COL.gsYellow); lg.addColorStop(0.65, COL.fbYellow); lg.addColorStop(1, COL.fbNavy);
  g.strokeStyle = lg; g.lineWidth = 5; g.beginPath(); g.roundRect(px + 4, py + 4, pw - 8, ph - 8, 26); g.stroke();
  text(g, CFG.boardLabel, 540, py + 85, { font: F.barI(50), ls: 8, fill: 'rgba(255,255,255,0.85)' });
  const lx = 540 - A.ledOn.width / 2, ly = py + 150;
  g.drawImage(A.ledOff, lx, ly);
  const rv = prog(lt, 0.1, 0.4);
  if (rv > 0) {
    g.save(); g.beginPath(); g.rect(lx, ly, A.ledOn.width * rv, A.ledOn.height); g.clip();
    g.globalAlpha = lt < 0.5 ? (hash01(Math.floor(t * 30)) > 0.3 ? 1 : 0.4) : 0.93 + 0.07 * hash(Math.floor(t * 20));
    g.drawImage(A.ledOn, lx, ly); g.restore();
  }
  g.restore();
  const p2 = eOutCubic(prog(lt, 0.35, 0.65));
  text(g, CFG.league, 540, py + ph + 90 + 30 * (1 - p2), { font: F.barI(60), ls: 4, fill: '#ffd400', alpha: p2, shadow: 'rgba(0,0,0,0.8)', blur: 20, sy: 6 });
}

function sceneScreen(g, t, lt) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#07060a'); gr.addColorStop(1, '#0d0a10');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  const r = mulberry32(42);
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = 150 + r() * 700, s = 40 + r() * 120;
    const spr = [A.glow.orange, A.glow.red, A.glow.blue, A.glow.warm][Math.floor(r() * 4)];
    g.globalAlpha = (0.15 + r() * 0.25) * (0.8 + 0.2 * Math.sin(t * 2 + i));
    g.drawImage(spr, x - s, y - s + Math.sin(t * 0.8 + i) * 10, s * 2, s * 2);
  }
  g.restore();
  g.save(); camera(g, lerp(1.0, 1.08, lt / 1.5), 0, 0, -0.025, 540, 800);
  const tv = renderTV(t, (lt / 1.5) * 0.7 + 0.15);
  const sx = 80, sy = 540, sw = 920, sh = 518;
  g.save(); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(60px)'; g.globalAlpha = 0.55;
  g.drawImage(tv, sx - 90, sy - 70, sw + 180, sh + 160); g.restore();
  g.fillStyle = '#020203'; g.beginPath(); g.roundRect(sx - 16, sy - 16, sw + 32, sh + 32, 14); g.fill();
  g.drawImage(tv, sx, sy, sw, sh);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25; g.drawImage(A.glow.screen, 40, 900, 1000, 700); g.restore();
  drawCrowd(g, A.audience, t, { colors: ['#050507', '#020203'], scarf: ['#000', '#000'], rim: 'rgba(200,255,215,0.45)' });
  g.restore();
  const p1 = eOutExpo(prog(lt, 0.0, 0.3));
  text(g, CFG.screen1, 540, 445 - 50 * (1 - p1), { font: F.anton(fitSize(g, CFG.screen1, F.anton, 170, 960)), fill: '#fff', alpha: p1, shadow: 'rgba(0,0,0,0.8)', blur: 30, sy: 8 });
  const p2 = eOutBack(prog(lt, 0.25, 0.55));
  if (p2 > 0) {
    g.save(); g.translate(540, 1130); g.scale(p2, p2);
    g.font = F.barI(76); g.letterSpacing = '6px';
    const w = g.measureText(CFG.screen2).width + 150;
    g.shadowColor = 'rgba(225,29,46,0.8)'; g.shadowBlur = 40;
    g.fillStyle = '#e11d2e'; g.beginPath(); g.roundRect(-w / 2, -55, w, 110, 55); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI * 2))})`; g.beginPath(); g.arc(-w / 2 + 52, 0, 14, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(CFG.screen2, -w / 2 + 84, 3);
    g.restore();
  }
}

function sceneStrobe(g, t, lt) {
  const k = Math.floor(lt / 0.125), gs = k % 2 === 0;
  g.fillStyle = gs ? COL.gsRed : COL.fbNavy; g.fillRect(0, 0, W, H);
  g.save(); g.translate(540, 960); g.rotate(gs ? -0.5 : 0.5);
  g.fillStyle = gs ? COL.gsYellow : COL.fbYellow;
  const off = (lt * 900) % 260;
  for (let x = -1400; x < 1400; x += 260) g.fillRect(x + off, -1400, 90, 2800);
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, W, H);
  const s = 1 + lt * 0.5;
  g.save(); g.translate(540, 860); g.scale(s, s);
  text(g, CFG.strobe1, 0, -110, { font: F.anton(fitSize(g, CFG.strobe1, F.anton, 260, 900)), fill: '#fff', shadow: 'rgba(0,0,0,0.85)', blur: 30, sy: 10 });
  text(g, CFG.strobe2, 0, 130, { font: F.anton(fitSize(g, CFG.strobe2, F.anton, 260, 900)), fill: '#fff', shadow: 'rgba(0,0,0,0.85)', blur: 30, sy: 10 });
  g.restore();
}

function sceneEnd(g, t, lt) {
  const gr = g.createRadialGradient(540, 820, 0, 540, 900, 1300);
  gr.addColorStop(0, '#1a1420'); gr.addColorStop(1, '#020203');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [x0, col, dir] of [[160, 'rgba(255,60,40,', 1], [920, 'rgba(60,110,255,', -1]]) {
    const bg = g.createLinearGradient(x0, 0, 540, 1300);
    bg.addColorStop(0, col + '0.22)'); bg.addColorStop(1, col + '0)');
    g.fillStyle = bg; g.beginPath(); g.moveTo(x0 - 30, -20); g.lineTo(x0 + 30, -20); g.lineTo(540 + dir * 420, 1500); g.lineTo(540 - dir * 80, 1500); g.closePath(); g.fill();
  }
  const r = mulberry32(8);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = ((r() * H - t * (20 + r() * 40)) % H + H) % H, s = 3 + r() * 6;
    g.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 2 + i)); g.drawImage(A.glow.warm, x - s, y - s, s * 2, s * 2);
  }
  g.restore();
  A.smokeEndL.draw(g, t); A.smokeEndR.draw(g, t);
  darkSpot(g, 540, 860, 700, 0.5);
  const top = CFG.brand || CFG.endTop;
  const p0 = eOutCubic(prog(lt, 0.0, 0.35));
  if (CFG.brand) text(g, top, 540, 400 - 30 * (1 - p0), { font: F.anton(fitSize(g, top, F.anton, 110, 900, 4)), ls: 4, fill: '#fff', alpha: p0, shadow: 'rgba(0,0,0,0.7)', blur: 24, sy: 6 });
  else text(g, top, 540, 420 - 30 * (1 - p0), { font: F.barI(48), ls: 6, fill: '#ffd400', alpha: p0 });
  const p1 = eOutExpo(prog(lt, 0.0, 0.35)), p2 = eOutExpo(prog(lt, 0.15, 0.5));
  g.save(); g.translate(540, 640); g.scale(lerp(1.5, 1, p1), lerp(1.5, 1, p1));
  text(g, CFG.cta1, 0, 0, { font: F.anton(fitSize(g, CFG.cta1, F.anton, 240, 940)), fill: '#fff', alpha: p1, shadow: 'rgba(0,0,0,0.7)', blur: 30, sy: 10 });
  g.restore();
  const yf = gg => { const q = gg.createLinearGradient(0, 760, 0, 900); q.addColorStop(0, '#fff07a'); q.addColorStop(1, '#ffb800'); return q; };
  text(g, CFG.cta2, 540, 830 + 50 * (1 - p2), { font: F.anton(fitSize(g, CFG.cta2, F.anton, 170, 960)), fill: yf, alpha: p2, shadow: 'rgba(0,0,0,0.7)', blur: 30, sy: 10 });
  const pb = eOutCubic(prog(lt, 0.35, 0.8));
  const lg = g.createLinearGradient(140, 0, 940, 0);
  lg.addColorStop(0, COL.gsRed); lg.addColorStop(0.45, COL.gsYellow); lg.addColorStop(0.55, COL.fbYellow); lg.addColorStop(1, COL.fbNavy);
  g.fillStyle = lg; g.fillRect(540 - 400 * pb, 945, 800 * pb, 7);
  const p3 = eOutCubic(prog(lt, 0.4, 0.75)), p4 = eOutCubic(prog(lt, 0.5, 0.85));
  text(g, `${CFG.dateBig} ${CFG.dateSmall} · ${CFG.time}`, 540, 1025 + 30 * (1 - p3), { font: F.barI(64), ls: 2, fill: '#fff', alpha: p3 });
  text(g, `${CFG.home} – ${CFG.away}`, 540, 1100 + 30 * (1 - p4), { font: F.bar(46, 600), ls: 4, fill: 'rgba(255,255,255,0.7)', alpha: p4 });
  const p5 = eOutBack(prog(lt, 0.7, 1.05));
  if (p5 > 0) {
    const pulse = 1 + 0.035 * Math.max(0, Math.sin(t * Math.PI * 2));
    g.save(); g.translate(540, 1260); g.scale(p5 * pulse, p5 * pulse);
    g.font = F.bar(48); g.letterSpacing = '1px';
    const w = g.measureText(CFG.ctaSub).width + 160;
    g.shadowColor = 'rgba(255,255,255,0.35)'; g.shadowBlur = 40;
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-w / 2, -56, w, 112, 56); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#0c0c12'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(CFG.ctaSub, -w / 2 + 56, 2);
    const ax = w / 2 - 70 + Math.sin(t * 8) * 6;
    g.strokeStyle = '#0c0c12'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(ax - 22, 0); g.lineTo(ax + 18, 0); g.moveTo(ax + 2, -16); g.lineTo(ax + 18, 0); g.lineTo(ax + 2, 16); g.stroke();
    g.restore();
  }
  const p6 = eOutBack(prog(lt, 0.85, 1.2));
  if (p6 > 0) {
    for (const [team, x] of [['gs', 380], ['fb', 700]]) { g.save(); g.translate(x, 1440); g.scale(p6, p6); drawBadge(g, 0, 0, 58, team); g.restore(); }
    drawVs(g, 540, 1440, 74, clamp(p6));
  }
}

const SCENES = [
  [0.0, 2.5, sceneIntro],
  [2.5, 3.5, sceneFlag('gs')],
  [3.5, 4.5, sceneFlag('fb')],
  [4.5, 5.5, sceneTribune('gs')],
  [5.5, 6.5, sceneTribune('fb')],
  [6.5, 8.0, scenePitch],
  [8.0, 9.5, sceneBoard],
  [9.5, 11.0, sceneScreen],
  [11.0, 11.5, sceneStrobe],
  [11.5, 15.01, sceneEnd],
];
const CUTS = SCENES.slice(1).map(s => s[0]);

// ---------------------------------------------------------------- frame
function renderFrame(t) {
  const main = document.getElementById('c'), g = main.getContext('2d');
  const bg = A.bufCtx;
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalAlpha = 1; bg.globalCompositeOperation = 'source-over'; bg.filter = 'none';
  bg.fillStyle = '#000'; bg.fillRect(0, 0, W, H);
  const sc = SCENES.find(s => t >= s[0] && t < s[1]) || SCENES[SCENES.length - 1];
  bg.save(); sc[2](bg, t, t - sc[0]); bg.restore();

  // kesme anlarında zoom vuruşu + sarsıntı
  let z = 1, sx = 0, sy = 0, flash = 0;
  for (const c of CUTS) {
    const p = (t - c) / 0.28;
    if (p >= 0 && p < 1) { z += 0.075 * Math.pow(1 - p, 3); flash = Math.max(flash, 0.5 * Math.pow(1 - p, 4)); }
    const [a, b] = shakeAt(t, c, 0.22, 10); sx += a; sy += b;
  }
  for (const [t0, d, amp] of [[8.1, 0.35, 16], [11.5, 0.4, 22]]) { const [a, b] = shakeAt(t, t0, d, amp); sx += a; sy += b; }
  const ip = prog(t, 0.95, 1.2); if (t >= 0.95) flash = Math.max(flash, 0.75 * Math.pow(1 - ip, 3));
  if (t < 0.25) flash = Math.max(flash, 1 - t / 0.25);

  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.save(); camera(g, z, sx, sy); g.drawImage(A.buf, 0, 0); g.restore();
  drawOverlay(g, t);

  // bloom
  const s = A.smallCtx; s.filter = 'blur(6px)'; s.clearRect(0, 0, 270, 480); s.drawImage(main, 0, 0, 270, 480); s.filter = 'none';
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.28; g.drawImage(A.small, 0, 0, W, H); g.restore();
  if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, W, H); }
  g.drawImage(A.vignette, 0, 0);
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.07; g.drawImage(A.grain[Math.floor(t * 30) % 4], 0, 0, W, H); g.restore();
}

window.renderFrame = renderFrame;
window.DURATION = DURATION;
window.ready = (async () => {
  const sample = 'AÇĞİÖŞÜ çğıöşü 0123456789·–';
  for (const f of ['400 80px Anton', 'italic 800 80px "Barlow Condensed"', '800 80px "Barlow Condensed"', '600 80px "Barlow Condensed"']) await document.fonts.load(f, sample);
  init();
  if (Q.has('preview')) {
    document.body.classList.add('preview');
    const t0 = performance.now();
    const loop = () => { renderFrame(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
    loop();
  }
  return true;
})();
