-- Aşçım Gelsin veritabanı: 6. aşama (aşçı talepleri)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.

-- 1) Talepler. Tam adres burada DEĞİL, ayrı tabloda tutulur (KVKK).
create table if not exists public.talepler (
  id uuid primary key default gen_random_uuid(),
  musteri_id uuid not null references public.profiles (id) on delete cascade,
  asci_id uuid not null references public.asci_profilleri (profil_id) on delete cascade,
  semt text not null check (char_length(semt) between 2 and 100),
  tarih timestamptz not null,
  kisi_sayisi integer not null check (kisi_sayisi between 1 and 50),
  mutfak_tercihleri text[] not null default '{}',
  istenen_yemekler text not null default '' check (char_length(istenen_yemekler) <= 1000),
  alerjiler text not null default '' check (char_length(alerjiler) <= 500),
  notlar text not null default '' check (char_length(notlar) <= 1000),
  durum text not null default 'bekliyor'
    check (durum in ('bekliyor', 'kabul', 'red', 'tamamlandi', 'iptal')),
  olusturma_tarihi timestamptz not null default now()
);

alter table public.talepler enable row level security;

-- Talebi yalnızca müşteri ve ilgili aşçı görebilir.
create policy "talebi müşteri ve aşçı görür" on public.talepler
  for select using (auth.uid() = musteri_id or auth.uid() = asci_id);

create policy "müşteri talep oluşturur" on public.talepler
  for insert with check (
    auth.uid() = musteri_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'musteri')
  );

-- Müşteri yalnızca kendi talebini ve yalnızca "iptal" yapabilir.
create policy "müşteri talebini iptal eder" on public.talepler
  for update
  using (auth.uid() = musteri_id and durum in ('bekliyor', 'kabul'))
  with check (auth.uid() = musteri_id and durum = 'iptal');

revoke insert, update on public.talepler from authenticated;
grant insert (musteri_id, asci_id, semt, tarih, kisi_sayisi, mutfak_tercihleri, istenen_yemekler, alerjiler, notlar)
  on public.talepler to authenticated;
grant update (durum) on public.talepler to authenticated;

-- 2) Tam adres: müşteri her zaman görür; aşçı SADECE talebi kabul ettikten sonra görür.
create table if not exists public.talep_adresleri (
  talep_id uuid primary key references public.talepler (id) on delete cascade,
  adres text not null check (char_length(adres) between 5 and 500)
);

alter table public.talep_adresleri enable row level security;

create policy "adresi müşteri görür" on public.talep_adresleri
  for select using (
    exists (select 1 from public.talepler t where t.id = talep_id and t.musteri_id = auth.uid())
  );

create policy "adresi kabul eden aşçı görür" on public.talep_adresleri
  for select using (
    exists (
      select 1 from public.talepler t
      where t.id = talep_id and t.asci_id = auth.uid() and t.durum in ('kabul', 'tamamlandi')
    )
  );

create policy "müşteri adres ekler" on public.talep_adresleri
  for insert with check (
    exists (select 1 from public.talepler t where t.id = talep_id and t.musteri_id = auth.uid())
  );

revoke update, delete on public.talep_adresleri from authenticated;

-- 3) Talep ile adresi tek seferde (ya hep ya hiç) kaydeden fonksiyon.
create or replace function public.talep_olustur(
  p_asci_id uuid,
  p_semt text,
  p_adres text,
  p_tarih timestamptz,
  p_kisi integer,
  p_mutfak text[],
  p_yemekler text,
  p_alerjiler text,
  p_notlar text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_tarih <= now() then
    raise exception 'Tarih gelecekte olmalı';
  end if;

  insert into public.talepler
    (musteri_id, asci_id, semt, tarih, kisi_sayisi, mutfak_tercihleri, istenen_yemekler, alerjiler, notlar)
  values
    (auth.uid(), p_asci_id, p_semt, p_tarih, p_kisi, p_mutfak, p_yemekler, p_alerjiler, p_notlar)
  returning id into v_id;

  insert into public.talep_adresleri (talep_id, adres) values (v_id, p_adres);
  return v_id;
end;
$$;

grant execute on function public.talep_olustur(uuid, text, text, timestamptz, integer, text[], text, text, text)
  to authenticated;
