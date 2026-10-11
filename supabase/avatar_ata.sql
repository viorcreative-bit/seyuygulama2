-- Profil fotoğrafı olmayan AŞÇILARA hazır avatar atar (kadın ve erkek avatarlar karışık, kişiye göre sabit).
-- Önce 6 avatar dosyası Storage > fotograflar > avatar klasörüne yüklenmiş olmalı (assets/avatars/*.png).
-- Supabase panelinde SQL Editor'e yapıştırıp Run'a bas. Tekrar çalıştırmak güvenlidir (fotoğrafı olanlara dokunmaz).
update public.profiles p
set fotograf = 'https://skuqzizpjtfwgfidksws.supabase.co/storage/v1/object/public/fotograflar/avatar/'
  || (array['kadin1.png', 'kadin2.png', 'kadin3.png', 'erkek1.png', 'erkek2.png', 'erkek3.png'])[1 + (abs(hashtext(p.id::text)) % 6)]
where p.rol = 'asci' and (p.fotograf is null or btrim(p.fotograf) = '');
