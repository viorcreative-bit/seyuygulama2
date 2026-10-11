# Yayına hazırlık kılavuzu

Bu dosya, uygulamayı App Store ve Google Play'e çıkarmak için yapılacakları sırayla anlatır. ✅ = kodda hazır, 👤 = senin yapman gereken.

## 1. Kodda hazır olanlar ✅
- Müşteri / aşçı / yönetici ayrımı, şifreyle giriş, SMS ile kayıt.
- **Uygulama içinden hesap silme** (Hesabım > Hesabımı Sil). Apple ve Google bunu zorunlu tutar.
- KVKK Aydınlatma Metni, Gizlilik Politikası ve Kullanım Koşulları (uygulama içinde, kayıtta onay kutusuyla). Metinler güncellenirse kullanıcıdan yeniden onay istenir.
- Yasal metinlerin internet sayfası hâli (`yasal-web/`). Mağazalar gizlilik politikası için bir internet adresi ister.
- Hata ekranı, uygulama ikonu, açılış ekranı, mağaza yapılandırması (`app.json`, `eas.json`).
- Yönetici web paneli: aşçı onayı, şikayetler, üye yönetimi.

## 2. Önce yapman gerekenler 👤

### a) Şirket bilgilerini yaz
`src/yasal/metinler.json` dosyasındaki `bilgiler` bölümünde şunlar köşeli parantezli duruyor: şirket unvanı, adres, e-posta, MERSİS no, internet sitesi. Gerçek bilgilerle değiştir, sonra:

```
npm run yasal
```

Bu komut internet sayfalarını yeniler ve hâlâ boş kalan bilgi varsa seni uyarır.

### b) Metinleri bir avukata göster
Hazır metinler **taslaktır**; ben avukat değilim. Özellikle şu konuları kontrol ettir:
- Yurt dışına veri aktarımı (Supabase sunucuları yurt dışında, Frankfurt). KVKK m.9'a göre açık rıza veya taahhütname gerekebilir.
- Aracı platform sorumluluğu ve iptal koşulları.
- Veri sorumluları siciline (VERBİS) kayıt zorunluluğu olup olmadığı.

Metinleri değiştirirsen `metinler.json` içindeki `surum` ve `guncelleme` tarihini de güncelle; kullanıcılardan otomatik yeniden onay istenir.

### c) Yasal sayfaları internete koy
`yasal-web/` klasörünü bir internet adresine yükle (Netlify, Cloudflare Pages, GitHub Pages ya da kendi alan adın). Mağaza formlarında istenen "gizlilik politikası adresi" bu olacak (örn. `https://siteadin.com/gizlilik.html`).

### d) Kimlik bilgisi (bundle id) onayı
`app.json` içinde şu an `com.ascimgelsin.app` yazıyor. **İlk mağaza yüklemesinden sonra değiştirilemez.** Kendi alan adınla uyumlu olmasını istiyorsan şimdi söyle.

