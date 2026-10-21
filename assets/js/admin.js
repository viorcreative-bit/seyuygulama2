/*
 * Nonna fiyat yönetimi (admin.html)
 *
 * Giriş, şifre işlemleri ve fiyatlar sitenin kendi sunucusundaki PHP uçlarından yürür:
 *   api/admin.php   oturum, kaydetme, şifre değiştirme, "şifremi unuttum" kodu
 *   api/prices.php  kayıtlı fiyatlar (site de buradan okur, assets/js/prices.js)
 * Oturum HttpOnly çerezde tutulur; her yazma isteği ayrıca CSRF anahtarı taşır.
 */
(function () {
  "use strict";

  var MENU = window.NONNA_MENU || [];
  var API = "api/admin.php";
  var PRICES_API = "api/prices.php";
  var MAX_PRICE = 1000000;
  var MIN_PASSWORD = 8;

  var user = null;         // { username, email (gizlenmiş) }
  var csrf = "";
  var resumeKeep = null;   // oturum düşerse yayınlanmamış değişiklikler, yeniden girişten sonra geri yüklenir
  var state = {
    version: 0,            // sunucudaki fiyatların sürümü (çakışma kontrolü için)
    items: []              // { key, catId, catTitle, name, tag, base, original, value, row, input, search }
  };

  var priceFormat = new Intl.NumberFormat("tr-TR");
  function formatPrice(p) { return priceFormat.format(p) + " ₺"; }

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // "kofte" yazınca "köfte" de bulunsun.
  var FOLD = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u", "é": "e" };
  function fold(text) {
    return (text || "").toLocaleLowerCase("tr-TR").replace(/i̇/g, "i").replace(/[çğıöşüâîûé]/g, function (ch) { return FOLD[ch]; });
  }

  // Sitedeki prices.js ile aynı anahtar: "kategori::ürün adı"
  function priceKey(catId, name) { return catId + "::" + name; }

  /* ---------- Sunucu istekleri ---------- */
  // Hata: err.status (HTTP), err.code (sunucunun hata kodu ya da NETWORK / NO_PHP), err.message (Türkçe açıklama)
  function request(url, opts) {
    return fetch(url, opts).then(function (res) {
      var type = res.headers.get("Content-Type") || "";
      return res.text().then(function (txt) {
        var data = null;
        if (type.indexOf("application/json") !== -1) {
          try { data = JSON.parse(txt); } catch (e) { data = null; }
        }
        if (!data) {
          // PHP çalışmıyor (ör. GitHub Pages, dosyayı bilgisayarda açmak) ya da sunucu hatası
          var bad = new Error("Sunucu beklenen yanıtı vermedi (HTTP " + res.status + ").");
          bad.status = res.status;
          bad.code = "NO_PHP";
          throw bad;
        }
        if (!res.ok) {
          var err = new Error(data.message || ("HTTP " + res.status));
          err.status = res.status;
          err.code = data.error || "";
          throw err;
        }
        return data;
      });
    }, function () {
      var err = new Error("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
      err.status = 0;
      err.code = "NETWORK";
      throw err;
    });
  }

  function call(action, data) {
    var body = { action: action };
    Object.keys(data || {}).forEach(function (k) { body[k] = data[k]; });
    var headers = { "Content-Type": "application/json" };
    if (csrf) headers["X-CSRF-Token"] = csrf;
    return request(API, { method: "POST", headers: headers, body: JSON.stringify(body), credentials: "same-origin", cache: "no-store" });
  }

  function setUser(data) {
    user = data.user;
    csrf = data.csrf || "";
    $("[data-account-email]").textContent = user && user.email
      ? "Şifre sıfırlama kodları " + user.email + " adresine gönderilir." : "";
  }

  function clearUser() {
    user = null;
    csrf = "";
  }

  /* ---------- Görünümler ---------- */
  function show(view) {
    $all("[data-view]").forEach(function (v) { v.hidden = v.getAttribute("data-view") !== view; });
    $("[data-session]").hidden = view !== "editor" && view !== "loading";
  }

  var toastTimer = 0;
  function toast(message) {
    var box = $("[data-toast]");
    box.textContent = message;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.hidden = true; }, 8000);
  }

  function showError(node, message) {
    node.textContent = message;
    node.hidden = !message;
  }

  function busy(btn, on, label) {
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.disabled = on;
    btn.textContent = on ? label : btn.dataset.label;
  }

  function showSetup(err) {
    var box = $("[data-setup-text]");
    box.textContent = "";
    if (err.code === "not_installed") {
      box.appendChild(document.createTextNode("Veritabanı bağlantısı henüz ayarlanmamış. Kurulumu tamamlamak için "));
      var a = el("a", "", "api/install.php");
      a.href = "api/install.php";
      box.appendChild(a);
      box.appendChild(document.createTextNode(" sayfasını açın."));
    } else if (err.code === "NO_PHP") {
      box.textContent = "Bu panel PHP ve MySQL destekleyen bir hostingde çalışır. Site dosyalarını hostinginize yükleyip api/install.php sayfasıyla kurulumu yapın; ayrıntılar README dosyasında.";
    } else {
      box.textContent = err.message + " ";
      var retry = el("button", "adm-link", "Tekrar dene");
      retry.type = "button";
      retry.addEventListener("click", start);
      box.appendChild(retry);
    }
    show("setup");
  }

  /* ---------- Giriş ---------- */
  var loginForm = $("[data-login-form]");
  var loginError = $("[data-login-error]");
  var loginNote = $("[data-login-note]");
  var loginSubmit = $("[data-login-submit]");

  function showLogin(error, note) {
    showError(loginError, error || "");
    showError(loginNote, note || "");
    show("login");
    (loginForm.username.value ? loginForm.password : loginForm.username).focus();
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var username = loginForm.username.value.trim();
    var password = loginForm.password.value;
    if (!username || !password) {
      showError(loginError, "Kullanıcı adı ve şifreyi girin.");
      return;
    }
    showError(loginError, "");
    showError(loginNote, "");
    busy(loginSubmit, true, "Giriş yapılıyor…");
    call("login", { username: username, password: password, remember: $("[data-remember]").checked }).then(function (data) {
      setUser(data);
      loginForm.password.value = "";
      var keep = resumeKeep;
      resumeKeep = null;
      return load(keep);
    }).catch(function (err) {
      if (err.code === "not_installed" || err.code === "NO_PHP") { showSetup(err); return; }
      showError(loginError, err.message);
    }).then(function () {
      busy(loginSubmit, false);
    });
  });

  $("[data-logout]").addEventListener("click", function () {
    if (pendingCount() && !confirm("Yayınlanmamış değişiklikler silinecek. Çıkış yapılsın mı?")) return;
    call("logout").catch(function () { /* oturum zaten kapanmışsa önemli değil */ });
    clearUser();
    $("[data-toast]").hidden = true;
    state.items = [];
    updateBar();
    showLogin();
  });

  /* ---------- Şifremi unuttum ---------- */
  var forgotSubmit = $("[data-forgot-submit]");
  var forgotError = $("[data-forgot-error]");
  var resetForm = $("[data-reset-form]");
  var resetError = $("[data-reset-error]");
  var resetSubmit = $("[data-reset-submit]");

  function showReset(text) {
    $("[data-reset-text]").textContent = text || "E-postanıza gelen 6 haneli kodu ve yeni şifrenizi yazın.";
    showError(resetError, "");
    show("reset");
    resetForm.querySelector("#reset-code").focus();
  }

  $("[data-show-forgot]").addEventListener("click", function () {
    showError(forgotError, "");
    show("forgot");
    forgotSubmit.focus();
  });
  $("[data-show-reset]").addEventListener("click", function () { showReset(); });
  $all("[data-show-login]").forEach(function (btn) {
    btn.addEventListener("click", function () { showLogin(); });
  });

  function sendCode(btn, errBox) {
    busy(btn, true, "Gönderiliyor…");
    showError(errBox, "");
    return call("forgot").then(function (data) {
      showReset("Kod " + data.email + " adresine gönderildi. 15 dakika geçerli; birkaç dakika içinde gelmezse gereksiz (spam) klasörüne bakın.");
    }).catch(function (err) {
      showError(errBox, err.message);
    }).then(function () {
      busy(btn, false);
    });
  }

  $("[data-forgot-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    sendCode(forgotSubmit, forgotError);
  });
  $("[data-resend]").addEventListener("click", function (e) {
    sendCode(e.currentTarget, resetError);
  });

  resetForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var code = resetForm.querySelector("#reset-code").value.replace(/\D/g, "");
    var a = resetForm.querySelector("#reset-password").value;
    var b = resetForm.querySelector("#reset-password-2").value;
    if (code.length !== 6) { showError(resetError, "E-postadaki 6 haneli kodu girin."); return; }
    if (a.length < MIN_PASSWORD) { showError(resetError, "Yeni şifre en az " + MIN_PASSWORD + " karakter olmalı."); return; }
    if (a !== b) { showError(resetError, "İki şifre aynı değil."); return; }
    showError(resetError, "");
    busy(resetSubmit, true, "Yenileniyor…");
    call("reset", { code: code, password: a }).then(function (data) {
      resetForm.reset();
      loginForm.username.value = data.username || loginForm.username.value;
      loginForm.password.value = "";
      showLogin("", "Şifreniz yenilendi. Yeni şifrenizle giriş yapın.");
    }).catch(function (err) {
      showError(resetError, err.message);
    }).then(function () {
      busy(resetSubmit, false);
    });
  });

  /* ---------- Şifreyi değiştir ---------- */
  var pwForm = $("[data-password-form]");
  var pwSubmit = $("[data-password-submit]");
  var pwError = $("[data-password-error]");

  pwForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var current = pwForm.querySelector("#current-password").value;
    var a = pwForm.querySelector("#new-password").value;
    var b = pwForm.querySelector("#new-password-2").value;
    if (!current) { showError(pwError, "Mevcut şifrenizi girin."); return; }
    if (a.length < MIN_PASSWORD) { showError(pwError, "Yeni şifre en az " + MIN_PASSWORD + " karakter olmalı."); return; }
    if (a !== b) { showError(pwError, "İki şifre aynı değil."); return; }
    showError(pwError, "");
    busy(pwSubmit, true, "Değiştiriliyor…");
    call("password", { current: current, password: a }).then(function () {
      pwForm.reset();
      pwForm.closest("details").open = false;
      toast("Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.");
    }).catch(function (err) {
      if (err.status === 401) { sessionLost(); return; }
      showError(pwError, err.message);
    }).then(function () {
      busy(pwSubmit, false);
    });
  });

  // Oturum sunucuda kapanmışsa (süresi doldu, şifre başka yerden değişti): değişiklikleri sakla, girişe dön.
  function sessionLost() {
    var keep = {};
    pendingItems().forEach(function (it) { keep[it.key] = it.value; });
    resumeKeep = Object.keys(keep).length ? keep : null;
    clearUser();
    if (dialog.open) dialog.close();
    showLogin("Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın." +
      (resumeKeep ? " Yayınlanmamış değişiklikleriniz giriş yaptıktan sonra geri gelecek." : ""));
  }

  /* ---------- Fiyatları yükle ---------- */
  // keep: yeniden yüklemede korunacak bekleyen değişiklikler (ürün anahtarı → fiyat)
  function load(keep) {
    show("loading");
    $("[data-loading-text]").textContent = "Menü yükleniyor…";
    return request(PRICES_API + "?t=" + Date.now(), { cache: "no-store" }).then(function (data) {
      state.version = Number(data.version) || 0;
      buildEditor(data.prices || {}, keep || {});
      show("editor");
    }).catch(function (err) {
      var box = $("[data-loading-text]");
      box.textContent = "Fiyatlar yüklenemedi: " + err.message + " ";
      var retry = el("button", "adm-link", "Tekrar dene");
      retry.type = "button";
      retry.addEventListener("click", function () { load(keep); });
      box.appendChild(retry);
    });
  }

  /* ---------- Düzenleyici ---------- */
  var list = $("[data-list]");
  var searchInput = $("[data-search]");
  var catFilter = $("[data-cat-filter]");
  var bulkScope = $("[data-bulk-scope]");

  function buildEditor(live, keep) {
    list.textContent = "";
    state.items = [];
    [catFilter, bulkScope].forEach(function (sel) {
      while (sel.options.length > 1) sel.remove(1);
    });

    var idx = 0;
    MENU.forEach(function (cat) {
      var sec = el("section", "adm-cat");
      sec.setAttribute("data-cat", cat.id);
      sec.appendChild(el("h2", "adm-cat-title", cat.title));
      var body = el("div", "adm-cat-body");
      sec.appendChild(body);
      list.appendChild(sec);
      [catFilter, bulkScope].forEach(function (sel) { sel.add(new Option(cat.title, cat.id)); });

      cat.sections.forEach(function (s) {
        if (s.title) body.appendChild(el("h3", "adm-group", s.title));
        s.items.forEach(function (it) {
          var key = priceKey(cat.id, it.n);
          var current = typeof live[key] === "number" ? live[key] : it.p;
          var item = {
            key: key,
            catId: cat.id,
            catTitle: cat.title,
            name: it.n,
            tag: it.tag || "",
            base: it.p,
            original: current,
            value: Object.prototype.hasOwnProperty.call(keep, key) ? keep[key] : current,
            search: fold([it.n, it.tag, s.title, cat.title].join(" "))
          };

          var row = el("div", "adm-row");
          var id = "price-" + (idx++);
          var label = el("label", "adm-name", it.n);
          label.htmlFor = id;
          if (it.tag) label.appendChild(el("span", "adm-tag", it.tag));
          var old = el("span", "adm-old", formatPrice(current));
          var wrap = el("div", "adm-price");
          var input = el("input");
          input.id = id;
          input.type = "number";
          input.inputMode = "numeric";
          input.min = "1";
          input.step = "1";
          input.value = String(item.value);
          wrap.appendChild(input);
          wrap.appendChild(el("span", "adm-currency", "₺"));
          row.appendChild(label);
          row.appendChild(old);
          row.appendChild(wrap);
          body.appendChild(row);

          item.row = row;
          item.input = input;
          item.old = old;
          input.addEventListener("input", function () { onPriceInput(item); });
          state.items.push(item);
          paintRow(item);
        });
      });
    });

    $("[data-summary]").textContent = state.items.length + " ürün, " + MENU.length + " kategori. Fiyatı değiştirdiğiniz ürünler işaretlenir; hepsini en son tek seferde yayınlarsınız." +
      (user ? " Giriş: " + user.username : "");
    applyFilter();
    updateBar();
  }

  function validPrice(v) { return Number.isInteger(v) && v > 0 && v < MAX_PRICE; }

  function onPriceInput(item) {
    var raw = item.input.value.trim();
    var v = raw === "" ? NaN : Number(raw);
    item.value = validPrice(v) ? v : NaN;
    paintRow(item);
    updateBar();
  }

  function paintRow(item) {
    var invalid = isNaN(item.value);
    var changed = !invalid && item.value !== item.original;
    item.row.classList.toggle("is-changed", changed);
    item.row.classList.toggle("is-invalid", invalid);
    item.input.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function setValue(item, v) {
    item.value = v;
    item.input.value = String(v);
    paintRow(item);
  }

  function pendingItems() { return state.items.filter(function (it) { return !isNaN(it.value) && it.value !== it.original; }); }
  function pendingCount() { return pendingItems().length; }
  function invalidCount() { return state.items.filter(function (it) { return isNaN(it.value); }).length; }

  var bar = $("[data-bar]");
  function updateBar() {
    var n = pendingCount(), bad = invalidCount();
    bar.hidden = !n && !bad;
    document.body.classList.toggle("has-bar", !bar.hidden);
    var text = n ? n + " fiyat değişti." : "";
    if (bad) text += (text ? " " : "") + bad + " fiyat geçersiz (boş ya da 0).";
    $("[data-bar-text]").textContent = text;
    $("[data-review]").disabled = !n || bad > 0;
  }

  /* Arama ve kategori filtresi */
  function applyFilter() {
    var terms = fold(searchInput.value.trim()).split(/\s+/).filter(Boolean);
    var cat = catFilter.value;
    var shown = 0;
    state.items.forEach(function (it) {
      var hit = (!cat || it.catId === cat) && terms.every(function (t) { return it.search.indexOf(t) !== -1; });
      it.row.hidden = !hit;
      if (hit) shown++;
    });
    list.querySelectorAll(".adm-cat").forEach(function (sec) {
      sec.hidden = !sec.querySelector(".adm-row:not([hidden])");
      sec.querySelectorAll(".adm-group").forEach(function (g) {
        var n = g.nextElementSibling, any = false;
        while (n && !n.classList.contains("adm-group")) { if (!n.hidden) any = true; n = n.nextElementSibling; }
        g.hidden = !any;
      });
    });
    $("[data-empty]").hidden = shown > 0;
  }
  searchInput.addEventListener("input", applyFilter);
  catFilter.addEventListener("change", applyFilter);

  /* Toplu güncelleme */
  $("[data-bulk-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var errBox = $("[data-bulk-error]");
    var pct = parseFloat(String($("[data-bulk-percent]").value).replace(",", "."));
    var step = +$("[data-bulk-round]").value || 1;
    var scope = bulkScope.value;
    if (isNaN(pct) || pct === 0) { showError(errBox, "Yüzde değeri girin (ör. 10 ya da -5)."); return; }
    if (pct <= -90 || pct > 500) { showError(errBox, "Yüzde değeri -90 ile 500 arasında olmalı."); return; }
    showError(errBox, "");
    var count = 0;
    state.items.forEach(function (it) {
      if (scope && it.catId !== scope) return;
      var from = isNaN(it.value) ? it.original : it.value;
      setValue(it, Math.max(step, Math.round(from * (1 + pct / 100) / step) * step));
      count++;
    });
    updateBar();
    var where = scope ? bulkScope.options[bulkScope.selectedIndex].text : "Tüm menü";
    toast(where + ": " + count + " ürünün fiyatı %" + String(pct).replace(".", ",") + " değişti. Yayınlamadan önce listeyi kontrol edin.");
  });

  /* Geri al */
  $("[data-discard]").addEventListener("click", function () {
    var n = pendingCount() + invalidCount();
    if (!n || !confirm(n + " değişiklik geri alınsın mı?")) return;
    state.items.forEach(function (it) { setValue(it, it.original); });
    updateBar();
  });

  /* ---------- Gözden geçir ve yayınla ---------- */
  var dialog = $("[data-review-dialog]");
  var publishBtn = $("[data-publish]");
  var publishError = $("[data-publish-error]");

  $("[data-review]").addEventListener("click", function () {
    var changes = pendingItems();
    if (!changes.length) return;
    var rows = $("[data-review-rows]");
    rows.textContent = "";
    changes.forEach(function (it) {
      var tr = el("tr");
      var name = el("td", "", it.name);
      name.appendChild(el("span", "adm-review-cat", it.catTitle));
      tr.appendChild(name);
      tr.appendChild(el("td", "adm-num", formatPrice(it.original)));
      var diff = Math.round((it.value - it.original) / it.original * 100);
      var td = el("td", "adm-num adm-new", formatPrice(it.value));
      td.appendChild(el("span", "adm-diff" + (diff < 0 ? " is-down" : ""), (diff > 0 ? "+" : "") + diff + "%"));
      tr.appendChild(td);
      rows.appendChild(tr);
    });
    $("[data-review-summary]").textContent = changes.length + " ürünün fiyatı güncellenecek. Yayınladığınız anda sitede görünür.";
    showError(publishError, "");
    busy(publishBtn, false);
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  });

  publishBtn.addEventListener("click", function () {
    var changes = pendingItems();
    if (!changes.length || invalidCount()) return;
    var prices = {};
    state.items.forEach(function (it) { prices[it.key] = it.value; });
    busy(publishBtn, true, "Yayınlanıyor…");
    showError(publishError, "");

    // Başka bir cihaz bu arada kaydetmişse sunucu sürüm uyuşmazlığı (409) döndürür, üzerine yazılmaz.
    call("save", { version: state.version, prices: prices }).then(function (data) {
      state.version = data.version;
      state.items.forEach(function (it) {
        it.original = it.value;
        it.old.textContent = formatPrice(it.original);
        paintRow(it);
      });
      updateBar();
      dialog.close();
      toast(changes.length + " fiyat kaydedildi ve sitede yayında.");
    }).catch(function (err) {
      busy(publishBtn, false);
      if (err.status === 409) {
        showError(publishError, "Fiyatlar siz düzenlerken başka bir cihazdan değiştirilmiş. \"Güncel fiyatları yükle\" ile en son hali alın; yaptığınız değişiklikler korunur.");
        var reload = el("button", "adm-link", "Güncel fiyatları yükle");
        reload.type = "button";
        reload.addEventListener("click", function () {
          var keep = {};
          pendingItems().forEach(function (it) { keep[it.key] = it.value; });
          dialog.close();
          load(keep);
        });
        publishError.appendChild(document.createTextNode(" "));
        publishError.appendChild(reload);
      } else if (err.status === 401) {
        sessionLost();
      } else {
        showError(publishError, "Kaydedilemedi: " + err.message + " Değişiklikleriniz duruyor, tekrar deneyebilirsiniz.");
      }
    });
  });

  // Yayınlanmamış değişiklik varken sayfadan çıkarken uyar.
  window.addEventListener("beforeunload", function (e) {
    if (pendingCount()) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Başlat ---------- */
  // Açık oturum varsa doğrudan düzenleyiciye geçilir.
  function start() {
    show("loading");
    request(API + "?action=me", { credentials: "same-origin", cache: "no-store" }).then(function (data) {
      setUser(data);
      return load();
    }).catch(function (err) {
      if (err.status === 401) showLogin();
      else showSetup(err);
    });
  }
  start();
})();
