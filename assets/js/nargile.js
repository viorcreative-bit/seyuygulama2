/*
 * Nargile bölümü: fiyat listesi ve duman efekti.
 *
 * - Fiyatlar menu.js'teki "nargile" kategorisinden okunur.
 * - Lüleden sürekli ince bir duman yükselir; sayfa kaydıkça daha çok duman çıkar.
 * - Bölüm ekrana girerken üzerini kalın bir duman perdesi kaplar, kaydırdıkça açılır
 *   ve yazılar dumanın içinden netleşerek belirir.
 * - "Hareketi azalt" ayarı açık olan cihazlarda efekt çalışmaz, içerik doğrudan görünür.
 */
(function () {
  "use strict";

  var section = document.querySelector("[data-hookah]");
  if (!section) return;

  /* ---------- Fiyat listesi ---------- */
  var PICKS = ["Klasik Tatlar", "Special Tatlar", "Adalya Tobacco", "Al Fakher Tobacco", "Premium Tobacco", "Nonna Premium"];
  var priceFormat = new Intl.NumberFormat("tr-TR");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Aroma listesinin ilk birkaç tanesi yeterli; tamamı menüde.
  function shortFlavors(d) {
    if (!d) return "";
    var list = d.replace(/\.$/, "").split(/,\s*/);
    return list.slice(0, 5).join(", ") + (list.length > 5 ? "…" : "");
  }

  function renderList() {
    var ul = section.querySelector("[data-hookah-list]");
    var cat = (window.NONNA_MENU || []).filter(function (c) { return c.id === "nargile"; })[0];
    if (!ul || !cat) return;
    var items = {};
    cat.sections.forEach(function (s) { s.items.forEach(function (it) { items[it.n] = it; }); });
    PICKS.forEach(function (name) {
      var it = items[name];
      if (!it) return;
      var li = el("li");
      li.setAttribute("data-reveal", "");
      var line = el("div", "item-line");
      line.appendChild(el("span", "item-name", it.n));
      line.appendChild(el("span", "item-leader"));
      line.appendChild(el("span", "item-price", priceFormat.format(it.p) + " ₺"));
      li.appendChild(line);
      if (it.d) li.appendChild(el("p", "item-desc", shortFlavors(it.d)));
      ul.appendChild(li);
    });
  }

  renderList();

  /* ---------- Duman efekti ---------- */
  var canvas = section.querySelector("[data-hookah-smoke]");
  var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !ctx) {
    if (canvas) canvas.hidden = true;
    return;
  }

  section.classList.add("is-smoky");

  var photo = section.querySelector("[data-hookah-photo] img");
  var reveals = [].slice.call(section.querySelectorAll("[data-reveal]"));
  var revealTops = [];

  // Lülenin fotoğraftaki yeri (görselin genişlik/yükseklik oranı olarak).
  var BOWL = { x: 0.638, y: 0.138 };
  var NATURAL = { w: 853, h: 1280 };

  // Duman zaten yumuşak; tuvali yarım çözünürlükte çizmek görüntüyü bozmadan yükü ~4 kat azaltır.
  var SCALE = 0.5;
  var W = 0, H = 0;
  var emitter = { x: 0, y: 0 };
  var sprites = [];       // lüleden çıkan ince duman
  var fogSprites = [];    // perde için geniş, yumuşak sis
  var puffs = [];
  var curtain = [];
  var curtainAmount = 1;
  var visible = false;
  var rafId = 0;
  var lastTime = 0;
  var emitDebt = 0;
  var scrollBoost = 0;
  var lastScrollY = window.scrollY;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // Çok sayıda soluk lekenin üst üste binmesiyle düzensiz, dağınık bir duman tutamı çizer.
  function makeSprite(lobes, spread, minR, maxR, alpha) {
    var s = document.createElement("canvas");
    s.width = s.height = 128;
    var c = s.getContext("2d");
    for (var i = 0; i < lobes; i++) {
      var x = 64 + rand(-spread, spread), y = 64 + rand(-spread, spread), r = rand(minR, maxR);
      var g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(232, 226, 218, " + alpha + ")");
      g.addColorStop(0.5, "rgba(232, 226, 218, " + alpha * 0.4 + ")");
      g.addColorStop(1, "rgba(232, 226, 218, 0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    return s;
  }

  // Bir öğenin bölüm içindeki dikey konumu (CSS transform'dan etkilenmez).
  function topWithin(node) {
    var y = 0;
    while (node && node !== section) {
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return y;
  }

  function parsePosition(value) {
    var parts = (value || "50% 50%").split(" ");
    var px = parseFloat(parts[0]), py = parseFloat(parts[1] != null ? parts[1] : parts[0]);
    return { x: isNaN(px) ? 0.5 : px / 100, y: isNaN(py) ? 0.5 : py / 100 };
  }

  // object-fit: cover ile kırpılan fotoğrafta lülenin bölüm içindeki yeri.
  function measureEmitter() {
    if (!photo) return;
    var box = photo.parentElement;
    var bw = box.clientWidth, bh = box.clientHeight;
    var scale = Math.max(bw / NATURAL.w, bh / NATURAL.h);
    var dw = NATURAL.w * scale, dh = NATURAL.h * scale;
    var pos = parsePosition(window.getComputedStyle(photo).objectPosition);
    var left = 0, top = topWithin(box), node = box;
    while (node && node !== section) { left += node.offsetLeft; node = node.offsetParent; }
    emitter.x = left + (bw - dw) * pos.x + BOWL.x * dw;
    emitter.y = top + (bh - dh) * pos.y + BOWL.y * dh;
  }

  function resize() {
    W = section.clientWidth;
    H = section.clientHeight;
    canvas.width = Math.round(W * SCALE);
    canvas.height = Math.round(H * SCALE);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    revealTops = reveals.map(topWithin);
    measureEmitter();
    seedCurtain();
  }

  // Bölümü kaplayan, kaydırdıkça incelen duman perdesi.
  function seedCurtain() {
    curtain = [];
    var count = Math.round(Math.min(48, Math.max(22, (W * H) / 30000)));
    var big = Math.max(W, H);
    for (var i = 0; i < count; i++) {
      curtain.push({
        x: rand(-0.15, 1.15) * W,
        y: rand(-0.05, 1.15) * H,
        size: rand(0.3, 0.55) * big,
        vx: rand(-8, 8),
        vy: rand(-18, -8),
        sprite: fogSprites[i % fogSprites.length],
        alpha: rand(0.45, 0.8)
      });
    }
  }

  function emitPuff() {
    puffs.push({
      x: emitter.x + rand(-5, 5),
      y: emitter.y + rand(-3, 3),
      vx: rand(-12, 16),
      vy: rand(-58, -34),
      size: rand(16, 26),
      grow: rand(34, 54),
      sway: rand(16, 40),
      freq: rand(0.4, 0.9),
      phase: rand(0, Math.PI * 2),
      stretch: rand(1.1, 1.7),
      age: 0,
      life: rand(4.5, 7),
      alpha: rand(0.3, 0.55),
      sprite: sprites[Math.floor(rand(0, sprites.length))]
    });
  }

  function updateScroll() {
    var rect = section.getBoundingClientRect();
    var vh = window.innerHeight;

    // Fotoğraf ve perde: bölüm ekranın altından girip üst kısma doğru çıktıkça açılır.
    var p = clamp01((vh - rect.top) / (vh * 0.85));
    section.style.setProperty("--p", p.toFixed(3));
    curtainAmount = Math.pow(1 - p, 1.3);

    // Yazılar: her öğe kendi konumu ekranın alt kısmına geldiğinde netleşir.
    for (var i = 0; i < reveals.length; i++) {
      var top = rect.top + revealTops[i];
      var r = clamp01((vh * 0.95 - top) / (vh * 0.32));
      reveals[i].style.setProperty("--r", r.toFixed(3));
    }

    var dy = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    if (visible) scrollBoost = Math.min(scrollBoost + dy * 0.05, 14);
  }

  function frame(now) {
    rafId = 0;
    if (!visible) return;
    var dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;

    // Lüleden duman: sabit akış + kaydırmayla gelen ekstra nefes.
    emitDebt += dt * (6 + scrollBoost * 3);
    scrollBoost *= Math.pow(0.15, dt);
    while (emitDebt >= 1 && puffs.length < 140) { emitPuff(); emitDebt -= 1; }
    if (emitDebt > 1) emitDebt = 0;

    ctx.clearRect(0, 0, W, H);

    for (var i = puffs.length - 1; i >= 0; i--) {
      var f = puffs[i];
      f.age += dt;
      var t = f.age / f.life;
      if (t >= 1 || f.y < -f.size) { puffs.splice(i, 1); continue; }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.82, dt);          // yükseldikçe yavaşlar
      f.size += f.grow * dt;
      var x = f.x + Math.sin(f.phase + f.age * f.freq * Math.PI) * f.sway * t;
      // Doğarken görünmez; büyüyüp dağıldıkça belirir, sonra söner.
      var ramp = Math.min(1, t / 0.35);
      var a = f.alpha * ramp * ramp * (3 - 2 * ramp) * Math.pow(1 - t, 1.3);
      // Yükseldikçe yanlara yayılan tutamlar
      var sx = f.size * (1 + (f.stretch - 1) * t), sy = f.size;
      ctx.globalAlpha = a;
      ctx.drawImage(f.sprite, x - sx / 2, f.y - sy / 2, sx, sy);
    }

    if (curtainAmount > 0.01) {
      for (var j = 0; j < curtain.length; j++) {
        var c = curtain[j];
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y < -c.size / 2) c.y = H + c.size / 2;
        ctx.globalAlpha = c.alpha * curtainAmount;
        ctx.drawImage(c.sprite, c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
      }
    }
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId) return;
    lastTime = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    puffs = [];
    ctx.clearRect(0, 0, W, H);
  }

  for (var s = 0; s < 6; s++) {
    sprites.push(makeSprite(16, 34, 12, 30, 0.2));
    fogSprites.push(makeSprite(14, 30, 22, 46, 0.2));
  }
  resize();
  updateScroll();

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { rootMargin: "120px 0px" }).observe(section);
  } else {
    visible = true;
    start();
  }

  var scrollQueued = false;
  window.addEventListener("scroll", function () {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () { scrollQueued = false; updateScroll(); });
  }, { passive: true });

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); updateScroll(); }, 150);
  });
  // Fotoğraf ve yazı tipleri yüklenince ölçüler değişebilir.
  window.addEventListener("load", function () { resize(); updateScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); updateScroll(); });
})();