## 3. Supabase'i yayına hazırla 👤
1. **Test telefon numarasını kapat:** Authentication > Sign In / Providers > Phone > "Test Phone Numbers" kutusunu boşalt.
2. **SMS sağlayıcısını gerçek bilgilerle kur** (Twilio veya Türkiye'ye uygun başka bir sağlayıcı). Ücret ve Türkiye gönderim kuralları sağlayıcıya göre değişir; sağlayıcıyı birlikte seçelim.
3. **Ücretli plana geç (Pro):** Ücretsiz planda proje bir hafta kullanılmazsa durdurulur ve otomatik yedek yoktur. Gerçek kullanıcı varken Pro plan önerilir.
4. **Şifre kuralları:** Authentication > Sign In / Providers sayfasında "Minimum password length" değerini 8 yap.
5. **Hız sınırları:** Authentication > Rate Limits sayfasında SMS gönderim sınırını makul tut (SMS suistimalini önler).
6. **SQL dosyalarının hepsini çalıştır:** `supabase/schema.sql`, `schema_4.sql` ... `schema_12.sql` sırayla.

## 4. Hesaplar 👤
| Hesap | Ücret | Not |
|---|---|---|
| Apple Developer Program | yıllık 99 USD | iPhone için zorunlu, onay birkaç gün sürebilir |
| Google Play Console | tek sefer 25 USD | Android için |
| Expo (EAS) | ücretsiz plan var | uygulamayı derleyip mağazaya yükleyen servis |

## 5. Uygulamayı derleme (hesaplar hazır olunca)
Bilgisayarında bir kez:
```
npm install -g eas-cli
eas login
eas init
```
Deneme sürümü (Android, telefona kurulan dosya):
```
eas build --platform android --profile preview
```
Mağaza sürümü:
```
eas build --platform all --profile production
eas submit --platform all --profile production
```

## 6. Mağaza sayfası için hazırla 👤
- **Ad:** Aşçım Gelsin · **Kategori:** Yemek ve İçecek · **Yaş sınırı:** 18+ (ya da 17+).
- **Kısa açıklama:** Ev yemeği, şef elinden. Aşçı evinize gelsin, yemekleriniz mutfağınızda pişsin.
- **Ekran görüntüleri:** Ana sayfa, aşçı profili, talep formu, taleplerim (telefonda alınan görüntüler). Gerekirse ben hazırlarım.
- **Gizlilik politikası adresi** ve **destek e-posta adresi.**
- **Apple "Veri Gizliliği" / Google "Veri Güvenliği" formu için veri listesi:** ad, telefon numarası, (aşçı ve müşteri için) adres/semt bilgisi, fotoğraflar, kullanıcı içeriği (yorum, şikayet). Veriler reklam için kullanılmaz ve satılmaz. Kullanıcı hesabını silebilir.
- **İnceleme hesabı:** Apple ve Google, uygulamayı denemek için bir hesap ister. SMS beklemeden girilebilmesi için telefon numarası + şifre ile giriş yapan **bir müşteri ve bir aşçı hesabı** hazırla (aşçı hesabını yönetici panelinden onayla, birkaç örnek yorumla doldur). Bu bilgileri mağaza formundaki "inceleme notları" alanına yaz.

## 7. Yayın öncesi son kontrol listesi
- [ ] Şirket bilgileri dolu, `npm run yasal` uyarı vermiyor
- [ ] Avukat metinleri onayladı
- [ ] Yasal sayfalar internette ve adresleri mağaza formunda
- [ ] Supabase: test numarası kapalı, SMS sağlayıcısı kurulu, Pro plan, şifre uzunluğu 8
- [ ] İnceleme hesapları hazır
- [ ] Demo verisi silindi (`DEMO_VERI.md`)
- [ ] Gerçek telefonda baştan sona deneme: kayıt, aşçı onayı, talep, kabul, tamamlama, yorum, şikayet, hesap silme
- [ ] Yönetici panelini internete koymaya karar ver (şimdilik yalnızca kendi bilgisayarında çalışıyor)

## 8. Karar bekleyen konular
- Ödeme (iyzico): şimdilik uygulama ödeme aracılığı yapmıyor; Kullanım Koşulları bunu belirtiyor. Ödeme eklenirse metinler de güncellenmeli.
- Aşçı ile müşterinin iletişimi: şu an telefon numarası paylaşılmıyor. Gerekirse uygulama içi mesajlaşma veya kabul sonrası telefon paylaşımı eklenebilir (KVKK açısından ayrıca değerlendirilmeli).

## 9. SMS sağlayıcısı kararı (Ekim 2026 araştırması)
**Durum:** Şimdilik Supabase'deki test numarasıyla devam ediyoruz. Gerçek kullanıcı alınmadan önce mutlaka bir sağlayıcı kurulmalı. Şirket belgeleri hazır.

| Seçenek | Artısı | Eksisi |
|---|---|---|
| Yerel Türk sağlayıcı (Netgsm, İleti Merkezi, Verimor...) + Supabase "Send SMS Hook" | Türkiye'ye özel, TL ile fatura, genelde daha uygun | Bağlantı fonksiyonu yazılması gerekir (ben yazarım) |
| Twilio Verify | Kod gerekmez, Supabase'de hazır | Türkiye için gönderici adı kaydı (5 iş günü - 2 hafta), dolar bazlı ücret, kayıtsız gönderici adları **18 Kasım 2026'dan itibaren engelleniyor** |

**Önerilen yol:** Yerel Türk sağlayıcı. Kaynaklar: [Supabase Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook.md), [Twilio Türkiye SMS kuralları](https://twilio.com/guidelines/tr/sms).

**Şimdi yapılabilecek (paralel, ücretsiz araştırma):**
1. 2-3 sağlayıcıdan **OTP SMS birim fiyatı ve SMS başlığı (gönderici adı) onay süresi** için teklif iste.
2. Seçtiğin sağlayıcıda hesap açıp şirket evraklarınla başlık onayı başvurusunu başlat (Türkiye'de başlık onayı birkaç gün sürebilir).
3. Başlık onaylanınca ve API bilgilerin hazır olunca bana haber ver: Supabase'te çalışacak bağlantı fonksiyonunu yazıp test ederiz.

**Test numarası hatırlatması:** Supabase > Authentication > Providers > Phone sayfasındaki "Test OTPs Valid Until" tarihi dolunca test numarası çalışmaz. Süre dolmadan tarihi ileri çek.
