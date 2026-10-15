(function () {
  "use strict";

  var L = window.Lazio;
  var C = L.config;

  function notFound() {
    L.$("#order-root").innerHTML =
      '<div class="empty-state" style="margin:40px 0 80px">' +
      "<h1 style=\"font-size:1.6rem\">Sipariş bulunamadı</h1>" +
      "<p>Sipariş bilgileri bu tarayıcıda kayıtlı değil. Siparişinizle ilgili sorularınız için bize WhatsApp'tan yazabilirsiniz.</p>" +
      '<a class="btn btn-primary" href="magaza.html">Mağazaya dön</a></div>';
  }

  function paymentBlock(o) {
    if (o.payment === "havale") {
      var b = C.payment.bankTransfer;
      return (
        '<section class="notice" aria-labelledby="pay-title">' +
        '<h2 id="pay-title">Havale/EFT bilgileri</h2>' +
        "<p>" + L.fmt(o.totals.total) + " tutarını 24 saat içinde aşağıdaki hesaba gönderin. " +
        "Açıklama kısmına sipariş numaranızı (" + L.esc(o.no) + ") yazın.</p>" +
        '<dl class="detail-list">' +
        "<div><dt>Banka</dt><dd>" + L.esc(b.bank) + "</dd></div>" +
        "<div><dt>Hesap sahibi</dt><dd>" + L.esc(b.holder) + "</dd></div>" +
        '<div><dt>IBAN</dt><dd><span class="iban-row"><span class="iban" id="iban">' + L.esc(b.iban) + "</span>" +
        '<button type="button" class="text-btn" id="copy-iban">IBAN\'ı kopyala</button></span></dd></div>' +
        "</dl></section>"
      );
    }
    return (
      '<section class="notice" aria-labelledby="pay-title">' +
      '<h2 id="pay-title">Kapıda ödeme</h2>' +
      "<p>" + L.fmt(o.totals.total) + " tutarını teslimat sırasında kuryeye nakit ya da kartla ödeyeceksiniz.</p>" +
      "</section>"
    );
  }

  function render(o) {
    var wa = o.channel === "whatsapp";
    var head = wa
      ? "<h1>Son adım: siparişi WhatsApp'tan gönderin</h1>" +
        "<p>Sipariş özetiniz WhatsApp'ta hazır mesaj olarak açıldı. Mesajı gönderdiğinizde siparişiniz işleme alınır. " +
        "WhatsApp açılmadıysa aşağıdaki düğmeyi kullanın.</p>" +
        '<a class="btn btn-primary" href="' + L.esc(L.waLink(o.message)) + '" target="_blank" rel="noopener">Siparişi WhatsApp ile gönder</a>'
      : "<h1>Siparişiniz alındı</h1>" +
        "<p>Teşekkürler. Siparişinizi onayladığımızda " + L.esc(o.customer.phone) + " numarasına bilgi vereceğiz.</p>";

    var items = o.lines
      .map(function (l) {
        var p = L.product(l.id);
        return (
          "<li>" +
          '<span class="cart-thumb">' + (p ? L.productVisual(p, l.color, { decorative: true }) : "") + "</span>" +
          "<span>" + L.esc(l.name) + '<br><span class="qty-badge">' + L.esc(l.colorName) + ", " + l.size + ", " + l.qty + " adet</span></span>" +
          "<strong>" + L.fmt(l.total) + "</strong></li>"
        );
      })
      .join("");

    L.$("#order-root").innerHTML =
      '<header class="page-head order-head">' +
      '<p style="margin-bottom:12px">Sipariş no: <span class="order-number">' + L.esc(o.no) + "</span></p>" +
      head +
      "</header>" +
      '<div class="order-layout"><div>' +
      paymentBlock(o) +
      '<section aria-labelledby="delivery-title"><h2 id="delivery-title" style="font-size:1.3rem">Teslimat</h2>' +
      '<dl class="detail-list">' +
      "<div><dt>Alıcı</dt><dd>" + L.esc(o.customer.name) + "</dd></div>" +
      "<div><dt>Telefon</dt><dd>" + L.esc(o.customer.phone) + "</dd></div>" +
      "<div><dt>Adres</dt><dd>" + L.esc(o.address.line) + ", " + L.esc(o.address.district) + " / " + L.esc(o.address.city) + "</dd></div>" +
      "<div><dt>Kargo</dt><dd>" + L.esc(C.shipping.carrier) + ", " + L.esc(C.shipping.dispatchTime) + " içinde kargoya verilir</dd></div>" +
      "</dl></section>" +
      "</div>" +
      '<aside class="summary" aria-labelledby="order-summary-title">' +
      '<h2 id="order-summary-title">Sipariş özeti</h2>' +
      '<ul class="summary-items">' + items + "</ul>" +
      '<dl class="summary-rows">' +
      "<div><dt>Ara toplam</dt><dd>" + L.fmt(o.totals.subtotal) + "</dd></div>" +
      "<div><dt>Kargo</dt><dd>" + (o.totals.shipping ? L.fmt(o.totals.shipping) : "Ücretsiz") + "</dd></div>" +
      (o.totals.cod ? "<div><dt>Kapıda ödeme bedeli</dt><dd>" + L.fmt(o.totals.cod) + "</dd></div>" : "") +
      '<div class="total"><dt>Toplam</dt><dd>' + L.fmt(o.totals.total) + "</dd></div>" +
      "</dl>" +
      '<a class="btn btn-secondary btn-block" href="magaza.html">Alışverişe devam et</a>' +
      "</aside></div>";

    var copy = L.$("#copy-iban");
    if (copy) {
      copy.addEventListener("click", function () {
        var text = C.payment.bankTransfer.iban.replace(/\s/g, "");
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(
            function () { L.toast("IBAN kopyalandı."); },
            function () { L.toast("IBAN kopyalanamadı. Lütfen elle seçip kopyalayın."); }
          );
        } else {
          L.toast("IBAN kopyalanamadı. Lütfen elle seçip kopyalayın.");
        }
      });
    }
  }

  L.ready(function () {
    var no = L.param("no");
    var orders = L.storageGet("lazio-orders", {});
    var o = no && orders[no];
    if (!o) {
      notFound();
      return;
    }
    render(o);
  });
})();
