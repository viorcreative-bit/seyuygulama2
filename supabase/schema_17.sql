-- Aşçım Gelsin veritabanı: 17. aşama (açık talep ve aşçı teklifleri)
-- Müşteri istediği yemekleri, günü ve saati yazarak talep açar; onaylı aşçılar toplam fiyat teklifi verir;
-- müşteri bir teklifi seçince normal bir talep (talepler tablosu) oluşur ve mevcut akış (kabul, tamamlandı, yorum) devam eder.
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas. Tekrar çalıştırılabilir.

-- 1) Seçilen tekliften oluşan talepte anlaşılan fiyat (kullanıcılar bu sütuna yazamaz; yalnızca aşağıdaki işlev yazar)
alter table public.talepler add column if not exists teklif_fiyati integer check (teklif_fiyati is null or teklif_fiyati > 0);

-- 2) Tablolar
create table if not exists public.acik_talepler (
  id uuid primary key default gen_random_uuid(),
  musteri_id uuid not null references public.profiles (id) on delete cascade,
  semt text not null check (char_length(btrim(semt)) between 2 and 100),
  tarih timestamptz not null,
  kisi_sayisi integer not null check (kisi_sayisi between 1 and 50),
  mutfak_tercihleri text[] not null default '{}',
  istenen_yemekler text not null check (char_length(btrim(istenen_yemekler)) between 3 and 1000),
  alerjiler text not null default '' check (char_length(alerjiler) <= 500),
  notlar text not null default '' check (char_length(notlar) <= 1000),
  durum text not null default 'acik' check (durum in ('acik', 'secildi', 'iptal')),
  secilen_teklif_id uuid,
  talep_id uuid references public.talepler (id) on delete set null,
  olusturma_tarihi timestamptz not null default now()
);

create table if not exists public.acik_talep_adresleri (
  talep_id uuid primary key references public.acik_talepler (id) on delete cascade,
  adres text not null check (char_length(adres) between 5 and 500)
);

create table if not exists public.acik_teklifler (
  id uuid primary key default gen_random_uuid(),
  talep_id uuid not null references public.acik_talepler (id) on delete cascade,
  asci_id uuid not null references public.asci_profilleri (profil_id) on delete cascade,
  fiyat integer not null check (fiyat between 1 and 1000000),
  mesaj text not null default '' check (char_length(mesaj) <= 1000),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'kabul', 'red')),
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now(),
  unique (talep_id, asci_id)
);

create index if not exists acik_talepler_durum on public.acik_talepler (durum, tarih);
create index if not exists acik_teklifler_talep on public.acik_teklifler (talep_id);

alter table public.acik_talepler enable row level security;
alter table public.acik_talep_adresleri enable row level security;
alter table public.acik_teklifler enable row level security;

revoke all on public.acik_talepler, public.acik_talep_adresleri, public.acik_teklifler from anon, authenticated;
grant select on public.acik_talepler, public.acik_talep_adresleri, public.acik_teklifler to authenticated;

-- 3) Yardımcı kontroller
create or replace function public.acik_asci_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.asci_profilleri a where a.profil_id = auth.uid() and a.onayli_mi);
$$;

create or replace function public.acik_talep_sahibi_mi(p_talep uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acik_talepler where id = p_talep and musteri_id = auth.uid());
$$;

create or replace function public.acik_teklifim_var_mi(p_talep uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acik_teklifler where talep_id = p_talep and asci_id = auth.uid());
$$;

grant execute on function public.acik_asci_mi(), public.acik_talep_sahibi_mi(uuid), public.acik_teklifim_var_mi(uuid)
  to authenticated;

-- 4) Okuma kuralları. Aşçı talepte müşterinin adını ve açık adresini görmez (seçilince normal talep olarak görür).
drop policy if exists "açık talebi kim görür" on public.acik_talepler;
create policy "açık talebi kim görür" on public.acik_talepler
  for select using (
    musteri_id = auth.uid()
    or (durum = 'acik' and tarih > now() and public.acik_asci_mi())
    or public.acik_teklifim_var_mi(id)
    or public.yonetici_mi()
  );

