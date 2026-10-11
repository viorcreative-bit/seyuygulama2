# Aşçım Gelsin

**Slogan:** Ev yemeği, şef elinden.

## Proje nedir?

Aşçım Gelsin, evde yemek yapmaya vakti olmayan çalışan insanları, yemek yapmayı iyi bilen aşçılarla buluşturan bir mobil uygulamadır. Aşçı müşterinin evine gelir ve yemekleri orada pişirir (genellikle bir haftalık). Bu bir paket servis uygulaması **değildir**; yemek müşterinin kendi mutfağında yapılır.

Hedef kitle: Türkiye'de, özellikle İstanbul'da yaşayan, üst gelir grubundaki çalışan kişiler ve aileler.

## Proje sahibi hakkında

Proje sahibi yazılımcı değildir. Bu yüzden:
- Her adımda ne yaptığını kısa ve basit Türkçe ile açıkla.
- Bir şeyi kurmak veya çalıştırmak gerektiğinde, kopyalanıp yapıştırılacak komutu tam olarak ver.
- Büyük değişiklikleri küçük adımlara böl; her adımdan sonra nasıl test edileceğini söyle.
- Emin olmadığın bir kararda (özellikle para, ödeme, kişisel veri) önce sor.

## Teknoloji

- **Mobil uygulama:** React Native + Expo (TypeScript). iPhone ve Android tek kodla.
- **Sunucu, veritabanı, giriş, dosya depolama:** Supabase.
- **Ödeme (ileride):** iyzico.
- Uygulamanın tüm arayüz dili **Türkçe**dir. Tarih, saat ve para birimi Türkiye formatında (TL, gg.aa.yyyy).

## Marka ve tasarım

- **Logo:** `assets/logo.png` (kırmızı daire içinde sarı şef şapkası, bıyık ve el yazısıyla "Aşçım Gelsin").
- **Tasarım dili: koyu tema.** Koyu bordo degrade zemin, yuvarlak köşeli koyu kartlar, sarı vurgu, fotoğraf ağırlıklı aşçı kartları, altta yüzen gezinme çubuğu. Referans: yemek siparişi uygulaması UI kit'i; renkler yeşil yerine marka renkleridir.
- **Renkler** (hepsi `src/theme.ts` içinde, ekranlarda renk kodu elle yazılmaz):
  - Zemin: `zemin` `#160606` (degrade tepesi `zeminUst` `#2B0B0B`); kartlar: `yuzey` `#2A1010`, `yuzeyUst` `#3A1818`; çizgiler: `cizgi` `#4D2626`
  - Sarı (ana vurgu, ana butonlar, seçili öğeler): `sari` `#FEC010`; sarı zemin üzerindeki yazı: `koyuMetin` `#2B1A12`
  - Kırmızı (marka rengi, rozetler, fotoğraf yoksa zemin): `kirmizi` `#A30909`; koyu zeminde hata/uyarı metni: `kirmiziAcik` `#FF6B5E`
  - Metin: `metin` `#FFF8E7` (krem), ikincil metin: `metinSoluk` `#BFA99A`
- **His:** Sıcak, samimi ama özenli ve premium. Bol boşluk, çok yuvarlak köşeler, büyük ve net yazılar.
- **Ortak bileşenler** (`src/components/`): `Ekran` (arka plan + üst çubuk), `Ust`, `AltMenu` (müşteri: Ana Sayfa / Taleplerim / Hesabım; aşçı: Ana Sayfa / Talepler / Yorumlar / Hesabım), `Dugme`, `Girdi`, `AsciKarti`, `GirisKabuk`, `DurumRozeti`, `Bos`. Yeni ekranlar bunları kullanır.

## Kullanıcı tipleri

1. **Müşteri:** Aşçı arar, profilleri inceler, talep oluşturur, hizmetten sonra yorum ve yıldız verir.
2. **Aşçı:** Kendi profilini oluşturur ve düzenler, gelen talepleri kabul veya reddeder, aldığı yorumları görür.
3. **Yönetici:** Aşçıları onaylar, şikayetleri inceler. Yalnızca web panelinden (`yonetim-web/`, bkz. `YONETIM_WEB.md`); mobil uygulamada yönetici ekranı yoktur.

## Özellikler (ilk sürüm)

