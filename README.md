# Kaptan Ark · ARK Dental asistanı

ARK Dental Clinic'in maskotu **Kaptan Ark**'ı web sitenizde canlandıran sohbet asistanı. Sunucu kurmanız gerekmez; dosyaları sitenize yüklemeniz yeterlidir.

- **Canlı maskot:** göz kırpar, el sallar, konuşurken ağzı hareket eder, düşünürken başını eğer, randevu talebi hazır olunca zıplayıp kutlama yapar.
- **Sesli karşılama:** "ARK Dental'e hoş geldiniz!" der, cevapları tarayıcının Türkçe sesiyle okur. Mikrofonla soru sorulabilir.
- **Sohbet:** Google Gemini veya OpenAI ile serbest soruları yanıtlar. Yapay zeka anahtarı girilmemişse ya da kota dolduysa, hazır cevaplarla (çalışma saatleri, adres, hizmetler, fiyat, acil durum, SSS) çalışmaya devam eder.
- **Randevu talebi:** Hasta hizmeti, günü ve saati butonlarla seçer, adını ve telefonunu yazar. Talep hazır bir mesaj olarak kliniğin **WhatsApp**'ına gider, onayı klinik verir.
- **Siteye ekleme:** Tek satırlık kodla sitenizin sağ alt köşesine maskotlu sohbet düğmesi eklenir.

## Dosyalar

```
kaptan-ark/            ← sitenize yükleyeceğiniz klasör
  index.html           asistan sayfası
  embed.js             sitenize eklenen widget kodu
  clinic.json          klinik bilgileri (DÜZENLEYİN)
  chat.php             yapay zeka ara dosyası (PHP'li hostingler için)
  chat-config.php      yapay zeka anahtarı ve ayarları (DÜZENLEYİN)
  js/, img/, styles.css
cloudflare-worker/     PHP desteklemeyen siteler için yapay zeka ara katmanı
test/                  otomatik testler
```

## Hızlı deneme: tek HTML dosyası

`dist/kaptan-ark.html`, her şeyin (maskot, sohbet, randevu, ayarlar) içine gömüldüğü tek bir dosyadır. Çift tıklayıp tarayıcıda açabilir ya da hostinginize tek dosya olarak yükleyebilirsiniz.

- Klinik ayarları dosyanın içindeki `<script id="clinic-config">` bölümündedir; telefon ve `whatsapp` numarasını oradan düzenleyin.
- Bu sürüm hazır cevaplarla çalışır. Yapay zeka için ayarlardaki `ai.endpoint` alanına bir Cloudflare Worker adresi yazın (bkz. 3b).
- `kaptan-ark/` klasöründe değişiklik yaptıktan sonra dosyayı yeniden üretmek için: `npm run build:single`

## 1. Klinik bilgilerini girin

`kaptan-ark/clinic.json` dosyasını bir metin düzenleyiciyle açın. Kaptan Ark **yalnızca** bu dosyadaki bilgileri kullanır.

| Alan | Açıklama |
|---|---|
| `whatsapp` | Randevu taleplerinin gideceği numara, ülke koduyla ve sadece rakam: `905321234567` (**zorunlu**; boşsa hasta aramaya yönlendirilir) |
| `phone`, `address`, `email`, `mapsUrl` | İletişim bilgileri (şu an örnek değerler var) |
| `welcome` | Karşılama cümlesi |
| `workingHours`, `breaks`, `closedDates` | Çalışma saatleri, öğle arası, tatil günleri |
| `appointment` | Randevu aralığı (dk), kaç gün sonrasına kadar ve en az kaç dk önceden talep alınacağı |
| `services` | Hizmetler; `keywords` hazır cevap motorunun o hizmeti tanıdığı kelimelerdir |
| `doctors` | Hekimler, ör. `[{"name": "Dt. Ayşe Kaya", "title": "Ortodontist"}]` |
| `prices.items` | Paylaşmak istediğiniz fiyatlar, ör. `{"Muayene ve Kontrol": "Ücretsiz"}` |
| `faq` | Sık sorulan sorular, ör. `[{"q": "Otopark var mı?", "a": "Evet, binanın önünde."}]`. Örnekler `_faq_ornek` alanında. |
| `extraInfo` | Ulaşım, kampanya gibi serbest metin bilgiler |
| `ai.endpoint` | Yapay zeka ara katmanının adresi (aşağıya bakın). Boş bırakılırsa sadece hazır cevaplar kullanılır. |

## 2. Yapay zeka anahtarı alın (isteğe bağlı)

