-- Aşçım Gelsin veritabanı: kurumsal (şirketler için toplu yemek) ve teklif sistemi
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.
-- (schema_13.sql daha önce çalıştırılmış olmalı.)
--
-- Akış: Şirket (müşteri hesabı) kurumsal talep açar -> kurumsal hizmet verdiğini işaretleyen,
-- onaylı ve kapasitesi yeten aşçılar kişi başı fiyat teklifi gönderir -> şirket birini seçer ->
-- yalnızca seçilen aşçı adresi ve yetkili kişinin iletişim bilgilerini görür (KVKK).

-- 1) Aşçı profiline kurumsal hizmet bilgisi
alter table public.asci_profilleri
  add column if not exists kurumsal_mi boolean not null default false,
  add column if not exists kurumsal_kapasite integer
    check (kurumsal_kapasite is null or kurumsal_kapasite between 10 and 5000);

grant insert (kurumsal_mi, kurumsal_kapasite) on public.asci_profilleri to authenticated;
grant update (kurumsal_mi, kurumsal_kapasite) on public.asci_profilleri to authenticated;

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
  a.guncelleme_tarihi,
  (select round(avg(y.yildiz)::numeric, 1) from public.yorumlar y where y.asci_id = a.profil_id) as ortalama_puan,
  (select count(*) from public.yorumlar y where y.asci_id = a.profil_id)::integer as yorum_sayisi,
  a.kurumsal_mi,
  a.kurumsal_kapasite
from public.asci_profilleri a
join public.profiles p on p.id = a.profil_id
where a.onayli_mi;

grant select on public.asci_vitrini to anon, authenticated;

-- 2) Tablolar
create table if not exists public.kurumsal_talepler (
  id uuid primary key default gen_random_uuid(),
  musteri_id uuid not null references public.profiles (id) on delete cascade,
  sirket_adi text not null check (char_length(sirket_adi) between 2 and 120),
  semt text not null check (char_length(semt) between 2 and 100),
  baslangic_tarihi timestamptz not null,
  tekrar text not null check (tekrar in ('tek_sefer', 'gunluk', 'haftalik')),
  tekrar_sayisi integer not null default 1 check (tekrar_sayisi between 1 and 365),
  ogun text not null check (ogun in ('kahvalti', 'ogle', 'aksam', 'ikram')),
  kisi_sayisi integer not null check (kisi_sayisi between 10 and 5000),
  butce_kisi_basi integer check (butce_kisi_basi is null or butce_kisi_basi > 0),
  mutfak_tercihleri text[] not null default '{}',
  diyet_notlari text not null default '' check (char_length(diyet_notlari) <= 500),
  notlar text not null default '' check (char_length(notlar) <= 1000),
  son_teklif_tarihi timestamptz not null,
  durum text not null default 'acik' check (durum in ('acik', 'secildi', 'tamamlandi', 'iptal')),
  secilen_teklif_id uuid,
  olusturma_tarihi timestamptz not null default now()
);

create table if not exists public.kurumsal_teklifler (
  id uuid primary key default gen_random_uuid(),
  talep_id uuid not null references public.kurumsal_talepler (id) on delete cascade,
  asci_id uuid not null references public.asci_profilleri (profil_id) on delete cascade,
  kisi_basi_fiyat integer not null check (kisi_basi_fiyat between 1 and 100000),
  mesaj text not null default '' check (char_length(mesaj) <= 1000),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'kabul', 'red')),
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now(),
  unique (talep_id, asci_id)
);

-- Adres ve yetkili kişi bilgileri ayrı ve korumalı tutulur.
create table if not exists public.kurumsal_iletisim (
  talep_id uuid primary key references public.kurumsal_talepler (id) on delete cascade,
  adres text not null check (char_length(adres) between 5 and 500),
  yetkili_ad text not null check (char_length(yetkili_ad) between 2 and 100),
  yetkili_telefon text not null check (char_length(yetkili_telefon) between 7 and 20)
);