drop policy if exists "açık teklifi kim görür" on public.acik_teklifler;
create policy "açık teklifi kim görür" on public.acik_teklifler
  for select using (
    asci_id = auth.uid()
    or public.acik_talep_sahibi_mi(talep_id)
    or public.yonetici_mi()
  );

drop policy if exists "açık talep adresini sahibi görür" on public.acik_talep_adresleri;
create policy "açık talep adresini sahibi görür" on public.acik_talep_adresleri
  for select using (public.acik_talep_sahibi_mi(talep_id));

-- Müşterinin gördüğü teklif listesi: aşçının adı, fotoğrafı ve puanıyla birlikte.
create or replace view public.acik_teklif_listesi as
select
  te.id,
  te.talep_id,
  te.asci_id,
  p.ad as asci_ad,
  p.fotograf as asci_foto,
  (select round(avg(y.yildiz)::numeric, 1) from public.yorumlar y where y.asci_id = te.asci_id) as ortalama_puan,
  (select count(*) from public.yorumlar y where y.asci_id = te.asci_id)::integer as yorum_sayisi,
  te.fiyat,
  te.mesaj,
  te.durum,
  te.olusturma_tarihi,
  te.guncelleme_tarihi
from public.acik_teklifler te
join public.profiles p on p.id = te.asci_id
where te.asci_id = auth.uid()
   or public.acik_talep_sahibi_mi(te.talep_id)
   or public.yonetici_mi();

grant select on public.acik_teklif_listesi to authenticated;

-- 5) Yazma işlemleri
create or replace function public.acik_talep_olustur(
  p_semt text, p_adres text, p_tarih timestamptz, p_kisi integer,
  p_mutfak text[], p_yemekler text, p_alerjiler text, p_notlar text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and rol = 'musteri') then
    raise exception 'Talep yalnızca müşteri hesabıyla açılabilir';
  end if;
  if p_tarih < now() + interval '2 hours' then
    raise exception 'Tarih ve saat en az 2 saat sonrası olmalı';
  end if;
  if (select count(*) from public.acik_talepler where musteri_id = auth.uid() and durum = 'acik' and tarih > now()) >= 5 then
    raise exception 'En fazla 5 açık talebin olabilir';
  end if;
  insert into public.acik_talepler
    (musteri_id, semt, tarih, kisi_sayisi, mutfak_tercihleri, istenen_yemekler, alerjiler, notlar)
  values
    (auth.uid(), btrim(p_semt), p_tarih, p_kisi, coalesce(p_mutfak, '{}'), btrim(p_yemekler),
     coalesce(p_alerjiler, ''), coalesce(p_notlar, ''))
  returning id into v_id;
  insert into public.acik_talep_adresleri (talep_id, adres) values (v_id, btrim(p_adres));
  return v_id;
end;
$$;

