# iPhone 18 Pro Max — kaydırmalı yakınlaşma bölümü

Ziyaretçi sayfayı aşağı kaydırdıkça fotoğraftaki iPhone 18 Pro Max'e yaklaşan ve her durakta bir ayrıntıyı anlatan bölüm. iPhone Duo bölümüyle aynı animasyon motorunu (`duo.css`, `duo.js`) kullanır.

## Akış

1. **Genel**: fotoğrafın tamamı ve başlık
2. **Kamera**: üç adet 48 MP kameranın bulunduğu plato
3. **Ana kamera**: ƒ/1.48 ile ƒ/4 arasında değişen diyafram
4. **Telefoto**: 4x telefoto, 8x optik kalitede yakınlaştırma
5. **LiDAR**: flaş, mikrofon ve LiDAR Tarayıcı
6. **Gövde**: tek parça alüminyum gövde, Eylem düğmesi ve ses tuşları
7. **Arka cam**: Ceramic Shield arka cam, MagSafe ile 25 W şarj
8. **Ekran ve çip**: 6,9 inç ekran ve A20 Pro

## Fotoğraf

Fotoğraf bu klasörde (`img/iphone-18-pro-max.jpg`, 2000×1501). Odak noktaları bu fotoğrafa göre yazıldı; aynı fotoğrafın farklı çözünürlükteki bir sürümü de olur.

Fotoğraf bulunamazsa sayfa bir **fotoğraf seçici** gösterir: ziyaretçi fotoğrafı seçer ya da sürükler, animasyon hemen başlar. Fotoğraf hiçbir yere yüklenmez.

Başka bir fotoğraf kullanırsanız `index.html` içindeki `data-focus` ve `data-spot` değerlerini o fotoğrafa göre güncelleyin.

## Kendi sitenize ekleme

iPhone Duo bölümüyle aynı adımlar (bkz. `../iphone-duo/README.md`):

1. `duo.css`, `duo.js` ve `img/` klasörünü sitenize kopyalayın.
2. `<head>` içine yazı tiplerini ve `duo.css` dosyasını ekleyin.
3. `index.html` içindeki `<section class="duo duo--promax"> … </section>` bloğunu sayfanıza yapıştırın.
4. `</body>` öncesine `duo.js` dosyasını ekleyin.

`duo.css` ve `duo.js` iki klasörde de aynı dosyadır. İki bölümü aynı sayfada kullanacaksanız bu dosyaları bir kez eklemeniz yeterli.

## Bilgilerin kaynağı

Apple'ın iPhone 18 Pro ve 18 Pro Max teknik özellikler sayfası, destek sayfası ve Eylül 2026 basın bülteni. Ölçüler ve pil süreleri bölgesel Apple sayfalarında küçük farklarla geçiyor; yayına almadan önce [apple.com/tr](https://www.apple.com/tr/) üzerinden kontrol edin.