alter table public.kurumsal_talepler enable row level security;
alter table public.kurumsal_teklifler enable row level security;
alter table public.kurumsal_iletisim enable row level security;

-- Yazma işlemleri yalnızca aşağıdaki fonksiyonlarla yapılır; tablolara doğrudan yazılamaz.
revoke insert, update, delete on public.kurumsal_talepler, public.kurumsal_teklifler, public.kurumsal_iletisim
  from anon, authenticated;

-- 3) Yardımcı kontroller (güvenlik tanımlı: tablolar arası döngüsel kural sorunlarını önler)
create or replace function public.kurumsal_asci_uygun(p_kisi integer)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.asci_profilleri a
    where a.profil_id = auth.uid() and a.onayli_mi and a.kurumsal_mi
      and (a.kurumsal_kapasite is null or a.kurumsal_kapasite >= p_kisi)
  );
$$;

create or replace function public.kurumsal_talep_sahibi_mi(p_talep uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.kurumsal_talepler where id = p_talep and musteri_id = auth.uid());
$$;

create or replace function public.kurumsal_teklifim_var_mi(p_talep uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.kurumsal_teklifler where talep_id = p_talep and asci_id = auth.uid());
$$;

create or replace function public.kurumsal_secildim_mi(p_talep uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.kurumsal_teklifler
    where talep_id = p_talep and asci_id = auth.uid() and durum = 'kabul'
  );
$$;

grant execute on function public.kurumsal_asci_uygun(integer), public.kurumsal_talep_sahibi_mi(uuid),
  public.kurumsal_teklifim_var_mi(uuid), public.kurumsal_secildim_mi(uuid) to authenticated;

-- 4) Okuma kuralları
create policy "kurumsal talebi kim görür" on public.kurumsal_talepler
  for select using (
    musteri_id = auth.uid()
    or (durum = 'acik' and son_teklif_tarihi > now() and public.kurumsal_asci_uygun(kisi_sayisi))
    or public.kurumsal_teklifim_var_mi(id)
    or public.yonetici_mi()
  );

create policy "kurumsal teklifi kim görür" on public.kurumsal_teklifler
  for select using (
    asci_id = auth.uid()
    or public.kurumsal_talep_sahibi_mi(talep_id)
    or public.yonetici_mi()
  );

create policy "kurumsal iletişimi kim görür" on public.kurumsal_iletisim
  for select using (
    public.kurumsal_talep_sahibi_mi(talep_id)
    or public.kurumsal_secildim_mi(talep_id)
  );

-- Şirketin gördüğü teklif listesi: aşçının adı, fotoğrafı ve puanıyla birlikte.
create or replace view public.kurumsal_teklif_listesi as
select
  te.id,
  te.talep_id,
  te.asci_id,
  p.ad as asci_ad,
  p.fotograf as asci_foto,
  (select round(avg(y.yildiz)::numeric, 1) from public.yorumlar y where y.asci_id = te.asci_id) as ortalama_puan,
  (select count(*) from public.yorumlar y where y.asci_id = te.asci_id)::integer as yorum_sayisi,
  te.kisi_basi_fiyat,
  te.mesaj,
  te.durum,
  te.olusturma_tarihi,
  te.guncelleme_tarihi
from public.kurumsal_teklifler te
join public.profiles p on p.id = te.asci_id
where te.asci_id = auth.uid()
   or public.kurumsal_talep_sahibi_mi(te.talep_id)
   or public.yonetici_mi();

grant select on public.kurumsal_teklif_listesi to authenticated;

