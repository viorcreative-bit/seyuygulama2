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
- **Şikayetler:** Durumu "İnceleniyor" veya "Çözüldü" yapma ve not yazma.

Silme işlemleri geri alınamaz; panel önce uyarır ve "SİL" yazmanı ister. Yönetici hesapları askıya alınamaz ve silinemez.

Not: Silinen kişilerin yüklediği fotoğraf dosyaları depolamada kalır (veritabanı kayıtları silinir). KVKK kapsamında tam temizlik için bu dosyaların ayrıca temizlenmesi gerekir; yayına yaklaşırken birlikte ele alınmalı.

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
