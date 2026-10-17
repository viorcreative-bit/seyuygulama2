# Güçlü İnşaat web sitesi

Güçlü İnşaat için tek sayfalık kurumsal web sitesi. Düz HTML, CSS ve JavaScript ile yazıldı; derleme adımı, sunucu ya da veritabanı gerektirmez.

## Sayfa yapısı

| Bölüm | İçerik |
| --- | --- |
| Açılış | “Önce zemin. Sonra bina.” başlığı ve kesit çizimi. Çizim açılışta temelden çatıya doğru bir kez çizilir. |
| Projeler | Devam eden ve tamamlanan projeler, duruma göre süzme. Devam edenlerde aşama ve tamamlanan kat sayısı gösterilir. |
| Hizmetler | Konut, ticari yapı, kentsel dönüşüm, kat karşılığı |
| Süreç | Zemin etüdünden iskâna beş aşama ve her aşamada teslim edilen belge |
| Arsa sahipleri | Kat karşılığı açıklaması, istenen bilgiler ve verilen teklif |
| Hakkımızda | Firma tanıtımı ve çalışma ilkeleri |
| İletişim | Teklif formu (WhatsApp ya da e-posta ile gönderir), iletişim bilgileri |

`kvkk.html` sayfası, formdaki KVKK onay kutusunun bağlandığı aydınlatma metnidir.

## Dosyalar

```
index.html            Ana sayfa (tüm içerik burada)
kvkk.html             KVKK aydınlatma metni
assets/css/style.css  Stiller
assets/js/main.js     Menü, proje filtresi, cephe çizimleri, teklif formu
assets/img/           Site simgesi ve sosyal medya paylaşım görseli
```

## Bilgisayarda açmak

```sh
python3 -m http.server 8080
```

Ardından tarayıcıda `http://localhost:8080` adresini açın.

## Yayına almadan önce değiştirilecekler

`index.html` içinde değiştirilecek yerler `<!-- DEĞİŞTİR -->` yorumuyla işaretlidir.

- [ ] **Telefon numarası**: üst menü, iletişim bölümü, alt bilgi ve `tel:` bağlantıları
- [ ] **WhatsApp numarası**: iletişim bölümündeki bağlantı ve formdaki `data-whatsapp` (ülke koduyla, boşluksuz: `905321234567`)
- [ ] **E-posta adresi**: iletişim bölümü, alt bilgi ve formdaki `data-eposta`
- [ ] **Adres ve harita bağlantısı**
- [ ] **Çalışma saatleri**
- [ ] **Projeler**: mevcut altı proje örnektir. Gerçek projelerle değiştirin.
- [ ] **Firma tanıtım metni** ve **çalışma ilkeleri** (Hakkımızda)
- [ ] **Metinlerdeki taahhütler**: ör. “sözleşmeyi noterde imzalarız”, “her ay ilerleme raporu paylaşırız”. Firmanın gerçekten uyguladığı şekilde düzeltin.
- [ ] **KVKK metni** (`kvkk.html`): şablondur. Firma bilgileriyle doldurup hukuk danışmanına kontrol ettirin.
- [ ] **Arama motoru bilgileri**: `<head>` içindeki `application/ld+json` bloğu (alan adı, telefon, adres)
- [ ] Logo varsa `.marka` içindeki SVG işaretini ve `assets/img/favicon.svg` dosyasını değiştirin.

## Proje eklemek

`index.html` içinde `<ul class="projeler">` altındaki bir `<li class="proje">` bloğunu kopyalayıp düzenleyin.

- `data-durum`: `devam` ya da `tamam`. Filtre sayıları otomatik hesaplanır.
- Cephe çizimi `.proje-cizim` öğesindeki ayarlardan otomatik üretilir:
  - `data-kat`: kat sayısı
  - `data-aks`: cephedeki pencere sayısı
  - `data-blok`: blok sayısı (varsayılan 1)
  - `data-biten`: devam eden projede tamamlanan kat sayısı (kalan katlar kesikli çizilir)
  - `data-asama="kaba"`: biten katları betonarme iskelet olarak çizer
  - `data-tur="ticari"`: zemin katı vitrin olarak çizer
- **Fotoğraf kullanmak için** `.proje-cizim` içine bir görsel koyun; çizim yapılmaz:

  ```html
  <div class="proje-cizim"><img src="assets/img/projeler/mese-evleri.jpg" alt="Meşe Evleri, ön cephe" loading="lazy"></div>
  ```

## Teklif formu nasıl çalışır

Site sunucu kullanmadığı için form mesajı kendisi göndermez. Ziyaretçi “WhatsApp ile gönder”e bastığında mesaj WhatsApp’ta, “E-posta ile gönder”e bastığında e-posta uygulamasında hazır açılır. Ziyaretçinin yalnızca göndermesi gerekir. “Arsa, kat karşılığı” ya da “Kentsel dönüşüm” seçildiğinde konum, ada/parsel ve arsa alanı alanları açılır.

Mesajların doğrudan e-postaya düşmesi istenirse form, Formspree ya da Netlify Forms gibi bir servise bağlanabilir.

## Yayınlama

Dosyalar herhangi bir statik barındırma hizmetine olduğu gibi yüklenebilir.

**GitHub Pages:** Depo ayarlarında *Settings → Pages → Build and deployment* altında kaynak olarak `main` dalını ve `/ (root)` klasörünü seçin. Kendi alan adınızı aynı sayfadaki *Custom domain* alanından bağlayabilirsiniz.
