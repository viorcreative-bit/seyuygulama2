-- Aşçım Gelsin veritabanı: 3. aşama (kullanıcı profilleri)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null check (rol in ('musteri', 'asci')),
  ad text not null check (char_length(ad) between 2 and 100),
  telefon text,
  fotograf text,
  olusturma_tarihi timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Herkes yalnızca kendi profilini görebilir, ekleyebilir, güncelleyebilir.
-- (Aşçı profilleri 4. aşamada ayrı tabloda herkese açık olacak.)
create policy "kendi profilini oku" on public.profiles
  for select using (auth.uid() = id);

create policy "kendi profilini ekle" on public.profiles
  for insert with check (auth.uid() = id);

-- Rol kayıttan sonra değiştirilemesin diye yalnızca ad ve fotoğraf güncellenebilir.
create policy "kendi profilini güncelle" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (ad, fotograf) on public.profiles to authenticated;
