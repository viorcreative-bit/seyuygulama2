(function () {
  "use strict";

  var L = window.Lazio;

  var PRICE_RANGES = [
    { id: "0-500", label: "500 TL altı", min: 0, max: 500 },
    { id: "500-800", label: "500–800 TL", min: 500, max: 800 },
    { id: "800-", label: "800 TL ve üzeri", min: 800, max: Infinity },
  ];

  var state = {
    kategori: "",
    beden: [],
    renk: [],
    fiyat: "",
    q: "",
    sirala: "onerilen",
  };

  function norm(s) {
    return String(s || "").toLocaleLowerCase("tr").trim();
  }

  function readURL() {
    var u = new URLSearchParams(window.location.search);
    state.kategori = L.category(u.get("kategori")) ? u.get("kategori") : "";
    state.beden = (u.get("beden") || "").split(",").filter(Boolean);
    state.renk = (u.get("renk") || "").split(",").filter(Boolean);
    state.fiyat = u.get("fiyat") || "";
    state.q = u.get("q") || "";
    state.sirala = u.get("sirala") || "onerilen";
  }

  function writeURL() {
    var u = new URLSearchParams();
    if (state.kategori) u.set("kategori", state.kategori);
    if (state.beden.length) u.set("beden", state.beden.join(","));
    if (state.renk.length) u.set("renk", state.renk.join(","));
    if (state.fiyat) u.set("fiyat", state.fiyat);
    if (state.q) u.set("q", state.q);
    if (state.sirala !== "onerilen") u.set("sirala", state.sirala);
    var qs = u.toString();
    history.replaceState(null, "", "magaza.html" + (qs ? "?" + qs : ""));
  }

  function inStockSizes(p) {
    return p.sizes.filter(function (s) {
      return !(p.unavailableSizes || []).includes(s);
    });
  }

  function matches(p, ignore) {
    if (ignore !== "kategori" && state.kategori && p.category !== state.kategori) return false;
    if (state.beden.length) {
      var sizes = inStockSizes(p);
      if (!state.beden.some(function (s) { return sizes.includes(s); })) return false;
    }
    if (state.renk.length && !state.renk.some(function (c) { return p.colors.includes(c); })) return false;
    if (state.fiyat) {
      var r = PRICE_RANGES.find(function (x) { return x.id === state.fiyat; });
      if (r && (p.price < r.min || p.price >= r.max)) return false;
    }
    if (state.q) {
      var cat = L.category(p.category);
      var hay = norm([p.name, cat && cat.name, p.fabric, p.composition].join(" "));
      var words = norm(state.q).split(/\s+/);
      if (!words.every(function (w) { return hay.includes(w); })) return false;
    }
    return true;
  }

  function sorted(list) {
    var out = list.slice();
    if (state.sirala === "artan") out.sort(function (a, b) { return a.price - b.price; });
    else if (state.sirala === "azalan") out.sort(function (a, b) { return b.price - a.price; });
    else if (state.sirala === "yeni") {
      out.sort(function (a, b) { return (b.badge === "Yeni") - (a.badge === "Yeni"); });
    } else {
      out.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    }
    return out;
  }

  /* ---------- Filtre arayüzü ---------- */

  function buildFilters() {
    var catCounts = {};
    L.products.forEach(function (p) {
      catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    });

    L.$("#f-category").innerHTML =
      '<li><label class="check"><input type="radio" name="kategori" value=""> Tümü' +
      '<span class="count">' + L.products.length + "</span></label></li>" +
      L.categories
        .map(function (c) {
          return (
            '<li><label class="check"><input type="radio" name="kategori" value="' + c.id + '"> ' + c.name +
            '<span class="count">' + (catCounts[c.id] || 0) + "</span></label></li>"
          );
        })
        .join("");

    L.$("#f-size").innerHTML = window.LAZIO_SIZES.map(function (s) {
      return '<label class="size-chip"><input type="checkbox" name="beden" value="' + s + '"><span>' + s + "</span></label>";
    }).join("");

    var used = [];
    L.products.forEach(function (p) {
      p.colors.forEach(function (c) {
        if (used.indexOf(c) === -1) used.push(c);
      });
    });
    L.$("#f-color").innerHTML = used
      .map(function (cid) {
        var c = L.color(cid);
        return (
          '<label class="swatch-check" title="' + L.esc(c.name) + '">' +
          '<input class="swatch-input" type="checkbox" name="renk" value="' + cid + '">' +
          '<span class="swatch-face" style="--sw:' + c.hex + '"></span>' +
          '<span class="sr-only">' + L.esc(c.name) + "</span></label>"
        );
      })
      .join("");

    L.$("#f-price").innerHTML =
      '<li><label class="check"><input type="radio" name="fiyat" value=""> Tümü</label></li>' +
      PRICE_RANGES.map(function (r) {
        return '<li><label class="check"><input type="radio" name="fiyat" value="' + r.id + '"> ' + r.label + "</label></li>";
      }).join("");

    L.$("#filters-close").innerHTML = L.icons.close;
  }

  function syncInputs() {
    L.$all('#filter-form input[name="kategori"]').forEach(function (i) {
      i.checked = i.value === state.kategori;
    });
    L.$all('#filter-form input[name="fiyat"]').forEach(function (i) {
      i.checked = i.value === state.fiyat;
    });
    L.$all('#filter-form input[name="beden"]').forEach(function (i) {
      i.checked = state.beden.includes(i.value);
    });
    L.$all('#filter-form input[name="renk"]').forEach(function (i) {
      i.checked = state.renk.includes(i.value);
    });
    L.$("#sort").value = state.sirala;
  }

  function readInputs() {
    var f = L.$("#filter-form");
    var cat = f.querySelector('input[name="kategori"]:checked');
    var price = f.querySelector('input[name="fiyat"]:checked');
    state.kategori = cat ? cat.value : "";
    state.fiyat = price ? price.value : "";
    state.beden = L.$all('input[name="beden"]:checked', f).map(function (i) { return i.value; });
    state.renk = L.$all('input[name="renk"]:checked', f).map(function (i) { return i.value; });
  }

  /* ---------- Çıktı ---------- */

  function render() {
    var list = sorted(L.products.filter(function (p) { return matches(p); }));
    var cat = L.category(state.kategori);

    L.$("#shop-title").textContent = cat ? cat.name : "Tüm ürünler";
    L.$("#shop-lead").textContent = cat
      ? cat.name + " modellerimiz; hepsi kendi üretimimiz."
      : "Kendi atölyemizde ürettiğimiz bütün modeller.";
    document.title = (cat ? cat.name : "Mağaza") + " | Lazio Tekstil";

    var crumbs =
      '<li><a href="index.html">Ana sayfa</a></li>' +
      (cat
        ? '<li><a href="magaza.html">Mağaza</a></li><li aria-current="page">' + cat.name + "</li>"
        : '<li aria-current="page">Mağaza</li>');
    L.$("#breadcrumb").innerHTML = crumbs;

    L.$("#result-count").textContent = list.length + " ürün";
    L.$("#filters-apply").textContent = list.length + " ürünü göster";
    L.$("#shop-grid").innerHTML = list.map(L.productCard).join("");
    L.$("#shop-empty").hidden = list.length > 0;

    var search = L.$("#active-search");
    if (state.q) {
      search.hidden = false;
      search.innerHTML =
        "<span>“" + L.esc(state.q) + "” için sonuçlar</span>" +
        '<button type="button" class="text-btn" id="clear-search">Aramayı temizle</button>';
    } else {
      search.hidden = true;
      search.innerHTML = "";
    }

    // Nav'daki aktif kategori bağlantısı
    L.$all(".main-nav a, .mobile-nav a").forEach(function (a) {
      var href = a.getAttribute("href");
      var key = href.indexOf("kategori=") > -1 ? href.split("kategori=")[1] : href === "magaza.html" ? "" : null;
      if (key === null) return;
      if (key === state.kategori) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function update() {
    writeURL();
    render();
  }

  function reset() {
    state.kategori = "";
    state.beden = [];
    state.renk = [];
    state.fiyat = "";
    state.q = "";
    L.$all('input[name="q"]').forEach(function (i) { i.value = ""; });
    syncInputs();
    update();
  }

  /* ---------- Mobil filtre paneli ---------- */

  function setPanel(open) {
    var panel = L.$("#filters");
    var btn = L.$("#filters-open");
    panel.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) L.$("#filters-close").focus();
    else btn.focus();
  }

  L.ready(function () {
    readURL();
    buildFilters();
    syncInputs();
    render();

    L.$("#filter-form").addEventListener("change", function () {
      readInputs();
      update();
    });
    L.$("#sort").addEventListener("change", function (e) {
      state.sirala = e.target.value;
      update();
    });
    L.$("#filters-reset").addEventListener("click", reset);
    L.$("#empty-reset").addEventListener("click", reset);
    L.$("#active-search").addEventListener("click", function (e) {
      if (e.target.id === "clear-search") {
        state.q = "";
        L.$all('input[name="q"]').forEach(function (i) { i.value = ""; });
        update();
      }
    });

    L.$("#filters-open").addEventListener("click", function () { setPanel(true); });
    L.$("#filters-close").addEventListener("click", function () { setPanel(false); });
    L.$("#filters-apply").addEventListener("click", function () { setPanel(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && L.$("#filters").classList.contains("is-open")) setPanel(false);
    });
  });
})();