**Google Gemini (önerilen, ücretsiz kotası var):** [aistudio.google.com/apikey](https://aistudio.google.com/apikey) adresinden Google hesabınızla anahtar oluşturun.

**OpenAI (alternatif, ücretli):** [platform.openai.com/api-keys](https://platform.openai.com/api-keys) adresinden anahtar oluşturun ve ayarlarda `provider` değerini `openai` yapın.

Anahtar asla tarayıcıya gönderilmez. Sitenizdeki `chat.php` dosyası ya da bir Cloudflare Worker anahtarı saklar ve soruyu yapay zekaya iletir.

## 3a. Sitenizde PHP varsa (WordPress, cPanel, Plesk ve çoğu Türk hosting firması)

1. `kaptan-ark/chat-config.php` dosyasını açın ve `gemini_api_key` alanına anahtarınızı yapıştırın.
2. `kaptan-ark` klasörünün tamamını FTP veya hosting panelinizdeki **Dosya Yöneticisi** ile sitenizin ana klasörüne (genellikle `public_html`) yükleyin.
3. Tarayıcıda `https://siteniz.com/kaptan-ark/` adresini açın. Sohbet başlığında **"Yapay zeka asistanı · çevrimiçi"** yazıyorsa yapay zeka çalışıyordur. **"Dijital asistan"** yazıyorsa hazır cevaplarla çalışıyordur.
4. Widget'ı sitenize ekleyin (adım 4).

## 3b. Sitenizde PHP yoksa (Wix, Ticimax, İdeasoft, Shopify vb.)

Bu sitelere klasör yüklenemediği için asistan ücretsiz bir yerde barındırılır:

1. `kaptan-ark` klasöründen **`chat.php` ve `chat-config.php` dosyalarını silin** (PHP olmayan yerde anahtar herkese görünür olur).
2. Klasörü ücretsiz bir statik hostinge yükleyin. Örneğin [app.netlify.com/drop](https://app.netlify.com/drop) adresine klasörü sürükleyip bırakmanız yeterli. Size `https://xxxx.netlify.app` gibi bir adres verilir.
3. Yapay zeka için Cloudflare'de ücretsiz hesap açın → **Workers & Pages → Create → Worker** → `cloudflare-worker/worker.js` dosyasının içeriğini yapıştırıp **Deploy** deyin.
4. Worker'ın **Settings → Variables and Secrets** bölümüne şunları ekleyin:
   - `GEMINI_API_KEY` (tür: Secret) → anahtarınız
   - `CLINIC_JSON_URL` → `https://xxxx.netlify.app/clinic.json`
   - `ALLOWED_ORIGINS` → `https://xxxx.netlify.app`
5. `clinic.json` içindeki `ai.endpoint` değerine Worker adresinizi yazın (ör. `https://kaptan-ark.hesabiniz.workers.dev`) ve klasörü tekrar yükleyin.

Yapay zeka istemiyorsanız 3. ve 4. adımları atlayın, `ai.endpoint` değerini boş bırakın.

## 4. Widget'ı sitenize ekleyin

Aşağıdaki satırdaki adresi kendi adresinizle değiştirin:

```html
<script src="https://siteniz.com/kaptan-ark/embed.js" defer></script>
```

- **WordPress:** "WPCode" eklentisini kurun → Code Snippets → Header & Footer → **Footer** kutusuna yapıştırın.
- **Wix:** Ayarlar → Gelişmiş → **Özel Kod** → "Tüm sayfalar", konum **Body – end** (genellikle bağlı alan adı olan ücretli plan ister).
- **Shopify:** Online Store → Themes → Edit code → `theme.liquid` içinde `</body>` öncesine yapıştırın.
- **Kendi HTML siteniz / diğerleri:** Her sayfada `</body>` öncesine ya da "Footer kodu / Özel kod" alanına yapıştırın.

Sağ alt köşede Kaptan Ark düğmesi ve "ARK Dental'e hoş geldiniz! 👋" baloncuğu çıkar. Baloncuk metnini `data-greeting="..."` ile değiştirebilirsiniz. İsterseniz sitenizdeki "Online Randevu" menüsünü doğrudan `https://siteniz.com/kaptan-ark/` adresine yönlendirebilirsiniz.

## Güvenlik ve maliyet

- `chat-config.php` içindeki `per_minute_limit` (aynı ziyaretçiden dakikada en fazla mesaj) ve `daily_limit` (günlük toplam mesaj) sınırları beklenmedik faturaya karşı korur. Sınır dolunca Kaptan Ark hazır cevaplarla devam eder.
- Google Cloud'da anahtarınıza bütçe uyarısı koymanız önerilir.
- `chat-config.php` dosyasını herkese açık bir GitHub deposuna anahtarla birlikte yüklemeyin.

## Gizlilik (KVKK)

- Ad ve telefon yapay zekaya **gönderilmez**. Bu bilgiler sadece hastanın kendi WhatsApp'ından kliniğe giden mesajda yer alır.
- Sohbetteki sorular cevap üretmek için Google'a (veya OpenAI'ye) iletilir. Google'ın koşullarına göre ücretsiz katmanda gönderilen içerikler ürün geliştirmede kullanılabilir; ücretli katmanda kullanılmaz. Güncel koşulları kontrol edin ve sitenizdeki aydınlatma metnine bu bilgiyi ekleyin.

## Sesler

Sesli okuma, ziyaretçinin tarayıcısındaki hazır Türkçe sesle yapılır (Chrome, Edge, Safari). Tarayıcılar sayfa açılır açılmaz ses çalmaya izin vermediği için karşılama ilk dokunuşta sesli okunur. Mikrofon için site HTTPS üzerinden açılmalıdır.

## Geliştirme ve test

```bash
npm test
```

Yerelde PHP ile çalıştırmak için:

```bash
npm run dev
```

Gerçek anahtar olmadan yapay zekalı modu denemek için sahte bir API sunucusu vardır (`node test/mock-ai.js`). `chat-config.php` içinde `gemini_api_key` alanına herhangi bir değer, `gemini_base_url` alanına `http://127.0.0.1:4020` yazın.
