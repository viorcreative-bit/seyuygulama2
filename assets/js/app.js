/*
 * Ortak işlevler: sepet, sayfa iskeleti (üst menü / alt bilgi),
 * ürün kartları, fiyat biçimi ve bildirimler.
 */
(function () {
  "use strict";

  var C = window.LAZIO_CONFIG;
  var PRODUCTS = window.LAZIO_PRODUCTS;
  var COLORS = window.LAZIO_COLORS;
  var CATEGORIES = window.LAZIO_CATEGORIES;

  /* ---------- Yardımcılar ---------- */

  var money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

  function fmt(n) {
    return money.format(n);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function storageGet(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function waLink(text) {
    return "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(text);
  }

  /* ---------- Katalog ---------- */

  function product(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }

  function category(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }

  function color(id) {
    return COLORS[id] || { name: id, hex: "#B7BABF" };
  }

  function sizeChart(p) {
    return window.LAZIO_SIZE_CHARTS[p.sizeChart] || null;
  }

  /* Ölçü çizgisi değerleri: yatay (göğüs/bel) ve dikey (boy) */
  function dimsFor(p, size) {
    var chart = sizeChart(p);
    if (!chart || !chart.sizes[size]) return null;
    var m = chart.sizes[size];
    return { h: m.chest != null ? m.chest : m.waist, v: m.length };
  }

  /* Ürün görseli: fotoğraf varsa fotoğraf, yoksa teknik çizim */
  function productVisual(p, colorId, opts) {
    var o = opts || {};
    var c = color(colorId);
    var photo = p.images && p.images[colorId];
    if (photo) {
      return '<img src="' + esc(photo) + '" alt="' + esc(p.name + ", " + c.name) + '" loading="lazy">';
    }
    return window.LazioGarments.svg(p.garment, {
      variant: p.variant,
      color: c.hex,
      label: o.decorative ? null : p.name + ", " + c.name + " (teknik çizim)",
      dims: o.dims || null,
    });
  }

  /* ---------- Sepet ---------- */

  var CART_KEY = "lazio-cart-v1";
  var memoryCart = [];

  function readCart() {
    var cart = storageGet(CART_KEY, null);
    if (!Array.isArray(cart)) return memoryCart.slice();
    return cart.filter(function (it) {
      return product(it.id) && it.qty > 0;
    });
  }

  function writeCart(items) {
    memoryCart = items.slice();
    storageSet(CART_KEY, items);
    window.dispatchEvent(new CustomEvent("lazio:cart"));
  }

  function lineKey(it) {
    return it.id + "|" + it.color + "|" + it.size;
  }

  var cart = {
    items: readCart,
    count: function () {
      return readCart().reduce(function (s, it) {
        return s + it.qty;
      }, 0);
    },
    add: function (id, colorId, size, qty) {
      var items = readCart();
      var key = lineKey({ id: id, color: colorId, size: size });
      var found = null;
      items.forEach(function (it) {
        if (lineKey(it) === key) found = it;
      });
      if (found) found.qty = Math.min(found.qty + qty, 99);
      else items.push({ id: id, color: colorId, size: size, qty: qty });
      writeCart(items);
    },
    setQty: function (key, qty) {
      var items = readCart()
        .map(function (it) {
          if (lineKey(it) === key) it.qty = Math.max(0, Math.min(qty, 99));
          return it;
        })
        .filter(function (it) {
          return it.qty > 0;
        });
      writeCart(items);
    },
    remove: function (key) {
      writeCart(
        readCart().filter(function (it) {
          return lineKey(it) !== key;
        })
      );
    },
    clear: function () {
      writeCart([]);
    },
    detailed: function () {
      return readCart().map(function (it) {
        var p = product(it.id);
        return {
          key: lineKey(it),
          id: it.id,
          product: p,
          color: it.color,
          colorName: color(it.color).name,
          size: it.size,
          qty: it.qty,
          unit: p.price,
          total: p.price * it.qty,
        };
      });
    },
    totals: function (paymentMethod) {
      var lines = cart.detailed();
      var subtotal = lines.reduce(function (s, l) {
        return s + l.total;
      }, 0);
      var shipping = subtotal === 0 || subtotal >= C.shipping.freeThreshold ? 0 : C.shipping.fee;
      var cod = paymentMethod === "kapida" ? C.payment.cashOnDelivery.fee : 0;
      return {
        lines: lines,
        subtotal: subtotal,
        shipping: shipping,
        cod: cod,
        total: subtotal + shipping + cod,
      };
    },
  };

  /* ---------- İkonlar ---------- */

  var ICONS = {
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h14l-3-3M20 15H6l3 3"/></svg>',
    card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5 5.3 15A7.5 7.5 0 1 1 8.6 18Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
  };

  /* ---------- Sayfa iskeleti ---------- */

  var NAV = [
    { href: "magaza.html", label: "Tüm ürünler", key: "magaza" },
    { href: "magaza.html?kategori=tisort", label: "Tişört", key: "tisort" },
    { href: "magaza.html?kategori=sweatshirt", label: "Sweatshirt", key: "sweatshirt" },
    { href: "magaza.html?kategori=kapusonlu", label: "Kapüşonlu", key: "kapusonlu" },
    { href: "magaza.html?kategori=esofman", label: "Eşofman", key: "esofman" },
    { href: "toptan.html", label: "Toptan ve fason", key: "toptan" },
  ];

  function activeKey() {
    var page = document.body.getAttribute("data-page");
    if (page === "magaza") return param("kategori") || "magaza";
    return page;
  }

  function logo() {
    return (
      '<a class="logo" href="index.html" aria-label="Lazio Tekstil ana sayfa">' +
      '<span class="logo-label">LAZIO</span><span class="logo-sub">tekstil</span></a>'
    );
  }

  function headerHTML() {
    var active = activeKey();
    var links = NAV.map(function (n) {
      var cur = n.key === active ? ' aria-current="page"' : "";
      return '<li><a href="' + n.href + '"' + cur + ">" + n.label + "</a></li>";
    }).join("");
    var mobileExtra =
      '<li><a href="hakkimizda.html">Hakkımızda</a></li>' +
      '<li><a href="iletisim.html">İletişim</a></li>';

    return (
      '<a class="skip-link" href="#main">İçeriğe geç</a>' +
      '<div class="utility-bar"><div class="container utility-inner">' +
      "<p>" + fmt(C.shipping.freeThreshold).replace(",00", "") + " ve üzeri siparişlerde kargo ücretsiz</p>" +
      '<ul class="utility-links">' +
      '<li><a href="hakkimizda.html">Hakkımızda</a></li>' +
      '<li><a href="iletisim.html">İletişim</a></li>' +
      '<li><a href="' + waLink("Merhaba, bilgi almak istiyorum.") + '" target="_blank" rel="noopener">WhatsApp destek</a></li>' +
      "</ul></div></div>" +
      '<header class="site-header"><div class="container header-inner">' +
      '<button class="icon-btn menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav">' +
      ICONS.menu + '<span class="sr-only">Menüyü aç</span></button>' +
      logo() +
      '<nav class="main-nav" aria-label="Ana menü"><ul>' + links + "</ul></nav>" +
      '<div class="header-actions">' +
      '<form class="header-search" action="magaza.html" role="search">' +
      '<label class="sr-only" for="header-q">Ürün ara</label>' +
      '<input id="header-q" name="q" type="search" placeholder="Ürün ara" autocomplete="off">' +
      '<button type="submit" class="icon-btn" aria-label="Ara">' + ICONS.search + "</button></form>" +
      '<a class="cart-link" href="sepet.html">' + ICONS.bag +
      '<span class="cart-text">Sepet</span><span class="cart-count" data-cart-count>0</span>' +
      '<span class="sr-only"> ürün</span></a>' +
      "</div></div>" +
      '<div id="mobile-nav" class="mobile-nav" hidden><div class="container">' +
      '<form class="mobile-search" action="magaza.html" role="search">' +
      '<label class="sr-only" for="mobile-q">Ürün ara</label>' +
      '<input id="mobile-q" name="q" type="search" placeholder="Ürün ara">' +
      '<button type="submit" class="icon-btn" aria-label="Ara">' + ICONS.search + "</button></form>" +
      "<ul>" + links + mobileExtra + "</ul></div></div>" +
      "</header>"
    );
  }

  function footerHTML() {
    var co = C.company;
    var cats = CATEGORIES.map(function (c) {
      return '<li><a href="magaza.html?kategori=' + c.id + '">' + c.name + "</a></li>";
    }).join("");
    var social = Object.keys(C.social)
      .filter(function (k) {
        return C.social[k];
      })
      .map(function (k) {
        var names = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };
        return '<li><a href="' + esc(C.social[k]) + '" target="_blank" rel="noopener">' + names[k] + "</a></li>";
      })
      .join("");
    var payments = [];
    if (C.payment.bankTransfer.enabled) payments.push("havale/EFT");
    if (C.payment.cashOnDelivery.enabled) payments.push("kapıda ödeme");

    return (
      '<footer class="site-footer"><div class="container footer-grid">' +
      '<div class="footer-brand">' + logo() +
      "<p>Tişört, sweatshirt ve eşofmanlarımızı kendimiz üretiyor, aracısız satıyoruz.</p>" +
      '<ul class="footer-contact">' +
      '<li><a href="tel:' + esc(co.phone.replace(/\s/g, "")) + '">' + esc(co.phone) + "</a></li>" +
      '<li><a href="mailto:' + esc(co.email) + '">' + esc(co.email) + "</a></li>" +
      "<li>" + esc(co.address) + "</li></ul>" +
      (social ? '<ul class="footer-social">' + social + "</ul>" : "") +
      "</div>" +
      '<div><h2 class="footer-title">Alışveriş</h2><ul>' + cats + "</ul></div>" +
      '<div><h2 class="footer-title">Kurumsal</h2><ul>' +
      '<li><a href="hakkimizda.html">Hakkımızda</a></li>' +
      '<li><a href="toptan.html">Toptan ve fason üretim</a></li>' +
      '<li><a href="iletisim.html">İletişim</a></li></ul></div>' +
      '<div><h2 class="footer-title">Yardım</h2><ul>' +
      '<li><a href="iletisim.html#sss">Sık sorulan sorular</a></li>' +
      '<li><a href="iade-ve-degisim.html">İade ve değişim</a></li>' +
      '<li><a href="mesafeli-satis-sozlesmesi.html">Mesafeli satış sözleşmesi</a></li>' +
      '<li><a href="on-bilgilendirme-formu.html">Ön bilgilendirme formu</a></li>' +
      '<li><a href="kvkk-aydinlatma-metni.html">KVKK aydınlatma metni</a></li></ul></div>' +
      "</div>" +
      '<div class="container footer-legal">' +
      "<p>© " + new Date().getFullYear() + " " + esc(co.legalName) + ". MERSİS: " + esc(co.mersis) +
      ". Vergi dairesi ve no: " + esc(co.taxOffice) + ", " + esc(co.taxNumber) + ".</p>" +
      "<p>Ödeme seçenekleri: " + payments.join(", ") + ".</p>" +
      "</div></footer>"
    );
  }

  function updateCartCount() {
    var n = cart.count();
    $all("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
      el.classList.toggle("is-empty", n === 0);
    });
  }

  function bindHeader() {
    var toggle = $(".menu-toggle");
    var panel = $("#mobile-nav");
    if (toggle && panel) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        toggle.innerHTML = (open ? ICONS.menu : ICONS.close) +
          '<span class="sr-only">' + (open ? "Menüyü aç" : "Menüyü kapat") + "</span>";
        panel.hidden = open;
      });
    }
    var q = param("q");
    if (q) {
      $all('input[name="q"]').forEach(function (i) {
        i.value = q;
      });
    }
  }

  /* ---------- Bildirim ---------- */

  var toastTimer = null;
  function toast(message, link) {
    var box = $("#toast");
    if (!box) {
      box = document.createElement("div");
      box.id = "toast";
      box.className = "toast";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    box.innerHTML =
      "<span>" + esc(message) + "</span>" +
      (link ? '<a href="' + esc(link.href) + '">' + esc(link.text) + "</a>" : "");
    box.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      box.classList.remove("is-visible");
    }, 4200);
  }

  /* ---------- Ürün kartı ---------- */

  function priceHTML(p) {
    if (p.oldPrice) {
      return (
        '<span class="price price-sale">' + fmt(p.price) + "</span>" +
        '<s class="price-old"><span class="sr-only">Eski fiyat: </span>' + fmt(p.oldPrice) + "</s>"
      );
    }
    return '<span class="price">' + fmt(p.price) + "</span>";
  }

  function badgeHTML(p) {
    if (p.oldPrice) {
      var pct = Math.round((1 - p.price / p.oldPrice) * 100);
      return '<span class="badge badge-sale">%' + pct + " indirim</span>";
    }
    return p.badge ? '<span class="badge">' + esc(p.badge) + "</span>" : "";
  }

  function swatchesHTML(p, current, small) {
    return (
      '<div class="swatches' + (small ? " swatches-sm" : "") + '" role="group" aria-label="Renk seçenekleri">' +
      p.colors
        .map(function (cid) {
          var c = color(cid);
          return (
            '<button type="button" class="swatch" data-color="' + cid + '" style="--sw:' + c.hex + '"' +
            ' aria-pressed="' + (cid === current) + '" title="' + esc(c.name) + '">' +
            '<span class="sr-only">' + esc(c.name) + "</span></button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function productCard(p) {
    var first = p.colors[0];
    var url = "urun.html?id=" + encodeURIComponent(p.id);
    var meta = esc(p.fabric) + ", " + p.gsm + " gr/m²";
    return (
      '<article class="product-card" data-product="' + p.id + '">' +
      '<a class="pc-media" href="' + url + '" tabindex="-1" aria-hidden="true">' +
      badgeHTML(p) + productVisual(p, first, { decorative: true }) + "</a>" +
      '<div class="pc-body">' +
      '<h3 class="pc-name"><a href="' + url + '">' + esc(p.name) + "</a></h3>" +
      '<p class="pc-meta">' + meta + "</p>" +
      '<p class="pc-price">' + priceHTML(p) + "</p>" +
      swatchesHTML(p, first, true) +
      "</div></article>"
    );
  }

  /* Kart üzerindeki renk seçimi: görseli ve bağlantıyı günceller */
  function bindCardSwatches(root) {
    (root || document).addEventListener("click", function (e) {
      var btn = e.target.closest(".product-card .swatch");
      if (!btn) return;
      var card = btn.closest(".product-card");
      var p = product(card.getAttribute("data-product"));
      var cid = btn.getAttribute("data-color");
      $all(".swatch", card).forEach(function (s) {
        s.setAttribute("aria-pressed", String(s === btn));
      });
      var media = $(".pc-media", card);
      var svg = $("svg.garment", media);
      if (svg && !(p.images && p.images[cid])) {
        window.LazioGarments.recolor(svg, color(cid).hex);
      } else {
        var badge = $(".badge", media);
        media.innerHTML = (badge ? badge.outerHTML : "") + productVisual(p, cid, { decorative: true });
      }
      var url = "urun.html?id=" + encodeURIComponent(p.id) + "&renk=" + cid;
      media.setAttribute("href", url);
      $(".pc-name a", card).setAttribute("href", url);
    });
  }

  /* ---------- Ücretsiz kargo şeridi (mezura) ---------- */

  function shippingMeter(subtotal) {
    var limit = C.shipping.freeThreshold;
    var pct = Math.min(100, Math.round((subtotal / limit) * 100));
    var text =
      subtotal >= limit
        ? "Kargonuz ücretsiz."
        : "Ücretsiz kargo için " + fmt(limit - subtotal) + " tutarında ürün daha ekleyin.";
    return (
      '<div class="tape-meter">' +
      '<p class="tape-text">' + text + "</p>" +
      '<div class="tape" role="progressbar" aria-label="Ücretsiz kargo sınırına ilerleme" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '">' +
      '<div class="tape-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="tape-scale" aria-hidden="true"><span>0</span><span>' + fmt(limit).replace(",00", "") + "</span></div>" +
      "</div>"
    );
  }

  /* ---------- Başlatma ---------- */

  function mountLayout() {
    var head = $("#site-header");
    var foot = $("#site-footer");
    if (head) head.outerHTML = headerHTML();
    if (foot) foot.outerHTML = footerHTML();
    bindHeader();
    updateCartCount();
    bindCardSwatches();
    window.addEventListener("lazio:cart", updateCartCount);
    window.addEventListener("storage", function (e) {
      if (e.key === CART_KEY) updateCartCount();
    });
    // Firma bilgilerini sayfadaki [data-co] alanlarına yaz
    $all("[data-co]").forEach(function (el) {
      var key = el.getAttribute("data-co");
      var val = key.split(".").reduce(function (o, k) {
        return o ? o[k] : "";
      }, C);
      if (val != null) el.textContent = val;
    });
  }

  var readyFns = [];
  function ready(fn) {
    readyFns.push(fn);
  }

  document.addEventListener("DOMContentLoaded", function () {
    mountLayout();
    readyFns.forEach(function (fn) {
      fn();
    });
  });

  window.Lazio = {
    config: C,
    fmt: fmt,
    esc: esc,
    param: param,
    $: $,
    $all: $all,
    storageGet: storageGet,
    storageSet: storageSet,
    waLink: waLink,
    product: product,
    products: PRODUCTS,
    category: category,
    categories: CATEGORIES,
    color: color,
    sizeChart: sizeChart,
    dimsFor: dimsFor,
    productVisual: productVisual,
    productCard: productCard,
    priceHTML: priceHTML,
    badgeHTML: badgeHTML,
    swatchesHTML: swatchesHTML,
    shippingMeter: shippingMeter,
    cart: cart,
    toast: toast,
    icons: ICONS,
    ready: ready,
  };
})();
