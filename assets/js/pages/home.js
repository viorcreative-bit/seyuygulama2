(function () {
  "use strict";

  var L = window.Lazio;

  /* Giriş bölümündeki teknik çizim: renk ve beden seçilebilir */
  function hero() {
    var p = L.product("basic-bisiklet-yaka-tisort");
    if (!p) return;
    var state = { color: "lacivert", size: "M" };
    var figure = L.$("#hero-figure");
    var swatchBox = L.$("#hero-swatches");
    var sizeBox = L.$("#hero-sizes");

    function titleBlock() {
      return (
        '<table class="title-block"><tbody>' +
        "<tr><th>Model</th><td>Basic tişört</td></tr>" +
        "<tr><th>Kumaş</th><td>" + L.esc(p.fabric) + ", " + L.esc(p.composition) + "</td></tr>" +
        "<tr><th>Gramaj</th><td>" + p.gsm + " gr/m²</td></tr>" +
        "<tr><th>Beden</th><td>" + state.size + "</td></tr>" +
        "</tbody></table>"
      );
    }

    function draw() {
      figure.innerHTML =
        L.productVisual(p, state.color, { dims: L.dimsFor(p, state.size) }) + titleBlock();
      L.$("#hero-color-label strong").textContent = L.color(state.color).name;
      L.$("#hero-size-label strong").textContent = state.size;
    }

    swatchBox.innerHTML = L.swatchesHTML(p, state.color).replace(/^<div[^>]*>|<\/div>$/g, "");
    sizeBox.innerHTML = p.sizes
      .map(function (s) {
        return (
          '<label class="size-chip"><input type="radio" name="hero-size" value="' + s + '"' +
          (s === state.size ? " checked" : "") + "><span>" + s + "</span></label>"
        );
      })
      .join("");

    draw();
    // İlk çizimden sonra ölçü animasyonu tekrar oynamasın
    setTimeout(function () {
      figure.classList.add("is-ready");
    }, 1600);

    swatchBox.addEventListener("click", function (e) {
      var btn = e.target.closest(".swatch");
      if (!btn) return;
      state.color = btn.getAttribute("data-color");
      L.$all(".swatch", swatchBox).forEach(function (s) {
        s.setAttribute("aria-pressed", String(s === btn));
      });
      window.LazioGarments.recolor(L.$("svg.garment", figure), L.color(state.color).hex);
      L.$("#hero-color-label strong").textContent = L.color(state.color).name;
    });

    sizeBox.addEventListener("change", function (e) {
      state.size = e.target.value;
      figure.classList.add("is-ready");
      draw();
    });
  }

  function categories() {
    var tint = {
      tisort: "lacivert",
      polo: "beyaz",
      sweatshirt: "gri-melanj",
      kapusonlu: "haki",
      esofman: "siyah",
      elbise: "adacayi",
    };
    L.$("#category-row").innerHTML = L.categories
      .map(function (c) {
        var count = L.products.filter(function (p) {
          return p.category === c.id;
        }).length;
        return (
          '<li><a class="category-tile" href="magaza.html?kategori=' + c.id + '">' +
          '<span class="ct-media">' +
          window.LazioGarments.svg(c.garment, { color: L.color(tint[c.id]).hex }) +
          "</span>" +
          '<span class="ct-name">' + c.name + "</span>" +
          '<span class="ct-count">' + count + " model</span></a></li>"
        );
      })
      .join("");
  }

  function featured() {
    var list = L.products.filter(function (p) {
      return p.featured;
    });
    L.products.forEach(function (p) {
      if (list.length < 8 && list.indexOf(p) === -1) list.push(p);
    });
    L.$("#featured-grid").innerHTML = list.slice(0, 8).map(L.productCard).join("");
  }

  function assurances() {
    var C = L.config;
    var free = L.fmt(C.shipping.freeThreshold).replace(",00", "");
    var pay = [];
    if (C.payment.bankTransfer.enabled) pay.push("Havale/EFT");
    if (C.payment.cashOnDelivery.enabled) pay.push("kapıda ödeme");
    var items = [
      [L.icons.truck, "Hızlı kargo", free + " üzeri ücretsiz, " + C.shipping.dispatchTime + " içinde kargoda"],
      [L.icons.swap, C.returnDays + " gün içinde iade", "Beden olmadıysa değişim de yapıyoruz"],
      [L.icons.card, "Ödeme", pay.join(" veya ")],
      [L.icons.chat, "WhatsApp destek", C.company.workingHours],
    ];
    L.$("#assurances").innerHTML = items
      .map(function (it) {
        return "<li>" + it[0] + "<div><strong>" + it[1] + "</strong><span>" + it[2] + "</span></div></li>";
      })
      .join("");
  }

  L.ready(function () {
    hero();
    categories();
    featured();
    assurances();
    var wa = L.$("#wholesale-wa");
    if (wa) wa.href = L.waLink("Merhaba, toptan / fason üretim hakkında bilgi almak istiyorum.");
  });
})();
