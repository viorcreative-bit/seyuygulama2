# Nonna by Big Mamma's Bahçeşehir — web sitesi

Nonna Cafe için tek sayfalık web sitesi ve menü fiyatlarını yönetmek için PHP + MySQL ile çalışan bir panel. Menüdeki tüm ürünler, fiyatlar ve fotoğraflar
Nonna Cafe menü kataloğundan (`menu.pdf`) alınmıştır.

## Bölümler

- **Giriş:** Nonna logosu, Big Mamma's imzası, menü ve rezervasyon butonları
- **Serpme kahvaltı:** kişi başı fiyat (menüdeki Serpme Kahvaltı fiyatından gelir), 10 yaş ve altı çocuklar ücretsiz, kahvaltı saati (her gün 15.00'e kadar), sofradaki 22 çeşit
- **Önce bunları deneyin:** altı imza tabak
- **Mekân:** kısa tanıtım, kahvaltı saatleri, rezervasyon telefonu
- **Maç yayınları:** beIN SPORTS ile Süper Lig ve Avrupa maçları, stadyum arka planlı bant
- **Nargile:** öne çıkan çeşitler ve fiyatlar; sayfa kaydıkça dumanın içinden belirir
- **Menü:** 22 kategori, 209 ürün; kategori çubuğu, arama ("kofte" yazınca "köfte" de bulunur) ve ürün fotoğrafı büyütme
- **Galeri:** mekân ve tabak fotoğrafları
- **Rezervasyon ve iletişim:** telefon, Instagram, harita

## Hostinge yükleme (PHP + MySQL)

Site, fiyat yönetim paneliyle birlikte PHP ve MySQL destekleyen herhangi bir hostingde (cPanel, Plesk, DirectAdmin vb.) çalışır.
Gerekenler: **PHP 7.3 ya da üstü** (PHP 8 önerilir), **PDO MySQL** ve **mbstring** eklentileri, bir **MySQL/MariaDB** veritabanı.

1. **Dosyaları yükleyin.** `index.html`, `admin.html`, `api/` ve `assets/` klasörlerini sitenin kök klasörüne
   (genellikle `public_html`) yükleyin. Hostingin koyduğu varsayılan `index.php` / `default.html` gibi dosyaları silin.
   `api/.htaccess` dosyasının da yüklendiğinden emin olun (gizli dosyalar bazı FTP programlarında görünmez).
2. **Veritabanı oluşturun.** Hosting panelinde **MySQL Veritabanları** bölümünden bir veritabanı ve bir kullanıcı oluşturun,
   kullanıcıyı veritabanına **tüm yetkilerle** (ALL PRIVILEGES) ekleyin.
3. **Kurulumu çalıştırın.** Tarayıcıda `https://alanadiniz/api/install.php` adresini açın; veritabanı bilgilerini,
   admin kullanıcı adını, şifresini ve e-postasını yazıp **Kurulumu tamamla**'ya basın. Sihirbaz tabloları oluşturur ve
   bağlantı bilgilerini `api/config.php` dosyasına kaydeder. Sunucu dosya yazmaya izin vermezse ekranda gösterilen metni
   Dosya Yöneticisi ile `api/config.php` dosyasına yapıştırın.
4. **`api/install.php` dosyasını silin.** (Kurulumdan sonra zaten çalışmaz; yine de sunucuda bırakmayın.)
5. **E-postayı kontrol edin.** Kurulumdaki deneme e-postası gelmediyse "Şifremi unuttum" kodu da gelmez: hostinginizde
   PHP `mail()` gönderiminin açık olduğunu kontrol edin, gönderen adresi alan adınızda açtığınız bir adres yapın
   (ör. `bilgi@alanadiniz.com`, `api/config.php` içindeki `mail_from`).

Panelde şifre gönderildiği için sitenizde SSL (https) açık olmalı; çoğu hostingde ücretsiz Let's Encrypt sertifikası tek tıkla açılır.

`api/config.php` veritabanı şifresini içerir; depoya eklenmez (`.gitignore`) ve `api/.htaccess` ile tarayıcıdan açılamaz.

### Bilgisayarda denemek

```bash
php -S localhost:8000
# http://localhost:8000          site
# http://localhost:8000/api/install.php   kurulum (yerel bir MySQL/MariaDB gerekir)
```

PHP olmadan (ör. `python3 -m http.server` ya da GitHub Pages) site `menu.js`'teki fiyatlarla çalışır; panel açılmaz.

## Fiyat yönetim paneli

Menü fiyatları **https://alanadiniz/admin.html** adresindeki panelden güncellenir
(sitede bu sayfaya bağlantı yoktur, arama motorlarına kapalıdır).

- **Giriş:** kurulumda belirlediğiniz kullanıcı adı (ya da e-posta) ve şifre. "Bu cihazda beni hatırla" seçilirse oturum 30 gün,
  seçilmezse tarayıcı kapanana kadar (en fazla 12 saat) açık kalır.
- **Şifremi unuttum:** admin e-postasına 6 haneli bir kod gider (15 dakika geçerli). Kodu ve yeni şifreyi panele yazınca şifre
  yenilenir, açık bütün oturumlar kapanır.
- **Şifreyi değiştir:** giriş yaptıktan sonra sayfanın altında; mevcut şifre sorulur, diğer cihazlardaki oturumlar kapanır.
- Ürünleri arayıp kategoriye göre süzerek fiyatları değiştirin; değişen ürünler sarı ile işaretlenir.
- **Toplu fiyat güncelleme** bir kategoriye ya da tüm menüye yüzde zam/indirim uygular (1, 5, 10 veya 50 ₺'ye yuvarlar).
- **Gözden geçir ve yayınla** değişiklik listesini gösterir; onaylayınca fiyatlar **hemen** sitede görünür
  (menü, favoriler, kahvaltının kişi başı fiyatı, nargile listesi).
- Fiyatları iki cihazdan aynı anda düzenlerseniz ikinci kayıt önceki kaydın üzerine yazılmaz; panel güncel fiyatları
  yükleyip sizin değişikliklerinizi korur.

### Nasıl çalışır

- `api/prices.php` kayıtlı fiyatları herkese açık olarak döndürür. Site açılırken bunları okur (`assets/js/prices.js`)
  ve `menu.js`'teki fiyatların yerine kullanır; sunucuya ulaşılamazsa son bilinen fiyatlar, o da yoksa `menu.js` fiyatları gösterilir.
- `api/admin.php` giriş, kaydetme ve şifre işlemlerini yapar. Şifreler ve sıfırlama kodları veritabanında şifrelenmiş
  (hash) tutulur; oturum HttpOnly çerezle ve her kayıtta ayrıca CSRF anahtarıyla doğrulanır.
- 15 dakikada 8 hatalı girişten sonra giriş geçici olarak kapanır; saatte en fazla 3 sıfırlama kodu gönderilir,
  bir kod için en fazla 5 deneme yapılabilir.
- Tablolar (`nonna_` önekiyle): `users`, `sessions`, `prices`, `state`, `resets`, `attempts`.

## Fiyat ve ürün güncelleme

Tüm menü `assets/js/menu.js` dosyasındadır. Her ürün şu alanlardan oluşur:

```js
{ n: "Serpme Kahvaltı", tag: "kişi başı", p: 590, img: "serpme-kahvalti", d: "Açıklama…" }
```

- `n` ürün adı, `p` fiyat (₺), `d` açıklama, `tag` küçük not, `img` fotoğraf adı (uzantısız)
- Fiyatları yönetim panelinden değiştirin. `menu.js`'teki `p` değerleri varsayılan fiyatlardır; panelde kayıtlı fiyat varsa sitede o görünür.
- Yeni fotoğraf eklerken: büyük boyutu `assets/img/`, küçük boyutu (en uzun kenar 560 px) `assets/img/sm/`
  klasörüne aynı adla koyun ve boyutlarını `assets/js/images.js` dosyasına ekleyin.

## GitHub Pages

Depodaki dal GitHub Pages'te de yayınlanır (önizleme için). Orada PHP çalışmadığı için site `menu.js` fiyatlarıyla açılır,
fiyat paneli yalnızca kendi hostinginizde çalışır.

## Dosya yapısı

```
index.html
admin.html             Fiyat yönetim paneli
api/
  install.php          Kurulum sihirbazı (kurulumdan sonra silin)
  prices.php           Kayıtlı fiyatlar (herkese açık, site okur)
  admin.php            Panel: giriş, kaydetme, şifre değiştirme, şifremi unuttum
  lib.php              Ortak kod: veritabanı, oturum, deneme sınırı, e-posta
  config.php           Kurulumda oluşur: veritabanı bilgileri (depoda yok)
  .htaccess            config.php ve lib.php'yi tarayıcıya kapatır
assets/
  css/style.css        Tasarım (renkler, yazı tipleri, düzen)
  css/admin.css        Fiyat yönetim paneli tasarımı
  js/menu.js           Menü verisi (ürünler ve varsayılan fiyatlar)
  js/images.js         Fotoğraf boyutları
  js/prices.js         Panelden kaydedilen fiyatları api/prices.php'den okur
  js/main.js           Menü, arama, galeri ve fotoğraf görüntüleyici
  js/nargile.js        Nargile bölümü: fiyat listesi ve duman efekti
  js/admin.js          Fiyat yönetim paneli (admin.html)
  img/                 Katalogdan çıkarılan fotoğraflar (sm/ küçük boyutlar)
  brand/               Nonna ve Big Mamma's logoları (SVG), favicon, beIN SPORTS logosu
```

## Kontrol edilmesi gerekenler

- **Adres ve harita:** Katalogda açık adres yok. Harita "Nonna by Big Mamma's Bahçeşehir" aramasıyla gösteriliyor;
  açık adresi `index.html` içindeki İletişim bölümüne ve harita bağlantısına eklemeniz önerilir.
- **Çalışma saatleri:** Sitede yalnızca kahvaltı saati var (hafta içi ve hafta sonu 15.00'e kadar).
- **"F. Çay":** Katalogdaki "F. Çay" (120 ₺) sitede "Fincan Çay" olarak yazıldı.
- **Serpme Kahvaltı:** Kişi başı 590 ₺ (katalogdaki 2 kişilik 1.180 ₺ yerine kişi başı fiyat yazıldı).
