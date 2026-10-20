(function () {
  "use strict";

  var MENU = window.NONNA_MENU || [];
  var IMAGES = window.NONNA_IMAGES || {};
  var IMG_DIR = "assets/img/";

  var priceFormat = new Intl.NumberFormat("tr-TR");
  function formatPrice(p) {
    return priceFormat.format(p) + " ₺";
  }

  // Aramada "kofte" yazan "köfte"yi de bulsun.
  var FOLD = { "ç": "c", "ğ": "g", "ı": "i", "i̇": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u", "é": "e" };
  function fold(text) {
    return (text || "")
      .toLocaleLowerCase("tr-TR")
      .replace(/i̇|[çğıöşüâîûé]/g, function (ch) { return FOLD[ch] || ch; });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Küçük ve büyük boyutları srcset ile veren <img>.
  function photo(slug, alt, sizes, eager) {
    var img = document.createElement("img");
    var dims = IMAGES[slug];
    img.src = IMG_DIR + "sm/" + slug + ".jpg";
    if (dims) {
      var smW = Math.round(Math.min(560, Math.max(dims[0], dims[1])) * dims[0] / Math.max(dims[0], dims[1]));
      img.srcset = IMG_DIR + "sm/" + slug + ".jpg " + smW + "w, " + IMG_DIR + slug + ".jpg " + dims[0] + "w";
      img.sizes = sizes || "100vw";
      img.width = dims[0];
      img.height = dims[1];
    }
    img.alt = alt || "";
    if (!eager) img.loading = "lazy";
    img.decoding = "async";
    return img;
  }

  /* ---------- Fotoğraf görüntüleyici ---------- */
  var lightbox = document.querySelector("[data-lightbox]");
  var lbImg = lightbox.querySelector("[data-lightbox-img]");
  var lbTitle = lightbox.querySelector("[data-lightbox-title]");
  var lbPrice = lightbox.querySelector("[data-lightbox-price]");
  var lbDesc = lightbox.querySelector("[data-lightbox-desc]");
  var lastTrigger = null;

  function openLightbox(info, trigger) {
    lastTrigger = trigger || null;
    lbImg.src = IMG_DIR + info.img + ".jpg";
    lbImg.alt = info.alt || info.title || "";
    var dims = IMAGES[info.img];
    if (dims) { lbImg.width = dims[0]; lbImg.height = dims[1]; }
    lbTitle.textContent = info.title || "";
    lbPrice.textContent = info.price != null ? formatPrice(info.price) : "";
    lbDesc.textContent = info.desc || "";
    lbDesc.hidden = !info.desc;
    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }
    document.documentElement.classList.add("is-locked");
  }

  function closeLightbox() {
    if (lightbox.open && typeof lightbox.close === "function") lightbox.close();
    else lightbox.removeAttribute("open");
  }

  lightbox.addEventListener("close", function () {
    document.documentElement.classList.remove("is-locked");
    if (lastTrigger) lastTrigger.focus();
  });
  lightbox.querySelector("[data-lightbox-close]").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) {
    // Fotoğrafın dışına (arka plana) tıklanınca kapanır.
    if (e.target === lightbox) closeLightbox();
  });

  /* ---------- Favoriler ---------- */
  var FAVORITES = [
    { img: "serpme-kahvalti", title: "Serpme Kahvaltı", price: 1180, desc: "İki kişilik: peynir çeşitleri, sahanda sucuk ve yumurta, ızgara hellim, pişi, kaymak, bal ve reçeller." },
    { img: "nonna-calzone-burger", title: "Nonna Calzone Burger", price: 699, desc: "Burger mı pizza mı? İkisi birden: dana burger, sucuk, pastırma, karamelize soğan ve cheddar, hamurun içinde." },
    { img: "dort-peynirli-ravioli", title: "Dört Peynirli Ravioli", price: 549, desc: "Ev yapımı ravioli, dört peynir dolgusu, krema ve domates sos." },
    { img: "mozaik-pizza", title: "Mozaik Pizza", price: 549, desc: "Sucuk, salam, jambon, mantar, zeytin, mısır ve biber bir arada." },
    { img: "kuzu-incik", title: "Kuzu İncik", price: 999, desc: "Fırınlanmış patates püresi yatağında, demiglace sos ile." },
    { img: "karayip-katlari", title: "Karayip Katları", price: 599, desc: "Antep fıstığı kaplamalı vanilyalı dondurma, brownie ve çikolata sos." }
  ];

  function renderFavorites() {
    var grid = document.querySelector("[data-favs]");
    if (!grid) return;
    FAVORITES.forEach(function (fav, i) {
      var fig = el("figure", "fav fav-" + (i + 1));
      var btn = el("button", "fav-photo");
      btn.type = "button";
      btn.setAttribute("aria-label", fav.title + " fotoğrafını büyüt");
      btn.appendChild(photo(fav.img, "", i === 0 ? "(min-width: 900px) 58vw, 100vw" : "(min-width: 900px) 34vw, 100vw"));
      btn.addEventListener("click", function () { openLightbox(fav, btn); });
      var cap = el("figcaption");
      var line = el("div", "fav-line");
      line.appendChild(el("span", "fav-name", fav.title));
      line.appendChild(el("span", "fav-price", formatPrice(fav.price)));
      cap.appendChild(line);
      cap.appendChild(el("p", "fav-desc", fav.desc));
      fig.appendChild(btn);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  }

  /* ---------- Menü ---------- */
  var menuRoot = document.querySelector("[data-menu]");
  var catsTrack = document.querySelector("[data-cats-track]");
  var chipById = {};
  var catSections = [];
  var itemRows = [];

  function renderItem(item, catTitle) {
    var li = el("li", "item" + (item.img ? " has-photo" : ""));
    li.dataset.search = fold([item.n, item.d, item.tag, catTitle].join(" "));

    if (item.img) {
      var thumb = el("button", "item-thumb");
      thumb.type = "button";
      thumb.setAttribute("aria-label", item.n + " fotoğrafını büyüt");
      thumb.appendChild(photo(item.img, "", "84px"));
      thumb.addEventListener("click", function () {
        openLightbox({ img: item.img, title: item.n, price: item.p, desc: item.d }, thumb);
      });
      li.appendChild(thumb);
    }

    var main = el("div", "item-main");
    var line = el("div", "item-line");
    var name = el("span", "item-name", item.n);
    if (item.tag) name.appendChild(el("span", "item-tag", item.tag));
    line.appendChild(name);
    line.appendChild(el("span", "item-leader"));
    line.appendChild(el("span", "item-price", formatPrice(item.p)));
    main.appendChild(line);
    if (item.d) main.appendChild(el("p", "item-desc", item.d));
    li.appendChild(main);
    itemRows.push(li);
    return li;
  }

  function renderMenu() {
    var count = 0;
    MENU.forEach(function (cat) {
      // Kategori çubuğu
      var chip = el("a", "cat-chip", cat.title);
      chip.href = "#" + cat.id;
      catsTrack.appendChild(chip);
      chipById[cat.id] = chip;

      // Kategori bölümü
      var sec = el("section", "cat");
      sec.id = cat.id;
      sec.setAttribute("aria-labelledby", "cat-title-" + cat.id);

      var aside = el("div", "cat-aside");
      var h3 = el("h3", "cat-title", cat.title);
      h3.id = "cat-title-" + cat.id;
      aside.appendChild(h3);

      if (cat.banner && cat.banner.length) {
        var banner = el("div", "cat-banner cat-banner-" + cat.banner.length);
        cat.banner.forEach(function (slug) {
          var b = el("button", "cat-banner-photo");
          b.type = "button";
          var match = null;
          cat.sections.forEach(function (s) { s.items.forEach(function (it) { if (it.img === slug && !match) match = it; }); });
          var label = match ? match.n : cat.title;
          b.setAttribute("aria-label", label + " fotoğrafını büyüt");
          b.appendChild(photo(slug, "", "(min-width: 900px) 30vw, 100vw"));
          b.addEventListener("click", function () {
            openLightbox(match ? { img: slug, title: match.n, price: match.p, desc: match.d } : { img: slug, title: cat.title }, b);
          });
          banner.appendChild(b);
        });
        aside.appendChild(banner);
      }
      if (cat.quote) aside.appendChild(el("blockquote", "cat-quote", "“" + cat.quote + "”"));
      if (cat.note) aside.appendChild(el("p", "cat-note", cat.note));
      sec.appendChild(aside);

      var body = el("div", "cat-body");
      cat.sections.forEach(function (s) {
        var group = el("div", "cat-group");
        if (s.title) group.appendChild(el("h4", "cat-group-title", s.title));
        if (s.note) group.appendChild(el("p", "cat-group-note", s.note));
        var ul = el("ul", "items");
        s.items.forEach(function (item) { ul.appendChild(renderItem(item, cat.title)); count++; });
        group.appendChild(ul);
        body.appendChild(group);
      });
      sec.appendChild(body);
      menuRoot.appendChild(sec);
      catSections.push(sec);
    });

    var summary = document.querySelector("[data-menu-summary]");
    if (summary) summary.textContent = MENU.length + " kategoride " + count + " ürün: kahvaltıdan nargileye tüm menümüz ve güncel fiyatları.";
  }

  /* ---------- Aktif kategori ---------- */
  var activeId = null;
  function setActive(id) {
    if (id === activeId) return;
    if (activeId && chipById[activeId]) chipById[activeId].removeAttribute("aria-current");
    activeId = id;
    var chip = chipById[id];
    if (!chip) return;
    chip.setAttribute("aria-current", "true");
    var track = catsTrack.parentElement;
    var left = chip.offsetLeft - (track.clientWidth - chip.offsetWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function watchCategories() {
    if (!("IntersectionObserver" in window)) return;
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      for (var i = 0; i < catSections.length; i++) {
        var s = catSections[i];
        if (visible[s.id] && !s.hidden) { setActive(s.id); break; }
      }
    }, { rootMargin: "-35% 0px -60% 0px" });
    catSections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Arama ---------- */
  var searchInput = document.querySelector("[data-search]");
  var searchClear = document.querySelector("[data-search-clear]");
  var searchStatus = document.querySelector("[data-search-status]");
  var emptyBox = document.querySelector("[data-empty]");

  function applySearch() {
    var q = fold(searchInput.value.trim());
    var terms = q ? q.split(/\s+/) : [];
    var shown = 0;
    itemRows.forEach(function (li) {
      var hit = terms.every(function (t) { return li.dataset.search.indexOf(t) !== -1; });
      li.hidden = !hit;
      if (hit) shown++;
    });
    document.querySelectorAll(".cat-group").forEach(function (g) {
      g.hidden = !g.querySelector(".item:not([hidden])");
    });
    catSections.forEach(function (s) {
      var any = !!s.querySelector(".item:not([hidden])");
      s.hidden = !any;
      if (chipById[s.id]) chipById[s.id].hidden = !any;
    });
    menuRoot.classList.toggle("is-searching", terms.length > 0);
    searchClear.hidden = terms.length === 0;
    emptyBox.hidden = !(terms.length && shown === 0);
    searchStatus.textContent = terms.length ? (shown ? shown + " ürün bulundu." : "") : "";
  }

  function resetSearch() {
    searchInput.value = "";
    applySearch();
    searchInput.focus();
  }

  /* ---------- Galeri ---------- */
  // shape: "tall" iki satır, "wide" iki sütun kaplar.
  var GALLERY = [
    { img: "kusbasili-kasarli-pide", shape: "tall", title: "Kuşbaşılı Kaşarlı Pide", alt: "Ahşap tahtada kuşbaşılı kaşarlı pide ve bir bardak ayran" },
    { img: "karides-guvec", shape: "wide", title: "Karides Güveç", alt: "Toprak güveçte tereyağında karides" },
    { img: "turk-kahvesi", title: "Türk Kahvesi", alt: "Gümüş tepside Türk kahvesi, su ve lokum" },
    { img: "nargile", shape: "tall", title: "Nargile", alt: "Loş ışıkta ahşap masada nargile" },
    { img: "kis-cayi", title: "Kış Çayı", alt: "Mermer masada fincanda kış çayı" },
    { img: "dedikodu-sepeti", title: "Dedikodu Sepeti", alt: "Tel sepette sosis, sigara böreği ve mozzarella çubukları" },
    { img: "oreo-milkshake", shape: "tall", title: "Milkshake Çeşitleri", alt: "Kremalı ve çikolata soslu Oreo milkshake" },
    { img: "lubnan-kebabi", shape: "wide", title: "Lübnan Kebabı", alt: "Tortillaya sarılmış köfte dilimleri, yoğurt ve acı sos ile" },
    { img: "combo-fajita", shape: "wide", title: "Combo Fajita", alt: "Döküm tavada tavuk ve bonfile dilimleri, üç sos ile" },
    { img: "beyaz-peynirli-gozleme", shape: "tall", title: "Beyaz Peynirli Gözleme", alt: "Yeşillik ve zeytinle servis edilmiş beyaz peynirli gözleme" },
    { img: "san-sebastian", title: "San Sebastian", alt: "Çikolata sosla kaplanmış San Sebastian dilimi" },
    { img: "mekan-nonna-neon", shape: "wide", pos: "50% 22%", title: "Nonna", alt: "Mavi NONNA neon tabelası" }
  ];

  function priceFor(title) {
    var found = null;
    MENU.forEach(function (c) { c.sections.forEach(function (s) { s.items.forEach(function (it) { if (!found && it.n === title) found = it; }); }); });
    return found;
  }

  function renderGallery() {
    var grid = document.querySelector("[data-gallery]");
    if (!grid) return;
    GALLERY.forEach(function (g) {
      var btn = el("button", "gallery-item" + (g.shape ? " is-" + g.shape : ""));
      btn.type = "button";
      btn.setAttribute("aria-label", g.title + " fotoğrafını büyüt");
      var img = photo(g.img, g.alt, g.shape === "wide" ? "(min-width: 900px) 50vw, 100vw" : "(min-width: 900px) 25vw, 50vw");
      if (g.pos) img.style.objectPosition = g.pos;
      btn.appendChild(img);
      var item = priceFor(g.title);
      btn.addEventListener("click", function () {
        openLightbox({ img: g.img, title: g.title, alt: g.alt, price: item ? item.p : null, desc: item ? item.d : "" }, btn);
      });
      grid.appendChild(btn);
    });
  }

  /* ---------- Üst bar ve mobil menü ---------- */
  var header = document.querySelector("[data-header]");
  var navToggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }

  function setNav(open) {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.querySelector(".visually-hidden").textContent = open ? "Gezinme menüsünü kapat" : "Gezinme menüsünü aç";
    header.classList.toggle("nav-open", open);
    document.documentElement.classList.toggle("is-locked", open);
  }

  navToggle.addEventListener("click", function () {
    setNav(navToggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setNav(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && header.classList.contains("nav-open")) {
      setNav(false);
      navToggle.focus();
    }
  });

  /* ---------- Başlat ---------- */
  renderFavorites();
  renderMenu();
  renderGallery();
  watchCategories();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  searchInput.addEventListener("input", applySearch);
  searchClear.addEventListener("click", resetSearch);
  document.querySelector("[data-search-reset]").addEventListener("click", resetSearch);
  document.querySelector("[data-search-form]").addEventListener("submit", function (e) { e.preventDefault(); });

  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