### 1. Ana sayfa
- Üstte logo ve slogan.
- Ortada büyük, dikkat çeken **"Talep Oluştur"** butonu: açık talep akışını başlatır (aşağıda 8. bölüm). Hemen altında "Aşçı Talep Et" butonu aşçı seçme ekranını (öne çıkanlar + yemek kategorileri) açar; aşçı profilindeki talep düğmesi de aynı doğrudan talep formuna gider.
- Altında **"En Sevilen Aşçılar"** bölümü: en yüksek puanlı aşçılar kartlar halinde.
  - Sıralama: ortalama yıldız puanına göre. Tek bir 5 yıldızla zirveye çıkılmasın diye, listeye girmek için en az 3 yorum gerekir.
  - Her kartta: fotoğraf, isim, uzmanlık (örn. "Ege mutfağı"), ortalama yıldız, yorum sayısı.

### 2. Aşçı profili
Aşçı kendisi oluşturur ve düzenler:
- Profil fotoğrafı ve yaptığı yemeklerin fotoğrafları (galeri)
- Ad soyad, kısa tanıtım yazısı
- Uzmanlık alanları (örn. Türk mutfağı, Ege, Antep, vegan, diyet, çocuk yemekleri)
- Hizmet verdiği semtler
- Ücret bilgisi (örn. bir haftalık hizmet için başlangıç fiyatı)
- Müsait olduğu günler
- Profilde ortalama yıldız ve tüm yorumlar görünür.

### 3. Yorum ve yıldız sistemi
- Müşteri 1–5 yıldız verir ve yazılı yorum bırakır.
- **Sadece o aşçıyla tamamlanmış bir hizmeti olan müşteri yorum yapabilir** (sahte yorumu önlemek için).
- Her tamamlanmış hizmet için bir yorum hakkı vardır.
- Aşçı yorumlara bir kez cevap yazabilir.

### 4. Aşçı talep etme
"Hemen Aşçı Talep Et" butonu veya aşçı profilinden başlar. Müşteri şunları girer:
- Adres (semt)
- Tarih ve saat
- Kaç kişilik yemek yapılacağı
- Mutfak tercihi ve istenen yemekler
- Alerjiler ve özel notlar

Talep durumları: **Bekliyor → Kabul edildi / Reddedildi → Tamamlandı / İptal edildi.**

### 5. Giriş ve kayıt
- Açılış ekranında üç seçenek: **Müşteri Girişi**, **Aşçı Girişi**, **Kaydol**.
- Giriş: telefon numarası + şifre. Seçilen giriş türü hesabın rolüyle uyuşmalıdır.
- Kaydol: telefon numarası + SMS kodu, sonra ad, rol ("Müşteriyim" / "Aşçıyım"), isteğe bağlı avatar (3 kadın, 3 erkek; `assets/avatars`, `scripts/avatar-uret.py`, `AvatarSecici.tsx`; seçilen avatar profil fotoğrafı olarak yüklenir) ve şifre.
- Şifresi olmayan (eski) hesaplar ve şifresini unutanlar: giriş ekranındaki "İlk kez mi giriyorsun veya şifreni mi unuttun?" bağlantısıyla SMS kodu girer, ardından yeni şifre belirlemesi zorunludur.
- Profil fotoğrafı olmayan üyelere girişte bir kez avatar seçtirilir ("Şimdilik geç" denebilir); Hesabım > Avatarımı Değiştir ile her zaman değiştirilir (`AvatarSec.tsx`).
- Şifre: en az 8 karakter, en az bir harf ve bir rakam. Kullanıcı ana sayfadaki "Şifre" bağlantısından, mevcut şifresini doğrulayarak değiştirir.

### 6. Reklam bandı ve kurumsal (toplu yemek)
- Uygulamanın altında (menünün üstünde) yönetici panelinden yönetilen dönen reklam bandı: `src/components/ReklamBandi.tsx`, tablo `reklamlar` (`schema_13.sql`).
- Kurumsal talep: şirket talep açar (kişi 10–5000, tekrar, öğün, bütçe), kurumsal hizmet veren aşçılar kişi başı fiyat teklifi verir, şirket bir teklifi seçer; şirket iletişim bilgisi yalnızca seçilen aşçıya görünür. Tablolar `kurumsal_talepler`, `kurumsal_teklifler`, `kurumsal_iletisim` (`schema_14.sql`); ekranlar `Kurumsal*.tsx`; müşteri/aşçı "Talepler" sekmesinde Bireysel | Kurumsal ayrımı.

