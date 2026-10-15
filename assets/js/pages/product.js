(function () {
  "use strict";

  var L = window.Lazio;
  var C = L.config;

  var p, state;

  function availableSizes() {
    return p.sizes.filter(function (s) {
      return !(p.unavailableSizes || []).includes(s);
    });
  }

  /* Ölçü çizgisi için beden: seçilen beden, yoksa ortadaki beden */
  function dimsSize() {
    if (state.size) return state.size;
    var av = availableSizes();
    return av.includes("M") ? "M" : av[Math.floor(av.length / 2)];
  }

  function drawFigure() {
    var size = dimsSize();
    var dims = state.showDims ? L.dimsFor(p, size) : null;
    L.$("#pd-figure").innerHTML = L.productVisual(p, state.color, { dims: dims });
    var hasPhoto = p.images && p.images[state.color];
    L.$("#pd-dim-caption").textContent = hasPhoto
      ? "Ürün fotoğrafı"
      : state.showDims
      ? "Teknik çizim, " + size + " beden ölçüleri"
      : "Teknik çizim";
    L.$("#dims-row").hidden = !!hasPhoto;
  }

  function specRow(label, value) {
    return value ? "<tr><th scope=\"row\">" + label + "</th><td>" + L.esc(value) + "</td></tr>" : "";
  }

  function render() {
    var cat = L.category(p.category);
    var free = L.fmt(C.shipping.freeThreshold).replace(",00", "");
    var unavailable = p.unavailableSizes || [];

    var sizeChips = p.sizes
      .map(function (s) {
        var dis = unavailable.includes(s);
        return (
          '<label class="size-chip"><input type="radio" name="size" value="' + s + '"' +
          (dis ? " disabled" : "") + ">" +
          "<span>" + s + (dis ? '<span class="sr-only"> (tükendi)</span>' : "") + "</span></label>"
        );
      })
      .join("");

    L.$("#product-root").innerHTML =
      '<div class="pd-grid">' +
      '<div class="pd-visual">' +
      '<div class="pd-board drafting"><div class="pd-figure" id="pd-figure"></div></div>' +
      '<div class="pd-visual-bar"><p id="pd-dim-caption"></p>' +
      '<span id="dims-row"><label class="switch"><input type="checkbox" id="dims-toggle"' +
      (state.showDims ? " checked" : "") + '><span class="switch-track"></span>Ölçüleri göster</label></span>' +
      "</div></div>" +

      '<div class="pd-info">' +
      "<h1>" + L.esc(p.name) + "</h1>" +
      '<p class="pd-price">' + L.priceHTML(p) + "</p>" +
      '<p class="pd-summary">' + L.esc(p.summary) + "</p>" +

      '<form id="buy-form" novalidate>' +
      '<div class="pd-block">' +
      '<div class="pd-block-head"><span class="control-label" id="color-label">Renk: <strong></strong></span></div>' +
      L.swatchesHTML(p, state.color) +
      "</div>" +

      '<div class="pd-block">' +
      '<div class="pd-block-head"><span class="control-label" id="size-label">Beden: <strong>seçilmedi</strong></span>' +
      '<button type="button" class="text-btn" id="open-size-chart">Beden tablosu</button></div>' +
      '<div class="size-options" role="radiogroup" aria-labelledby="size-label" aria-describedby="size-error">' +
      sizeChips + "</div>" +
      '<p class="field-error" id="size-error" hidden>Sepete eklemek için bir beden seçin.</p>' +
      (unavailable.length ? '<p class="summary-note">Üstü çizili bedenler şu an tükendi.</p>' : "") +
      "</div>" +

      '<div class="pd-block">' +
      '<div class="buy-row">' +
      '<div class="qty"><button type="button" data-step="-1" aria-label="Adedi azalt">−</button>' +
      '<input id="qty" type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="Adet">' +
      '<button type="button" data-step="1" aria-label="Adedi artır">+</button></div>' +
      '<button type="submit" class="btn btn-primary">Sepete ekle</button>' +
      "</div>" +
      '<ul class="pd-notes">' +
      "<li>" + L.icons.truck + "<span>" + C.shipping.dispatchTime + " içinde kargoda, " + free + " üzeri kargo ücretsiz</span></li>" +
      "<li>" + L.icons.swap + "<span>" + C.returnDays + " gün içinde iade ve beden değişimi</span></li>" +
      "</ul></div>" +
      "</form>" +

      '<div class="pd-block"><h2>Kumaş ve kalıp</h2><table class="spec-table"><tbody>' +
      specRow("Kumaş", p.fabric) +
      specRow("İçerik", p.composition) +
      specRow("Gramaj", p.gsm ? p.gsm + " gr/m²" : "") +
      specRow("Kalıp", p.fit) +
      specRow("Yıkama", "30 °C'de tersten yıkayın, ağartıcı ve kurutma makinesi kullanmayın.") +
      specRow("Üretim yeri", "Türkiye") +
      "</tbody></table></div>" +

      '<div class="pd-block"><h2>Ürün hakkında</h2><p>' + L.esc(p.description) + "</p></div>" +
      "</div></div>";

    L.$("#breadcrumb").innerHTML =
      '<li><a href="index.html">Ana sayfa</a></li>' +
      '<li><a href="magaza.html">Mağaza</a></li>' +
      (cat ? '<li><a href="magaza.html?kategori=' + cat.id + '">' + cat.name + "</a></li>" : "") +
      '<li aria-current="page">' + L.esc(p.name) + "</li>";

    updateColorLabel();
    drawFigure();
  }

  function updateColorLabel() {
    L.$("#color-label strong").textContent = L.color(state.color).name;
  }

  function sizeTable() {
    var chart = L.sizeChart(p);
    if (!chart) return "<p>Bu ürün için beden tablosu yakında eklenecek.</p>";
    var current = dimsSize();
    var head =
      '<tr><th scope="col">Beden</th>' +
      chart.measures.map(function (m) {
        return '<th scope="col">' + m.label + " (cm)</th>";
      }).join("") +
      "</tr>";
    var rows = p.sizes
      .map(function (s) {
        var m = chart.sizes[s];
        if (!m) return "";
        return (
          "<tr" + (s === current ? ' class="is-current"' : "") + '><th scope="row">' + s + "</th>" +
          chart.measures.map(function (x) {
            return "<td>" + m[x.key] + "</td>";
          }).join("") +
          "</tr>"
        );
      })
      .join("");
    return (
      '<table class="size-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>" +
      "<p>Ürünü düz bir zemine serip ölçün. Göğüs genişliği koltuk altlarının 2 cm altından, " +
      "boy omuzun en yüksek noktasından eteğe kadar alınır. Size en uygun bedeni, sevdiğiniz bir " +
      "kıyafetinizi aynı şekilde ölçüp karşılaştırarak bulabilirsiniz.</p>"
    );
  }

  function addJsonLd() {
    var data = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.summary,
      sku: p.id,
      brand: { "@type": "Brand", name: "Lazio Tekstil" },
      material: p.composition,
      offers: {
        "@type": "Offer",
        url: C.siteUrl + "/urun.html?id=" + p.id,
        priceCurrency: "TRY",
        price: p.price.toFixed(2),
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  function related() {
    var same = L.products.filter(function (x) {
      return x.id !== p.id && x.category === p.category;
    });
    var rest = L.products.filter(function (x) {
      return x.id !== p.id && x.category !== p.category && x.featured;
    });
    var list = same.concat(rest).slice(0, 4);
    if (!list.length) return;
    L.$("#related-grid").innerHTML = list.map(L.productCard).join("");
    L.$("#related").hidden = false;
  }

  function notFound() {
    L.$("#product-root").innerHTML =
      '<div class="empty-state" style="margin:24px 0 80px">' +
      "<h1 style=\"font-size:1.6rem\">Bu ürünü bulamadık</h1>" +
      "<p>Ürün kaldırılmış ya da bağlantı hatalı olabilir.</p>" +
      '<a class="btn btn-primary" href="magaza.html">Tüm ürünlere dön</a></div>';
    document.title = "Ürün bulunamadı | Lazio Tekstil";
  }

  function bind() {
    var root = L.$("#product-root");

    root.addEventListener("click", function (e) {
      var sw = e.target.closest(".pd-info .swatch");
      if (sw) {
        state.color = sw.getAttribute("data-color");
        L.$all(".pd-info .swatch").forEach(function (s) {
          s.setAttribute("aria-pressed", String(s === sw));
        });
        var svg = L.$("#pd-figure svg.garment");
        var photo = p.images && p.images[state.color];
        if (svg && !photo) window.LazioGarments.recolor(svg, L.color(state.color).hex);
        else drawFigure();
        updateColorLabel();
        history.replaceState(null, "", "urun.html?id=" + encodeURIComponent(p.id) + "&renk=" + state.color);
        return;
      }
      var step = e.target.closest("[data-step]");
      if (step) {
        var input = L.$("#qty");
        var v = (parseInt(input.value, 10) || 1) + parseInt(step.getAttribute("data-step"), 10);
        input.value = Math.max(1, Math.min(99, v));
        return;
      }
      if (e.target.id === "open-size-chart") {
        L.$("#size-dialog-body").innerHTML = sizeTable();
        L.$("#size-dialog").showModal();
      }
    });

    root.addEventListener("change", function (e) {
      if (e.target.name === "size") {
        state.size = e.target.value;
        L.$("#size-label strong").textContent = state.size;
        L.$("#size-error").hidden = true;
        drawFigure();
      }
      if (e.target.id === "dims-toggle") {
        state.showDims = e.target.checked;
        drawFigure();
      }
      if (e.target.id === "qty") {
        var v = parseInt(e.target.value, 10) || 1;
        e.target.value = Math.max(1, Math.min(99, v));
      }
    });

    root.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!state.size) {
        L.$("#size-error").hidden = false;
        var first = L.$('.pd-info input[name="size"]:not(:disabled)');
        if (first) first.focus();
        return;
      }
      var qty = Math.max(1, Math.min(99, parseInt(L.$("#qty").value, 10) || 1));
      L.cart.add(p.id, state.color, state.size, qty);
      L.toast(
        "Sepete eklendi: " + p.name + " (" + L.color(state.color).name + ", " + state.size + ")",
        { href: "sepet.html", text: "Sepete git" }
      );
    });

    var dialog = L.$("#size-dialog");
    L.$("#size-dialog-close").innerHTML = L.icons.close;
    L.$("#size-dialog-close").addEventListener("click", function () {
      dialog.close();
    });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
  }

  L.ready(function () {
    p = L.product(L.param("id"));
    if (!p) {
      notFound();
      return;
    }
    var requested = L.param("renk");
    state = {
      color: p.colors.includes(requested) ? requested : p.colors[0],
      size: null,
      showDims: true,
    };
    document.title = p.name + " | Lazio Tekstil";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", p.summary + " " + p.fabric + ", " + p.composition + ".");
    render();
    bind();
    related();
    addJsonLd();
  });
})();
