/*!
 * iPhone Duo — kaydırmalı yakınlaşma bölümü
 * Bağımlılık yok. Sayfadaki her .duo bölümünü otomatik başlatır.
 */
(function () {
  "use strict";

  // Odak koordinatları bu boyuttaki görsele göre yazıldı. Daha yüksek çözünürlüklü
  // bir sürümle değiştirirseniz (ör. 4000×2666) koordinatları değiştirmeniz gerekmez.
  var REF_W = 2000;
  var REF_H = 1333;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smoothstep = function (a, b, v) {
    var t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  var easeInOutCubic = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  var nums = function (str) {
    return str ? str.split(",").map(function (n) { return parseFloat(n); }) : null;
  };
  var trNumber = function (v) { return v.toFixed(1).replace(".", ","); };

  function initDuo(root) {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    var tour = root.querySelector(".duo-tour");
    var sticky = root.querySelector(".duo-tour__sticky");
    var canvas = root.querySelector(".duo-tour__canvas");
    var photo = root.querySelector(".duo-tour__photo");
    var spot = root.querySelector(".duo-tour__spot");
    var rail = root.querySelector(".duo-tour__rail");
    var cue = root.querySelector(".duo-tour__cue");
    var progressBar = root.querySelector(".duo-tour__progress span");
    var washes = {
      top: root.querySelector(".duo-tour__wash--top"),
      left: root.querySelector(".duo-tour__wash--left"),
      right: root.querySelector(".duo-tour__wash--right"),
      bottom: root.querySelector(".duo-tour__wash--bottom")
    };
    var ctx = canvas && canvas.getContext("2d");
    if (!tour || !sticky || !ctx || !photo) return;

    var steps = Array.prototype.map.call(root.querySelectorAll(".duo-step"), function (el) {
      var f = nums(el.getAttribute("data-focus"));
      var fm = nums(el.getAttribute("data-focus-m")) || f;
      var s = nums(el.getAttribute("data-spot"));
      return {
        el: el,
        side: el.getAttribute("data-side") || "none",
        label: el.getAttribute("data-label") || "",
        focus: { cx: f[0], cy: f[1], w: f[2], h: f[3] },
        focusM: { cx: fm[0], cy: fm[1], w: fm[2], h: fm[3] },
        spot: s ? { x0: s[0], y0: s[1], x1: s[2], y1: s[3] } : null,
        circle: el.getAttribute("data-spot-shape") === "circle"
      };
    });
    var N = steps.length;
    if (N < 2) return;

    root.classList.add("is-enhanced");
    root.style.setProperty("--duo-count", N);

    // Gezinme düğmeleri
    var railButtons = [];
    if (rail) {
      steps.forEach(function (step, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = step.label;
        b.addEventListener("click", function () { scrollToStep(i); });
        rail.appendChild(b);
        railButtons.push(b);
      });
    }

    var state = {
      vw: 0, vh: 0, dpr: 1, stacked: false,
      keyframes: [],
      target: 0,   // kaydırmadan gelen ilerleme (0 … N-1)
      current: 0,  // yumuşatılmış ilerleme
      raf: 0,
      lastSpot: -1,
      lastRail: -1
    };

    function topOffset() {
      var v = parseFloat(getComputedStyle(root).getPropertyValue("--duo-top-offset"));
      return isNaN(v) ? 0 : v;
    }

    // ---- Düzen: her ayrıntı için kameranın nereye bakacağını hesapla ----
    function measure() {
      state.vw = sticky.clientWidth;
      state.vh = sticky.clientHeight;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      var stacked = state.vw < 760 || state.vw / state.vh < 0.84;
      if (stacked !== state.stacked) {
        state.stacked = stacked;
        root.classList.toggle("is-stacked", stacked);
      }
      canvas.width = Math.round(state.vw * state.dpr);
      canvas.height = Math.round(state.vh * state.dpr);
      state.keyframes = steps.map(keyframeFor);
    }

    function areaFor(step) {
      var vw = state.vw, vh = state.vh;
      if (state.stacked) {
        var card = step.el.offsetHeight;
        if (step.side === "none") {
          var top = 28 + card + 12;
          return { x: 0, y: top, w: vw, h: Math.max(vh - top - 72, vh * 0.35) };
        }
        var free = vh - card - 24 - 28;
        return { x: 0, y: 8, w: vw, h: Math.max(free, vh * 0.32) };
      }
      if (step.side === "none") return { x: 0, y: 0, w: vw, h: vh };
      var textW = vw * 0.42;
      return step.side === "right"
        ? { x: 0, y: 0, w: vw - textW, h: vh }
        : { x: textW, y: 0, w: vw - textW, h: vh };
    }

    function keyframeFor(step) {
      var r = state.stacked ? step.focusM : step.focus;
      var a = areaFor(step);
      var pad = step.side === "none" ? 1 : state.stacked ? 0.94 : 0.84;
      var s = Math.min((a.w * pad) / r.w, (a.h * pad) / r.h);
      if (step.side === "none" && !state.stacked) {
        s = Math.max(s, state.vw / REF_W, state.vh / REF_H); // masaüstünde kenardan kenara
      }
      var sx = a.x + a.w / 2;
      var sy = a.y + a.h / 2;
      var t = clampTranslate(sx - r.cx * s, sy - r.cy * s, s);
      return {
        s: s, fx: r.cx, fy: r.cy,
        sx: t.x + r.cx * s, sy: t.y + r.cy * s,
        wash: washFor(step)
      };
    }

    // Görsel ekranı kaplıyorsa kenar boşluğu bırakma
    function clampTranslate(tx, ty, s) {
      var w = REF_W * s, h = REF_H * s;
      if (w >= state.vw) tx = clamp(tx, state.vw - w, 0);
      if (h >= state.vh) ty = clamp(ty, state.vh - h, 0);
      return { x: tx, y: ty };
    }

    function washFor(step) {
      if (step.side === "none") return { top: 1, left: 0, right: 0, bottom: 0 };
      if (state.stacked) return { top: 0, left: 0, right: 0, bottom: 1 };
      return {
        top: 0,
        left: step.side === "left" ? 1 : 0,
        right: step.side === "right" ? 1 : 0,
        bottom: 0
      };
    }

    // ---- Kaydırma → ilerleme ----
    function scrollLength() {
      return Math.max(1, tour.offsetHeight - sticky.offsetHeight);
    }

    function readScroll() {
      var rect = tour.getBoundingClientRect();
      var prog = clamp((topOffset() - rect.top) / scrollLength(), 0, 1);
      state.target = prog * (N - 1);
    }

    function scrollToStep(i) {
      var rect = tour.getBoundingClientRect();
      var y = window.pageYOffset + rect.top - topOffset() + (i / (N - 1)) * scrollLength();
      window.scrollTo({ top: Math.round(y), behavior: reduceMotion.matches ? "auto" : "smooth" });
    }

    // ---- Kamera ----
    function cameraAt(p) {
      var kf = state.keyframes;
      var i = Math.min(Math.floor(p), N - 2);
      var f = p - i;
      // Her ayrıntıda bir süre durur, aradaki bölümde hareket eder
      var t = reduceMotion.matches ? (f < 0.5 ? 0 : 1) : easeInOutCubic(smoothstep(0.22, 0.78, f));
      var A = kf[i], B = kf[i + 1];
      var s = Math.exp(lerp(Math.log(A.s), Math.log(B.s), t));
      var fx = lerp(A.fx, B.fx, t), fy = lerp(A.fy, B.fy, t);
      var sx = lerp(A.sx, B.sx, t), sy = lerp(A.sy, B.sy, t);

      // Uzak noktalar arasında geçerken hafifçe geri çekil (kamera "nefes alır")
      if (!reduceMotion.matches) {
        var dist = Math.hypot((B.fx - A.fx) * Math.min(A.s, B.s), (B.fy - A.fy) * Math.min(A.s, B.s));
        var dip = clamp((dist / Math.max(state.vw, 1)) * 0.28, 0, 0.32);
        s *= 1 - dip * Math.sin(Math.PI * t);
      }

      var tr = clampTranslate(sx - fx * s, sy - fy * s, s);
      var wash = {};
      ["top", "left", "right", "bottom"].forEach(function (k) {
        wash[k] = lerp(A.wash[k], B.wash[k], t);
      });
      return { s: s, tx: tr.x, ty: tr.y, wash: wash };
    }

    function draw(cam) {
      var d = state.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(d * cam.s, 0, 0, d * cam.s, d * cam.tx, d * cam.ty);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(photo, 0, 0, photo.naturalWidth, photo.naturalHeight, 0, 0, REF_W, REF_H);

      // Görselin kenarları göründüğünde (telefon girişi) yumuşak geçiş
      if (REF_W * cam.s < state.vw + 1 || REF_H * cam.s < state.vh + 1) {
        var F = 90;
        ctx.globalCompositeOperation = "destination-out";
        [[0, 0, 0, F, 0, 0, REF_W, F],
         [0, REF_H, 0, REF_H - F, 0, REF_H - F, REF_W, F],
         [0, 0, F, 0, 0, 0, F, REF_H],
         [REF_W, 0, REF_W - F, 0, REF_W - F, 0, F, REF_H]].forEach(function (g) {
          var grad = ctx.createLinearGradient(g[0], g[1], g[2], g[3]);
          grad.addColorStop(0, "rgba(0,0,0,1)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(g[4], g[5], g[6], g[7]);
        });
        ctx.globalCompositeOperation = "source-over";
      }
    }

    function stepOpacity(k, p) {
      var d = p - k;
      var fadeIn = k === 0 ? 1 : smoothstep(-0.36, -0.22, d);
      var fadeOut = k === N - 1 ? 1 : 1 - smoothstep(0.22, 0.36, d);
      return fadeIn * fadeOut;
    }

    function render() {
      var p = state.current;
      var cam = cameraAt(p);
      draw(cam);

      Object.keys(washes).forEach(function (k) {
        if (washes[k]) washes[k].style.opacity = cam.wash[k].toFixed(3);
      });

      var best = -1, bestO = 0;
      steps.forEach(function (step, k) {
        var o = stepOpacity(k, p);
        var el = step.el;
        el.style.opacity = o.toFixed(3);
        // Ekran okuyucular tüm metne erişebilsin diye gizli kartlar yalnızca saydamlaşır
        el.style.setProperty("--duo-in", reduceMotion.matches ? 1 : o.toFixed(3));
        if (o > bestO) { bestO = o; best = k; }
      });

      // Odak halkası
      var st = best >= 0 ? steps[best] : null;
      if (spot) {
        if (st && st.spot && bestO > 0.01) {
          var x0 = cam.tx + st.spot.x0 * cam.s, y0 = cam.ty + st.spot.y0 * cam.s;
          var w = (st.spot.x1 - st.spot.x0) * cam.s, h = (st.spot.y1 - st.spot.y0) * cam.s;
          var pad = 6;
          spot.style.width = (w + pad * 2).toFixed(1) + "px";
          spot.style.height = (h + pad * 2).toFixed(1) + "px";
          spot.style.transform = "translate(" + (x0 - pad).toFixed(1) + "px," + (y0 - pad).toFixed(1) + "px)";
          spot.style.opacity = bestO.toFixed(3);
          if (state.lastSpot !== best) {
            spot.classList.toggle("is-circle", st.circle);
            state.lastSpot = best;
          }
        } else {
          spot.style.opacity = "0";
        }
      }

      if (cue) cue.style.opacity = (1 - smoothstep(0.02, 0.18, p)).toFixed(3);
      if (progressBar) progressBar.style.transform = "scaleX(" + (p / (N - 1)).toFixed(4) + ")";

      var active = Math.round(p);
      if (active !== state.lastRail) {
        railButtons.forEach(function (b, i) {
          if (i === active) b.setAttribute("aria-current", "step");
          else b.removeAttribute("aria-current");
        });
        state.lastRail = active;
      }
    }

    // ---- Açılma sahnesi ----
    var unfold = root.querySelector(".duo-unfold");
    var unfoldSticky = unfold && unfold.querySelector(".duo-unfold__sticky");
    var device = unfold && unfold.querySelector(".duo-device");
    var widthOut = unfold && unfold.querySelector("[data-duo-width]");
    var depthOut = unfold && unfold.querySelector("[data-duo-depth]");
    var shades = device ? {
      left: device.querySelector(".duo-device__half--left .duo-device__face--front .duo-device__shade"),
      back: device.querySelector(".duo-device__face--back .duo-device__shade"),
      right: device.querySelector(".duo-device__half--right .duo-device__shade")
    } : null;
    var lastOpen = -1;

    function renderUnfold() {
      if (!unfold || !unfoldSticky || !device) return;
      var rect = unfold.getBoundingClientRect();
      var len = Math.max(1, unfold.offsetHeight - unfoldSticky.offsetHeight);
      var q = clamp((topOffset() - rect.top) / len, 0, 1);
      var open = easeInOutCubic(clamp((q - 0.12) / 0.62, 0, 1));
      if (Math.abs(open - lastOpen) < 0.0005) return;
      lastOpen = open;

      var angle = 180 * (1 - open); // sol yarının açısı (derece)
      unfold.style.setProperty("--open", open.toFixed(4));
      unfold.style.setProperty("--tilt", reduceMotion.matches ? 0 : Math.sin(Math.PI * open).toFixed(4));
      if (shades.left) shades.left.style.setProperty("--shade", (0.55 * clamp(angle / 90, 0, 1)).toFixed(3));
      if (shades.back) shades.back.style.setProperty("--shade", (0.55 * clamp((180 - angle) / 90, 0, 1)).toFixed(3));
      if (shades.right) shades.right.style.setProperty("--shade", (0.42 * Math.pow(1 - open, 0.8) * (angle < 179 ? 1 : 0)).toFixed(3));

      if (widthOut) widthOut.textContent = trNumber(lerp(84.1, 164.6, open));
      if (depthOut) depthOut.textContent = trNumber(lerp(11.3, 5.2, open));
      unfold.classList.toggle("is-open", open > 0.96);
    }

    // ---- Döngü ----
    function frame() {
      state.raf = 0;
      readScroll();
      var diff = state.target - state.current;
      if (reduceMotion.matches || Math.abs(diff) < 0.0008) {
        state.current = state.target;
      } else {
        state.current += diff * 0.14;
      }
      render();
      renderUnfold();
      if (state.current !== state.target) request();
    }

    function request() {
      if (!state.raf) state.raf = requestAnimationFrame(frame);
    }

    function relayout() {
      measure();
      lastOpen = -1;
      render();
      renderUnfold();
      request();
    }

    function start() {
      relayout();
      readScroll();
      state.current = state.target;
      render();
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", relayout);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
      if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", relayout);
    }

    if (photo.complete && photo.naturalWidth) start();
    else {
      photo.addEventListener("load", start, { once: true });
      photo.addEventListener("error", function () {
        root.classList.remove("is-enhanced", "is-stacked"); // görsel yoksa düz düzene dön
      }, { once: true });
    }
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll(".duo"), initDuo);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
