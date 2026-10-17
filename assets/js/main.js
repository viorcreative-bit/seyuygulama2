// Güçlü İnşaat — site davranışları

(() => {
  "use strict";

  /* Mobil menü */

  const menuDugme = document.querySelector(".menu-dugme");
  const menu = document.getElementById("ana-menu");

  function menuyuKapat() {
    menu.classList.remove("acik");
    menuDugme.setAttribute("aria-expanded", "false");
  }

  if (menuDugme && menu) {
    menuDugme.addEventListener("click", () => {
      const acik = menu.classList.toggle("acik");
      menuDugme.setAttribute("aria-expanded", String(acik));
    });
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) menuyuKapat();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("acik")) {
        menuyuKapat();
        menuDugme.focus();
      }
    });
  }

  /* Proje cephe çizimleri
     .proje-cizim içine fotoğraf (<img>) konursa çizim yapılmaz.
     data-kat: kat sayısı, data-biten: tamamlanan kat (devam eden projeler),
     data-aks: cephedeki pencere aksı, data-blok: blok sayısı,
     data-tur="ticari": zemin katta vitrin, data-asama="kaba": biten katlar iskelet olarak çizilir. */

  const AKS = 36;
  const KAT = 30;
  const KENAR = 14;
  const BLOK_ARA = 24;

  function dikdortgen(x, y, g, y2, sinif) {
    return `<rect class="${sinif}" x="${x}" y="${y}" width="${g}" height="${y2}"/>`;
  }

  function cepheCiz(el) {
    if (el.querySelector("img")) return;

    const kat = Number(el.dataset.kat) || 5;
    const biten = el.dataset.biten ? Number(el.dataset.biten) : kat;
    const aks = Number(el.dataset.aks) || 3;
    const blok = Number(el.dataset.blok) || 1;
    const ticari = el.dataset.tur === "ticari";
    const kaba = el.dataset.asama === "kaba";

    const binaG = aks * AKS;
    const G = KENAR * 2 + blok * binaG + (blok - 1) * BLOK_ARA;
    const Y = 12 + kat * KAT + 14;
    const zemin = Y - 14;
    let s = "";

    for (let b = 0; b < blok; b++) {
      const x0 = KENAR + b * (binaG + BLOK_ARA);

      for (let k = 0; k < kat; k++) {
        const y = zemin - (k + 1) * KAT;

        if (k >= biten) {
          s += dikdortgen(x0, y, binaG, KAT, "c-plan");
        } else if (kaba) {
          s += dikdortgen(x0 - 3, y, binaG + 6, 3.5, "c-iskelet");
          for (let a = 0; a <= aks; a++) {
            s += dikdortgen(x0 + a * AKS - 2, y + 3.5, 4, KAT - 3.5, "c-iskelet");
          }
        } else {
          s += dikdortgen(x0, y, binaG, KAT, "c-kat");
          for (let a = 0; a < aks; a++) {
            const ax = x0 + a * AKS;
            if (k === 0 && ticari) {
              s += dikdortgen(ax + 4, y + 6, AKS - 8, KAT - 6, "c-pencere");
            } else if (k === 0 && a === Math.floor(aks / 2)) {
              s += dikdortgen(ax + 11, y + 8, AKS - 22, KAT - 8, "c-kapi");
            } else {
              s += dikdortgen(ax + 9, y + 7, AKS - 18, 15, "c-pencere");
            }
          }
        }
      }

      if (biten === kat && !kaba) {
        s += dikdortgen(x0 - 2, zemin - kat * KAT - 5, binaG + 4, 5, "c-iskelet");
      }
    }

    s += `<line class="c-zemin" x1="0" y1="${zemin}" x2="${G}" y2="${zemin}"/>`;
    for (let x = 6; x < G; x += 8) {
      s += `<line class="c-toprak" x1="${x}" y1="${zemin + 3}" x2="${x - 6}" y2="${zemin + 11}"/>`;
    }

    el.innerHTML = `<svg viewBox="0 0 ${G} ${Y}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${s}</svg>`;
  }

  document.querySelectorAll(".proje-cizim").forEach(cepheCiz);

  /* Proje filtresi */

  const filtreler = document.querySelectorAll("[data-filtre]");
  const projeler = document.querySelectorAll(".proje");
  const filtreSonuc = document.getElementById("filtre-sonuc");

  function eslesir(proje, filtre) {
    return filtre === "hepsi" || proje.dataset.durum === filtre;
  }

  filtreler.forEach((dugme) => {
    const sayi = [...projeler].filter((p) => eslesir(p, dugme.dataset.filtre)).length;
    const sayiEl = dugme.querySelector(".sayi");
    if (sayiEl) sayiEl.textContent = `(${sayi})`;

    dugme.addEventListener("click", () => {
      const filtre = dugme.dataset.filtre;
      let gorunen = 0;
      filtreler.forEach((d) => d.setAttribute("aria-pressed", String(d === dugme)));
      projeler.forEach((p) => {
        const goster = eslesir(p, filtre);
        p.hidden = !goster;
        if (goster) gorunen++;
      });
      if (filtreSonuc) filtreSonuc.textContent = `${gorunen} proje gösteriliyor.`;
    });
  });

  /* Alt bilgideki yıl */

  const yil = document.getElementById("yil");
  if (yil) yil.textContent = String(new Date().getFullYear());

  /* Teklif formu
     Sunucu gerektirmez: mesajı WhatsApp'ta ya da e-posta uygulamasında hazırlar. */

  const form = document.getElementById("teklif-formu");
  if (!form) return;

  const konu = form.elements.konu;
  const arsaAlanlari = document.getElementById("arsa-alanlari");
  const durum = document.getElementById("form-durum");

  function arsaAlanlariniGuncelle() {
    arsaAlanlari.hidden = !["arsa", "donusum"].includes(konu.value);
  }

  konu.addEventListener("change", arsaAlanlariniGuncelle);

  // "Arsa bilgilerini gönderin" gibi bağlantılar konuyu önceden seçer.
  document.querySelectorAll("a[data-konu]").forEach((a) => {
    a.addEventListener("click", () => {
      konu.value = a.dataset.konu;
      arsaAlanlariniGuncelle();
    });
  });

  const kontroller = [
    { alan: form.elements.ad, gecerli: (el) => el.value.trim().length >= 2 },
    { alan: form.elements.telefon, gecerli: (el) => el.value.replace(/\D/g, "").length >= 10 },
    { alan: konu, gecerli: (el) => el.value !== "" },
    { alan: form.elements.kvkk, gecerli: (el) => el.checked },
  ];

  function hataGoster(alan, goster) {
    const hata = document.getElementById(alan.getAttribute("aria-describedby"));
    if (hata) hata.hidden = !goster;
    if (goster) alan.setAttribute("aria-invalid", "true");
    else alan.removeAttribute("aria-invalid");
  }

  kontroller.forEach(({ alan, gecerli }) => {
    const olay = alan.type === "checkbox" || alan.tagName === "SELECT" ? "change" : "input";
    alan.addEventListener(olay, () => {
      if (alan.hasAttribute("aria-invalid") && gecerli(alan)) hataGoster(alan, false);
    });
  });

  function mesajOlustur() {
    const d = form.elements;
    const satirlar = [
      "Merhaba, web sitenizden yazıyorum.",
      "",
      `Ad soyad: ${d.ad.value.trim()}`,
      `Telefon: ${d.telefon.value.trim()}`,
      `Konu: ${konu.options[konu.selectedIndex].text}`,
    ];
    if (!arsaAlanlari.hidden) {
      if (d.konum.value.trim()) satirlar.push(`Konum: ${d.konum.value.trim()}`);
      if (d.parsel.value.trim()) satirlar.push(`Ada / parsel: ${d.parsel.value.trim()}`);
      if (d.alan.value.trim()) satirlar.push(`Arsa alanı: ${d.alan.value.trim()} m²`);
    }
    if (d.mesaj.value.trim()) satirlar.push("", d.mesaj.value.trim());
    return satirlar.join("\n");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let ilkHatali = null;
    kontroller.forEach(({ alan, gecerli }) => {
      const tamam = gecerli(alan);
      hataGoster(alan, !tamam);
      if (!tamam && !ilkHatali) ilkHatali = alan;
    });
    if (ilkHatali) {
      durum.hidden = true;
      ilkHatali.focus();
      return;
    }

    const mesaj = mesajOlustur();
    const kanal = e.submitter && e.submitter.value === "eposta" ? "eposta" : "whatsapp";

    if (kanal === "whatsapp") {
      const numara = form.dataset.whatsapp;
      window.open(`https://wa.me/${numara}?text=${encodeURIComponent(mesaj)}`, "_blank", "noopener");
      durum.textContent = "Mesajınız WhatsApp’ta hazırlandı. Göndermek için WhatsApp’taki gönder düğmesine dokunun.";
    } else {
      const konuSatiri = `Web sitesi: ${konu.options[konu.selectedIndex].text}`;
      window.location.href = `mailto:${form.dataset.eposta}?subject=${encodeURIComponent(konuSatiri)}&body=${encodeURIComponent(mesaj)}`;
      durum.textContent = "Mesajınız e-posta uygulamanızda hazırlandı. Göndermek için Gönder’e basın.";
    }
    durum.hidden = false;
  });

})();
