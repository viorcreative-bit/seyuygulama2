(function () {
  "use strict";

  var L = window.Lazio;

  function lineHTML(l) {
    var url = "urun.html?id=" + encodeURIComponent(l.id) + "&renk=" + l.color;
    return (
      '<li class="cart-line" data-key="' + L.esc(l.key) + '">' +
      '<a class="cart-thumb" href="' + url + '" tabindex="-1" aria-hidden="true">' +
      L.productVisual(l.product, l.color, { decorative: true }) + "</a>" +
      "<div>" +
      '<h3><a href="' + url + '">' + L.esc(l.product.name) + "</a></h3>" +
      '<p class="line-meta">Renk: ' + L.esc(l.colorName) + ", beden: " + l.size + ", birim fiyat: " + L.fmt(l.unit) + "</p>" +
      '<div class="line-actions">' +
      '<div class="qty"><button type="button" data-step="-1" aria-label="' + L.esc(l.product.name) + ' adedini azalt">−</button>' +
      '<input type="number" min="1" max="99" value="' + l.qty + '" inputmode="numeric" aria-label="' + L.esc(l.product.name) + ' adedi">' +
      '<button type="button" data-step="1" aria-label="' + L.esc(l.product.name) + ' adedini artır">+</button></div>' +
      '<button type="button" class="remove-btn" data-remove>' + L.icons.trash + "Kaldır</button>" +
      "</div></div>" +
      '<p class="line-total">' + L.fmt(l.total) + (l.qty > 1 ? "<small>" + l.qty + " adet</small>" : "") + "</p>" +
      "</li>"
    );
  }

  function render() {
    var t = L.cart.totals();
    var root = L.$("#cart-root");

    if (!t.lines.length) {
      root.innerHTML =
        '<div class="empty-state" style="margin-bottom:80px">' +
        "<h2>Sepetiniz boş</h2>" +
        "<p>Beğendiğiniz ürünleri renk ve beden seçerek sepete ekleyebilirsiniz.</p>" +
        '<a class="btn btn-primary" href="magaza.html">Ürünlere göz atın</a></div>';
      return;
    }

    root.innerHTML =
      '<div class="cart-layout">' +
      '<div><ul class="cart-lines" aria-label="Sepetteki ürünler">' + t.lines.map(lineHTML).join("") + "</ul>" +
      '<p style="margin-top:20px"><a class="link-more" href="magaza.html">Alışverişe devam et</a></p></div>' +
      '<aside class="summary" aria-labelledby="summary-title">' +
      '<h2 id="summary-title">Sipariş özeti</h2>' +
      L.shippingMeter(t.subtotal) +
      '<dl class="summary-rows">' +
      "<div><dt>Ara toplam</dt><dd>" + L.fmt(t.subtotal) + "</dd></div>" +
      "<div><dt>Kargo</dt><dd>" + (t.shipping ? L.fmt(t.shipping) : "Ücretsiz") + "</dd></div>" +
      '<div class="total"><dt>Toplam</dt><dd>' + L.fmt(t.total) + "</dd></div>" +
      "</dl>" +
      '<a class="btn btn-primary btn-block" href="odeme.html">Ödeme adımına geç</a>' +
      '<p class="summary-note">Kapıda ödeme seçerseniz ' + L.fmt(L.config.payment.cashOnDelivery.fee) +
      " hizmet bedeli eklenir. Fiyatlara KDV dahildir.</p>" +
      "</aside></div>";
  }

  L.ready(function () {
    render();
    var root = L.$("#cart-root");

    root.addEventListener("click", function (e) {
      var line = e.target.closest(".cart-line");
      if (!line) return;
      var key = line.getAttribute("data-key");
      var step = e.target.closest("[data-step]");
      if (step) {
        var input = L.$("input", line);
        L.cart.setQty(key, (parseInt(input.value, 10) || 1) + parseInt(step.getAttribute("data-step"), 10));
        render();
        var again = L.$('.cart-line[data-key="' + CSS.escape(key) + '"] [data-step="' + step.getAttribute("data-step") + '"]');
        if (again) again.focus();
        else L.$("h1").focus();
        return;
      }
      if (e.target.closest("[data-remove]")) {
        var name = L.$("h3", line).textContent;
        L.cart.remove(key);
        render();
        L.toast(name + " sepetten çıkarıldı.");
      }
    });

    root.addEventListener("change", function (e) {
      var line = e.target.closest(".cart-line");
      if (!line || e.target.type !== "number") return;
      var v = parseInt(e.target.value, 10);
      L.cart.setQty(line.getAttribute("data-key"), isNaN(v) ? 1 : v);
      render();
    });

    window.addEventListener("storage", render);
  });
})();