-- 5) Yazma işlemleri
create or replace function public.kurumsal_talep_olustur(
  p_sirket text, p_yetkili text, p_telefon text, p_semt text, p_adres text,
  p_baslangic timestamptz, p_tekrar text, p_tekrar_sayisi integer, p_ogun text,
  p_kisi integer, p_butce integer, p_mutfak text[], p_diyet text, p_notlar text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and rol = 'musteri') then
    raise exception 'Kurumsal talep yalnızca müşteri hesabıyla açılabilir';
  end if;
  if p_baslangic < now() + interval '3 days' then
    raise exception 'Başlangıç tarihi en az 3 gün sonra olmalı';
  end if;
  insert into public.kurumsal_talepler
    (musteri_id, sirket_adi, semt, baslangic_tarihi, tekrar, tekrar_sayisi, ogun, kisi_sayisi, butce_kisi_basi,
     mutfak_tercihleri, diyet_notlari, notlar, son_teklif_tarihi)
  values
    (auth.uid(), btrim(p_sirket), btrim(p_semt), p_baslangic, p_tekrar,
     case when p_tekrar = 'tek_sefer' then 1 else p_tekrar_sayisi end, p_ogun, p_kisi, p_butce,
     coalesce(p_mutfak, '{}'), coalesce(p_diyet, ''), coalesce(p_notlar, ''), p_baslangic - interval '1 day')
  returning id into v_id;
  insert into public.kurumsal_iletisim (talep_id, adres, yetkili_ad, yetkili_telefon)
  values (v_id, btrim(p_adres), btrim(p_yetkili), btrim(p_telefon));
  return v_id;
end;
$$;

