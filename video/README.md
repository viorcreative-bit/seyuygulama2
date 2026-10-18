# Güçlü Group — Tanıtım Videosu

Kurumsal kataloğun içeriğinden üretilen yaklaşık 2 dakika 42 saniyelik, müzikli tanıtım filmi.
Tüm görseller, logo, rakamlar, metinler ve projeler kataloğun kendisinden alındı. Video kodla
üretiliyor: Chromium'da bir canvas animasyonu kare kare çekiliyor, ffmpeg ile MP4'e çevriliyor.
Fon müziği `muzik.py` ile sahne geçişlerine denk gelecek şekilde sentezleniyor, telif sorunu yok.

| Dosya | Format | Kullanım |
| --- | --- | --- |
| `out/guclu-group-tanitim-16x9.mp4` | 1920×1080 | YouTube, web sitesi, sunum, fuar ekranı |
| `out/guclu-group-tanitim-9x16.mp4` | 1080×1920 | Instagram Reels, TikTok, YouTube Shorts |

## Akış

| Bölüm | İçerik |
| --- | --- |
| Açılış | "Yapıları kadar sağlam temeller üzerinde yükseliyoruz." → Güçlü Group logosu, 1991'den beri, 6 ülke |
| Rakamlarla Güçlü Group | 1991 · 6 ülke · 100+ proje · 2000+ çalışan · 35 yıl (sayaçlar) |
| Hakkımızda | Kuruluş hikâyesi, faaliyet alanları, 35. yıl amblemi |
| Faaliyet haritası | 6 ülke haritada, İstanbul'dan diğer ülkelere uzanan hatlar; 6 grup şirketi |
| Başkanın mesajı | Hüseyin Çelik'in fotoğrafı ve mesajından alıntı |
| Marka değerimiz | Dünya markaları, yatırım değeri, güven, zamanında teslim, lokasyon |
| Kalite · Çevre · İş güvenliği | Katalogdaki ilgili görsellerle üç kısa ara sahne |
| Projelerimiz | 5 bölüm, 25 proje: Konut ve Rezidans (7), Altyapı (7), Karayolu ve Çevre Düzenleme (4), Restorasyon (6), AVM (1). Her projede konum, bitiş yılı, katalogdaki tüm fotoğrafları, varsa işveren logosu ve proje notu |
| Yönetim kurulu | 6 isim ve unvan |
| Kapanış | Logo, web adresi, İstanbul ofis adresi, ofisler |

## İçeriği değiştirmek

Bütün metinler, sahne sırası ve süreler `config.json` içinde. Sahneler listede yazıldığı sırayla
oynatılır; bir sahneyi silmek, yerini değiştirmek veya yeni proje eklemek için listeyi düzenlemek
yeterli. Süreler vuruş cinsindendir (`"vurus": 4` = 2,4 sn, 100 bpm); toplam süre ve müzik buna göre
kendiliğinden hesaplanır.

- Proje eklerken: `ad`, `konum`, `yil`, `gorseller` (ilki ana görsel, diğerleri küçük kareler);
  isteğe bağlı `not`, `isveren` (logo dosyaları), `logo`, `vurus`.
- Görseller `gorseller/` klasöründen okunur.
- Renkler `renkler` altında; marka mavisi kataloğun rengidir (`#2A3C90`).

## Yeniden üretmek

Gerekenler: Node.js 18+, ffmpeg, Python 3 + numpy.

```bash
cd video
npm install
npx playwright install chromium   # ilk kurulumda bir kez

npm run render          # 16:9  -> out/guclu-group-tanitim-16x9.mp4
npm run render:dikey    # 9:16  -> out/guclu-group-tanitim-9x16.mp4
```

Ek seçenekler:

```bash
node render.mjs --kare 3,8,14          # belirli saniyelerin PNG görüntüsü (out/kareler/), hızlı önizleme için
node render.mjs --format 16x9 --sessiz # müziksiz
node render.mjs --config diger.json    # başka bir ayar dosyasıyla
```

Katalog güncellenirse görseller yeniden çıkarılabilir (poppler-utils ve Pillow gerekir):

```bash
python3 araclar/katalogdan_gorseller.py Guclu_Group_Katalog.pdf
```

## Dosyalar

- `sahne.js`: animasyon motoru; zaman çizelgesini config'den kurar, `cizKare(saniye)` o anı çizer
- `sahne.html`: canvas'ı ve Archivo yazı tipini (katalogdaki geniş başlık yazısı) yükleyen sayfa
- `render.mjs`: klasörü yerelde sunar, Playwright ile kareleri alıp ffmpeg'e aktarır, müziği üretir
- `muzik.py`: zaman çizelgesine göre fon müziği (`out/muzik.wav`)
- `araclar/katalogdan_gorseller.py`: katalog PDF'inden görselleri, logoları ve haritayı çıkarır
- `gorseller/`: katalogdan çıkarılmış görseller
- `config.json`: içerik ve ayarlar
