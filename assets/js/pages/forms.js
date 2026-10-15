/*
 * Kurumsal sayfalar: toptan teklif formu, iletişim formu,
 * sık sorulan sorular ve sayfa görselleri.
 */
(function () {
  "use strict";

  var L = window.Lazio;
  var C = L.config;

  var FORM_TITLES = {
    teklif: "Toptan / fason üretim teklif talebi",
    iletisim: "Web sitesi iletişim formu",
  };

  function labelFor(input) {
    var label = document.querySelector('label[for="' + input.id + '"]');
    if (!label) return input.name;
    var clone = label.cloneNode(true);
    L.$all(".optional", clone).forEach(function (o) { o.remove(); });
    return clone.textContent.trim();
  }

  function fieldError(input, msg) {
    var field = input.closest(".field");
    field.classList.add("has-error");
    var p = document.createElement("p");
    p.className = "field-error";
    p.id = "err-" + input.id;
    p.setAttribute("data-generated", "");
    p.textContent = msg;
    field.appendChild(p);
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", p.id);
  }

  function validate(form) {
    L.$all(".has-error", form).forEach(function (f) { f.classList.remove("has-error"); });
    L.$all("[data-generated]", form).forEach(function (e) { e.remove(); });
    L.$all("[aria-invalid]", form).forEach(function (i) {
      i.removeAttribute("aria-invalid");
      i.removeAttribute("aria-describedby");
    });
    var alertBox = L.$(".form-alert", form);
    alertBox.hidden = true;

    var invalid = [];
    L.$all("input, select, textarea", form).forEach(function (i) {
      var v = i.value.trim();
      var name = labelFor(i).toLocaleLowerCase("tr");
      if (i.required && !v) {
        fieldError(i, i.tagName === "SELECT" ? "Bir seçenek belirleyin." : "Bu alanı doldurun: " + name + ".");
        invalid.push(i);
      } else if (v && i.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        fieldError(i, "Geçerli bir e-posta adresi yazın.");
        invalid.push(i);
      } else if (v && i.type === "tel" && v.replace(/\D/g, "").length < 10) {
        fieldError(i, "Telefon numarasını alan koduyla birlikte yazın.");
        invalid.push(i);
      }
    });
    if (invalid.length) {
      alertBox.textContent = "Göndermeden önce işaretli alanları düzeltin.";
      alertBox.hidden = false;
      invalid[0].focus();
      return false;
    }
    return true;
  }

  function compose(form) {
    var title = FORM_TITLES[form.getAttribute("data-form")] || "Web sitesi formu";
    var lines = [title, ""];
    L.$all("input, select, textarea", form).forEach(function (i) {
      if (i.value.trim()) lines.push(labelFor(i) + ": " + i.value.trim());
    });
    return { subject: title, body: lines.join("\n") };
  }

  function bindForm(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var msg = compose(form);
      var channel = e.submitter && e.submitter.getAttribute("data-channel");
      if (channel === "email") {
        window.location.href =
          "mailto:" + C.company.email +
          "?subject=" + encodeURIComponent(msg.subject) +
          "&body=" + encodeURIComponent(msg.body);
        L.toast("E-posta uygulamanızda mesaj hazırlandı. Göndermeyi unutmayın.");
      } else {
        window.open(L.waLink(msg.body), "_blank", "noopener");
        L.toast("Mesajınız WhatsApp'ta hazır. Göndermek için gönder düğmesine dokunun.");
      }
    });
  }

  /* ---------- Sayfa parçaları ---------- */

  function contactLinks() {
    var tel = "tel:" + C.company.phone.replace(/[^\d+]/g, "");
    var mail = "mailto:" + C.company.email;
    ["#w-phone", "#c-phone"].forEach(function (s) {
      var a = L.$(s);
      if (a) a.href = tel;
    });
    ["#w-email", "#c-email"].forEach(function (s) {
      var a = L.$(s);
      if (a) a.href = mail;
    });
    var wa = L.$("#c-wa");
    if (wa) wa.href = L.waLink("Merhaba, bilgi almak istiyorum.");
  }

  function map() {
    var slot = L.$("#map-slot");
    if (!slot || !C.company.mapEmbedUrl) return;
    slot.innerHTML =
      '<iframe class="map-frame" src="' + L.esc(C.company.mapEmbedUrl) + '" title="Lazio Tekstil konumu"' +
      ' loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
  }

  function wholesale() {
    var row = L.$("#wholesale-groups");
    if (row) {
      var tint = ["lacivert", "beyaz", "gri-melanj", "haki", "siyah", "adacayi"];
      row.innerHTML = L.categories
        .map(function (c, i) {
          return (
            '<li><a class="category-tile" href="magaza.html?kategori=' + c.id + '">' +
            '<span class="ct-media">' + window.LazioGarments.svg(c.garment, { color: L.color(tint[i % tint.length]).hex }) + "</span>" +
            '<span class="ct-name">' + c.name + "</span></a></li>"
          );
        })
        .join("");
    }
    var sel = L.$("#q-product");
    if (sel) {
      sel.insertAdjacentHTML(
        "beforeend",
        L.categories.map(function (c) { return "<option>" + c.name + "</option>"; }).join("") +
          "<option>Birden fazla ürün</option><option>Diğer</option>"
      );
    }
  }

  function trio() {
    var board = L.$("#trio-board");
    if (!board) return;
    board.innerHTML =
      window.LazioGarments.svg("tee", { color: L.color("ekru").hex }) +
      window.LazioGarments.svg("hoodie", { color: L.color("lacivert").hex }) +
      window.LazioGarments.svg("jogger", { color: L.color("gri-melanj").hex });
  }

  function faq() {
    var box = L.$("#faq");
    if (!box) return;
    var free = L.fmt(C.shipping.freeThreshold).replace(",00", "");
    var items = [
      ["Siparişim ne zaman kargoya verilir?",
        "Siparişler " + C.shipping.dispatchTime + " içinde kargoya verilir. Havale/EFT ile ödemede süre, ödemenin hesabımıza geçtiği gün başlar."],
      ["Kargo ücreti ne kadar?",
        free + " ve üzeri siparişlerde kargo ücretsizdir. Daha düşük tutarlı siparişlerde kargo ücreti: " + L.fmt(C.shipping.fee) + "."],
      ["Hangi ödeme yöntemlerini kullanabilirim?",
        "Havale/EFT ile ya da kapıda nakit veya kartla ödeyebilirsiniz. Kapıda ödemede " + L.fmt(C.payment.cashOnDelivery.fee) + " hizmet bedeli eklenir."],
      ["Ürünü nasıl iade ederim?",
        "Teslim aldığınız tarihten itibaren " + C.returnDays + " gün içinde, kullanılmamış ve etiketi sökülmemiş ürünleri iade edebilirsiniz. Önce WhatsApp'tan sipariş numaranızla bize yazın, size iade kodunu iletelim."],
      ["Bedenim olmadı, değiştirebilir miyim?",
        "Evet. Stokta varsa farklı bedenle değişim yapıyoruz. Ürün sayfalarındaki beden tablosu, her bedenin gerçek ölçülerini gösterir."],
      ["Toptan alım yapabilir miyim?",
        "Evet. Toptan ve fason üretim için minimum sipariş miktarı " + C.wholesale.minQuantity.toLocaleLowerCase("tr") + ". Teklif için toptan sayfasındaki formu doldurabilirsiniz."],
    ];
    box.innerHTML = items
      .map(function (it) {
        return "<details><summary>" + L.esc(it[0]) + "</summary><p>" + L.esc(it[1]) + "</p></details>";
      })
      .join("");
  }

  L.ready(function () {
    L.$all("form[data-form]").forEach(bindForm);
    contactLinks();
    map();
    wholesale();
    trio();
    faq();
  });
})();
