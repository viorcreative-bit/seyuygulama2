/*
 * Canlı fiyatlar: yönetim panelinden kaydedilen fiyatları sunucudan (api/prices.php) okuyup menüye uygular.
 *
 * - menu.js'teki fiyatlar varsayılandır; panelde kayıtlı fiyat varsa onun yerine geçer.
 * - Son okunan fiyatlar tarayıcıda saklanır, sonraki ziyarette sayfa hemen güncel fiyatla açılır.
 * - Sunucuya ulaşılamazsa (ya da site PHP'siz bir yerde açılırsa) site menu.js'teki fiyatlarla çalışır.
 * - Fiyatlar sonradan değişirse "nonna:prices" olayı yayınlanır; main.js ekrandaki fiyatları yeniler.
 */
(function () {
  "use strict";

  var MENU = window.NONNA_MENU || [];
  var API = "api/prices.php";
  var CACHE_KEY = "nonna-prices";

  // Bir ürünün fiyat anahtarı: "kategori::ürün adı" (panel de aynı anahtarı kullanır).
  function priceKey(catId, name) { return catId + "::" + name; }
  window.NONNA_PRICE_KEY = priceKey;

  function validPrice(v) { return typeof v === "number" && v > 0 && v === Math.floor(v); }

  // Kayıtlı fiyatı olmayan ürün menu.js'teki fiyatına döner.
  function apply(prices) {
    var changed = false;
    MENU.forEach(function (cat) {
      cat.sections.forEach(function (sec) {
        sec.items.forEach(function (it) {
          if (it.base == null) it.base = it.p;
          var v = prices[priceKey(cat.id, it.n)];
          var next = validPrice(v) ? v : it.base;
          if (it.p !== next) {
            it.p = next;
            changed = true;
          }
        });
      });
    });
    return changed;
  }

  // 1) Önceki ziyaretten kalan fiyatlar: sayfa ilk çizilirken kullanılır.
  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && cached.prices) apply(cached.prices);
  } catch (e) { /* depolama kapalıysa önemli değil */ }

  // 2) Güncel fiyatlar: gelince menüye uygulanır ve ekran yenilenir.
  fetch(API, { cache: "no-store" }).then(function (res) {
    var type = res.headers.get("Content-Type") || "";
    // PHP çalışmayan bir sunucu (ör. GitHub Pages) ya da kurulumu yapılmamış panel: menu.js fiyatlarıyla devam.
    if (!res.ok || type.indexOf("application/json") === -1) return null;
    return res.json();
  }).then(function (data) {
    if (!data || !data.prices) return;
    var prices = {};
    Object.keys(data.prices).forEach(function (k) {
      var v = Number(data.prices[k]);
      if (validPrice(v)) prices[k] = v;
    });
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ prices: prices, version: data.version })); } catch (e) {}
    if (apply(prices)) document.dispatchEvent(new CustomEvent("nonna:prices"));
  }).catch(function () { /* menu.js fiyatlarıyla devam */ });
})();
