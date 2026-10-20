# Nonna by Big Mamma's Bahçeşehir — web sitesi

Nonna Cafe için tek sayfalık, statik web sitesi. Menüdeki tüm ürünler, fiyatlar ve fotoğraflar
Nonna Cafe menü kataloğundan (`menu.pdf`) alınmıştır.

## Bölümler

- **Giriş:** Nonna logosu, Big Mamma's imzası, menü ve rezervasyon butonları
- **Önce bunları deneyin:** altı imza tabak
- **Mekân:** kısa tanıtım, kahvaltı saatleri, rezervasyon telefonu
- **Menü:** 22 kategori, 209 ürün; kategori çubuğu, arama ("kofte" yazınca "köfte" de bulunur) ve ürün fotoğrafı büyütme
- **Galeri:** mekân ve tabak fotoğrafları
- **Instagram'dan:** hesabın son gönderileri, otomatik güncellenir
- **Rezervasyon ve iletişim:** telefon, Instagram, harita

## Açmak

Kurulum gerekmez. `index.html` dosyasını tarayıcıda açmanız yeterli.
Yerel sunucuyla denemek isterseniz:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Fiyat ve ürün güncelleme

Tüm menü `assets/js/menu.js` dosyasındadır. Her ürün şu alanlardan oluşur:

```js
{ n: "Serpme Kahvaltı", tag: "2 kişilik", p: 1180, img: "serpme-kahvalti", d: "Açıklama…" }
```

- `n` ürün adı, `p` fiyat (₺), `d` açıklama, `tag` küçük not, `img` fotoğraf adı (uzantısız)
- Fiyatı değiştirmek için yalnızca `p` değerini güncelleyin.
- Yeni fotoğraf eklerken: büyük boyutu `assets/img/`, küçük boyutu (en uzun kenar 560 px) `assets/img/sm/`
  klasörüne aynı adla koyun ve boyutlarını `assets/js/images.js` dosyasına ekleyin.

## Yayınlama

Site, `.github/workflows/site.yml` görevi ile GitHub Pages'e yayınlanır:

- `main` dalına her gönderimde (push) site yeniden yayınlanır.
- 3 saatte bir Instagram'daki son gönderiler çekilir, değişiklik varsa site güncellenir.
- Görevi elle başlatmak için: **Actions → Siteyi yayınla → Run workflow**.

Tek seferlik ayar: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Site statik olduğu için Netlify veya başka bir hosting'e de `index.html` ve `assets/` klasörü olduğu gibi yüklenebilir.

## Instagram gönderileri

Sitedeki "Instagram'dan" bölümü @nonna.bahcesehir hesabının son 8 gönderisini gösterir.
Gönderiler Instagram'ın resmi API'sinden alınır; görseller küçültülüp `assets/instagram/` klasörüne kaydedilir.
Erişim anahtarı tanımlanana kadar bölüm sitede görünmez.

### Kurulum (bir kez)

1. **Instagram hesabı profesyonel olmalı:** Instagram → Ayarlar → Hesap türü → İşletme veya İçerik üreticisi.
2. **Meta uygulaması oluşturun:** https://developers.facebook.com/apps → Uygulama oluştur →
   kullanım alanı olarak Instagram içeriğini yönetmeyi seçin (uygulama türü: İşletme).
3. **Erişim anahtarı alın:** Uygulama panelinde **Instagram → API setup with Instagram login** →
   **Generate access tokens** bölümünde hesabı ekleyin (@nonna.bahcesehir ile giriş yapıp izin verin) →
   **Generate token** ile oluşan anahtarı kopyalayın. Sizden istenirse test kullanıcısı davetini Instagram'da
   (Ayarlar → Web siteleri ve uygulamalar) kabul edin.
4. **Anahtarı GitHub'a ekleyin:** Depo → **Settings → Secrets and variables → Actions → New repository secret** →
   Name: `INSTAGRAM_TOKEN`, Secret: kopyaladığınız anahtar.
5. **Actions → Siteyi yayınla → Run workflow** ile ilk eşitlemeyi başlatın.

Meta panelindeki menü adları zamanla değişebilir; adımların özü aynıdır.

### Anahtarın süresi

Instagram anahtarları 60 gün geçerlidir. Görev, anahtarı her gün otomatik olarak yeniler.
Instagram yenilemede farklı bir anahtar verirse bunun GitHub'a geri yazılabilmesi için (isteğe bağlı):

- GitHub → Settings → Developer settings → **Fine-grained tokens** → yalnızca bu depoya erişimli,
  **Secrets: Read and write** izinli bir token oluşturun.
- Bu token'ı `GH_SECRETS_PAT` adıyla depo secret'ı olarak ekleyin.

Anahtarın süresi dolarsa görev hata verir (GitHub e-posta ile bildirir), site eski gönderilerle yayında kalır.
Çözüm: 3. adımdaki gibi yeni anahtar alıp `INSTAGRAM_TOKEN` secret'ını güncellemek.

### Bilinmesi gereken

GitHub, herkese açık depolarda 60 gün boyunca hiç hareket olmazsa zamanlanmış görevleri durdurur.
Yeni Instagram gönderileri depoya kaydedildiği için hesap düzenli paylaşım yaptıkça görev çalışmaya devam eder.
Durdurulursa **Actions** sekmesinden tekrar etkinleştirilebilir.

## Dosya yapısı

```
index.html
assets/
  css/style.css        Tasarım (renkler, yazı tipleri, düzen)
  js/menu.js           Menü verisi (ürünler ve fiyatlar)
  js/images.js         Fotoğraf boyutları
  js/instagram.js      Instagram gönderileri (otomatik oluşturulur)
  js/main.js           Menü, arama, galeri, Instagram ve fotoğraf görüntüleyici
  img/                 Katalogdan çıkarılan fotoğraflar (sm/ küçük boyutlar)
  instagram/           Instagram gönderi görselleri (otomatik)
  brand/               Nonna ve Big Mamma's logoları (SVG), favicon
scripts/instagram_sync.py   Instagram gönderilerini çeken betik
.github/workflows/site.yml  Yayın ve Instagram eşitleme görevi
```

## Kontrol edilmesi gerekenler

- **Adres ve harita:** Katalogda açık adres yok. Harita "Nonna by Big Mamma's Bahçeşehir" aramasıyla gösteriliyor;
  açık adresi `index.html` içindeki İletişim bölümüne ve harita bağlantısına eklemeniz önerilir.
- **Çalışma saatleri:** Katalogda yalnızca kahvaltı saatleri var (hafta içi 12.00'a, hafta sonu 14.00'a kadar).
- **"F. Çay":** Katalogdaki "F. Çay" (120 ₺) sitede "Fincan Çay" olarak yazıldı.
- **Serpme Kahvaltı:** Katalog sayfasında görünen güncel fiyat (1.180 ₺) kullanıldı.
