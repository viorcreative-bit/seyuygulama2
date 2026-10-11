# Yönetici web paneli

Yönetici işlemleri (aşçı onayı ve şikayetler) mobil uygulamada **yoktur**; yalnızca bu web sayfasından yapılır.

## Kendi bilgisayarında açmak
Proje klasöründe (`.env` dosyası hazır olmalı):

```
npm run yonetim
```

Sonra tarayıcıda şu adresi aç: http://localhost:5174

Giriş: yönetici yaptığın hesabın telefon numarası ve şifresi. (Yönetici olmayan bir hesapla giriş yapılamaz.)

## Panelde neler yapılır
- **Fotoğraflar:** Aşçı ve üye kartlarında profil fotoğrafı (yoksa baş harf) ve aşçıların yemek fotoğrafları görünür. Büyütmek için tıkla, kapatmak için tekrar tıkla.
- **Aşçılar:** Onayla, Reddet (sebep yazılır, aşçıya gösterilir), Onayı Kaldır, Profili Sil.
- **Üyeler:** Tüm müşteri ve aşçılar. Askıya Al / Aktif Et (askıdaki kişi giriş yapamaz) ve Hesabı Sil.
- **Reklamlar:** Uygulamanın alt kısmında dönen reklam bandı. "Yeni reklam ekle" ile görsel (1200×300 piksel, en fazla 1 MB), reklam adı, reklamveren, dokununca açılacak https bağlantısı ve yayın tarihleri girilir. Her reklamın gösterim, tıklama ve tıklanma oranı görünür; "Düzenle" ile bilgiler ve görsel değiştirilir (görseli boş bırakırsan eskisi kalır), "Kapat/Aç" ile yayından kaldırılır, "Sil" ile silinir. Reklamlar "Reklam" etiketiyle gösterilir. (Gerekli veritabanı: `schema_13.sql`.)
- **Kurumsal:** Şirketlerin açtığı toplu yemek taleplerini salt okunur listeler (şirket, semt, tarih, kişi sayısı, gelen teklif sayısı, seçilen aşçı). Şirket iletişim bilgileri burada gösterilmez. (Gerekli veritabanı: `schema_14.sql`.)
- **Şikayetler:** Durumu "İnceleniyor" veya "Çözüldü" yapma ve not yazma.

Silme işlemleri geri alınamaz; panel önce uyarır ve "SİL" yazmanı ister. Yönetici hesapları askıya alınamaz ve silinemez.

Silme sırasında kişinin yüklediği fotoğraf dosyaları da depodan temizlenir (schema_12.sql gerekir).

## Yönetici ekleme
Yalnızca Supabase → SQL Editor'den yapılır (numarayı değiştir):

```sql
insert into public.yoneticiler (profil_id)
select id from public.profiles where telefon = '+905551112233';
```

Yöneticiliği kaldırmak için:

```sql
delete from public.yoneticiler
where profil_id = (select id from public.profiles where telefon = '+905551112233');
```

## İnternette yayınlamak (ileride)
`yonetim-web` klasörü düz HTML/JS dosyalarından oluşur. Netlify, Cloudflare Pages veya GitHub Pages gibi bir servise yüklenebilir. Yüklemeden önce `npm run yonetim` ile üretilen `yonetim-web/config.js` dosyası da klasörde bulunmalıdır (Git'e eklenmez, `.env`'den üretilir).

Güvenlik yetkisi sayfada değil veritabanındadır: sayfaya erişen biri yönetici değilse hiçbir yönetici verisini göremez ve işlem yapamaz.

Panel uygulamayla aynı koyu temayı kullanır.
