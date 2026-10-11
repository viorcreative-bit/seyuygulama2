-- Aşçım Gelsin veritabanı: 5. aşama (müşterinin gördüğü aşçı vitrini)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.
--
-- profiles tablosu gizlidir (telefon numarası içerir). Bu görünüm, aşçıların
-- yalnızca herkese açık bilgilerini (ad, fotoğraf, tanıtım...) paylaşır.
-- Telefon numarası bilerek eklenmemiştir (KVKK).

create or replace view public.asci_vitrini as
select
  p.id,
  p.ad,
  p.fotograf,
  a.tanitim,
  a.uzmanliklar,
  a.semtler,
  a.baslangic_fiyati,
  a.musait_gunler,
  a.onayli_mi,
  a.guncelleme_tarihi
from public.asci_profilleri a
join public.profiles p on p.id = a.profil_id;

grant select on public.asci_vitrini to anon, authenticated;
