# ARK Dental · Kaptan Ark Asistan

ARK Dental Clinic maskotunu canlandıran, yapay zeka destekli web asistanı.

- **Canlı maskot:** göz kırpar, el sallar, konuşurken ağzı hareket eder, düşünürken başını eğer, randevu oluşunca zıplayıp kutlama yapar.
- **Sesli karşılama:** "ARK Dental'e hoş geldiniz!" der; cevapları tarayıcının Türkçe sesiyle okur (ses kapatılabilir). Mikrofonla soru sorulabilir.
- **Yapay zeka (Claude):** hastaların sorularını klinik bilgilerine göre yanıtlar, fiyat/kampanya gibi bilinmeyen şeyleri uydurmaz, acil durumlarda 112'ye yönlendirir. Yabancı hastalara kendi dillerinde cevap verir.
- **Randevu sistemi:** boş saatleri kontrol eder, bilgileri özetleyip onay alır, randevuyu kaydeder ve randevu kodu verir. İptal ve sorgulama da yapılabilir. Hasta "Takvime ekle" ile randevuyu telefonuna ekleyebilir.
- **Yönetim paneli:** `/admin` adresinden tüm randevular görülür, aranır, iptal edilir.
- **Web sitesine ekleme:** tek satırlık kodla mevcut sitenizin sağ alt köşesine maskotlu sohbet düğmesi eklenir.

## Hızlı başlangıç

