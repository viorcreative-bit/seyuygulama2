-- Aşçım Gelsin veritabanı: 18. aşama (müşteri - aşçı sohbeti)
-- Sohbet yalnızca aralarında bir ilişki olan kişiler arasında açılır: müşterinin talebi olan aşçı,
-- ya da müşterinin açık/kurumsal talebine teklif veren aşçı. Mesajları yalnızca iki taraf görür (yönetici dahil kimse okuyamaz).
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas. Tekrar çalıştırılabilir.

create table if not exists public.sohbetler (
  id uuid primary key default gen_random_uuid(),
  musteri_id uuid not null references public.profiles (id) on delete cascade,
  asci_id uuid not null references public.profiles (id) on delete cascade,
  olusturma_tarihi timestamptz not null default now(),
  son_mesaj_tarihi timestamptz,
  unique (musteri_id, asci_id),
  check (musteri_id <> asci_id)
);

create table if not exists public.mesajlar (
  id uuid primary key default gen_random_uuid(),
  sohbet_id uuid not null references public.sohbetler (id) on delete cascade,
  gonderen_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  metin text not null check (char_length(btrim(metin)) between 1 and 1000),
  olusturma_tarihi timestamptz not null default now(),
  okundu_tarihi timestamptz
);

create index if not exists mesajlar_sohbet on public.mesajlar (sohbet_id, olusturma_tarihi desc);

alter table public.sohbetler enable row level security;
alter table public.mesajlar enable row level security;

create or replace function public.sohbet_katilimcisi_mi(p_sohbet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sohbetler where id = p_sohbet and (musteri_id = auth.uid() or asci_id = auth.uid())
  );
$$;
grant execute on function public.sohbet_katilimcisi_mi(uuid) to authenticated;

drop policy if exists "sohbeti katılımcılar görür" on public.sohbetler;
create policy "sohbeti katılımcılar görür" on public.sohbetler
  for select using (musteri_id = auth.uid() or asci_id = auth.uid());

drop policy if exists "mesajı katılımcılar görür" on public.mesajlar;
create policy "mesajı katılımcılar görür" on public.mesajlar
  for select using (public.sohbet_katilimcisi_mi(sohbet_id));

drop policy if exists "katılımcı mesaj yazar" on public.mesajlar;
create policy "katılımcı mesaj yazar" on public.mesajlar
  for insert with check (gonderen_id = auth.uid() and public.sohbet_katilimcisi_mi(sohbet_id));

revoke all on public.sohbetler, public.mesajlar from anon, authenticated;
grant select on public.sohbetler to authenticated;
grant select on public.mesajlar to authenticated;
grant insert (sohbet_id, metin) on public.mesajlar to authenticated;

-- Hız sınırı (dakikada en fazla 20 mesaj), sohbet zamanını güncelleme ve karşı tarafa bildirim
create or replace function public.mesaj_oncesi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.mesajlar
      where gonderen_id = new.gonderen_id and olusturma_tarihi > now() - interval '1 minute') >= 20 then
    raise exception 'Çok hızlı mesaj gönderiyorsun, biraz bekle';
  end if;
  new.metin := btrim(new.metin);
  return new;
end;
$$;
drop trigger if exists mesaj_oncesi on public.mesajlar;
create trigger mesaj_oncesi before insert on public.mesajlar
  for each row execute function public.mesaj_oncesi();

create or replace function public.mesaj_sonrasi()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s public.sohbetler%rowtype;
  v_ad text;
begin
  update public.sohbetler set son_mesaj_tarihi = new.olusturma_tarihi where id = new.sohbet_id returning * into s;
  select split_part(ad, ' ', 1) into v_ad from public.profiles where id = new.gonderen_id;
  -- Bildirimde mesajın içeriği yer almaz. Bildirim sistemi kurulu değilse sessizce atlanır.
  begin
    perform public.bildirim_dene(
      array[case when s.musteri_id = new.gonderen_id then s.asci_id else s.musteri_id end],
      'Yeni mesaj', coalesce(v_ad, 'Biri') || ' sana mesaj gönderdi.');
  exception when others then
    null;
  end;
  return null;
end;
$$;
drop trigger if exists mesaj_sonrasi on public.mesajlar;
create trigger mesaj_sonrasi after insert on public.mesajlar
  for each row execute function public.mesaj_sonrasi();

