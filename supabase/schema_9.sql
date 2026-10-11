-- Aşçım Gelsin veritabanı: yönetici paneli (aşçı onayı ve şikayetler)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.

-- 1) Yöneticiler listesi. Uygulamadan hiç kimse bu tabloya doğrudan erişemez;
--    yönetici ekleme işi yalnızca Supabase SQL Editor'den yapılır.
create table if not exists public.yoneticiler (
  profil_id uuid primary key references public.profiles (id) on delete cascade
);
alter table public.yoneticiler enable row level security;
revoke all on public.yoneticiler from anon, authenticated;

create or replace function public.yonetici_mi()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.yoneticiler where profil_id = auth.uid());
$$;
grant execute on function public.yonetici_mi() to authenticated;

-- 2) Onaylanmamış aşçılar müşterilere görünmez.
--    Aşçı kendi profilini, yönetici ise tüm profilleri görmeye devam eder.
drop policy if exists "aşçı profillerini herkes okur" on public.asci_profilleri;
create policy "onaylı aşçı profilleri okunur" on public.asci_profilleri
  for select using (onayli_mi or auth.uid() = profil_id or public.yonetici_mi());

drop policy if exists "fotoğrafları herkes okur" on public.asci_fotograflari;
create policy "onaylı aşçıların fotoğrafları okunur" on public.asci_fotograflari
  for select using (
    exists (
      select 1 from public.asci_profilleri a
      where a.profil_id = asci_id
        and (a.onayli_mi or a.profil_id = auth.uid() or public.yonetici_mi())
    )
  );

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
  (select count(*) from public.yorumlar y where y.asci_id = a.profil_id)::integer as yorum_sayisi
from public.asci_profilleri a
join public.profiles p on p.id = a.profil_id
where a.onayli_mi;

grant select on public.asci_vitrini to anon, authenticated;

-- 3) Yalnızca onaylı aşçıdan talep açılabilir.
drop policy if exists "müşteri talep oluşturur" on public.talepler;
create policy "müşteri onaylı aşçıdan talep oluşturur" on public.talepler
  for insert with check (
    auth.uid() = musteri_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'musteri')
    and exists (select 1 from public.asci_profilleri a where a.profil_id = asci_id and a.onayli_mi)
  );

-- 4) Yöneticinin aşçı listesi (telefon dahil) ve onay verme/kaldırma işlemi.
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
  a.guncelleme_tarihi
from public.asci_profilleri a
join public.profiles p on p.id = a.profil_id
where public.yonetici_mi();

grant select on public.yonetici_ascilar to authenticated;

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
  update public.asci_profilleri set onayli_mi = p_onayli where profil_id = p_asci_id;
end;
$$;
grant execute on function public.asci_onayla(uuid, boolean) to authenticated;

-- 5) Şikayetler: müşteri veya aşçı, kendisinin dahil olduğu bir talep hakkında şikayet gönderebilir.
create table if not exists public.sikayetler (
  id uuid primary key default gen_random_uuid(),
  talep_id uuid not null references public.talepler (id) on delete cascade,
  sikayet_eden_id uuid not null references public.profiles (id) on delete cascade,
  aciklama text not null check (char_length(btrim(aciklama)) between 10 and 1000),
  durum text not null default 'acik' check (durum in ('acik', 'inceleniyor', 'cozuldu')),
  yonetici_notu text check (yonetici_notu is null or char_length(yonetici_notu) <= 1000),
  olusturma_tarihi timestamptz not null default now(),
  unique (talep_id, sikayet_eden_id)
);

alter table public.sikayetler enable row level security;

create policy "şikayetini kendisi görür" on public.sikayetler
  for select using (auth.uid() = sikayet_eden_id);

create policy "talebe dahil olan şikayet eder" on public.sikayetler
  for insert with check (
    auth.uid() = sikayet_eden_id
    and exists (
      select 1 from public.talepler t
      where t.id = talep_id and (t.musteri_id = auth.uid() or t.asci_id = auth.uid())
    )
  );

revoke insert, update, delete on public.sikayetler from authenticated;
grant insert (talep_id, sikayet_eden_id, aciklama) on public.sikayetler to authenticated;

-- Yöneticinin şikayet listesi. Açık adres ve telefon gösterilmez.
create or replace view public.yonetici_sikayetleri as
select
  s.id,
  s.durum,
  s.aciklama,
  s.yonetici_notu,
  s.olusturma_tarihi,
  se.ad as sikayet_eden_ad,
  se.rol as sikayet_eden_rol,
  case when se.id = t.musteri_id then ap.ad else mp.ad end as karsi_taraf_ad,
  t.tarih as talep_tarihi,
  t.semt as talep_semt
from public.sikayetler s
join public.talepler t on t.id = s.talep_id
join public.profiles se on se.id = s.sikayet_eden_id
join public.profiles mp on mp.id = t.musteri_id
join public.profiles ap on ap.id = t.asci_id
where public.yonetici_mi();

grant select on public.yonetici_sikayetleri to authenticated;

create or replace function public.sikayet_guncelle(p_id uuid, p_durum text, p_not text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yönetici olmalısın';
  end if;
  update public.sikayetler
  set durum = p_durum, yonetici_notu = nullif(btrim(coalesce(p_not, '')), '')
  where id = p_id;
end;
$$;
grant execute on function public.sikayet_guncelle(uuid, text, text) to authenticated;