Gereken: [Node.js 22.9+](https://nodejs.org) ve bir [Claude API anahtarı](https://console.anthropic.com).

```bash
npm install
```

```bash
cp .env.example .env
```

`.env` dosyasını açıp `ANTHROPIC_API_KEY` ve `ADMIN_PASSWORD` değerlerini girin, sonra:

```bash
npm start
```

Tarayıcıda `http://localhost:3000` adresini açın. Randevu paneli: `http://localhost:3000/admin`.

## Klinik bilgilerini düzenleme

Tüm klinik bilgileri `config/clinic.json` dosyasındadır. Asistan **yalnızca** bu dosyadaki bilgileri kullanır. Yayına almadan önce mutlaka düzenleyin:

| Alan | Açıklama |
|---|---|
| `phone`, `address`, `whatsapp`, `email`, `mapsUrl` | İletişim bilgileri (şu an örnek değerler var) |
| `assistantName` | Maskotun adı (varsayılan "Kaptan Ark") |
| `workingHours`, `breaks`, `closedDates` | Çalışma saatleri, öğle arası, tatil günleri |
| `appointment.slotMinutes` | Bir randevunun süresi (dk) |
| `appointment.capacityPerSlot` | Aynı saate kaç randevu verilebilir (hekim/koltuk sayısı) |
| `appointment.maxDaysAhead`, `minNoticeMinutes` | En ileri randevu günü, en az kaç dk önceden alınabileceği |
| `services` | Hizmet listesi ve kısa açıklamaları |
| `doctors` | Hekimler, ör. `[{"name": "Dt. Ayşe Kaya", "title": "Ortodontist"}]` |
| `prices.items` | Paylaşmak istediğiniz fiyatlar, ör. `{"Muayene": "Ücretsiz"}`. Boşsa asistan fiyatın muayeneden sonra belirlendiğini söyler. |
| `faq` | Sık sorulan sorular, ör. `[{"q": "Kredi kartına taksit var mı?", "a": "Evet, 6 taksit yapılabiliyor."}]` |
| `extraInfo` | Otopark, ulaşım, kampanya gibi serbest metin bilgiler |

Değişiklikten sonra sunucuyu yeniden başlatın.

## Web sitenize ekleme (adım adım)

Yapay zeka API anahtarı gizli kalmalıdır; bu yüzden asistan doğrudan sitenizin içine dosya olarak konamaz, ayrı küçük bir sunucuda çalışır. Siteniz ise bu sunucuya tek satırlık bir kodla bağlanır.

**1. Asistanı yayına alın.** En kolay yol [Render](https://render.com):

1. Render'da hesap açın ve GitHub hesabınızı bağlayın.
2. **New → Blueprint** deyip bu depoyu seçin. `render.yaml` dosyası her şeyi otomatik ayarlar.
3. Sizden istenen iki değeri girin: `ANTHROPIC_API_KEY` (Claude API anahtarı) ve `ADMIN_PASSWORD` (panel şifresi).
4. Kurulum bitince Render size `https://ark-dental-asistan.onrender.com` gibi bir adres verir. Bu adresi açıp maskotun çalıştığını kontrol edin.
5. İsterseniz Render'da **Custom Domain** ile `asistan.arkdental.com` gibi kendi alt alan adınızı bağlayın.

Not: `render.yaml` randevuların silinmemesi için kalıcı disk ister; bu nedenle ücretli "Starter" planı seçilidir. Docker destekleyen başka bir sunucu kullanacaksanız hazır `Dockerfile` da var (`/data` klasörünü kalıcı birim olarak bağlayın).

**2. Sitenize kodu ekleyin.** Aşağıdaki satırdaki adresi kendi asistan adresinizle değiştirin:

```html
<script src="https://ASISTAN-ADRESINIZ/embed.js" defer></script>
```

- **Kendi HTML siteniz:** Her sayfada `</body>` etiketinden hemen önce yapıştırın.
- **WordPress:** "WPCode" (Insert Headers and Footers) eklentisini kurun → Code Snippets → Header & Footer → **Footer** kutusuna yapıştırıp kaydedin.
- **Wix:** Ayarlar → Gelişmiş → **Özel Kod** → Kod Ekle → "Tüm sayfalar", konum **Body – end** (bu özellik genelde bağlı alan adı olan ücretli plan ister).
- **Shopify:** Online Store → Themes → Edit code → `theme.liquid` dosyasında `</body>` öncesine yapıştırın.
- **Squarespace / Webflow / Ticimax / İdeasoft vb.:** "Footer code", "Özel kod" veya "Body sonu kodu" alanına yapıştırın.

Sağ alt köşede maskot düğmesi ve "ARK Dental'e hoş geldiniz! 👋" baloncuğu çıkar; tıklanınca sohbet açılır. Baloncuk metnini `data-greeting="..."` ile değiştirebilirsiniz.

Asistanı tam sayfa olarak da kullanabilirsiniz: sitenizdeki "Online Randevu" menüsünü doğrudan asistan adresine yönlendirmeniz yeterli.

## Yayına alma (teknik ayrıntılar)

Herhangi bir Node.js barındırma hizmetinde çalışır (Render, Railway, Fly.io, kendi VPS'iniz vb.):

- Kurulum: `npm ci --omit=dev`, başlatma: `npm start` (veya `node server.js`)
- Ortam değişkenleri: `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD` (gerekirse `PORT`)
- Randevular `data/appointments.json` dosyasında saklanır. Sunucunun **kalıcı diski** olmalı ya da `DATA_FILE` ile kalıcı bir klasör gösterilmeli; düzenli yedek alın.
- Mikrofonla konuşma için site **HTTPS** üzerinden yayınlanmalıdır.
- Yeni randevularda bildirim almak için `APPOINTMENT_WEBHOOK_URL` tanımlayın (Zapier, Make, n8n, Slack webhook'u vb.). Her yeni veya iptal edilen randevu JSON olarak bu adrese gönderilir.

## Yapay zeka ayarları

- Varsayılan model `claude-opus-5-5`, hızlı cevap için düşük düşünme seviyesiyle (`AI_EFFORT=low`) çalışır.
- Daha düşük maliyet için `.env` dosyasında `AI_MODEL=claude-sonnet-5-5` veya `AI_MODEL=claude-haiku-5-5` yapılabilir.
- Bir istek güvenlik filtresine takılırsa Claude API'nin sunucu tarafı yedek model özelliği (`fallbacks: "default"`) devreye girer; ayrıca bir işlem gerekmez.
- Asistanın davranış kuralları `src/prompt.js` dosyasındadır.

## Sesler hakkında

Sesli okuma, ziyaretçinin tarayıcısındaki hazır Türkçe sesle yapılır (Chrome, Edge, Safari'de var). Ses kalitesi cihaza göre değişir. Tarayıcılar sayfa açılır açılmaz ses çalmaya izin vermediği için karşılama mesajı ziyaretçinin ilk dokunuşunda sesli okunur.

## Geliştirme ve test

```bash
npm test
```

API anahtarı olmadan arayüzü denemek için sahte (senaryolu) bir Claude sunucusu vardır. İki ayrı terminalde:

```bash
node test/mock-anthropic.js
```

```bash
ANTHROPIC_API_KEY=demo ANTHROPIC_BASE_URL=http://localhost:4010 ADMIN_PASSWORD=demo npm start
```

## Dosya yapısı

```
server.js              Express sunucusu (sohbet, yönetim API'si, statik dosyalar)
src/assistant.js       Claude bağlantısı ve randevu araçları
src/prompt.js          Asistanın talimatları
src/appointments.js    Boş saat hesaplama ve randevu kayıtları
config/clinic.json     Klinik bilgileri (düzenleyin)
public/                Maskotlu sohbet sayfası, yönetim paneli, embed.js
public/img/            Maskot katmanları (gövde, el)
assets/                Orijinal maskot görseli
```

## Gizlilik (KVKK)

Asistan yalnızca randevu için ad soyad ve telefon ister; bunlar sizin sunucunuzdaki randevu dosyasında tutulur. Sohbet içerikleri cevap üretmek için Anthropic'e (Claude API) gönderilir. Sitenizdeki aydınlatma metnine bu bilgiyi eklemeniz önerilir.
