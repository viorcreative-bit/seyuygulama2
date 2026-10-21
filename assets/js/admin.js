/*
 * Nonna fiyat yönetimi (admin.html)
 *
 * Giriş ve şifre işlemleri Firebase Authentication ile, fiyatlar Firebase Firestore'daki
 * "site/menu" belgesinde tutulur. Site (assets/js/prices.js) bu belgeyi okuyup menu.js'teki
 * fiyatların yerine kullanır; kaydedilen fiyatlar sitede hemen görünür.
 *
 * Ayarlar assets/js/firebase-config.js dosyasında; yazma yetkisini Firestore kuralları
 * (firestore.rules) yalnızca admin hesabına verir.
 */
(function () {
  "use strict";

  var FB = window.NONNA_FIREBASE || {};
  var MENU = window.NONNA_MENU || [];
  var CONFIGURED = !!(FB.apiKey && FB.projectId && FB.adminEmail);

  var AUTH_URL = "https://identitytoolkit.googleapis.com/v1/accounts:";
  var TOKEN_URL = "https://securetoken.googleapis.com/v1/token";
  var DOC_URL = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(FB.projectId || "") +
    "/databases/(default)/documents/site/menu";
  var SESSION_KEY = "nonna-admin-session";
  var MAX_PRICE = 1000000;

  var session = null;      // { idToken, refreshToken, email, expiresAt }
  var state = {
    updateTime: null,      // Firestore belgesinin son güncellenme zamanı (çakışma kontrolü için)
    items: []              // { key, catId, catTitle, name, tag, base, original, value, row, input, search }
  };

  var priceFormat = new Intl.NumberFormat("tr-TR");
  function formatPrice(p) { return priceFormat.format(p) + " ₺"; }

  function $(sel) { return document.querySelector(sel); }
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

  // e-postanın bir kısmını gizler: v•••••••••••@gmail.com
  function maskEmail(email) {
    var at = email.indexOf("@");
    if (at < 2) return email;
    return email.charAt(0) + new Array(at).join("•") + email.slice(at);
  }

  /* ---------- Oturum saklama ---------- */
  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveSession(remember) {
    try {
      var raw = JSON.stringify(session);
      if (remember == null) remember = !!localStorage.getItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, raw);
    } catch (e) { /* tarayıcı depolamaya izin vermiyorsa yalnızca bu sekmede çalışır */ }
  }
  function clearSession() {
    session = null;
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  /* ---------- Firebase istekleri ---------- */
  function request(method, url, body, opts) {
    opts = opts || {};
    var headers = {};
    var payload;
    if (opts.form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      payload = opts.form;
    } else if (body) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    if (opts.token) headers["Authorization"] = "Bearer " + opts.token;
    return fetch(url, { method: method, headers: headers, body: payload, cache: "no-store" }).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
        if (!res.ok) {
          var e = (data && data.error) || {};
          // Giriş hataları kodu mesajın başında taşır ("INVALID_LOGIN_CREDENTIALS", "WEAK_PASSWORD : ..."),
          // Firestore hataları "status" alanında ("PERMISSION_DENIED", "FAILED_PRECONDITION").
          var m = /^([A-Z_]+)(?:\s|:|$)/.exec(e.message || "");
          var err = new Error(e.message || ("HTTP " + res.status));
          err.status = res.status;
          err.code = m ? m[1] : (e.status || "");
          err.fsStatus = e.status || "";
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

  function authCall(method, body) {
    return request("POST", AUTH_URL + method + "?key=" + encodeURIComponent(FB.apiKey), body);
  }

  function startSession(data, email) {
    session = {
      idToken: data.idToken || data.id_token,
      refreshToken: data.refreshToken || data.refresh_token,
      email: email || (session && session.email) || data.email,
      expiresAt: Date.now() + (Number(data.expiresIn || data.expires_in) || 3600) * 1000
    };
  }

  // Geçerli kimlik jetonu; süresi dolmak üzereyse yeniler.
  function idToken(force) {
    if (!session) return Promise.reject(Object.assign(new Error("Oturum yok"), { code: "NO_SESSION", status: 401 }));
    if (!force && session.expiresAt - 60000 > Date.now()) return Promise.resolve(session.idToken);
    var form = "grant_type=refresh_token&refresh_token=" + encodeURIComponent(session.refreshToken);
    return request("POST", TOKEN_URL + "?key=" + encodeURIComponent(FB.apiKey), null, { form: form }).then(function (data) {
      startSession(data);
      saveSession();
      return session.idToken;
    });
  }

  // Firestore isteği; jeton geçersiz sayılırsa bir kez yenileyip tekrar dener.
  function firestore(method, url, body) {
    return idToken().then(function (tok) {
      return request(method, url, body, { token: tok }).catch(function (err) {
        if (err.status !== 401) throw err;
        return idToken(true).then(function (fresh) { return request(method, url, body, { token: fresh }); });
      });
    });
  }

  /* ---------- Görünümler ---------- */
  function show(view) {
    document.querySelectorAll("[data-view]").forEach(function (v) { v.hidden = v.getAttribute("data-view") !== view; });
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

  /* ---------- Giriş ---------- */
  var loginForm = $("[data-login-form]");
  var loginError = $("[data-login-error]");
  var loginSubmit = $("[data-login-submit]");

  // Kullanıcı adı "admin" ise yapılandırmadaki e-postaya karşılık gelir; e-posta da yazılabilir.
  function emailFor(username) {
    var u = username.trim().toLocaleLowerCase("tr-TR");
    if (u === String(FB.adminUser || "admin").toLocaleLowerCase("tr-TR")) return FB.adminEmail;
    return u.indexOf("@") > 0 ? u : "";
  }

  function authMessage(err) {
    switch (err.code) {
      case "INVALID_LOGIN_CREDENTIALS":
      case "INVALID_PASSWORD":
      case "EMAIL_NOT_FOUND":
      case "INVALID_EMAIL":
        return "Kullanıcı adı ya da şifre hatalı.";
      case "USER_DISABLED":
        return "Bu hesap kapatılmış. Firebase konsolundan hesabı yeniden etkinleştirin.";
      case "TOO_MANY_ATTEMPTS_TRY_LATER":
        return "Çok fazla hatalı deneme yapıldı. Biraz bekleyin ya da \"Şifremi unuttum\" ile şifrenizi sıfırlayın.";
      case "NETWORK":
        return err.message;
      default:
        return "Giriş yapılamadı (" + (err.code || err.status) + ").";
    }
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = emailFor(loginForm.username.value);
    var password = loginForm.password.value;
    if (!loginForm.username.value.trim() || !password) {
      showError(loginError, "Kullanıcı adı ve şifreyi girin.");
      return;
    }
    if (!email) {
      showError(loginError, "Kullanıcı adı ya da şifre hatalı.");
      return;
    }
    showError(loginError, "");
    busy(loginSubmit, true, "Giriş yapılıyor…");
    authCall("signInWithPassword", { email: email, password: password, returnSecureToken: true }).then(function (data) {
      startSession(data, data.email || email);
      saveSession($("[data-remember]").checked);
      loginForm.password.value = "";
      return load();
    }).catch(function (err) {
      showError(loginError, authMessage(err));
    }).then(function () {
      busy(loginSubmit, false);
    });
  });

  $("[data-logout]").addEventListener("click", function () {
    if (pendingCount() && !confirm("Yayınlanmamış değişiklikler silinecek. Çıkış yapılsın mı?")) return;
    clearSession();
    state.items = [];
    updateBar();
    show("login");
    loginForm.username.focus();
  });

  /* ---------- Şifremi unuttum ---------- */
  var forgotForm = $("[data-forgot-form]");
  var forgotSubmit = $("[data-forgot-submit]");

  $("[data-show-forgot]").addEventListener("click", function () {
    $("[data-forgot-text]").textContent = "Yeni şifre belirlemeniz için " + maskEmail(FB.adminEmail || "") +
      " adresine bir bağlantı gönderilecek. E-postadaki bağlantıyı açıp yeni şifrenizi yazın, ardından buradan giriş yapın.";
    showError($("[data-forgot-done]"), "");
    showError($("[data-forgot-error]"), "");
    show("forgot");
    forgotSubmit.focus();
  });
  $("[data-show-login]").addEventListener("click", function () { show("login"); loginForm.username.focus(); });

  forgotForm.addEventListener("submit", function (e) {
    e.preventDefault();
    busy(forgotSubmit, true, "Gönderiliyor…");
    showError($("[data-forgot-error]"), "");
    authCall("sendOobCode", { requestType: "PASSWORD_RESET", email: FB.adminEmail }).then(function () {
      showError($("[data-forgot-done]"), "Bağlantı gönderildi. Birkaç dakika içinde gelmezse gereksiz (spam) klasörüne bakın.");
    }).catch(function (err) {
      var msg = err.code === "TOO_MANY_ATTEMPTS_TRY_LATER" || err.code === "RESET_PASSWORD_EXCEED_LIMIT"
        ? "Kısa sürede çok fazla bağlantı istendi. Biraz bekleyip tekrar deneyin."
        : (err.code === "NETWORK" ? err.message : "Bağlantı gönderilemedi (" + (err.code || err.status) + ").");
      showError($("[data-forgot-error]"), msg);
    }).then(function () {
      busy(forgotSubmit, false);
    });
  });

  /* ---------- Şifreyi değiştir ---------- */
  var pwForm = $("[data-password-form]");
  var pwSubmit = $("[data-password-submit]");
  var pwError = $("[data-password-error]");

  pwForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var a = pwForm.querySelector("#new-password").value;
    var b = pwForm.querySelector("#new-password-2").value;
    if (a.length < 8) { showError(pwError, "Şifre en az 8 karakter olmalı."); return; }
    if (a !== b) { showError(pwError, "İki şifre aynı değil."); return; }
    showError(pwError, "");
    busy(pwSubmit, true, "Değiştiriliyor…");
    idToken().then(function (tok) {
      return authCall("update", { idToken: tok, password: a, returnSecureToken: true });
    }).then(function (data) {
      startSession(data);
      saveSession();
      pwForm.reset();
      pwForm.closest("details").open = false;
      toast("Şifreniz değiştirildi. Bir sonraki girişte yeni şifrenizi kullanın.");
    }).catch(function (err) {
      var msg = err.code === "CREDENTIAL_TOO_OLD_LOGIN_AGAIN"
        ? "Güvenlik nedeniyle şifre değiştirmek için yeni giriş yapılmış olmalı. Çıkış yapıp tekrar giriş yaptıktan sonra deneyin."
        : err.code === "WEAK_PASSWORD" ? "Bu şifre çok zayıf; daha uzun bir şifre seçin."
        : "Şifre değiştirilemedi (" + (err.code || err.status) + ").";
      showError(pwError, msg);
    }).then(function () {
      busy(pwSubmit, false);
    });
  });

  /* ---------- Fiyatları yükle ---------- */
  function readPrices(doc) {
    var fields = (doc && doc.fields && doc.fields.prices && doc.fields.prices.mapValue && doc.fields.prices.mapValue.fields) || {};
    var out = {};
    Object.keys(fields).forEach(function (k) {
      var v = fields[k].integerValue != null ? Number(fields[k].integerValue) : Number(fields[k].doubleValue);
      if (!isNaN(v)) out[k] = v;
    });
    return out;
  }

  // keep: yeniden yüklemede korunacak bekleyen değişiklikler (ürün anahtarı → fiyat)
  function load(keep) {
    show("loading");
    $("[data-loading-text]").textContent = "Menü yükleniyor…";
    return firestore("GET", DOC_URL + "?key=" + encodeURIComponent(FB.apiKey)).catch(function (err) {
      if (err.status === 404) return null;           // henüz hiç kayıt yapılmamış
      throw err;
    }).then(function (doc) {
      state.updateTime = doc ? doc.updateTime : null;
      buildEditor(readPrices(doc), keep || {});
      show("editor");
    }).catch(function (err) {
      if (err.code === "NO_SESSION" || err.status === 400 && /TOKEN|REFRESH/.test(err.code)) {
        clearSession();
        show("login");
        showError(loginError, "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.");
        return;
      }
      var box = $("[data-loading-text]");
      box.textContent = (err.status === 403
        ? "Fiyatlar okunamadı: Firestore kuralları okumaya izin vermiyor."
        : "Fiyatlar yüklenemedi: " + err.message) + " ";
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
      (session && session.email ? " Giriş: " + session.email : "");
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

  function publishBody() {
    var fields = {};
    state.items.forEach(function (it) { fields[it.key] = { integerValue: String(it.value) }; });
    return {
      fields: {
        prices: { mapValue: { fields: fields } },
        updatedAt: { timestampValue: new Date().toISOString() },
        updatedBy: { stringValue: (session && session.email) || "" }
      }
    };
  }

  publishBtn.addEventListener("click", function () {
    var changes = pendingItems();
    if (!changes.length || invalidCount()) return;
    // Başka biri bu arada kaydetmişse üzerine yazmamak için koşullu kayıt.
    var pre = state.updateTime
      ? "currentDocument.updateTime=" + encodeURIComponent(state.updateTime)
      : "currentDocument.exists=false";
    busy(publishBtn, true, "Yayınlanıyor…");
    showError(publishError, "");

    firestore("PATCH", DOC_URL + "?" + pre + "&key=" + encodeURIComponent(FB.apiKey), publishBody()).then(function (doc) {
      state.updateTime = doc.updateTime;
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
      var conflict = err.fsStatus === "FAILED_PRECONDITION" || err.fsStatus === "ALREADY_EXISTS" || err.fsStatus === "ABORTED" || err.status === 409;
      if (conflict) {
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
      } else if (err.status === 403) {
        showError(publishError, "Bu hesabın fiyatları değiştirme yetkisi yok. Firestore kurallarındaki admin kimliğini (UID) kontrol edin. Değişiklikleriniz kaydedilmedi.");
      } else if (err.status === 401 || err.code === "NO_SESSION") {
        showError(publishError, "Oturumunuzun süresi dolmuş. Değişiklikleriniz kaydedilmedi; çıkış yapıp tekrar giriş yapın.");
      } else {
        showError(publishError, "Kaydedilemedi: " + err.message);
      }
    });
  });

  // Yayınlanmamış değişiklik varken sayfadan çıkarken uyar.
  window.addEventListener("beforeunload", function (e) {
    if (pendingCount()) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Başlat ---------- */
  if (!CONFIGURED) {
    show("setup");
  } else {
    session = loadSession();
    if (session && session.refreshToken) load(); else show("login");
  }
})();
