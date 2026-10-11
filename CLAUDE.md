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
- **Renkler:**
  - Kırmızı (ana renk): `#A30909` — üst bar, başlıklar, ana butonlar
  - Koyu sarı (vurgu): `#FEC010` — yıldızlar, buton yazıları, vurgular
  - Krem (arka plan): `#FFF8E7`
  - Koyu metin: `#2B1A12`
- **His:** Sıcak, samimi ama özenli ve premium. Bol boşluk, yuvarlak köşeler, büyük ve net yazılar.
- Renkleri tek bir tema dosyasında tanımla (`src/theme.ts`), hiçbir ekranda renk kodunu elle yazma.

## Kullanıcı tipleri

1. **Müşteri:** Aşçı arar, profilleri inceler, talep oluşturur, hizmetten sonra yorum ve yıldız verir.
2. **Aşçı:** Kendi profilini oluşturur ve düzenler, gelen talepleri kabul veya reddeder, aldığı yorumları görür.
3. **Yönetici (ileride):** Aşçıları onaylar, şikayetleri inceler.

## Özellikler (ilk sürüm)

### 1. Ana sayfa
- Üstte logo ve slogan.
- Ortada büyük, dikkat çeken **"Hemen Aşçı Talep Et"** butonu (kırmızı zemin, sarı yazı).
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
- Kaydol: telefon numarası + SMS kodu, sonra ad, rol ("Müşteriyim" / "Aşçıyım") ve şifre.
- Şifresi olmayan (eski) hesaplar ve şifresini unutanlar: giriş ekranındaki "İlk kez mi giriyorsun veya şifreni mi unuttun?" bağlantısıyla SMS kodu girer, ardından yeni şifre belirlemesi zorunludur.
- Şifre: en az 8 karakter, en az bir harf ve bir rakam. Kullanıcı ana sayfadaki "Şifre" bağlantısından, mevcut şifresini doğrulayarak değiştirir.

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

## Önemli kurallar

- Kişisel veriler (telefon, adres) **KVKK** kapsamındadır. Adres sadece talebi kabul eden aşçıya gösterilir.
- Gizli anahtarları (API key) asla koda yazma; `.env` dosyasında tut ve `.env` dosyasını Git'e ekleme.
- Ödeme kısmını yazmadan önce mutlaka proje sahibine danış.
