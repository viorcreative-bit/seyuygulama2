-- Aşçım Gelsin veritabanı: 8. aşama (yorum ve yıldız sistemi)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.

-- 1) Yorumlar. Her tamamlanmış hizmet (talep) için yalnızca bir yorum olabilir.
create table if not exists public.yorumlar (
  id uuid primary key default gen_random_uuid(),
  talep_id uuid not null unique references public.talepler (id) on delete cascade,
  musteri_id uuid not null references public.profiles (id) on delete cascade,
  asci_id uuid not null references public.asci_profilleri (profil_id) on delete cascade,
  yildiz integer not null check (yildiz between 1 and 5),
  yorum text not null default '' check (char_length(yorum) <= 1000),
  asci_cevabi text check (asci_cevabi is null or char_length(btrim(asci_cevabi)) between 1 and 1000),
  cevap_tarihi timestamptz,
  olusturma_tarihi timestamptz not null default now()
);

alter table public.yorumlar enable row level security;

-- Yorumları herkes okuyabilir.
create policy "yorumları herkes okur" on public.yorumlar
  for select using (true);

-- Müşteri, yalnızca KENDİ ve TAMAMLANMIŞ talebi için, o talebin aşçısına yorum yazabilir.
create policy "müşteri tamamlanan hizmete yorum yazar" on public.yorumlar
  for insert with check (
    auth.uid() = musteri_id
    and exists (
      select 1 from public.talepler t
      where t.id = talep_id
        and t.musteri_id = auth.uid()
        and t.asci_id = yorumlar.asci_id
        and t.durum = 'tamamlandi'
    )
  );

-- Aşçı, kendi yorumuna YALNIZCA BİR KEZ cevap yazabilir (cevap boşken).
create policy "aşçı yorumuna bir kez cevap yazar" on public.yorumlar
  for update
  using (auth.uid() = asci_id and asci_cevabi is null)
  with check (auth.uid() = asci_id);

revoke insert, update on public.yorumlar from authenticated;
grant insert (talep_id, musteri_id, asci_id, yildiz, yorum) on public.yorumlar to authenticated;
grant update (asci_cevabi) on public.yorumlar to authenticated;

-- Cevap tarihi sunucuda otomatik yazılsın.
create or replace function public.yorum_cevap_tarihi()
returns trigger
language plpgsql
as $$
begin
  if new.asci_cevabi is not null and old.asci_cevabi is null then
    new.cevap_tarihi := now();
  end if;
  return new;
end;
$$;

drop trigger if exists yorum_cevap_tarihi on public.yorumlar;
create trigger yorum_cevap_tarihi
  before update on public.yorumlar
  for each row execute function public.yorum_cevap_tarihi();

-- 2) Herkese açık yorum listesi: müşterinin adı kısaltılır ("Ayşe K.").
create or replace view public.yorum_listesi as
select
  y.id,
  y.asci_id,
  case
    when position(' ' in btrim(p.ad)) > 0
      then split_part(btrim(p.ad), ' ', 1) || ' ' || left((regexp_match(btrim(p.ad), '(\S+)$'))[1], 1) || '.'
    else btrim(p.ad)
  end as musteri_ad,
  y.yildiz,
  y.yorum,
  y.asci_cevabi,
  y.cevap_tarihi,
  y.olusturma_tarihi
from public.yorumlar y
join public.profiles p on p.id = y.musteri_id;

grant select on public.yorum_listesi to anon, authenticated;

-- 3) Aşçı vitrinine ortalama puan ve yorum sayısı eklenir.
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
join public.profiles p on p.id = a.profil_id;

grant select on public.asci_vitrini to anon, authenticated;
