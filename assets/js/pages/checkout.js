(function () {
  "use strict";

  var L = window.Lazio;
  var C = L.config;

  var PROVINCES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
    "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
    "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum",
    "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
    "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
    "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir",
    "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak",
    "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
  ];

  var PAYMENT_LABELS = {
    havale: "Havale/EFT",
    kapida: "Kapıda ödeme",
  };

  var useEndpoint = !!C.orderEndpoint;

  function form() {
    return L.$("#checkout-form");
  }

  function paymentMethod() {
    var r = form().querySelector('input[name="payment"]:checked');
    return r ? r.value : "";
  }

  /* ---------- Kurulum ---------- */

  function buildProvinces() {
    var sel = L.$("#city");
    sel.insertAdjacentHTML(
      "beforeend",
      PROVINCES.map(function (p) {
        return '<option value="' + p + '">' + p + "</option>";
      }).join("")
    );
  }

  function buildPayments() {
    var opts = [];
    if (C.payment.bankTransfer.enabled) {
      opts.push(
        '<label class="choice"><input type="radio" name="payment" value="havale">' +
        "<div><strong>Havale/EFT</strong><span>Sipariş sonrası IBAN bilgisini göstereceğiz. " +
        "Ödemeyi 24 saat içinde yapmanız yeterli.</span></div>" +
        '<span class="choice-fee">Ücretsiz</span></label>'
      );
    }
    if (C.payment.cashOnDelivery.enabled) {
      opts.push(
        '<label class="choice"><input type="radio" name="payment" value="kapida">' +
        "<div><strong>Kapıda ödeme</strong><span>Teslimatta kuryeye nakit ya da kartla ödersiniz.</span></div>" +
        '<span class="choice-fee">+' + L.fmt(C.payment.cashOnDelivery.fee) + "</span></label>"
      );
    }
    L.$("#payment-options").innerHTML = opts.join("");
    var first = L.$('#payment-options input[name="payment"]');
    if (first) first.checked = true;
  }

  function renderSummary() {
    var t = L.cart.totals(paymentMethod());
    L.$("#summary-items").innerHTML = t.lines
      .map(function (l) {
        return (
          "<li>" +
          '<span class="cart-thumb">' + L.productVisual(l.product, l.color, { decorative: true }) + "</span>" +
          "<span>" + L.esc(l.product.name) +
          '<br><span class="qty-badge">' + L.esc(l.colorName) + ", " + l.size + ", " + l.qty + " adet</span></span>" +
          "<strong>" + L.fmt(l.total) + "</strong></li>"
        );
      })
      .join("");
    L.$("#summary-rows").innerHTML =
      "<div><dt>Ara toplam</dt><dd>" + L.fmt(t.subtotal) + "</dd></div>" +
      "<div><dt>Kargo</dt><dd>" + (t.shipping ? L.fmt(t.shipping) : "Ücretsiz") + "</dd></div>" +
      (t.cod ? "<div><dt>Kapıda ödeme bedeli</dt><dd>" + L.fmt(t.cod) + "</dd></div>" : "") +
      '<div class="total"><dt>Toplam</dt><dd>' + L.fmt(t.total) + "</dd></div>";

    var btn = L.$("#submit-order");
    btn.textContent = useEndpoint ? "Siparişi tamamla" : "Siparişi WhatsApp ile gönder";
    L.$("#submit-note").textContent = useEndpoint
      ? "Toplam: " + L.fmt(t.total) + ". Siparişiniz bize iletilecek ve size onay mesajı göndereceğiz."
      : "Toplam: " + L.fmt(t.total) + ". Sipariş özetiniz WhatsApp'ta hazır mesaj olarak açılır; göndere dokunmanız yeterli.";
  }

  /* ---------- Doğrulama ---------- */

  function digits(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function validPhone(v) {
    var d = digits(v);
    if (d.indexOf("90") === 0 && d.length === 12) d = d.slice(2);
    if (d.indexOf("0") === 0 && d.length === 11) d = d.slice(1);
    return d.length === 10 && d.charAt(0) === "5";
  }

  function rules() {
    var corporate = form().invoiceType.value === "kurumsal";
    var list = [
      ["name", function (v) { return v.trim().split(/\s+/).length >= 2; }, "Adınızı ve soyadınızı yazın."],
      ["phone", validPhone, "Geçerli bir cep telefonu yazın, ör. 0532 123 45 67."],
      ["email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }, "Geçerli bir e-posta adresi yazın."],
      ["city", function (v) { return !!v; }, "Teslimat ilini seçin."],
      ["district", function (v) { return v.trim().length >= 2; }, "İlçeyi yazın."],
      ["address", function (v) { return v.trim().length >= 10; }, "Mahalle, sokak ve bina numarasını içeren açık adresinizi yazın."],
    ];
    if (corporate) {
      list.push(
        ["companyName", function (v) { return v.trim().length >= 2; }, "Firma unvanını yazın."],
        ["taxOffice", function (v) { return v.trim().length >= 2; }, "Vergi dairesini yazın."],
        ["taxNumber", function (v) { var d = digits(v); return d.length === 10 || d.length === 11; }, "Vergi numarası 10, TC kimlik numarası 11 haneli olmalı."]
      );
    }
    return list;
  }

  function clearErrors() {
    L.$all(".field.has-error", form()).forEach(function (f) {
      f.classList.remove("has-error");
    });
    L.$all(".field-error[data-generated]", form()).forEach(function (e) {
      e.remove();
    });
    L.$all("[aria-invalid]", form()).forEach(function (i) {
      i.removeAttribute("aria-invalid");
      i.removeAttribute("aria-describedby");
    });
    L.$("#form-alert").hidden = true;
  }

  function showError(input, message) {
    var field = input.closest(".field");
    field.classList.add("has-error");
    var id = "err-" + input.id;
    var p = document.createElement("p");
    p.className = "field-error";
    p.id = id;
    p.setAttribute("data-generated", "");
    p.textContent = message;
    field.appendChild(p);
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", id);
  }

  function validate() {
    clearErrors();
    var f = form();
    var invalid = [];
    rules().forEach(function (r) {
      var input = f.elements[r[0]];
      if (!r[1](input.value)) {
        showError(input, r[2]);
        invalid.push(input);
      }
    });
    var agree = L.$("#agree");
    if (!agree.checked) {
      showError(agree, "Siparişi verebilmek için ön bilgilendirme formunu ve mesafeli satış sözleşmesini onaylayın.");
      invalid.push(agree);
    }
    if (!paymentMethod()) {
      var alertBox = L.$("#form-alert");
      alertBox.textContent = "Bir ödeme yöntemi seçin.";
      alertBox.hidden = false;
      return false;
    }
    if (invalid.length) {
      var box = L.$("#form-alert");
      box.textContent =
        invalid.length === 1
          ? "Bir alan eksik ya da hatalı. İşaretli alanı düzeltip tekrar deneyin."
          : invalid.length + " alan eksik ya da hatalı. İşaretli alanları düzeltip tekrar deneyin.";
      box.hidden = false;
      invalid[0].focus();
      return false;
    }
    return true;
  }

  /* ---------- Sipariş ---------- */

  function orderNumber() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return (
      "LZ-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" +
      String(Math.floor(1000 + Math.random() * 9000))
    );
  }

  function buildOrder() {
    var f = form();
    var method = paymentMethod();
    var t = L.cart.totals(method);
    var corporate = f.invoiceType.value === "kurumsal";
    return {
      no: orderNumber(),
      createdAt: new Date().toISOString(),
      channel: useEndpoint ? "web" : "whatsapp",
      customer: {
        name: f.name.value.trim(),
        phone: f.phone.value.trim(),
        email: f.email.value.trim(),
      },
      address: {
        city: f.city.value,
        district: f.district.value.trim(),
        line: f.address.value.trim(),
      },
      invoice: corporate
        ? {
            type: "kurumsal",
            companyName: f.companyName.value.trim(),
            taxOffice: f.taxOffice.value.trim(),
            taxNumber: f.taxNumber.value.trim(),
          }
        : { type: "bireysel" },
      payment: method,
      note: f.note.value.trim(),
      lines: t.lines.map(function (l) {
        return {
          id: l.id,
          name: l.product.name,
          color: l.color,
          colorName: l.colorName,
          size: l.size,
          qty: l.qty,
          unit: l.unit,
          total: l.total,
        };
      }),
      totals: { subtotal: t.subtotal, shipping: t.shipping, cod: t.cod, total: t.total },
    };
  }

  function orderMessage(o) {
    var lines = o.lines
      .map(function (l, i) {
        return (i + 1) + ") " + l.name + ", " + l.colorName + ", " + l.size + " beden, " + l.qty + " adet: " + L.fmt(l.total);
      })
      .join("\n");
    var inv =
      o.invoice.type === "kurumsal"
        ? "Kurumsal: " + o.invoice.companyName + ", " + o.invoice.taxOffice + " VD, " + o.invoice.taxNumber
        : "Bireysel";
    return [
      "Merhaba, sipariş vermek istiyorum.",
      "Sipariş no: " + o.no,
      "",
      lines,
      "",
      "Ara toplam: " + L.fmt(o.totals.subtotal),
      "Kargo: " + (o.totals.shipping ? L.fmt(o.totals.shipping) : "Ücretsiz"),
      o.totals.cod ? "Kapıda ödeme bedeli: " + L.fmt(o.totals.cod) : null,
      "Toplam: " + L.fmt(o.totals.total),
      "",
      "Ödeme: " + PAYMENT_LABELS[o.payment],
      "Ad soyad: " + o.customer.name,
      "Telefon: " + o.customer.phone,
      "E-posta: " + o.customer.email,
      "Adres: " + o.address.line + ", " + o.address.district + " / " + o.address.city,
      "Fatura: " + inv,
      o.note ? "Not: " + o.note : null,
    ]
      .filter(function (x) { return x !== null; })
      .join("\n");
  }

  function saveOrder(o) {
    var orders = L.storageGet("lazio-orders", {});
    orders[o.no] = o;
    // Yalnızca son 10 siparişi tut
    var keys = Object.keys(orders).sort(function (a, b) {
      return orders[b].createdAt.localeCompare(orders[a].createdAt);
    });
    keys.slice(10).forEach(function (k) { delete orders[k]; });
    L.storageSet("lazio-orders", orders);
  }

  function finish(o) {
    saveOrder(o);
    L.cart.clear();
    window.location.href = "siparis.html?no=" + encodeURIComponent(o.no);
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    var o = buildOrder();
    o.message = orderMessage(o);

    if (!useEndpoint) {
      window.open(L.waLink(o.message), "_blank", "noopener");
      finish(o);
      return;
    }

    var btn = L.$("#submit-order");
    btn.disabled = true;
    btn.textContent = "Sipariş gönderiliyor…";
    fetch(C.orderEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(o),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        finish(o);
      })
      .catch(function () {
        btn.disabled = false;
        renderSummary();
        var box = L.$("#form-alert");
        box.innerHTML =
          "Sipariş gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin ya da " +
          '<a href="' + L.esc(L.waLink(o.message)) + '" target="_blank" rel="noopener">siparişi WhatsApp ile gönderin</a>.';
        box.hidden = false;
        box.focus();
      });
  }

  L.ready(function () {
    if (!L.cart.items().length) {
      L.$("#checkout").hidden = true;
      L.$("#checkout-empty").hidden = false;
      return;
    }
    buildProvinces();
    buildPayments();
    renderSummary();

    var f = form();
    f.addEventListener("change", function (e) {
      if (e.target.name === "payment") renderSummary();
      if (e.target.name === "invoiceType") {
        var corp = e.target.value === "kurumsal";
        L.$("#corporate-fields").hidden = !corp;
        L.$("#invoice-hint").textContent = corp
          ? "Fatura bu firma bilgilerine düzenlenir, ürünler teslimat adresine gönderilir."
          : "Fatura, teslimat adresine ve yukarıdaki ad soyada düzenlenir.";
      }
    });
    f.addEventListener("submit", submit);
  });
})();
