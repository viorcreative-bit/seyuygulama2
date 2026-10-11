-- Aşçım Gelsin veritabanı: yönetici panelinde profil fotoğrafları
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.
-- (schema_10.sql daha önce çalıştırılmış olmalı.)

create or replace view public.yonetici_ascilar as
select
  p.id,
  p.ad,
  p.telefon,
  a.tanitim,
  a.uzmanliklar,
  a.semtler,
  a.baslangic_fiyati,
  a.onayli_mi,
  a.guncelleme_tarihi,
  a.reddedildi_mi,
  a.red_nedeni,
  (select count(*) from public.talepler t where t.asci_id = a.profil_id)::integer as talep_sayisi,
  (select count(*) from public.yorumlar y where y.asci_id = a.profil_id)::integer as yorum_sayisi,
  p.olusturma_tarihi as kayit_tarihi,
  p.fotograf
from public.asci_profilleri a
join public.profiles p on p.id = a.profil_id
where public.yonetici_mi();

grant select on public.yonetici_ascilar to authenticated;

create or replace view public.yonetici_uyeler as
select
  p.id,
  p.ad,
  p.rol,
  p.telefon,
  p.olusturma_tarihi as kayit_tarihi,
  (u.banned_until is not null and u.banned_until > now()) as askida,
  exists (select 1 from public.yoneticiler y where y.profil_id = p.id) as yonetici,
  (select count(*) from public.talepler t where t.musteri_id = p.id or t.asci_id = p.id)::integer as talep_sayisi,
  p.fotograf
from public.profiles p
left join auth.users u on u.id = p.id
where public.yonetici_mi();

grant select on public.yonetici_uyeler to authenticated;
