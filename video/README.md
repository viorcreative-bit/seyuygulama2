# Güçlü İnşaat — Tanıtım Videosu

30 saniyelik, müzikli tanıtım videosu. Bütün görüntü kodla çiziliyor: Chromium'da bir canvas
animasyonu kare kare çekiliyor, ffmpeg ile MP4'e çevriliyor. Fon müziği de `muzik.py` ile
sahne geçişlerine denk gelecek şekilde sentezleniyor, telif sorunu yok.

Hazır çıktılar:

| Dosya | Format | Kullanım |
| --- | --- | --- |
| `out/guclu-insaat-tanitim-16x9.mp4` | 1920×1080 | YouTube, web sitesi, sunum, ekran |
| `out/guclu-insaat-tanitim-9x16.mp4` | 1080×1920 | Instagram Reels, TikTok, YouTube Shorts |

## Akış

| Süre | Sahne | İçerik |
| --- | --- | --- |
| 0.0 – 4.8 sn | Plan | Teknik çizim ızgarası üzerinde binaların planı çiziliyor. "Her büyük yapı bir planla başlar." |
| 4.8 – 10.8 sn | İnşa | Binalar kat kat yükseliyor, vinç kuruluyor, pencereler yanıyor. "Sağlam temeller, güçlü yapılar." |
| 10.8 – 18.0 sn | Hizmetler | Dört hizmet kartı; her biri sırayla vurgulanıyor |
| 18.0 – 23.4 sn | Değerler | KALİTE · GÜVEN · ZAMANINDA TESLİM |
| 23.4 – 30.0 sn | Logo | Amblem, firma adı, slogan ve (doldurulursa) iletişim bilgileri |

## Metinleri değiştirmek

Tüm yazılar, renkler ve süreler `config.json` içinde:

- `firma`: ad, alt ad, slogan
- `iletisim`: `web`, `telefon`, `adres`. Boş bırakılan alan videoda görünmez.
- `sahneler`: her sahnenin etiketi ve satırları, hizmet kartları (`ikon`: `konut`, `ticari`, `donusum`, `yonetim`, `baret`)
- `zamanlama`: sahnelerin başlangıç saniyeleri ve müzik temposu (`bpm`)
- `renkler`: vurgu ve arka plan renkleri

Değişiklikten sonra videoyu yeniden üretin. Müzik de yeni sürelere göre yeniden oluşur.

## Yeniden üretmek

Gerekenler: Node.js 18+, ffmpeg, Python 3 + numpy, Inter ve Inter Display yazı tipleri.

```bash
cd video
npm install
npx playwright install chromium   # ilk kurulumda bir kez

npm run render          # 16:9  -> out/guclu-insaat-tanitim-16x9.mp4
npm run render:dikey    # 9:16  -> out/guclu-insaat-tanitim-9x16.mp4
```

Ek seçenekler:

```bash
node render.mjs --kare 3,8,14          # belirli saniyelerin PNG görüntüsü (out/kareler/), hızlı önizleme için
node render.mjs --format 16x9 --sessiz # müziksiz
node render.mjs --config diger.json    # başka bir ayar dosyasıyla
```

## Dosyalar

- `sahne.js`: animasyon; `cizKare(saniye)` her çağrıldığında o anın görüntüsünü çizer
- `sahne.html`: canvas'ı barındıran sayfa
- `render.mjs`: Playwright ile kareleri alıp ffmpeg'e aktarır
- `muzik.py`: fon müziğini üretir (`out/muzik.wav`)
- `config.json`: içerik ve ayarlar
