-- Aşçım Gelsin veritabanı: yönetici paneli genişletmesi
-- (aşçı reddetme, aşçı profili silme, üye yönetimi: askıya alma ve hesap silme)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.
-- (schema_9.sql daha önce çalıştırılmış olmalı.)

-- 1) Reddedilen aşçı bilgisi
alter table public.asci_profilleri
  add column if not exists reddedildi_mi boolean not null default false,
  add column if not exists red_nedeni text check (red_nedeni is null or char_length(red_nedeni) <= 500);

-- Reddedilen aşçı profilini düzenleyip kaydederse, profil yeniden incelemeye düşer.
create or replace function public.asci_profil_red_sifirla()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.profil_id and old.reddedildi_mi
     and (new.tanitim, new.uzmanliklar, new.semtler, new.baslangic_fiyati, new.musait_gunler)
         is distinct from
         (old.tanitim, old.uzmanliklar, old.semtler, old.baslangic_fiyati, old.musait_gunler)
  then
    new.reddedildi_mi := false;
    new.red_nedeni := null;
  end if;
  return new;
end;
$$;

drop trigger if exists asci_profil_red_sifirla on public.asci_profilleri;
create trigger asci_profil_red_sifirla
  before update on public.asci_profilleri
  for each row execute function public.asci_profil_red_sifirla();

-- 2) Yöneticinin aşçı listesi (yeni sütunlar sona eklenir)
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
  p.olusturma_tarihi as kayit_tarihi
from public.asci_profilleri a
join public.profiles p on p.id = a.profil_id
where public.yonetici_mi();

grant select on public.yonetici_ascilar to authenticated;

-- 3) Yöneticinin üye listesi (müşteriler ve aşçılar)
create or replace view public.yonetici_uyeler as
select
  p.id,
  p.ad,
  p.rol,
  p.telefon,
  p.olusturma_tarihi as kayit_tarihi,
  (u.banned_until is not null and u.banned_until > now()) as askida,
  exists (select 1 from public.yoneticiler y where y.profil_id = p.id) as yonetici,
  (select count(*) from public.talepler t where t.musteri_id = p.id or t.asci_id = p.id)::integer as talep_sayisi
from public.profiles p
left join auth.users u on u.id = p.id
where public.yonetici_mi();

grant select on public.yonetici_uyeler to authenticated;

-- 4) Yönetici işlemleri (hepsi yetki kontrolü yapar)

-- Onayla / onayı kaldır (kaldırınca profil tekrar "onay bekliyor" olur)
create or replace function public.asci_onayla(p_asci_id uuid, p_onayli boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yönetici olmalısın';
  end if;
  update public.asci_profilleri
  set onayli_mi = p_onayli, reddedildi_mi = false, red_nedeni = null
  where profil_id = p_asci_id;
end;
$$;
grant execute on function public.asci_onayla(uuid, boolean) to authenticated;

-- Reddet (sebep aşçıya gösterilir)
create or replace function public.asci_reddet(p_asci_id uuid, p_neden text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yönetici olmalısın';
  end if;
  update public.asci_profilleri
  set onayli_mi = false,
      reddedildi_mi = true,
      red_nedeni = nullif(btrim(coalesce(p_neden, '')), '')
  where profil_id = p_asci_id;
end;
$$;
grant execute on function public.asci_reddet(uuid, text) to authenticated;

-- Aşçı profilini sil. Hesap durur; aşçı isterse yeni profil oluşturabilir.
-- DİKKAT: Bu aşçıya ait talepler, yorumlar ve fotoğraf kayıtları da silinir.
create or replace function public.asci_profili_sil(p_asci_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yönetici olmalısın';
  end if;
  delete from public.asci_profilleri where profil_id = p_asci_id;
end;
$$;
grant execute on function public.asci_profili_sil(uuid) to authenticated;

-- Üyeyi askıya al / tekrar aktif et. Askıdaki kişi giriş yapamaz.
create or replace function public.uye_askiya_al(p_id uuid, p_askida boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yönetici olmalısın';
  end if;
  if p_id = auth.uid() or exists (select 1 from public.yoneticiler where profil_id = p_id) then
    raise exception 'Yöneticiler askıya alınamaz';
  end if;
  update auth.users
  set banned_until = case when p_askida then now() + interval '100 years' else null end
  where id = p_id;
  if p_askida then
    delete from auth.sessions where user_id = p_id; -- açık oturumları kapat
  end if;
end;
$$;
grant execute on function public.uye_askiya_al(uuid, boolean) to authenticated;

-- Üyeyi ve tüm verisini (profil, talepler, yorumlar, şikayetler) kalıcı olarak sil.
create or replace function public.uye_sil(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yönetici olmalısın';
  end if;
  if p_id = auth.uid() or exists (select 1 from public.yoneticiler where profil_id = p_id) then
    raise exception 'Yöneticiler silinemez';
  end if;
  delete from auth.users where id = p_id;
end;
$$;
grant execute on function public.uye_sil(uuid) to authenticated;
