-- Aşçım Gelsin veritabanı: 15. aşama (telefon bildirimleri + favoriler)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas. Tekrar çalıştırılabilir.

-- ============ 1) Telefon bildirimleri ============

-- Bildirimleri Supabase'in kendi HTTP eklentisi gönderir (Expo bildirim servisine).
-- Eklenti kurulu değilse (ör. test ortamı) bildirim sessizce atlanır, hiçbir işlem bozulmaz.
do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net kurulamadı: bildirimler gönderilmeyecek (%).', sqlerrm;
end $$;

-- Telefonların bildirim adresleri. Doğrudan erişim yok; yalnızca aşağıdaki işlevlerle.
create table if not exists public.push_tokenlari (
  token text primary key,
  kullanici_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default '',
  guncelleme_tarihi timestamptz not null default now()
);
alter table public.push_tokenlari enable row level security;
revoke all on public.push_tokenlari from anon, authenticated;

create or replace function public.push_kaydet(p_token text, p_platform text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın'; end if;
  if p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then raise exception 'Geçersiz bildirim adresi'; end if;
  insert into public.push_tokenlari (token, kullanici_id, platform)
  values (p_token, auth.uid(), coalesce(left(p_platform, 20), ''))
  on conflict (token) do update
    set kullanici_id = auth.uid(), platform = excluded.platform, guncelleme_tarihi = now();
end;
$$;

create or replace function public.push_sil(p_token text)
returns void
language sql security definer set search_path = public as $$
  delete from public.push_tokenlari where token = p_token and kullanici_id = auth.uid();
$$;

grant execute on function public.push_kaydet(text, text), public.push_sil(text) to authenticated;

-- İç kullanım: kullanıcılara bildirim yollar. Hata olursa yutar (asıl işlem asla bozulmasın).
create or replace function public.bildirim_gonder(p_kullanicilar uuid[], p_baslik text, p_govde text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_mesajlar jsonb;
begin
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return; end if;
  select jsonb_agg(jsonb_build_object('to', token, 'title', p_baslik, 'body', p_govde, 'sound', 'default'))
    into v_mesajlar
  from public.push_tokenlari where kullanici_id = any (p_kullanicilar);
  if v_mesajlar is null then return; end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using 'https://exp.host/--/api/v2/push/send', v_mesajlar,
          '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb;
exception when others then
  raise warning 'Bildirim gönderilemedi: %', sqlerrm;
end;
$$;
revoke execute on function public.bildirim_gonder(uuid[], text, text) from public, anon, authenticated;

-- Bildirim tetikleyicileri. Metinlerde adres veya telefon gibi kişisel bilgi YOKTUR.

create or replace function public.bildirim_talep()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.bildirim_gonder(array[new.asci_id], 'Yeni talep geldi',
      new.semt || ' · ' || new.kisi_sayisi || ' kişilik yemek talebi');
  elsif new.durum is distinct from old.durum then
    if new.durum = 'kabul' then
      perform public.bildirim_gonder(array[new.musteri_id], 'Talebin kabul edildi', 'Aşçı talebini kabul etti.');
    elsif new.durum = 'red' then
      perform public.bildirim_gonder(array[new.musteri_id], 'Talebin reddedildi', 'Aşçı bu talebi karşılayamıyor. Başka bir aşçı seçebilirsin.');
    elsif new.durum = 'iptal' then
      perform public.bildirim_gonder(array[new.asci_id], 'Talep iptal edildi', 'Bir müşteri talebini iptal etti.');
    elsif new.durum = 'tamamlandi' then
      perform public.bildirim_gonder(array[new.musteri_id], 'Hizmet tamamlandı', 'Aşçını yorumlayarak puan verebilirsin.');
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists bildirim_talep_ekle on public.talepler;
create trigger bildirim_talep_ekle after insert on public.talepler
  for each row execute function public.bildirim_talep();
drop trigger if exists bildirim_talep_durum on public.talepler;
create trigger bildirim_talep_durum after update of durum on public.talepler
  for each row execute function public.bildirim_talep();

create or replace function public.bildirim_yorum()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.bildirim_gonder(array[new.asci_id], 'Yeni yorum aldın', new.yildiz || ' yıldızlı yeni bir yorum var.');
  return null;
end;
$$;
drop trigger if exists bildirim_yorum_ekle on public.yorumlar;
create trigger bildirim_yorum_ekle after insert on public.yorumlar
  for each row execute function public.bildirim_yorum();

create or replace function public.bildirim_kurumsal_talep()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_asciler uuid[];
begin
  if tg_op = 'INSERT' then
    select coalesce(array_agg(a.profil_id), '{}') into v_asciler
    from public.asci_profilleri a
    where a.onayli_mi and a.kurumsal_mi and (a.kurumsal_kapasite is null or a.kurumsal_kapasite >= new.kisi_sayisi);
    perform public.bildirim_gonder(v_asciler, 'Yeni kurumsal talep',
      new.semt || ' · ' || new.kisi_sayisi || ' kişilik toplu yemek. Teklif verebilirsin.');
  elsif new.durum = 'iptal' and old.durum is distinct from 'iptal' then
    select coalesce(array_agg(te.asci_id), '{}') into v_asciler
    from public.kurumsal_teklifler te where te.talep_id = new.id;
    perform public.bildirim_gonder(v_asciler, 'Kurumsal talep iptal edildi', 'Teklif verdiğin bir kurumsal talep iptal edildi.');
  end if;
  return null;
end;
$$;
drop trigger if exists bildirim_kurumsal_talep_ekle on public.kurumsal_talepler;
create trigger bildirim_kurumsal_talep_ekle after insert on public.kurumsal_talepler
  for each row execute function public.bildirim_kurumsal_talep();
drop trigger if exists bildirim_kurumsal_talep_durum on public.kurumsal_talepler;
create trigger bildirim_kurumsal_talep_durum after update of durum on public.kurumsal_talepler
  for each row execute function public.bildirim_kurumsal_talep();

create or replace function public.bildirim_kurumsal_teklif()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_musteri uuid;
begin
  if tg_op = 'INSERT' then
    select musteri_id into v_musteri from public.kurumsal_talepler where id = new.talep_id;
    perform public.bildirim_gonder(array[v_musteri], 'Yeni teklif geldi', 'Kurumsal talebin için bir aşçı teklif verdi.');
  elsif new.durum = 'kabul' and old.durum is distinct from 'kabul' then
    perform public.bildirim_gonder(array[new.asci_id], 'Teklifin seçildi', 'Kurumsal talepte teklifin seçildi. Ayrıntılar uygulamada.');
  end if;
  return null;
end;
$$;
drop trigger if exists bildirim_kurumsal_teklif_ekle on public.kurumsal_teklifler;
create trigger bildirim_kurumsal_teklif_ekle after insert on public.kurumsal_teklifler
  for each row execute function public.bildirim_kurumsal_teklif();
drop trigger if exists bildirim_kurumsal_teklif_durum on public.kurumsal_teklifler;
create trigger bildirim_kurumsal_teklif_durum after update of durum on public.kurumsal_teklifler
  for each row execute function public.bildirim_kurumsal_teklif();

-- ============ 2) Favoriler ============

create table if not exists public.favoriler (
  musteri_id uuid not null references public.profiles (id) on delete cascade,
  asci_id uuid not null references public.asci_profilleri (profil_id) on delete cascade,
  olusturma_tarihi timestamptz not null default now(),
  primary key (musteri_id, asci_id)
);
alter table public.favoriler enable row level security;

drop policy if exists "favorilerimi görürüm" on public.favoriler;
create policy "favorilerimi görürüm" on public.favoriler for select using (auth.uid() = musteri_id);
drop policy if exists "favori eklerim" on public.favoriler;
create policy "favori eklerim" on public.favoriler for insert with check (
  auth.uid() = musteri_id
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'musteri')
  and exists (select 1 from public.asci_profilleri a where a.profil_id = asci_id and a.onayli_mi)
);
drop policy if exists "favori silerim" on public.favoriler;
create policy "favori silerim" on public.favoriler for delete using (auth.uid() = musteri_id);

revoke all on public.favoriler from anon, authenticated;
grant select, insert, delete on public.favoriler to authenticated;