### 7. Bildirimler ve favoriler
- Telefon bildirimi (Expo push): yeni talep/teklif, kabul/ret, iptal, tamamlandı, yeni yorum. Veritabanı tetikleyicileri `pg_net` ile Expo'ya gönderir (`schema_15.sql`, tablo `push_tokenlari`); istemci `src/lib/bildirim.ts`. Bildirim metinlerinde adres/telefon yoktur. Gerçek cihaz ve EAS proje kimliği gerekir (Expo Go'da sınırlı).
- Favoriler: müşteri aşçı kartındaki/profildeki kalple favoriler (`favoriler` tablosu, `src/auth/FavoriContext.tsx`); ana sayfada "Favorilerim" filtresi.
- Aşçı profilinde yapacağı yemekler ve kullanacağı malzemeler (`asci_yemekleri`, `schema_16.sql`, `YemekDuzenleyici.tsx`); müşteri aşçı profilinde görür, yönetici panelinde onay kartında görünür.
- Yönetici web paneli de koyu temadadır.

### 8. Açık talep ve aşçı teklifleri
- Müşteri ana sayfada "Talep Oluştur" der; istediği yemekleri, gün ve saati, kişi sayısını, semt ve adresi yazar (`AcikTalepOlustur.tsx`). Talep tüm onaylı aşçılara gider (Talepler > Teklif Ver); aşçılar toplam fiyat teklifi verir; müşteri bir teklifi seçer.
- Seçilince normal bir talep (`talepler`, durum `kabul`, `teklif_fiyati` dolu) oluşur; böylece tamamlama, yorum, şikayet ve adres görünürlüğü mevcut akışla devam eder. Aşçı, teklif aşamasında müşterinin adını ve adresini görmez.
- Tablolar `acik_talepler`, `acik_talep_adresleri`, `acik_teklifler` (`schema_17.sql`); en fazla 5 açık talep; ekranlar `Acik*.tsx`; müşteri sekmeleri Doğrudan | Açık Talepler | Kurumsal, aşçı sekmeleri Bana Gelen | Teklif Ver | Kurumsal.

## Veritabanı tabloları (taslak)

- `profiles`: id, rol (musteri / asci), ad, telefon, fotoğraf, oluşturulma tarihi
- `asci_profilleri`: profil_id, tanıtım, uzmanlıklar, semtler, başlangıç fiyatı, müsaitlik, onaylı_mı
- `asci_fotograflari`: asci_id, fotoğraf adresi, sıra
- `talepler`: id, musteri_id, asci_id, adres, tarih, kişi sayısı, tercihler, notlar, durum
- `yorumlar`: id, talep_id (benzersiz), musteri_id, asci_id, yıldız (1–5), yorum, aşçı cevabı, tarih

Supabase'de her tabloya güvenlik kuralları (Row Level Security) ekle: kullanıcılar sadece kendi verilerini değiştirebilsin; yorumlar ve aşçı profilleri herkes tarafından okunabilsin.

## Geliştirme sırası

Her aşamayı bitir, proje sahibine test ettir, sonra bir sonrakine geç:

1. Proje kurulumu, tema dosyası, logo, boş ana sayfa
2. Ana sayfa tasarımı (logo, slogan, büyük buton, örnek verilerle aşçı kartları)
3. Supabase bağlantısı ve telefonla giriş
4. Aşçı profili oluşturma ve düzenleme
5. Aşçı profil sayfası (müşterinin gördüğü)
6. Aşçı talep etme akışı
7. Aşçının talepleri görüp kabul/ret etmesi
8. Yorum ve yıldız sistemi
9. Ana sayfada gerçek "En Sevilen Aşçılar" listesi
10. (İleride) Ödeme, kimlik doğrulama, yönetici paneli

## Yayın ve yasal

- Yasal metinler (KVKK, gizlilik, kullanım koşulları) tek kaynaktan gelir: `src/yasal/metinler.json`. Uygulama ve `yasal-web/` sayfaları buradan beslenir (`npm run yasal`). Metin değişince `surum` güncellenir; kullanıcılardan yeniden onay istenir.
- Hesap silme uygulama içindedir (Hesabım > Hesabımı Sil); devam eden talebi olan hesap silinemez.
- Yayın adımları: `YAYIN_HAZIRLIK.md`.

## Önemli kurallar

- Kişisel veriler (telefon, adres) **KVKK** kapsamındadır. Adres sadece talebi kabul eden aşçıya gösterilir.
- Gizli anahtarları (API key) asla koda yazma; `.env` dosyasında tut ve `.env` dosyasını Git'e ekleme.
- Ödeme kısmını yazmadan önce mutlaka proje sahibine danış.
