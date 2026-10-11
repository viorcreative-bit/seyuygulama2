# Demo verisi (20 örnek aşçı)

Uygulamayı dolu görmek ve denemek için 20 örnek aşçı, 8 örnek müşteri, 89 örnek tamamlanmış talep ve yorum hazırlandı. **Bunlar gerçek kişiler değildir.** Yemek görselleri de gerçek fotoğraf değil, çizimdir. Gerçek aşçılar kendi fotoğraflarını yükleyecek.

## Kurulum (bir kez, yaklaşık 5 dakika)

**0. Önce `schema_13.sql`'i çalıştır** (reklam banner'ları için). Demo veri bunu da kullanır.

**1. Görselleri yükle**
1. Supabase > **Storage** > **fotograflar** kovasını aç.
2. **Create folder** ile `demo` adında bir klasör oluştur ve içine gir.
3. Bilgisayarındaki `demo-veri/gorseller` klasöründen **83 dosyanın tamamını** seçip sayfaya sürükle (`asci01-0.jpg` ... `asci20-3.jpg` ve 3 adet `reklam-1.jpg` ... `reklam-3.jpg`).

**2. Veriyi ekle**
1. `open -e supabase/demo_veri.sql` yaz, dosyanın içeriğini kopyala.
2. Supabase > **SQL Editor** > yeni sorgu, yapıştır, **Run**. "Success" yazmalı.

Bu SQL tekrar çalıştırılabilir (önce eski demo verisini siler).

**3. Uygulamada gör**
Uygulamanın altında 3 demo reklam bandı dönmeye başlar ("DEMO REKLAM" yazılı). Ana sayfada 17 aşçı "En Sevilen" listesine girer (en az 3 yorumu olanlar). Bir aşçı "yeni" görünür (hiç yorumu yok). Yönetici panelindeki Üyeler sekmesinde de görünürler. Demo reklamlar Reklamlar sekmesinde durur.

## Dikkat
- Demo aşçılar talepleri **cevaplamaz**; bir müşteri onlara talep açarsa bekleyen kalır.
- Giriş yapılamaz: telefon numaraları gerçek değildir ve şifreleri rastgeledir.
- Görseller bu projenin adresine göre hazırlandı (`skuqzizpjtfwgfidksws.supabase.co`). Farklı bir proje kullanırsan adresi `scripts/demo-gorsel-uret.py` içinde değiştirip `python3 scripts/demo-gorsel-uret.py` çalıştır (Python ve Pillow gerekir).

## Yayından önce mutlaka sil
1. `supabase/demo_veri_sil.sql` dosyasını SQL Editor'de çalıştır. Yalnızca demo kayıtları siler, gerçek kullanıcılara dokunmaz.
2. Storage > fotograflar > `demo` klasörünü sil.

## Not
Demo veride kurumsal talep yoktur; kurumsal akışı denemek için bir müşteri hesabıyla talep aç, bir aşçı hesabında Profili Düzenle'den "Kurumsal hizmet" anahtarını aç ve teklif ver.
Demo aşçıların yemekleri ve malzemeleri de eklenir (`schema_16.sql` çalıştırılmışsa).

## Fotoğrafı olmayan mevcut aşçılara avatar
`assets/avatars` içindeki 6 dosyayı Storage > fotograflar > avatar klasörüne yükle, sonra `supabase/avatar_ata.sql` dosyasını SQL Editor'de çalıştır. Fotoğrafı olan aşçılara dokunmaz.