create or replace function public.acik_teklif_ver(p_talep uuid, p_fiyat integer, p_mesaj text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t public.acik_talepler%rowtype;
  v_id uuid;
begin
  select * into t from public.acik_talepler where id = p_talep;
  if not found or t.durum <> 'acik' or t.tarih <= now() then
    raise exception 'Bu talep artık teklif almıyor';
  end if;
  if not public.acik_asci_mi() then
    raise exception 'Teklif vermek için onaylı bir aşçı olmalısın';
  end if;
  insert into public.acik_teklifler (talep_id, asci_id, fiyat, mesaj)
  values (p_talep, auth.uid(), p_fiyat, coalesce(p_mesaj, ''))
  on conflict (talep_id, asci_id) do update
    set fiyat = excluded.fiyat, mesaj = excluded.mesaj, guncelleme_tarihi = now()
    where public.acik_teklifler.durum = 'bekliyor'
  returning id into v_id;
  if v_id is null then
    raise exception 'Bu teklif artık değiştirilemez';
  end if;
  return v_id;
end;
$$;

create or replace function public.acik_teklif_geri_cek(p_teklif uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.acik_teklifler te
  using public.acik_talepler t
  where te.id = p_teklif and te.asci_id = auth.uid() and te.durum = 'bekliyor'
    and t.id = te.talep_id and t.durum = 'acik';
  if not found then
    raise exception 'Teklif geri çekilemedi';
  end if;
end;
$$;

-- Müşteri teklifi seçer: diğer teklifler reddedilir ve seçilen aşçıyla "kabul edilmiş" normal bir talep oluşur.
create or replace function public.acik_teklif_sec(p_teklif uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  te public.acik_teklifler%rowtype;
  t public.acik_talepler%rowtype;
  v_adres text;
  v_talep uuid;
begin
  select * into te from public.acik_teklifler where id = p_teklif;
  if not found then raise exception 'Teklif bulunamadı'; end if;
  select * into t from public.acik_talepler where id = te.talep_id;
  if t.musteri_id <> auth.uid() then raise exception 'Bu talep sana ait değil'; end if;
  if t.durum <> 'acik' or te.durum <> 'bekliyor' then raise exception 'Bu teklif seçilemez'; end if;
  if t.tarih <= now() then raise exception 'Talebin tarihi geçmiş'; end if;
  select adres into v_adres from public.acik_talep_adresleri where talep_id = t.id;

  insert into public.talepler
    (musteri_id, asci_id, semt, tarih, kisi_sayisi, mutfak_tercihleri, istenen_yemekler, alerjiler, notlar, durum, teklif_fiyati)
  values
    (t.musteri_id, te.asci_id, t.semt, t.tarih, t.kisi_sayisi, t.mutfak_tercihleri, t.istenen_yemekler,
     t.alerjiler, t.notlar, 'kabul', te.fiyat)
  returning id into v_talep;
  insert into public.talep_adresleri (talep_id, adres) values (v_talep, v_adres);

  update public.acik_teklifler set durum = 'kabul', guncelleme_tarihi = now() where id = p_teklif;
  update public.acik_teklifler set durum = 'red', guncelleme_tarihi = now()
    where talep_id = t.id and id <> p_teklif and durum = 'bekliyor';
  update public.acik_talepler set durum = 'secildi', secilen_teklif_id = p_teklif, talep_id = v_talep where id = t.id;
  return v_talep;
end;
$$;

create or replace function public.acik_talep_iptal(p_talep uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.acik_talepler set durum = 'iptal'
  where id = p_talep and musteri_id = auth.uid() and durum = 'acik';
  if not found then raise exception 'Talep iptal edilemedi'; end if;
  update public.acik_teklifler set durum = 'red', guncelleme_tarihi = now()
  where talep_id = p_talep and durum = 'bekliyor';
end;
$$;

grant execute on function
  public.acik_talep_olustur(text, text, timestamptz, integer, text[], text, text, text),
  public.acik_teklif_ver(uuid, integer, text), public.acik_teklif_geri_cek(uuid),
  public.acik_teklif_sec(uuid), public.acik_talep_iptal(uuid)
  to authenticated;

-- 6) Aşçının "gelen talepler" görünümüne anlaşılan fiyat eklenir (sona eklenen sütun).
create or replace view public.asci_talepleri as
select
  t.id,
  t.asci_id,
  p.ad as musteri_ad,
  t.semt,
  t.tarih,
  t.kisi_sayisi,
  t.mutfak_tercihleri,
  t.istenen_yemekler,
  t.alerjiler,
  t.notlar,
  t.durum,
  t.olusturma_tarihi,
  case when t.durum in ('kabul', 'tamamlandi') then a.adres else null end as adres,
  t.teklif_fiyati
from public.talepler t
join public.profiles p on p.id = t.musteri_id
left join public.talep_adresleri a on a.talep_id = t.id
where t.asci_id = auth.uid();

-- 7) Bildirimler (bildirimlerin gitmesi için schema_15.sql de çalıştırılmış olmalı; çalıştırılmadıysa talep yine de sorunsuz açılır)
-- Bildirim gönderilemese bile asıl işlem (talep, teklif) asla bozulmasın.
create or replace function public.bildirim_dene(p_kullanicilar uuid[], p_baslik text, p_govde text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.bildirim_gonder(p_kullanicilar, p_baslik, p_govde);
exception when others then
  raise warning 'Bildirim atlandı: %', sqlerrm;
end;
$$;
revoke execute on function public.bildirim_dene(uuid[], text, text) from public, anon, authenticated;

-- Seçilen tekliften doğan talep için "yeni talep" bildirimi gitmesin (aşçıya ayrıca "teklifin seçildi" gider).
create or replace function public.bildirim_talep()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.durum = 'bekliyor' then
      perform public.bildirim_dene(array[new.asci_id], 'Yeni talep geldi',
        new.semt || ' · ' || new.kisi_sayisi || ' kişilik yemek talebi');
    end if;
  elsif new.durum is distinct from old.durum then
    if new.durum = 'kabul' then
      perform public.bildirim_dene(array[new.musteri_id], 'Talebin kabul edildi', 'Aşçı talebini kabul etti.');
    elsif new.durum = 'red' then
      perform public.bildirim_dene(array[new.musteri_id], 'Talebin reddedildi', 'Aşçı bu talebi karşılayamıyor. Başka bir aşçı seçebilirsin.');
    elsif new.durum = 'iptal' then
      perform public.bildirim_dene(array[new.asci_id], 'Talep iptal edildi', 'Bir müşteri talebini iptal etti.');
    elsif new.durum = 'tamamlandi' then
      perform public.bildirim_dene(array[new.musteri_id], 'Hizmet tamamlandı', 'Aşçını yorumlayarak puan verebilirsin.');
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.bildirim_acik_talep()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_asciler uuid[];
begin
  if tg_op = 'INSERT' then
    select coalesce(array_agg(a.profil_id), '{}') into v_asciler from public.asci_profilleri a where a.onayli_mi;
    perform public.bildirim_dene(v_asciler, 'Yeni müşteri talebi',
      new.semt || ' · ' || new.kisi_sayisi || ' kişilik. Teklif verebilirsin.');
  elsif new.durum = 'iptal' and old.durum is distinct from 'iptal' then
    select coalesce(array_agg(te.asci_id), '{}') into v_asciler from public.acik_teklifler te where te.talep_id = new.id;
    perform public.bildirim_dene(v_asciler, 'Talep iptal edildi', 'Teklif verdiğin bir müşteri talebi iptal edildi.');
  end if;
  return null;
end;
$$;
drop trigger if exists bildirim_acik_talep_ekle on public.acik_talepler;
create trigger bildirim_acik_talep_ekle after insert on public.acik_talepler
  for each row execute function public.bildirim_acik_talep();
drop trigger if exists bildirim_acik_talep_durum on public.acik_talepler;
create trigger bildirim_acik_talep_durum after update of durum on public.acik_talepler
  for each row execute function public.bildirim_acik_talep();

create or replace function public.bildirim_acik_teklif()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_musteri uuid;
begin
  if tg_op = 'INSERT' then
    select musteri_id into v_musteri from public.acik_talepler where id = new.talep_id;
    perform public.bildirim_dene(array[v_musteri], 'Yeni teklif geldi', 'Talebin için bir aşçı teklif verdi.');
  elsif new.durum = 'kabul' and old.durum is distinct from 'kabul' then
    perform public.bildirim_dene(array[new.asci_id], 'Teklifin seçildi', 'Müşteri teklifini seçti. Talep, Doğrudan talepler bölümünde.');
  end if;
  return null;
end;
$$;
drop trigger if exists bildirim_acik_teklif_ekle on public.acik_teklifler;
create trigger bildirim_acik_teklif_ekle after insert on public.acik_teklifler
  for each row execute function public.bildirim_acik_teklif();
drop trigger if exists bildirim_acik_teklif_durum on public.acik_teklifler;
create trigger bildirim_acik_teklif_durum after update of durum on public.acik_teklifler
  for each row execute function public.bildirim_acik_teklif();
