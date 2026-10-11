-- Aşçım Gelsin veritabanı: reklam banner'ları
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.
-- (schema_12.sql daha önce çalıştırılmış olmalı.)

create table if not exists public.reklamlar (
  id uuid primary key default gen_random_uuid(),
  baslik text not null check (char_length(baslik) between 2 and 80),
  reklamveren text not null default '' check (char_length(reklamveren) <= 80),
  gorsel_adres text not null check (gorsel_adres ~ '^https://'),
  hedef_adres text check (hedef_adres is null or hedef_adres ~ '^https://'),
  baslangic timestamptz not null default now(),
  bitis timestamptz,
  aktif boolean not null default true,
  sira integer not null default 0,
  gosterim_sayisi integer not null default 0,
  tiklama_sayisi integer not null default 0,
  olusturma_tarihi timestamptz not null default now(),
  check (bitis is null or bitis > baslangic)
);

alter table public.reklamlar enable row level security;

-- Herkes yalnızca YAYINDAKİ (aktif ve tarih aralığı içindeki) reklamları görür; yönetici hepsini görür.
create policy "yayındaki reklamları herkes okur" on public.reklamlar
  for select using (
    (aktif and baslangic <= now() and (bitis is null or bitis > now()))
    or public.yonetici_mi()
  );

-- Reklamları yalnızca yönetici ekler, değiştirir ve siler.
create policy "yönetici reklam ekler" on public.reklamlar
  for insert to authenticated with check (public.yonetici_mi());
create policy "yönetici reklam günceller" on public.reklamlar
  for update to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi());
create policy "yönetici reklam siler" on public.reklamlar
  for delete to authenticated using (public.yonetici_mi());

revoke insert, update, delete on public.reklamlar from anon;

-- Sayaçlar: kişisel veri tutulmaz, yalnızca toplam gösterim ve tıklama sayısı.
create or replace function public.reklam_goster(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reklamlar set gosterim_sayisi = gosterim_sayisi + 1
  where id = p_id and aktif and baslangic <= now() and (bitis is null or bitis > now());
$$;

create or replace function public.reklam_tikla(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reklamlar set tiklama_sayisi = tiklama_sayisi + 1
  where id = p_id and aktif and baslangic <= now() and (bitis is null or bitis > now());
$$;

grant execute on function public.reklam_goster(uuid) to anon, authenticated;
grant execute on function public.reklam_tikla(uuid) to anon, authenticated;

-- Reklam görselleri için herkese açık depo; yalnızca yönetici yükleyip silebilir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reklamlar', 'reklamlar', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "reklam görselleri herkese açık" on storage.objects
  for select using (bucket_id = 'reklamlar');
create policy "yönetici reklam görseli yükler" on storage.objects
  for insert to authenticated with check (bucket_id = 'reklamlar' and public.yonetici_mi());
create policy "yönetici reklam görseli siler" on storage.objects
  for delete to authenticated using (bucket_id = 'reklamlar' and public.yonetici_mi());
