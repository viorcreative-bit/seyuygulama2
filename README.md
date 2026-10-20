# Nonna by Big Mamma's Bahçeşehir — web sitesi

Nonna Cafe için tek sayfalık, statik web sitesi. Menüdeki tüm ürünler, fiyatlar ve fotoğraflar
Nonna Cafe menü kataloğundan (`menu.pdf`) alınmıştır.

## Bölümler

- **Giriş:** Nonna logosu, Big Mamma's imzası, menü ve rezervasyon butonları
- **Serpme kahvaltı:** kişi başı fiyat (menüdeki 2 kişilik fiyatın yarısı, otomatik hesaplanır), kahvaltı saatleri, sofradaki 22 çeşit
- **Önce bunları deneyin:** altı imza tabak
- **Mekân:** kısa tanıtım, kahvaltı saatleri, rezervasyon telefonu
- **Maç yayınları:** beIN SPORTS ile Süper Lig ve Avrupa maçları, stadyum arka planlı bant
- **Nargile:** öne çıkan çeşitler ve fiyatlar; sayfa kaydıkça dumanın içinden belirir
- **Menü:** 22 kategori, 209 ürün; kategori çubuğu, arama ("kofte" yazınca "köfte" de bulunur) ve ürün fotoğrafı büyütme
- **Galeri:** mekân ve tabak fotoğrafları
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

Site tamamen statiktir; GitHub Pages, Netlify veya herhangi bir hosting'e dosyalar olduğu gibi yüklenebilir.
GitHub Pages için: depo ayarlarında **Pages → Branch** olarak bu dalı ve kök klasörü (`/`) seçin.

## Dosya yapısı

```
index.html
assets/
  css/style.css        Tasarım (renkler, yazı tipleri, düzen)
  js/menu.js           Menü verisi (ürünler ve fiyatlar)
  js/images.js         Fotoğraf boyutları
  js/main.js           Menü, arama, galeri ve fotoğraf görüntüleyici
  js/nargile.js        Nargile bölümü: fiyat listesi ve duman efekti
  img/                 Katalogdan çıkarılan fotoğraflar (sm/ küçük boyutlar)
  brand/               Nonna ve Big Mamma's logoları (SVG), favicon
```

## Kontrol edilmesi gerekenler

- **Adres ve harita:** Katalogda açık adres yok. Harita "Nonna by Big Mamma's Bahçeşehir" aramasıyla gösteriliyor;
  açık adresi `index.html` içindeki İletişim bölümüne ve harita bağlantısına eklemeniz önerilir.
- **Çalışma saatleri:** Katalogda yalnızca kahvaltı saatleri var (hafta içi 12.00'a, hafta sonu 14.00'a kadar).
- **"F. Çay":** Katalogdaki "F. Çay" (120 ₺) sitede "Fincan Çay" olarak yazıldı.
- **Serpme Kahvaltı:** Katalog sayfasında görünen güncel fiyat (1.180 ₺) kullanıldı.
