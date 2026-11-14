# iPhone Duo — kaydırmalı yakınlaşma bölümü

Ziyaretçi sayfayı aşağı kaydırdıkça fotoğraftaki telefonlara yaklaşan, her durakta bir ayrıntıyı anlatan ve sonunda telefonu açıp teknik özellikleri listeleyen bağımsız bir bölüm. Hiçbir kütüphaneye bağımlı değildir.

## Akış

1. **Genel**: fotoğrafın tamamı ve başlık
2. **Kamera**: 48 MP Dual Fusion kamera platosu
3. **Touch ID**: yan tuş
4. **Gövde**: Ceramic Shield, IP68, ağırlık
5. **Menteşe**: 100'den fazla parça, Grade 5 titanyum
6. **Dış ekran**: 5,4 inç, ProMotion, 3000 nit
7. **Ön kamera**: 12 MP Center Stage, ekran altı FaceTime kamerası
8. **Açılış**: telefon kaydırdıkça açılır; genişlik 84,1 mm'den 164,6 mm'ye, kalınlık 11,3 mm'den 5,2 mm'ye canlı değişir
9. **Teknik özellikler** tablosu

## Dosyalar

| Dosya | Görevi |
| --- | --- |
| `index.html` | Demo sayfa. Bölümün HTML'i `<section class="duo">` içinde |
| `duo.css` | Bölümün stilleri. Tüm sınıflar `duo-` ile başlar |
| `duo.js` | Kaydırma, yakınlaşma ve açılma animasyonu |
| `img/iphone-duo.jpg` | Ana fotoğraf (2000×1333) |
| `img/duo-dis-ekran.webp` | Açılma sahnesindeki dış ekran (fotoğraftan kırpıldı) |
| `img/duo-ic-ekran.jpg` | Açılma sahnesindeki iç ekran duvar kağıdı (fotoğraftan kırpıldı) |

## Kendi sitenize ekleme

1. `duo.css`, `duo.js` ve `img/` klasörünü sitenize kopyalayın.
2. `<head>` içine yazı tiplerini ve stili ekleyin:

   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sofia+Sans:wght@400;500;600;700&family=Sofia+Sans+Extra+Condensed:wght@600;700&display=swap">
   <link rel="stylesheet" href="/yol/duo.css">
   ```

3. `index.html` içindeki `<section class="duo"> … </section>` bloğunun tamamını sayfanızda istediğiniz yere yapıştırın.
4. `</body>` öncesine betiği ekleyin:

   ```html
   <script src="/yol/duo.js" defer></script>
   ```

5. Dosyaları farklı bir klasöre koyduysanız şu yolları güncelleyin:
   - HTML'deki iki `img/iphone-duo.jpg`
   - `duo.css` içindeki `img/duo-ic-ekran.jpg` ve `img/duo-dis-ekran.webp` (CSS dosyasının konumuna göre çözülür)

## Ayarlar

- **Sabit üst menü**: Sitenizde ekranın üstüne yapışan bir menü varsa, yüksekliğini CSS'te verin. Bölüm o kadar aşağıdan başlar:

  ```css
  .duo { --duo-top-offset: 64px; }
  ```

- **Renkler ve yazı tipi**: `duo.css` dosyasının başındaki `--duo-*` değişkenleri. Sitenizin yazı tipini kullanmak isterseniz `--duo-font` ve `--duo-font-tall` değerlerini değiştirin.
- **Metinler**: Tüm metinler HTML'de; doğrudan düzenleyebilirsiniz.
- **Durak ekleme ya da çıkarma**: `.duo-step` öğesi ekleyip silmeniz yeterli; gezinme çubuğu ve kaydırma uzunluğu kendiliğinden ayarlanır. Her durakta:
  - `data-focus="x,y,genişlik,yükseklik"`: kameranın göstereceği alan. Değerler 2000×1333 piksellik fotoğrafa göre; x ve y alanın merkezi.
  - `data-focus-m`: telefon ekranları için aynı alan (isteğe bağlı).
  - `data-side="left"` ya da `"right"`: metnin ekranın hangi yanında duracağı.
  - `data-spot="x0,y0,x1,y1"` ve `data-spot-shape="pill"` ya da `"circle"`: parçanın etrafına çizilen beyaz halka (isteğe bağlı).
  - `data-label`: alttaki gezinme çubuğundaki ad.
- **Daha keskin yakınlaşma**: Fotoğrafın daha yüksek çözünürlüklü bir sürümü varsa (ör. 4000×2666) `img/iphone-duo.jpg` yerine koyun. Koordinatları değiştirmeniz gerekmez.

## Davranış notları

- Masaüstünde metin yanda durur, alt kısımda ayrıntılar arasında geçiş yapılan bir gezinme çubuğu vardır. Telefonda ve dar ekranlarda metin altta durur, üstte ince bir ilerleme çizgisi görünür.
- İşletim sisteminde "hareketi azalt" açıksa kamera geçişleri yumuşak kaydırma yerine kesik yapılır ve nabız animasyonları kapanır.
- JavaScript çalışmazsa bölüm, fotoğraf ve altında sıralanmış metinlerden oluşan düz bir sayfa olarak görünür.
- Tüm metinler ekran okuyuculara açıktır; fotoğrafın alternatif metni HTML'de yer alır.

## Bilgilerin kaynağı

Teknik özellikler Apple'ın iPhone Duo ürün sayfası, teknik özellikler sayfası ve Eylül 2026 basın bülteninden derlendi. Yayına almadan önce özellikle fiyatı ve Türkiye'ye özgü bilgileri [apple.com/tr](https://www.apple.com/tr/) üzerinden kontrol edin.
