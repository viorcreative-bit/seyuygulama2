# Lazio Tekstil web sitesi

laziotekstil.com için hazırlanmış e-ticaret sitesi. Kurulum veya derleme gerektirmez: düz HTML, CSS ve JavaScript'ten oluşur, her hostingde çalışır.

## Neler var

| Sayfa | Dosya |
| --- | --- |
| Ana sayfa | `index.html` |
| Mağaza (filtre, arama, sıralama) | `magaza.html` |
| Ürün detayı (renk, beden, beden tablosu) | `urun.html?id=...` |
| Sepet | `sepet.html` |
| Ödeme (adres, fatura, ödeme yöntemi) | `odeme.html` |
| Sipariş onayı | `siparis.html` |
| Toptan ve fason üretim (teklif formu) | `toptan.html` |
| Hakkımızda | `hakkimizda.html` |
| İletişim ve sık sorulan sorular | `iletisim.html` |
| Yasal metinler | `mesafeli-satis-sozlesmesi.html`, `on-bilgilendirme-formu.html`, `iade-ve-degisim.html`, `kvkk-aydinlatma-metni.html` |

Ürün fotoğrafı olmayan ürünlerde, üretimde kullanılan teknik çizimlere benzer görseller otomatik oluşturulur. Bu görseller seçilen renge boyanır ve seçilen bedenin ölçülerini gösterir.

## Bilgisayarda açmak

`index.html` dosyasına çift tıklamanız yeterli. Ya da klasörde bir yerel sunucu başlatın:

```bash
npx http-server -p 8080
# veya
python3 -m http.server 8080
```

## Düzenleme

### 1. Firma bilgileri: `assets/js/config.js`

Telefon, e-posta, adres, WhatsApp numarası, IBAN, kargo ücreti ve ücretsiz kargo sınırı, kapıda ödeme bedeli, toptan koşulları. Köşeli parantez `[ ]` içindeki her değeri doldurun.

### 2. Ürünler: `assets/js/products.js`

Ürünler, fiyatlar, renkler, bedenler ve beden tabloları bu dosyadadır. **Şu anki ürünler ve fiyatlar örnektir**; kendi ürünlerinizle değiştirin.

Yeni ürün eklemek için mevcut bir ürünü kopyalayıp `id` (adres satırında görünür, benzersiz olmalı), ad, fiyat ve diğer alanları değiştirin. İndirimli ürün için `oldPrice` yazın. Tükenen bedenleri `unavailableSizes: ["XXL"]` ile işaretleyin.

### 3. Ürün fotoğrafları

Fotoğrafları `assets/img/urunler/` klasörüne koyup ürüne `images` alanı ekleyin:

```js
images: {
  beyaz: "assets/img/urunler/basic-tisort-beyaz.jpg",
  siyah: "assets/img/urunler/basic-tisort-siyah.jpg",
},
```

Fotoğrafı olan renklerde fotoğraf, olmayanlarda teknik çizim gösterilir. Fotoğraflar 4:5 oranında (ör. 1200×1500 px) olursa kartlarda en iyi görünür.

### 4. Metinler

Ana sayfa, Hakkımızda ve Toptan sayfalarındaki metinler genel taslaktır (ör. "kendi atölyemizde kesip dikiyoruz", minimum sipariş adedi, termin süresi). Firmanıza uyacak şekilde gözden geçirin. Kuruluş yılı, konum ve üretim kapasitesi gibi bilgiler eklemek güven verir.

## Sipariş nasıl ulaşıyor?

Varsayılan olarak müşteri ödeme sayfasında formu doldurup **"Siparişi WhatsApp ile gönder"** düğmesine bastığında, sipariş özeti (ürünler, toplam, adres, ödeme yöntemi) `config.js` içindeki WhatsApp numarasına hazır mesaj olarak açılır. Müşteri göndere bastığında sipariş size ulaşır. Ödeme seçenekleri havale/EFT ve kapıda ödemedir.

Siparişleri kendi sunucunuza ya da bir form servisine almak isterseniz `config.js` içindeki `orderEndpoint` alanına adresi yazın. Sipariş, JSON olarak bu adrese gönderilir ve düğme "Siparişi tamamla" olarak değişir.

### Kredi kartıyla ödeme

Kartla ödeme almak için sanal POS (ör. iyzico, PayTR) ve bu POS ile konuşan küçük bir sunucu tarafı gerekir. Kart bilgileri asla bu statik sitede işlenmemelidir. Sonraki adım için iki seçenek:

1. Bu tasarımı koruyup küçük bir sunucu (Node.js veya PHP) ekleyerek iyzico/PayTR entegrasyonu yapmak.
2. İkas, Ticimax, Shopify gibi hazır bir e-ticaret altyapısına geçip bu tasarımı tema olarak uygulamak (stok, kargo entegrasyonu ve e-fatura da hazır gelir).

## Yayına almadan önce kontrol listesi

- [ ] `config.js`: unvan, adres, telefon, e-posta, MERSİS, vergi dairesi/no, KEP, WhatsApp numarası, banka/IBAN, kargo firması
- [ ] `products.js`: gerçek ürünler, fiyatlar, renkler, beden ölçüleri
- [ ] Yasal metinler: köşeli parantezli alanları doldurun, metinleri bir hukuk danışmanına kontrol ettirin, sayfalardaki sarı "Taslak metin" kutusunu silin
- [ ] KVKK: WhatsApp üzerinden alınan siparişlerin yurt dışı aktarım konusunu (KVKK aydınlatma metninde işaretli paragraf) hukuk danışmanınızla netleştirin
- [ ] Ana sayfa, Hakkımızda ve Toptan metinlerini firmanıza göre düzenleyin
- [ ] `sitemap.xml` içindeki ürün adreslerini ürünlerinizle güncelleyin
- [ ] İsterseniz `config.js` > `company.mapEmbedUrl` alanına Google Haritalar yerleştirme adresini ekleyin

## Yayına alma

Klasördeki tüm dosyaları hostinginizin kök dizinine (genellikle `public_html`) yükleyin. GitHub Pages, Netlify veya Cloudflare Pages gibi ücretsiz statik hosting servisleriyle de doğrudan yayınlanabilir. `404.html` sayfasının çalışması için site alan adının kök dizininde yayınlanmalıdır.

## Klasör yapısı

```
assets/
  css/style.css          Tüm stiller (renkler ve yazı tipi en üstte)
  img/favicon.svg
  js/config.js           Firma, kargo ve ödeme ayarları
  js/products.js         Ürün kataloğu ve beden tabloları
  js/garments.js         Teknik çizim üreticisi
  js/app.js              Sepet, üst menü, alt bilgi, ürün kartı
  js/pages/*.js          Sayfaya özel kodlar
```
