-- Aşçım Gelsin veritabanı: 16. aşama (aşçının yapacağı yemekler ve malzemeleri)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas. Tekrar çalıştırılabilir.

create table if not exists public.asci_yemekleri (
  id uuid primary key default gen_random_uuid(),
  asci_id uuid not null references public.asci_profilleri (profil_id) on delete cascade,
  ad text not null check (char_length(btrim(ad)) between 2 and 80),
  malzemeler text not null default '' check (char_length(malzemeler) <= 600),
  sira integer not null default 0,
  olusturma_tarihi timestamptz not null default now()
);

create index if not exists asci_yemekleri_asci on public.asci_yemekleri (asci_id, sira);

alter table public.asci_yemekleri enable row level security;

-- Onaylı aşçıların yemekleri herkese açık; onaysız aşçınınkini yalnızca kendisi ve yönetici görür.
drop policy if exists "yemekleri görürüm" on public.asci_yemekleri;
create policy "yemekleri görürüm" on public.asci_yemekleri
  for select using (
    exists (
      select 1 from public.asci_profilleri a
      where a.profil_id = asci_id
        and (a.onayli_mi or a.profil_id = auth.uid() or public.yonetici_mi())
    )
  );
drop policy if exists "aşçı yemek ekler" on public.asci_yemekleri;
create policy "aşçı yemek ekler" on public.asci_yemekleri
  for insert with check (auth.uid() = asci_id);
drop policy if exists "aşçı yemeğini düzenler" on public.asci_yemekleri;
create policy "aşçı yemeğini düzenler" on public.asci_yemekleri
  for update using (auth.uid() = asci_id) with check (auth.uid() = asci_id);
drop policy if exists "aşçı yemeğini siler" on public.asci_yemekleri;
create policy "aşçı yemeğini siler" on public.asci_yemekleri
  for delete using (auth.uid() = asci_id);

revoke all on public.asci_yemekleri from anon, authenticated;
grant select on public.asci_yemekleri to anon, authenticated;
grant insert (asci_id, ad, malzemeler, sira), update (ad, malzemeler, sira), delete on public.asci_yemekleri to authenticated;

-- Bir aşçı en fazla 40 yemek ekleyebilir.
create or replace function public.yemek_siniri()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.asci_yemekleri where asci_id = new.asci_id) >= 40 then
    raise exception 'En fazla 40 yemek ekleyebilirsin';
  end if;
  return new;
end;
$$;
drop trigger if exists yemek_siniri on public.asci_yemekleri;
create trigger yemek_siniri before insert on public.asci_yemekleri
  for each row execute function public.yemek_siniri();
