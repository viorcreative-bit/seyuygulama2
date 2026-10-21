/*
 * Canlı fiyatlar: yönetim panelinden kaydedilen fiyatları Firebase'den okuyup menüye uygular.
 *
 * - menu.js'teki fiyatlar varsayılandır; Firebase'de kayıtlı fiyat varsa onun yerine geçer.
 * - Son okunan fiyatlar tarayıcıda saklanır, sonraki ziyarette sayfa hemen güncel fiyatla açılır.
 * - Firebase'e ulaşılamazsa site menu.js'teki fiyatlarla çalışmaya devam eder.
 * - Fiyatlar sonradan değişirse "nonna:prices" olayı yayınlanır; main.js ekrandaki fiyatları yeniler.
 */
(function () {
  "use strict";

  var MENU = window.NONNA_MENU || [];
  var FB = window.NONNA_FIREBASE || {};
  var CACHE_KEY = "nonna-prices";

  // Bir ürünün fiyat anahtarı: "kategori::ürün adı" (panel de aynı anahtarı kullanır).
  function priceKey(catId, name) { return catId + "::" + name; }
  window.NONNA_PRICE_KEY = priceKey;

  function apply(prices) {
    var changed = false;
    MENU.forEach(function (cat) {
      cat.sections.forEach(function (sec) {
        sec.items.forEach(function (it) {
          var v = prices[priceKey(cat.id, it.n)];
          if (typeof v === "number" && v > 0 && v === Math.floor(v) && it.p !== v) {
            it.p = v;
            changed = true;
          }
        });
      });
    });
    return changed;
  }

  if (!FB.apiKey || !FB.projectId) return;

  // 1) Önceki ziyaretten kalan fiyatlar: sayfa ilk çizilirken kullanılır.
  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && cached.prices) apply(cached.prices);
  } catch (e) { /* depolama kapalıysa önemli değil */ }

  // 2) Güncel fiyatlar: gelince menüye uygulanır ve ekran yenilenir.
  var url = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(FB.projectId) +
    "/databases/(default)/documents/site/menu?key=" + encodeURIComponent(FB.apiKey);

  fetch(url, { cache: "no-store" }).then(function (res) {
    if (res.status === 404) return null;            // panelden henüz kayıt yapılmamış
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }).then(function (doc) {
    if (!doc) return;
    var fields = (doc.fields && doc.fields.prices && doc.fields.prices.mapValue && doc.fields.prices.mapValue.fields) || {};
    var prices = {};
    Object.keys(fields).forEach(function (k) {
      var v = fields[k].integerValue != null ? Number(fields[k].integerValue) : Number(fields[k].doubleValue);
      if (!isNaN(v)) prices[k] = v;
    });
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ prices: prices, at: doc.updateTime })); } catch (e) {}
    if (apply(prices)) document.dispatchEvent(new CustomEvent("nonna:prices"));
  }).catch(function () { /* menu.js fiyatlarıyla devam */ });
})();
