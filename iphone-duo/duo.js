/*!
 * iPhone Duo — kaydırmalı yakınlaşma bölümü
 * Bağımlılık yok. Sayfadaki her .duo bölümünü otomatik başlatır.
 */
(function () {
  "use strict";


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
    // Betik sayfaya iki kez eklense de her bölüm bir kez kurulur
    if (root.getAttribute("data-duo-ready")) return;
    root.setAttribute("data-duo-ready", "1");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var screenCtl = createScreen(root);
    // Animasyon kurulamazsa telefon açık kalır; ekran yine kullanılabilir
    var staticFallback = function () { if (screenCtl) screenCtl.setActive(true); };

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
    if (!tour || !sticky || !ctx || !photo) { staticFallback(); return; }

    // Odak koordinatları, fotoğrafın HTML'deki width/height değerlerine göre yazılır.
    // Aynı fotoğrafın daha yüksek çözünürlüklü sürümünü koysanız da koordinatlar değişmez.
    var REF_W = parseFloat(photo.getAttribute("width")) || 2000;
    var REF_H = parseFloat(photo.getAttribute("height")) || 1333;

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
    if (N < 2) { staticFallback(); return; }

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
    var live = false;

    function renderUnfold() {
      if (!unfold || !unfoldSticky || !device) return;
      var rect = unfold.getBoundingClientRect();
      var len = Math.max(1, unfold.offsetHeight - unfoldSticky.offsetHeight);
      var q = clamp((topOffset() - rect.top) / len, 0, 1);
      // Telefon kaydırmanın ilk yarısında açılır, kalan kısımda açık durur (uygulamalar için)
      var open = easeInOutCubic(clamp((q - 0.08) / 0.5, 0, 1));
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

      var nowLive = open >= 0.999;
      if (nowLive !== live) {
        live = nowLive;
        unfold.classList.toggle("is-live", live);
        if (screenCtl) screenCtl.setActive(live);
      }
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
        staticFallback();
      }, { once: true });
    }
  }

  // ========================================================================
  // Dokunulabilen iç ekran: ana ekran ve uygulamalar
  // ========================================================================

  var TR = "tr-TR";
  var ICON_BACK = '<svg viewBox="0 0 10 16" aria-hidden="true"><path d="M8.5 1.5 2 8l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var ICON_FLIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10A7.8 7.8 0 0 1 18 6.6M19.5 14A7.8 7.8 0 0 1 6 17.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.6 2.8v4.4h-4.4M5.4 21.2v-4.4h4.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function safeStore() {
    return {
      get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* gizli pencere vb. */ } }
    };
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function appBar(title, opts) {
    opts = opts || {};
    return '<div class="duo-view__bar"><button type="button" class="duo-view__back" data-duo-go-home>' +
      ICON_BACK + "<span>Ana ekran</span></button>" + (opts.extra || "") + "</div>" +
      (opts.noTitle ? "" : '<h4 class="duo-view__title">' + title + "</h4>");
  }

  function createScreen(root) {
    var screen = root.querySelector("[data-duo-screen]");
    if (!screen) return null;
    var home = screen.querySelector("[data-duo-home]");
    var view = screen.querySelector("[data-duo-view]");
    var homebar = screen.querySelector("[data-duo-homebar]");
    var modal = root.querySelector("[data-duo-modal]");
    var homeParent = screen.parentNode;
    var store = safeStore();
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    var prefs = { wall: store.get("duo-duvar") || "kum", mirror: store.get("duo-ayna") !== "0" };
    screen.setAttribute("data-wall", prefs.wall);

    var photos = [];            // { url, time } — yalnızca bellekte
    var current = null;         // { name, cleanup }
    var lastButton = null;
    var inModal = false;
    var savedOverflow = "";
    var tickers = [];
    var tickTimer = 0;
    var watch = { running: false, start: 0, elapsed: 0, laps: [] };

    var fmtTime = new Intl.DateTimeFormat(TR, { hour: "2-digit", minute: "2-digit" });
    var fmtDate = new Intl.DateTimeFormat(TR, { day: "numeric", month: "long", weekday: "long" });
    var fmtWeekday = new Intl.DateTimeFormat(TR, { weekday: "short" });

    // ---- Canlı saat ----
    function tick() {
      var now = new Date();
      var values = {
        time: fmtTime.format(now),
        date: fmtDate.format(now),
        weekday: fmtWeekday.format(now),
        day: String(now.getDate())
      };
      Array.prototype.forEach.call(screen.querySelectorAll("[data-duo-now]"), function (n) {
        var v = values[n.getAttribute("data-duo-now")];
        if (v && n.textContent !== v) n.textContent = v;
      });
      tickers.forEach(function (fn) { fn(now); });
    }
    function startTick() { if (!tickTimer) { tick(); tickTimer = setInterval(tick, 1000); } }
    function stopTick() { clearInterval(tickTimer); tickTimer = 0; }
    function onTick(fn) {
      tickers.push(fn);
      fn(new Date());
      return function () { tickers = tickers.filter(function (f) { return f !== fn; }); };
    }

    function setLight(on) { screen.classList.toggle("is-app-light", on); }

    // ---- Uygulama aç / kapat ----
    function needsModal() {
      return !!(modal && typeof modal.showModal === "function") && screen.clientWidth < 480;
    }

    function enterModal() {
      modal.appendChild(screen);
      screen.classList.add("is-modal");
      if (!modal.open) modal.showModal();
      inModal = true;
      savedOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }

    function exitModal() {
      inModal = false;
      screen.classList.remove("is-modal");
      homeParent.appendChild(screen);
      if (modal.open) modal.close();
      document.documentElement.style.overflow = savedOverflow;
    }

    function closeCurrent() {
      if (current && current.cleanup) current.cleanup();
      current = null;
    }

    function openApp(name, opts) {
      var app = apps[name];
      if (!app) return;
      closeCurrent();
      if (!inModal && needsModal()) enterModal();
      view.innerHTML = "";
      view.className = "duo-view duo-view--" + name;
      view.hidden = false;
      home.hidden = true;
      setLight(!app.dark);
      current = { name: name, cleanup: app.open(view, opts || {}) || null };
      var first = view.querySelector("[data-autofocus]") || view.querySelector("button:not([disabled]), a, input, textarea");
      if (first) first.focus({ preventScroll: true });
    }

    function goHome(silent) {
      closeCurrent();
      view.hidden = true;
      view.innerHTML = "";
      home.hidden = false;
      setLight(false);
      if (inModal) exitModal();
      if (!silent && lastButton && document.contains(lastButton)) lastButton.focus({ preventScroll: true });
    }

    home.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-app]");
      if (!b) return;
      lastButton = b;
      openApp(b.getAttribute("data-app"));
    });

    view.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-duo-go-home], [data-duo-open]");
      if (!t || !view.contains(t)) return;
      if (t.hasAttribute("data-duo-go-home")) goHome();
      else openApp(t.getAttribute("data-duo-open"));
    });

    if (homebar) homebar.addEventListener("click", function () { if (current) goHome(); });

    screen.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && current && !inModal) { e.preventDefault(); goHome(); }
    });

    if (modal) {
      modal.addEventListener("cancel", function (e) { e.preventDefault(); goHome(); });
    }

    // ====================================================================
    // Uygulamalar
    // ====================================================================
    var apps = {};

    // ---- Kamera ----
    apps.kamera = {
      dark: true,
      open: function (v) {
        v.innerHTML =
          '<div class="duo-cam">' +
            '<video class="duo-cam__video" playsinline muted autoplay></video>' +
            '<div class="duo-cam__msg" role="status"></div>' +
            '<div class="duo-cam__flash" aria-hidden="true"></div>' +
            '<div class="duo-cam__top">' +
              '<button type="button" class="duo-cam__close" data-duo-go-home aria-label="Kamerayı kapat">' + ICON_CLOSE + "</button>" +
              '<span class="duo-cam__label" aria-live="polite"></span>' +
            "</div>" +
            '<div class="duo-cam__toast" role="status"></div>' +
            '<div class="duo-cam__controls">' +
              '<button type="button" class="duo-cam__thumb" aria-label="Çekilen fotoğrafları aç"></button>' +
              '<button type="button" class="duo-cam__shutter" aria-label="Fotoğraf çek" disabled></button>' +
              '<button type="button" class="duo-cam__flip" aria-label="Ön ve arka kamera arasında geç" disabled>' + ICON_FLIP + "</button>" +
            "</div>" +
          "</div>";

        var video = v.querySelector("video");
        var msg = v.querySelector(".duo-cam__msg");
        var flash = v.querySelector(".duo-cam__flash");
        var label = v.querySelector(".duo-cam__label");
        var toast = v.querySelector(".duo-cam__toast");
        var thumb = v.querySelector(".duo-cam__thumb");
        var shutter = v.querySelector(".duo-cam__shutter");
        var flip = v.querySelector(".duo-cam__flip");
        var stream = null, closed = false, facing = null, cams = 0, busy = false, toastTimer = 0;

        function setMsg(text, retry) {
          if (!text) { msg.hidden = true; msg.innerHTML = ""; return; }
          msg.hidden = false;
          msg.innerHTML = "<p></p>" + (retry ? '<button type="button" class="duo-btn">Tekrar dene</button>' : "");
          msg.querySelector("p").textContent = text;
          if (retry) {
            msg.querySelector("button").addEventListener("click", function () {
              start(facing || "environment", false).catch(function (err) { setMsg(explain(err), true); });
            });
          }
        }

        function showToast(text) {
          toast.textContent = text;
          toast.classList.add("is-on");
          clearTimeout(toastTimer);
          toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 2200);
        }

        function stopStream() {
          if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
          stream = null;
          video.srcObject = null;
        }

        function applyFacing() {
          video.classList.toggle("is-mirrored", prefs.mirror && facing === "user");
          label.textContent = facing === "environment" ? "Arka kamera" : facing === "user" ? "Ön kamera" : "";
        }

        function renderThumb() {
          thumb.innerHTML = "";
          if (!photos.length) return;
          var img = document.createElement("img");
          img.alt = "";
          img.src = photos[0].url;
          thumb.appendChild(img);
        }

        function explain(err) {
          var n = err && err.name;
          if (n === "NotAllowedError" || n === "SecurityError") {
            return "Kamera izni verilmedi. Tarayıcının adres çubuğundaki kamera simgesinden izin verip tekrar deneyin.";
          }
          if (n === "NotFoundError" || n === "OverconstrainedError") return "Bu cihazda kamera bulunamadı.";
          if (n === "NotReadableError") return "Kamerayı başka bir uygulama kullanıyor olabilir. O uygulamayı kapatıp tekrar deneyin.";
          return "Kamera açılamadı." + (n ? " (" + n + ")" : "");
        }

        function start(want, exact) {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setMsg(window.isSecureContext === false
              ? "Kamera yalnızca güvenli bağlantıda (https://) açılır. Sayfa sitenizde https ile yayındayken çalışır."
              : "Bu tarayıcı kamera erişimini desteklemiyor.");
            return Promise.resolve(false);
          }
          busy = true;
          shutter.disabled = true;
          flip.disabled = true;
          setMsg("Kamera açılıyor…");
          stopStream();
          var constraints = {
            audio: false,
            video: {
              facingMode: exact ? { exact: want } : { ideal: want },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          };
          return navigator.mediaDevices.getUserMedia(constraints).then(function (s) {
            if (closed) { s.getTracks().forEach(function (t) { t.stop(); }); return false; }
            stream = s;
            video.srcObject = s;
            var playing = video.play();
            if (playing && playing.catch) playing.catch(function () {});
            var track = s.getVideoTracks()[0];
            var settings = track && track.getSettings ? track.getSettings() : {};
            facing = settings.facingMode === "environment" || settings.facingMode === "user" ? settings.facingMode : null;
            return navigator.mediaDevices.enumerateDevices().then(function (list) {
              cams = list.filter(function (d) { return d.kind === "videoinput"; }).length;
            }).catch(function () {}).then(function () {
              if (closed) return false;
              // Dizüstü kameraları yön bildirmez; tek kamera varsa ön kameradır
              if (!facing) facing = cams <= 1 ? "user" : want;
              applyFacing();
              setMsg("");
              shutter.disabled = false;
              flip.disabled = false;
              busy = false;
              return true;
            });
          }, function (err) {
            busy = false;
            throw err;
          });
        }

        flip.addEventListener("click", function () {
          if (busy) return;
          var target = facing === "environment" ? "user" : "environment";
          var name = target === "environment" ? "arka" : "ön";
          if (cams && cams < 2) { showToast("Bu cihazda " + name + " kamera yok."); return; }
          var previous = facing;
          start(target, true).catch(function () {
            showToast("Bu cihazda " + name + " kamera bulunamadı.");
            return start(previous || "user", false);
          }).catch(function (err) { setMsg(explain(err), true); });
        });

        shutter.addEventListener("click", function () {
          if (!video.videoWidth) return;
          var c = document.createElement("canvas");
          c.width = video.videoWidth;
          c.height = video.videoHeight;
          var g = c.getContext("2d");
          if (video.classList.contains("is-mirrored")) { g.translate(c.width, 0); g.scale(-1, 1); }
          g.drawImage(video, 0, 0, c.width, c.height);
          if (!reduce.matches) {
            flash.classList.remove("is-on");
            void flash.offsetWidth;
            flash.classList.add("is-on");
          }
          c.toBlob(function (blob) {
            if (!blob) return;
            photos.unshift({ url: URL.createObjectURL(blob), time: new Date() });
            if (!closed) { renderThumb(); showToast("Fotoğraf çekildi."); }
          }, "image/jpeg", 0.92);
        });

        thumb.addEventListener("click", function () { openApp("fotograflar", { photo: 0 }); });

        renderThumb();
        start("environment", false).catch(function (err) { if (!closed) setMsg(explain(err), true); });

        return function () {
          closed = true;
          clearTimeout(toastTimer);
          stopStream();
        };
      }
    };

    // ---- Fotoğraflar ----
    apps.fotograflar = {
      open: function (v, opts) {
        function grid() {
          setLight(true);
          v.innerHTML = appBar("Fotoğraflar") + '<div class="duo-view__body"></div>';
          var body = v.querySelector(".duo-view__body");
          if (!photos.length) {
            body.innerHTML = '<div class="duo-empty"><p>Henüz fotoğraf yok.<br>Kamerayla çektikleriniz burada görünür.</p>' +
              '<button type="button" class="duo-btn" data-duo-open="kamera">Kamerayı aç</button></div>';
            return;
          }
          var wrap = document.createElement("div");
          wrap.className = "duo-photos";
          photos.forEach(function (p, i) {
            var b = document.createElement("button");
            b.type = "button";
            b.setAttribute("aria-label", "Fotoğrafı aç, saat " + fmtTime.format(p.time));
            var img = document.createElement("img");
            img.alt = "";
            img.src = p.url;
            b.appendChild(img);
            b.addEventListener("click", function () { single(i); });
            wrap.appendChild(b);
          });
          body.appendChild(wrap);
          var note = document.createElement("p");
          note.className = "duo-view__note";
          note.textContent = "Fotoğraflar yalnızca bu sayfada tutulur; sayfayı kapattığınızda silinir.";
          body.appendChild(note);
        }

        function single(i) {
          var p = photos[i];
          if (!p) { grid(); return; }
          setLight(false);
          v.innerHTML = '<div class="duo-viewer">' +
            '<div class="duo-view__bar"><button type="button" class="duo-view__back" data-back>' + ICON_BACK + "<span>Fotoğraflar</span></button></div>" +
            '<img class="duo-viewer__img" alt="Kamerayla çekilen fotoğraf">' +
            '<div class="duo-viewer__tools"><a class="duo-btn duo-btn--quiet">İndir</a>' +
            '<button type="button" class="duo-btn duo-btn--danger" data-del>Sil</button></div></div>';
          v.querySelector("img").src = p.url;
          var a = v.querySelector("a");
          a.href = p.url;
          a.download = "iphone-duo-" + p.time.getFullYear() + pad2(p.time.getMonth() + 1) + pad2(p.time.getDate()) +
            "-" + pad2(p.time.getHours()) + pad2(p.time.getMinutes()) + pad2(p.time.getSeconds()) + ".jpg";
          var back = v.querySelector("[data-back]");
          back.addEventListener("click", grid);
          v.querySelector("[data-del]").addEventListener("click", function () {
            URL.revokeObjectURL(p.url);
            photos.splice(i, 1);
            grid();
          });
          back.focus({ preventScroll: true });
        }

        if (opts.photo != null && photos[opts.photo]) single(opts.photo);
        else grid();
      }
    };

    // ---- Saat ----
    apps.saat = {
      open: function (v) {
        v.innerHTML = appBar("Saat") +
          '<div class="duo-view__body"><div class="duo-clock__now"></div><div class="duo-clock__date"></div><ul class="duo-list"></ul></div>';
        var nowEl = v.querySelector(".duo-clock__now");
        var dateEl = v.querySelector(".duo-clock__date");
        var list = v.querySelector(".duo-list");
        var fmtSec = new Intl.DateTimeFormat(TR, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        var cities = [["İstanbul", "Europe/Istanbul"], ["Londra", "Europe/London"], ["New York", "America/New_York"], ["Tokyo", "Asia/Tokyo"]];
        var rows = cities.map(function (c) {
          var li = document.createElement("li");
          li.innerHTML = "<span><span></span><small></small></span><strong></strong>";
          li.firstChild.firstChild.textContent = c[0];
          list.appendChild(li);
          return {
            day: li.querySelector("small"),
            time: li.querySelector("strong"),
            fTime: new Intl.DateTimeFormat(TR, { hour: "2-digit", minute: "2-digit", timeZone: c[1] }),
            fDay: new Intl.DateTimeFormat(TR, { weekday: "long", timeZone: c[1] })
          };
        });
        return onTick(function (now) {
          nowEl.textContent = fmtSec.format(now);
          dateEl.textContent = fmtDate.format(now);
          rows.forEach(function (r) {
            r.time.textContent = r.fTime.format(now);
            r.day.textContent = r.fDay.format(now);
          });
        });
      }
    };

    // ---- Kronometre (uygulamadan çıkınca da çalışmaya devam eder) ----
    apps.kronometre = {
      open: function (v) {
        v.innerHTML = appBar("Kronometre") +
          '<div class="duo-view__body"><div class="duo-watch">' +
          '<div class="duo-watch__time" role="timer" aria-live="off">00:00,00</div>' +
          '<div class="duo-watch__buttons"><button type="button" class="duo-btn duo-btn--quiet" data-lap>Tur</button>' +
          '<button type="button" class="duo-btn" data-run data-autofocus>Başlat</button></div>' +
          '<ol class="duo-list"></ol></div></div>';
        var timeEl = v.querySelector(".duo-watch__time");
        var lapBtn = v.querySelector("[data-lap]");
        var runBtn = v.querySelector("[data-run]");
        var lapsEl = v.querySelector(".duo-list");
        var raf = 0;

        function elapsed() { return watch.elapsed + (watch.running ? performance.now() - watch.start : 0); }
        function fmt(ms) {
          var cs = Math.floor(ms / 10);
          return pad2(Math.floor(cs / 6000)) + ":" + pad2(Math.floor(cs / 100) % 60) + "," + pad2(cs % 100);
        }
        function loop() {
          timeEl.textContent = fmt(elapsed());
          raf = watch.running ? requestAnimationFrame(loop) : 0;
        }
        function sync() {
          runBtn.textContent = watch.running ? "Durdur" : "Başlat";
          lapBtn.textContent = watch.running || !watch.elapsed ? "Tur" : "Sıfırla";
          lapBtn.disabled = !watch.running && !watch.elapsed;
          lapsEl.innerHTML = watch.laps.map(function (t, i) {
            return "<li><span>Tur " + (watch.laps.length - i) + "</span><strong>" + fmt(t) + "</strong></li>";
          }).join("");
          timeEl.textContent = fmt(elapsed());
        }

        runBtn.addEventListener("click", function () {
          if (watch.running) {
            watch.elapsed = elapsed();
            watch.running = false;
            cancelAnimationFrame(raf);
          } else {
            watch.start = performance.now();
            watch.running = true;
            loop();
          }
          sync();
        });

        lapBtn.addEventListener("click", function () {
          if (watch.running) {
            var done = watch.laps.reduce(function (a, b) { return a + b; }, 0);
            watch.laps.unshift(elapsed() - done);
          } else {
            watch.elapsed = 0;
            watch.laps = [];
          }
          sync();
        });

        sync();
        if (watch.running) loop();
        return function () { cancelAnimationFrame(raf); };
      }
    };

    // ---- Takvim ----
    apps.takvim = {
      open: function (v) {
        v.innerHTML = appBar("Takvim") +
          '<div class="duo-view__body"><div class="duo-cal__head"><span class="duo-cal__month" aria-live="polite"></span>' +
          '<span class="duo-cal__nav"><button type="button" data-m="-1" aria-label="Önceki ay">‹</button>' +
          '<button type="button" data-m="1" aria-label="Sonraki ay">›</button></span></div>' +
          '<div class="duo-cal__grid"></div></div>';
        var title = v.querySelector(".duo-cal__month");
        var gridEl = v.querySelector(".duo-cal__grid");
        var fmtMonth = new Intl.DateTimeFormat(TR, { month: "long", year: "numeric" });
        var offset = 0;

        function draw() {
          var now = new Date();
          var first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
          var lead = (first.getDay() + 6) % 7; // haftanın ilk günü pazartesi
          var days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
          var html = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(function (w) {
            return '<span class="duo-cal__wd" aria-hidden="true">' + w + "</span>";
          }).join("");
          for (var i = 0; i < lead; i++) html += "<span></span>";
          for (var d = 1; d <= days; d++) {
            var weekend = (lead + d - 1) % 7 >= 5;
            var today = offset === 0 && d === now.getDate();
            html += '<span class="duo-cal__day' + (weekend ? " is-weekend" : "") + (today ? " is-today" : "") + '"' +
              (today ? ' aria-current="date"' : "") + ">" + d + "</span>";
          }
          title.textContent = fmtMonth.format(first);
          gridEl.innerHTML = html;
        }

        v.querySelector(".duo-cal__nav").addEventListener("click", function (e) {
          var b = e.target.closest("[data-m]");
          if (!b) return;
          offset += parseInt(b.getAttribute("data-m"), 10);
          draw();
        });
        draw();
      }
    };

    // ---- Notlar ----
    apps.notlar = {
      open: function (v) {
        v.innerHTML = appBar("Notlar") +
          '<div class="duo-view__body"><textarea class="duo-notes" aria-label="Not" placeholder="Bir şeyler yazın…"></textarea>' +
          '<p class="duo-view__note">Notlarınız yalnızca bu tarayıcıda saklanır.</p></div>';
        var ta = v.querySelector("textarea");
        var timer = 0;
        ta.value = store.get("duo-notlar") || "";
        ta.addEventListener("input", function () {
          clearTimeout(timer);
          timer = setTimeout(function () { store.set("duo-notlar", ta.value); }, 250);
        });
        return function () { clearTimeout(timer); store.set("duo-notlar", ta.value); };
      }
    };

    // ---- Hesap Makinesi ----
    apps.hesap = {
      dark: true,
      open: function (v) {
        var keys = [
          ["AC", "is-fn", "clear", "Temizle"], ["±", "is-fn", "neg", "İşaret değiştir"], ["%", "is-fn", "pct", "Yüzde"], ["÷", "is-op", "/", "Böl"],
          ["7"], ["8"], ["9"], ["×", "is-op", "*", "Çarp"],
          ["4"], ["5"], ["6"], ["−", "is-op", "-", "Çıkar"],
          ["1"], ["2"], ["3"], ["+", "is-op", "+", "Topla"],
          ["0", "is-wide"], [",", "", "dot", "Virgül"], ["=", "is-op", "eq", "Eşittir"]
        ];
        v.innerHTML = appBar("Hesap Makinesi", { noTitle: true }) +
          '<div class="duo-calc"><output class="duo-calc__display" aria-live="polite">0</output><div class="duo-calc__keys">' +
          keys.map(function (k) {
            return '<button type="button" class="' + (k[1] || "") + '" data-k="' + (k[2] || k[0]) + '"' +
              (k[3] ? ' aria-label="' + k[3] + '"' : "") + ">" + k[0] + "</button>";
          }).join("") + "</div></div>";
        var disp = v.querySelector(".duo-calc__display");
        var opButtons = v.querySelectorAll(".is-op");
        var cur = "0", acc = null, op = null, fresh = true;

        function apply(a, b, o) {
          if (o === "+") return a + b;
          if (o === "-") return a - b;
          if (o === "*") return a * b;
          return b === 0 ? NaN : a / b;
        }
        function format(n) {
          if (!isFinite(n)) return "Hata";
          var s = String(parseFloat(n.toPrecision(12)));
          return s.length > 13 ? n.toExponential(6) : s;
        }
        function show() {
          var t = cur === "Hata" ? cur : cur.replace("-", "−").replace(".", ",");
          disp.textContent = t;
          disp.classList.toggle("is-long", t.length > 8);
          Array.prototype.forEach.call(opButtons, function (b) {
            b.classList.toggle("is-active", fresh && op && b.getAttribute("data-k") === op);
          });
        }
        function press(k) {
          if (cur === "Hata" && k !== "clear") { cur = "0"; acc = null; op = null; fresh = true; }
          if (/^[0-9]$/.test(k)) {
            if (fresh || cur === "0") { cur = k; fresh = false; }
            else if (cur === "-0") cur = "-" + k;
            else if (cur.replace(/[-.]/g, "").length < 12) cur += k;
          } else if (k === "dot") {
            if (fresh) { cur = "0."; fresh = false; }
            else if (cur.indexOf(".") < 0) cur += ".";
          } else if (k === "back") {
            if (!fresh) cur = cur.length > 1 && cur !== "-0" ? cur.slice(0, -1).replace(/^-$/, "0") : "0";
          } else if (k === "neg") {
            cur = cur.charAt(0) === "-" ? cur.slice(1) : "-" + cur;
          } else if (k === "pct") {
            cur = format(parseFloat(cur) / 100);
          } else if (k === "+" || k === "-" || k === "*" || k === "/") {
            if (op && !fresh) cur = format(apply(acc, parseFloat(cur), op));
            acc = parseFloat(cur);
            op = k;
            fresh = true;
          } else if (k === "eq") {
            if (op) { cur = format(apply(acc, parseFloat(cur), op)); op = null; acc = null; }
            fresh = true;
          } else if (k === "clear") {
            cur = "0"; acc = null; op = null; fresh = true;
          }
          show();
        }

        v.querySelector(".duo-calc__keys").addEventListener("click", function (e) {
          var b = e.target.closest("[data-k]");
          if (b) press(b.getAttribute("data-k"));
        });
        v.addEventListener("keydown", function (e) {
          var map = { ",": "dot", ".": "dot", "Enter": "eq", "=": "eq", "Backspace": "back", "Delete": "clear", "+": "+", "-": "-", "*": "*", "x": "*", "/": "/", "%": "pct" };
          var k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
          if (!k) return;
          e.preventDefault();
          press(k);
        });
        show();
      }
    };

    // ---- Ayarlar ----
    apps.ayarlar = {
      open: function (v) {
        var walls = [["kum", "Kum tepeleri"], ["alacakaranlik", "Alacakaranlık"], ["gece", "Gece"]];
        v.innerHTML = appBar("Ayarlar") + '<div class="duo-view__body">' +
          '<div class="duo-set__group"><p class="duo-set__label">Duvar kağıdı</p><div class="duo-set__card">' +
          '<div class="duo-wallpick" role="radiogroup" aria-label="Duvar kağıdı">' +
          walls.map(function (w) {
            return '<label><input type="radio" name="duo-duvar" value="' + w[0] + '"' + (prefs.wall === w[0] ? " checked" : "") + ">" +
              '<span class="duo-wallpick__swatch duo-wallpick__swatch--' + w[0] + '"></span>' + w[1] + "</label>";
          }).join("") + "</div></div></div>" +
          '<div class="duo-set__group"><p class="duo-set__label">Kamera</p><div class="duo-set__card">' +
          '<label class="duo-switch"><span>Ön kamerada ayna görüntüsü</span><input type="checkbox"' + (prefs.mirror ? " checked" : "") + ">" +
          '<span class="duo-switch__track" aria-hidden="true"></span></label></div></div></div>';

        v.querySelector(".duo-wallpick").addEventListener("change", function (e) {
          prefs.wall = e.target.value;
          screen.setAttribute("data-wall", prefs.wall);
          store.set("duo-duvar", prefs.wall);
        });
        v.querySelector(".duo-switch input").addEventListener("change", function (e) {
          prefs.mirror = e.target.checked;
          store.set("duo-ayna", prefs.mirror ? "1" : "0");
        });
      }
    };

    // ---- Görünürlük: saat yalnızca bölüm ekrandayken çalışır, kamera ekrandan çıkınca kapanır ----
    var watchTarget = root.querySelector(".duo-unfold") || root;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) startTick();
        else {
          stopTick();
          if (current && current.name === "kamera" && !inModal) goHome(true);
        }
      }).observe(watchTarget);
    } else {
      startTick();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && current && current.name === "kamera") goHome(true);
    });

    return {
      // Telefon tamamen açıkken true; katlanmaya başlayınca false
      setActive: function (on) {
        screen.inert = !on;
        if (!on) {
          screen.setAttribute("inert", "");
          if (current) goHome(true);
        } else {
          screen.removeAttribute("inert");
          tick();
        }
      }
    };
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll(".duo"), initDuo);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
