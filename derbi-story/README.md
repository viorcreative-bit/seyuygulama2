# Derbi Instagram Hikâyesi — Galatasaray vs Fenerbahçe

26 Ekim 2026 Pazartesi 21:30 derbisi için 1080x1920, 15 sn, 30 fps Instagram hikâye videosu.

## Hazır dosyalar (`out/`)

| Dosya | Açıklama |
| --- | --- |
| `derbi-story.mp4` | Sesli sürüm (stadyum ritmi + tribün uğultusu + geçiş efektleri) |
| `derbi-story-sessiz.mp4` | Sessiz sürüm — müziği Instagram'ın müzik kütüphanesinden eklemek için |
| `kapak.jpg` | Önizleme karesi |

## Akış

| Süre | Sahne |
| --- | --- |
| 0.0–2.5 | Stadyum, GALATASARAY ⚡ VS ⚡ FENERBAHÇE, tarih/saat |
| 2.5–4.5 | Dalgalanan GS ve FB bayrakları |
| 4.5–6.5 | Meşaleli tribünler: "HEYECAN" / "ZİRVEDE" |
| 6.5–8.0 | Kuşbakışı saha: "26 EKİM PAZARTESİ" |
| 8.0–9.5 | LED skorbord: "21:30" |
| 9.5–11.0 | Dev ekran: "DEV EKRANDA CANLI" |
| 11.0–11.5 | "HAZIR MISIN?" flaşları |
| 11.5–15.0 | Kapanış: "YERİNİ ŞİMDİDEN AYIRT" + rezervasyon çağrısı |

2.5–11.5 arasında referans videodaki gibi sabit alt bant (GS vs FB rozetleri) ve kayan yazı bulunur.

## Düzenleme

Metinler `config.json` içindedir. Mekân adını üste ve kapanışa eklemek için `"brand"` alanını doldurun;
şube listesi gibi bilgileri `"ticker"` dizisine yazın. Sonra:

```bash
./build.sh   # node + playwright, python3 + numpy, ffmpeg gerekir
```

Canlı önizleme: `story.html?preview` sayfasını bir HTTP sunucusu üzerinden açın.
