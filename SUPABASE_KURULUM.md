# Supabase kurulumu (3. aşama)

1. https://supabase.com adresinde ücretsiz hesap aç, **New project** de. Proje adı: `ascim-gelsin`, bölge: **Frankfurt** (Türkiye'ye en yakın), güçlü bir veritabanı şifresi seç ve not al.
2. Proje hazır olunca **SQL Editor → New query** aç, `supabase/schema.sql` dosyasının içeriğini yapıştır, **Run** de. "Success" yazmalı.
3. **Project Settings → API** sayfasından iki değeri kopyala: **Project URL** ve **anon public** anahtar.
4. Proje klasöründe `.env.example` dosyasını kopyalayıp adını `.env` yap, değerleri yapıştır. (`.env` Git'e gitmez.)
5. **Authentication → Providers → Phone**: aç (Enable). Gerçek SMS için bir sağlayıcı (Twilio vb.) gerekir; bu ücretlidir, karar vermeden önce bana danış.
   **Şimdilik test için:** aynı sayfada **Test Phone Numbers and OTPs** bölümüne `905551112233=123456` yaz. Uygulamada 555 111 22 33 numarasını girip kod olarak 123456 yazarsan gerçek SMS olmadan giriş yaparsın.
6. `npx expo start -c` ile uygulamayı yeniden başlat.
