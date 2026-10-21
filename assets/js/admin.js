/*
 * Nonna fiyat yönetimi (admin.html)
 *
 * Menüdeki fiyatları düzenler ve GitHub'daki assets/js/menu.js dosyasına kaydeder.
 * Sunucu yoktur: tarayıcı GitHub API'ye, kullanıcının oluşturduğu erişim anahtarıyla bağlanır.
 * Dosyada yalnızca "p: 123" fiyat değerleri değiştirilir; ürün adları, açıklamalar ve
 * yorumlar olduğu gibi kalır. Kayıttan sonra GitHub Pages siteyi 1–2 dakikada yeniden yayınlar.
 */
(function () {
  "use strict";

  // Site hangi daldan yayınlanıyorsa (GitHub → Settings → Pages) burada o dal yazmalı.
  var CONFIG = {
    owner: "viorcreative-bit",
    repo: "seyuygulama2",
    branch: "claude/nice-planck-y0l93b",
    path: "assets/js/menu.js"
  };
  var API = "https://api.github.com";
  var TOKEN_KEY = "nonna-admin-token";
  var PRICE_RE = /\bp:\s*(\d+)/g;
  var MAX_PRICE = 1000000;

  var state = {
    token: "",
    sha: "",
    text: "",
    menu: [],
    items: []      // { key, catId, catTitle, group, name, tag, original, value, row, input, old, search }
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

  /* ---------- Anahtar saklama ---------- */
  function storedToken() {
    try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function storeToken(token, remember) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch (e) { /* tarayıcı depolamaya izin vermiyorsa yalnızca bu oturumda çalışır */ }
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  /* ---------- GitHub API ---------- */
  function api(method, url, body) {
    var headers = {
      "Authorization": "Bearer " + state.token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (body) headers["Content-Type"] = "application/json";
    return fetch(API + url, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
        if (!res.ok) {
          var err = new Error((data && data.message) || ("HTTP " + res.status));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    }, function () {
      var err = new Error("GitHub'a bağlanılamadı. İnternet bağlantınızı kontrol edin.");
      err.status = 0;
      throw err;
    });
  }

  function repoUrl() { return "/repos/" + CONFIG.owner + "/" + CONFIG.repo; }
  function fileUrl() { return repoUrl() + "/contents/" + CONFIG.path.split("/").map(encodeURIComponent).join("/"); }

  function decodeBase64(b64) {
    var bin = atob(b64.replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  function encodeBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  /* ---------- Menü dosyası ---------- */
  function parseMenu(text) {
    var sandbox = {};
    new Function("window", text)(sandbox);
    if (!Array.isArray(sandbox.NONNA_MENU)) throw new Error("Menü dosyası okunamadı.");
    return sandbox.NONNA_MENU;
  }

  function flatten(menu) {
    var list = [];
    menu.forEach(function (cat) {
      cat.sections.forEach(function (sec) {
        sec.items.forEach(function (it) {
          list.push({ catId: cat.id, catTitle: cat.title, group: sec.title || "", name: it.n, tag: it.tag || "", price: it.p });
        });
      });
    });
    return list;
  }

  // Dosyadaki "p: 123" değerlerinin sırası menüdeki ürün sırasıyla birebir eşleşmeli.
  function priceMatches(text) {
    var out = [], m;
    PRICE_RE.lastIndex = 0;
    while ((m = PRICE_RE.exec(text))) out.push(+m[1]);
    return out;
  }

  function checkStructure(text, flat) {
    var found = priceMatches(text);
    if (found.length !== flat.length) return false;
    for (var i = 0; i < flat.length; i++) if (found[i] !== flat[i].price) return false;
    return true;
  }

  function buildText() {
    var k = 0;
    return state.text.replace(PRICE_RE, function (match, num) {
      var item = state.items[k++];
      return item && item.value !== item.original ? match.replace(num, String(item.value)) : match;
    });
  }

  /* ---------- Görünümler ---------- */
  function show(view) {
    document.querySelectorAll("[data-view]").forEach(function (v) { v.hidden = v.getAttribute("data-view") !== view; });
    $("[data-session]").hidden = view === "login";
  }

  var toastTimer = 0;
  function toast(message, link) {
    var box = $("[data-toast]");
    box.textContent = message;
    if (link) {
      box.appendChild(document.createTextNode(" "));
      var a = el("a", "", link.text);
      a.href = link.href;
      a.target = "_blank";
      a.rel = "noopener";
      box.appendChild(a);
    }
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.hidden = true; }, 9000);
  }

  function showError(node, message) {
    node.textContent = message;
    node.hidden = !message;
  }

  /* ---------- Giriş ---------- */
  var loginForm = $("[data-login-form]");
  var loginError = $("[data-login-error]");
  var loginSubmit = $("[data-login-submit]");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var token = loginForm.token.value.trim();
    if (!token) {
      showError(loginError, "Erişim anahtarını yapıştırın.");
      loginForm.token.focus();
      return;
    }
    state.token = token;
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Kontrol ediliyor…";
    showError(loginError, "");
    api("GET", repoUrl()).then(function (repo) {
      if (repo && repo.permissions && !repo.permissions.push) {
        throw Object.assign(new Error("Bu hesabın depoya yazma izni yok."), { status: 403 });
      }
      storeToken(token, $("[data-remember]").checked);
      loginForm.reset();
      return load();
    }).catch(function (err) {
      state.token = "";
      show("login");
      showError(loginError, loginMessage(err));
    }).then(function () {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Giriş yap";
    });
  });

  function loginMessage(err) {
    if (err.status === 401) return "Anahtar geçersiz ya da süresi dolmuş. Yeni bir anahtar oluşturup tekrar deneyin.";
    if (err.status === 403) return "Bu anahtarın seyuygulama2 deposuna yazma izni yok. Anahtarı oluştururken Contents için \"Read and write\" seçin.";
    if (err.status === 404) return "Depo bulunamadı. Anahtarı oluştururken \"Only select repositories\" altında seyuygulama2 deposunu seçtiğinizden emin olun.";
    return err.message;
  }

  $("[data-logout]").addEventListener("click", function () {
    if (pendingCount() && !confirm("Yayınlanmamış değişiklikler silinecek. Çıkış yapılsın mı?")) return;
    clearToken();
    state.token = "";
    state.items = [];
    updateBar();
    show("login");
    loginForm.token.focus();
  });

  /* ---------- Menüyü yükle ---------- */
  // keep: yeniden yüklemede korunacak bekleyen değişiklikler (ürün anahtarı → fiyat)
  function load(keep) {
    show("loading");
    $("[data-loading-text]").textContent = "Menü yükleniyor…";
    return api("GET", fileUrl() + "?ref=" + encodeURIComponent(CONFIG.branch)).then(function (file) {
      var text = decodeBase64(file.content);
      var menu = parseMenu(text);
      var flat = flatten(menu);
      if (!checkStructure(text, flat)) {
        throw new Error("Menü dosyasının yapısı beklenenden farklı olduğu için fiyatlar güvenle değiştirilemiyor. Dosya elle düzenlendiyse her ürünün tek bir \"p:\" fiyatı olduğundan emin olun.");
      }
      state.sha = file.sha;
      state.text = text;
      state.menu = menu;
      buildEditor(flat, keep || {});
      show("editor");
    }).catch(function (err) {
      if (err.status === 401 || err.status === 403) {
        clearToken();
        state.token = "";
        show("login");
        showError(loginError, loginMessage(err));
        return;
      }
      if (err.status === 404) err.message = "Menü dosyası bulunamadı (" + CONFIG.path + ", dal: " + CONFIG.branch + ").";
      show("loading");
      var box = $("[data-loading-text]");
      box.textContent = err.message + " ";
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

  function itemKey(it) { return it.catId + "/" + it.name; }

  function buildEditor(flat, keep) {
    list.textContent = "";
    state.items = [];
    [catFilter, bulkScope].forEach(function (sel) {
      while (sel.options.length > 1) sel.remove(1);
    });

    var currentCat = null, catBody = null, currentGroup = null;
    flat.forEach(function (f, idx) {
      if (f.catId !== currentCat) {
        currentCat = f.catId;
        currentGroup = null;
        var sec = el("section", "adm-cat");
        sec.setAttribute("data-cat", f.catId);
        sec.appendChild(el("h2", "adm-cat-title", f.catTitle));
        catBody = el("div", "adm-cat-body");
        sec.appendChild(catBody);
        list.appendChild(sec);
        [catFilter, bulkScope].forEach(function (sel) { sel.add(new Option(f.catTitle, f.catId)); });
      }
      if (f.group && f.group !== currentGroup) {
        currentGroup = f.group;
        catBody.appendChild(el("h3", "adm-group", f.group));
      }

      var item = {
        key: itemKey(f),
        catId: f.catId,
        catTitle: f.catTitle,
        name: f.name,
        tag: f.tag,
        original: f.price,
        value: f.price,
        search: fold([f.name, f.tag, f.group, f.catTitle].join(" "))
      };
      if (Object.prototype.hasOwnProperty.call(keep, item.key)) item.value = keep[item.key];

      var row = el("div", "adm-row");
      var id = "price-" + idx;
      var label = el("label", "adm-name", f.name);
      label.htmlFor = id;
      if (f.tag) label.appendChild(el("span", "adm-tag", f.tag));
      var old = el("span", "adm-old", formatPrice(f.price));
      old.setAttribute("aria-label", "Eski fiyat " + formatPrice(f.price));
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
      catBody.appendChild(row);

      item.row = row;
      item.input = input;
      input.addEventListener("input", function () { onPriceInput(item); });
      state.items.push(item);
      paintRow(item);
    });

    $("[data-summary]").textContent = state.items.length + " ürün, " + state.menu.length + " kategori. Fiyatı değiştirdiğiniz ürünler işaretlenir; hepsini en son tek seferde yayınlarsınız.";
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
      var base = isNaN(it.value) ? it.original : it.value;
      var next = Math.max(step, Math.round(base * (1 + pct / 100) / step) * step);
      setValue(it, next);
      count++;
    });
    updateBar();
    var where = scope ? bulkScope.options[bulkScope.selectedIndex].text : "tüm menü";
    toast(where.charAt(0).toLocaleUpperCase("tr-TR") + where.slice(1) + ": " + count + " ürünün fiyatı %" + String(pct).replace(".", ",") + " değişti. Yayınlamadan önce listeyi kontrol edin.");
  });

  /* Geri al */
  $("[data-discard]").addEventListener("click", function () {
    var n = pendingCount() + invalidCount();
    if (!n) return;
    if (!confirm(n + " değişiklik geri alınsın mı?")) return;
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
    $("[data-review-summary]").textContent = changes.length + " ürünün fiyatı güncellenecek. Yayınladıktan 1–2 dakika sonra sitede görünür.";
    showError(publishError, "");
    publishBtn.disabled = false;
    publishBtn.textContent = "Yayınla";
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  });

  function commitMessage(changes) {
    var parts = changes.slice(0, 6).map(function (it) { return it.name + " " + it.original + "→" + it.value; });
    var title = changes.length === 1
      ? "Fiyat güncellemesi: " + parts[0]
      : "Fiyat güncellemesi: " + changes.length + " ürün";
    var body = changes.map(function (it) { return "- " + it.catTitle + " / " + it.name + ": " + it.original + " → " + it.value + " ₺"; }).join("\n");
    return title + "\n\nYönetim panelinden güncellendi.\n\n" + body;
  }

  publishBtn.addEventListener("click", function () {
    var changes = pendingItems();
    if (!changes.length || invalidCount()) return;
    var newText = buildText();

    // Kaydetmeden önce: yeni dosya okunabiliyor ve her fiyat istenen değerde mi?
    try {
      var check = flatten(parseMenu(newText));
      var ok = check.length === state.items.length && check.every(function (f, i) { return f.price === state.items[i].value; });
      if (!ok || !checkStructure(newText, check)) throw new Error();
    } catch (e) {
      showError(publishError, "Değişiklikler dosyaya güvenle yazılamadı; hiçbir şey kaydedilmedi. Sayfayı yenileyip tekrar deneyin.");
      return;
    }

    publishBtn.disabled = true;
    publishBtn.textContent = "Yayınlanıyor…";
    showError(publishError, "");

    api("PUT", fileUrl(), {
      message: commitMessage(changes),
      content: encodeBase64(newText),
      sha: state.sha,
      branch: CONFIG.branch
    }).then(function (res) {
      state.sha = res.content.sha;
      state.text = newText;
      state.items.forEach(function (it) { it.original = it.value; paintRow(it); });
      state.items.forEach(function (it) {
        var old = it.row.querySelector(".adm-old");
        old.textContent = formatPrice(it.original);
        old.setAttribute("aria-label", "Eski fiyat " + formatPrice(it.original));
      });
      updateBar();
      dialog.close();
      toast(changes.length + " fiyat kaydedildi. Site 1–2 dakika içinde güncellenir.",
        res.commit && res.commit.html_url ? { text: "Kaydı GitHub'da gör", href: res.commit.html_url } : null);
    }).catch(function (err) {
      publishBtn.disabled = false;
      publishBtn.textContent = "Yayınla";
      if (err.status === 409 || err.status === 422) {
        showError(publishError, "Menü dosyası siz düzenlerken başka bir yerden değiştirilmiş. \"Güncel menüyü yükle\" ile en son hali alın; yaptığınız değişiklikler korunur.");
        var reload = el("button", "adm-link", "Güncel menüyü yükle");
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
        showError(publishError, "Erişim anahtarının süresi dolmuş ya da geçersiz. Değişiklikleriniz kaydedilmedi; yeni anahtarla tekrar giriş yapın.");
      } else if (err.status === 403 || err.status === 404) {
        showError(publishError, "Bu anahtarın menü dosyasını değiştirme izni yok (Contents: Read and write gerekli). Değişiklikleriniz kaydedilmedi.");
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
  state.token = storedToken();
  if (state.token) {
    load();
  } else {
    show("login");
  }
})();