create or replace function public.kurumsal_teklif_ver(p_talep uuid, p_fiyat integer, p_mesaj text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t public.kurumsal_talepler%rowtype;
  v_id uuid;
begin
  select * into t from public.kurumsal_talepler where id = p_talep;
  if not found or t.durum <> 'acik' or t.son_teklif_tarihi <= now() then
    raise exception 'Bu talep artık teklif almıyor';
  end if;
  if not public.kurumsal_asci_uygun(t.kisi_sayisi) then
    raise exception 'Bu talep için teklif verme yetkin yok';
  end if;
  insert into public.kurumsal_teklifler (talep_id, asci_id, kisi_basi_fiyat, mesaj)
  values (p_talep, auth.uid(), p_fiyat, coalesce(p_mesaj, ''))
  on conflict (talep_id, asci_id) do update
    set kisi_basi_fiyat = excluded.kisi_basi_fiyat, mesaj = excluded.mesaj, guncelleme_tarihi = now()
    where public.kurumsal_teklifler.durum = 'bekliyor'
  returning id into v_id;
  if v_id is null then
    raise exception 'Bu teklif artık değiştirilemez';
  end if;
  return v_id;
end;
$$;

create or replace function public.kurumsal_teklif_geri_cek(p_teklif uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.kurumsal_teklifler te
  using public.kurumsal_talepler t
  where te.id = p_teklif and te.asci_id = auth.uid() and te.durum = 'bekliyor'
    and t.id = te.talep_id and t.durum = 'acik';
  if not found then
    raise exception 'Teklif geri çekilemedi';
  end if;
end;
$$;

create or replace function public.kurumsal_teklif_sec(p_teklif uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  te public.kurumsal_teklifler%rowtype;
  t public.kurumsal_talepler%rowtype;
begin
  select * into te from public.kurumsal_teklifler where id = p_teklif;
  if not found then raise exception 'Teklif bulunamadı'; end if;
  select * into t from public.kurumsal_talepler where id = te.talep_id;
  if t.musteri_id <> auth.uid() then raise exception 'Bu talep sana ait değil'; end if;
  if t.durum <> 'acik' or te.durum <> 'bekliyor' then raise exception 'Bu teklif seçilemez'; end if;
  if t.baslangic_tarihi <= now() then raise exception 'Talebin başlangıç tarihi geçmiş'; end if;
  update public.kurumsal_teklifler set durum = 'kabul', guncelleme_tarihi = now() where id = p_teklif;
  update public.kurumsal_teklifler set durum = 'red', guncelleme_tarihi = now()
    where talep_id = t.id and id <> p_teklif and durum = 'bekliyor';
  update public.kurumsal_talepler set durum = 'secildi', secilen_teklif_id = p_teklif where id = t.id;
end;
$$;

create or replace function public.kurumsal_talep_iptal(p_talep uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.kurumsal_talepler set durum = 'iptal'
  where id = p_talep and musteri_id = auth.uid() and durum in ('acik', 'secildi');
  if not found then raise exception 'Talep iptal edilemedi'; end if;
  update public.kurumsal_teklifler set durum = 'red', guncelleme_tarihi = now()
  where talep_id = p_talep and durum = 'bekliyor';
end;
$$;

-- Seçilen aşçı, son hizmet gününden sonra talebi tamamlandı yapar.
create or replace function public.kurumsal_talep_tamamla(p_talep uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  t public.kurumsal_talepler%rowtype;
  v_son timestamptz;
begin
  select * into t from public.kurumsal_talepler where id = p_talep;
  if not found or t.durum <> 'secildi' or not public.kurumsal_secildim_mi(p_talep) then
    raise exception 'Bu talep tamamlanamaz';
  end if;
  v_son := t.baslangic_tarihi + case t.tekrar
    when 'gunluk' then (t.tekrar_sayisi - 1) * interval '1 day'
    when 'haftalik' then (t.tekrar_sayisi - 1) * interval '7 days'
    else interval '0' end;
  if v_son > now() then raise exception 'Son hizmet gününden önce tamamlanamaz'; end if;
  update public.kurumsal_talepler set durum = 'tamamlandi' where id = p_talep;
end;
$$;

grant execute on function public.kurumsal_talep_olustur(text, text, text, text, text, timestamptz, text, integer, text, integer, integer, text[], text, text),
  public.kurumsal_teklif_ver(uuid, integer, text), public.kurumsal_teklif_geri_cek(uuid),
  public.kurumsal_teklif_sec(uuid), public.kurumsal_talep_iptal(uuid), public.kurumsal_talep_tamamla(uuid)
  to authenticated;

-- 6) Hesap silme: devam eden kurumsal işler de engeller. Uygulama önce bu kontrolü sorar.
create or replace function public.hesap_silme_engeli()
returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return 'Giriş yapmalısın'; end if;
  if exists (select 1 from public.yoneticiler where profil_id = auth.uid()) then
    return 'Yönetici hesabı uygulamadan silinemez';
  end if;
  if exists (
    select 1 from public.talepler t
    where (t.musteri_id = auth.uid() or t.asci_id = auth.uid()) and t.durum in ('bekliyor', 'kabul')
  ) or exists (
    select 1 from public.kurumsal_talepler where musteri_id = auth.uid() and durum in ('acik', 'secildi')
  ) or exists (
    select 1 from public.kurumsal_teklifler te join public.kurumsal_talepler t on t.id = te.talep_id
    where te.asci_id = auth.uid() and te.durum = 'kabul' and t.durum = 'secildi'
  ) then
    return 'Devam eden talebin var';
  end if;
  return null;
end;
$$;
revoke execute on function public.hesap_silme_engeli() from public, anon;
grant execute on function public.hesap_silme_engeli() to authenticated;

create or replace function public.hesabi_sil()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_engel text := public.hesap_silme_engeli();
begin
  if v_engel is not null then
    raise exception '%', v_engel;
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.hesabi_sil() from public, anon;
grant execute on function public.hesabi_sil() to authenticated;

-- 7) Yöneticinin izleme listesi (adres ve telefon içermez)
create or replace view public.yonetici_kurumsal as
select
  t.id,
  t.sirket_adi,
  p.ad as musteri_ad,
  t.semt,
  t.baslangic_tarihi,
  t.tekrar,
  t.tekrar_sayisi,
  t.ogun,
  t.kisi_sayisi,
  t.durum,
  t.olusturma_tarihi,
  (select count(*) from public.kurumsal_teklifler te where te.talep_id = t.id)::integer as teklif_sayisi,
  (select pa.ad from public.kurumsal_teklifler te join public.profiles pa on pa.id = te.asci_id
     where te.id = t.secilen_teklif_id) as secilen_asci
from public.kurumsal_talepler t
join public.profiles p on p.id = t.musteri_id
where public.yonetici_mi();

grant select on public.yonetici_kurumsal to authenticated;