-- Sohbet açma: yalnızca gerçek bir ilişki varsa (talep ya da teklif). Aynı çiftin tek sohbeti olur.
create or replace function public.sohbet_ac(p_musteri uuid, p_asci uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from public.sohbetler where musteri_id = p_musteri and asci_id = p_asci;
  if v_id is null then
    insert into public.sohbetler (musteri_id, asci_id) values (p_musteri, p_asci) returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke execute on function public.sohbet_ac(uuid, uuid) from public, anon, authenticated;

create or replace function public.sohbet_baslat_talep(p_talep uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.talepler%rowtype;
begin
  select * into t from public.talepler where id = p_talep;
  if not found or auth.uid() not in (t.musteri_id, t.asci_id) then
    raise exception 'Bu talep için sohbet açılamaz';
  end if;
  return public.sohbet_ac(t.musteri_id, t.asci_id);
end;
$$;

create or replace function public.sohbet_baslat_teklif(p_teklif uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_asci uuid;
  v_musteri uuid;
begin
  select te.asci_id, t.musteri_id into v_asci, v_musteri
  from public.acik_teklifler te join public.acik_talepler t on t.id = te.talep_id
  where te.id = p_teklif;
  if v_asci is null or auth.uid() not in (v_asci, v_musteri) then
    raise exception 'Bu teklif için sohbet açılamaz';
  end if;
  return public.sohbet_ac(v_musteri, v_asci);
end;
$$;

create or replace function public.sohbet_baslat_kurumsal(p_teklif uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_asci uuid;
  v_musteri uuid;
begin
  select te.asci_id, t.musteri_id into v_asci, v_musteri
  from public.kurumsal_teklifler te join public.kurumsal_talepler t on t.id = te.talep_id
  where te.id = p_teklif;
  if v_asci is null or auth.uid() not in (v_asci, v_musteri) then
    raise exception 'Bu teklif için sohbet açılamaz';
  end if;
  return public.sohbet_ac(v_musteri, v_asci);
end;
$$;

create or replace function public.sohbet_okundu(p_sohbet uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sohbet_katilimcisi_mi(p_sohbet) then
    raise exception 'Bu sohbete erişimin yok';
  end if;
  update public.mesajlar set okundu_tarihi = now()
  where sohbet_id = p_sohbet and gonderen_id <> auth.uid() and okundu_tarihi is null;
end;
$$;

grant execute on function public.sohbet_baslat_talep(uuid), public.sohbet_baslat_teklif(uuid),
  public.sohbet_baslat_kurumsal(uuid), public.sohbet_okundu(uuid) to authenticated;

-- Kişinin sohbet listesi: karşı tarafın adı (müşterinin yalnızca ilk adı), fotoğrafı, son mesaj, okunmamış sayısı.
create or replace view public.sohbet_listesi as
select
  s.id,
  case when s.musteri_id = auth.uid() then s.asci_id else s.musteri_id end as diger_id,
  case when s.musteri_id = auth.uid() then pa.ad else split_part(pm.ad, ' ', 1) end as diger_ad,
  case when s.musteri_id = auth.uid() then pa.fotograf else pm.fotograf end as diger_foto,
  (select m.metin from public.mesajlar m where m.sohbet_id = s.id order by m.olusturma_tarihi desc limit 1) as son_mesaj,
  s.son_mesaj_tarihi,
  (select count(*) from public.mesajlar m
     where m.sohbet_id = s.id and m.gonderen_id <> auth.uid() and m.okundu_tarihi is null)::integer as okunmamis,
  s.olusturma_tarihi
from public.sohbetler s
join public.profiles pm on pm.id = s.musteri_id
join public.profiles pa on pa.id = s.asci_id
where s.musteri_id = auth.uid() or s.asci_id = auth.uid();

grant select on public.sohbet_listesi to authenticated;

-- Anlık mesajlaşma (Supabase Realtime). Kurulamazsa uygulama yine de kısa aralıklarla yeniler.
do $$ begin
  alter publication supabase_realtime add table public.mesajlar;
exception when others then
  raise notice 'Realtime yayını eklenemedi veya zaten ekli: %', sqlerrm;
end $$;
