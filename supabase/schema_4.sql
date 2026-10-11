-- Aşçım Gelsin veritabanı: 4. aşama (aşçı profilleri ve fotoğrafları)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.
-- (3. aşamadaki schema.sql daha önce çalıştırılmış olmalı.)

-- 1) Aşçı profilleri
create table if not exists public.asci_profilleri (
  profil_id uuid primary key references public.profiles (id) on delete cascade,
  tanitim text not null default '' check (char_length(tanitim) <= 1000),
  uzmanliklar text[] not null default '{}',
  semtler text[] not null default '{}',
  baslangic_fiyati integer check (baslangic_fiyati is null or baslangic_fiyati >= 0),
  musait_gunler text[] not null default '{}',
  onayli_mi boolean not null default false,
  guncelleme_tarihi timestamptz not null default now()
);

alter table public.asci_profilleri enable row level security;

-- Aşçı profilleri herkes tarafından okunabilir.
create policy "aşçı profillerini herkes okur" on public.asci_profilleri
  for select using (true);

-- Sadece rolü "asci" olan kullanıcı kendi profilini ekleyebilir.
create policy "aşçı kendi profilini ekler" on public.asci_profilleri
  for insert with check (
    auth.uid() = profil_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'asci')
  );

create policy "aşçı kendi profilini günceller" on public.asci_profilleri
  for update using (auth.uid() = profil_id) with check (auth.uid() = profil_id);

-- "onayli_mi" alanını kullanıcı değiştiremesin (sadece yönetici, ileride).
revoke insert, update on public.asci_profilleri from authenticated;
grant insert (profil_id, tanitim, uzmanliklar, semtler, baslangic_fiyati, musait_gunler, guncelleme_tarihi)
  on public.asci_profilleri to authenticated;
grant update (profil_id, tanitim, uzmanliklar, semtler, baslangic_fiyati, musait_gunler, guncelleme_tarihi)
  on public.asci_profilleri to authenticated;

-- 2) Yemek fotoğrafları (galeri)
create table if not exists public.asci_fotograflari (
  id uuid primary key default gen_random_uuid(),
  asci_id uuid not null references public.asci_profilleri (profil_id) on delete cascade,
  adres text not null,
  sira integer not null default 0,
  olusturma_tarihi timestamptz not null default now()
);

alter table public.asci_fotograflari enable row level security;

create policy "fotoğrafları herkes okur" on public.asci_fotograflari
  for select using (true);
create policy "aşçı kendi fotoğrafını ekler" on public.asci_fotograflari
  for insert with check (auth.uid() = asci_id);
create policy "aşçı kendi fotoğrafını siler" on public.asci_fotograflari
  for delete using (auth.uid() = asci_id);

-- 3) Fotoğraf deposu: herkes görebilir, herkes yalnızca kendi klasörüne yükleyebilir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotograflar', 'fotograflar', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "fotoğraflar herkese açık" on storage.objects
  for select using (bucket_id = 'fotograflar');
create policy "kendi klasörüne yükle" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotograflar' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kendi dosyasını sil" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotograflar' and (storage.foldername(name))[1] = auth.uid()::text);
