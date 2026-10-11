-- Aşçım Gelsin veritabanı: yayına hazırlık
-- (KVKK / kullanım koşulları onayı, hesabı silme, silinen kişilerin fotoğraf temizliği)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.

-- 1) Yasal metin onayı: hangi sürümü ne zaman kabul etti?
alter table public.profiles
  add column if not exists kvkk_onay_surumu text,
  add column if not exists kvkk_onay_tarihi timestamptz;

-- Kayıt sırasında (insert) onay sürümü gönderilir; tarih sunucuda yazılır.
create or replace function public.yasal_onay_tarihi_yaz()
returns trigger
language plpgsql
as $$
begin
  if new.kvkk_onay_surumu is not null
     and (tg_op = 'INSERT' or new.kvkk_onay_surumu is distinct from old.kvkk_onay_surumu) then
    new.kvkk_onay_tarihi := now();
  end if;
  return new;
end;
$$;

drop trigger if exists yasal_onay_tarihi_yaz on public.profiles;
create trigger yasal_onay_tarihi_yaz
  before insert or update on public.profiles
  for each row execute function public.yasal_onay_tarihi_yaz();

-- Mevcut kullanıcı güncellenen metni kabul eder.
create or replace function public.yasal_onayla(p_surum text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Giriş yapmalısın';
  end if;
  update public.profiles set kvkk_onay_surumu = p_surum where id = auth.uid();
end;
$$;
revoke execute on function public.yasal_onayla(text) from public, anon;
grant execute on function public.yasal_onayla(text) to authenticated;

-- 2) Kullanıcı kendi hesabını siler. Devam eden (bekleyen veya kabul edilmiş)
--    talebi varsa karşı tarafı mağdur etmemek için engellenir.
--    DİKKAT: Profil, talepler, yorumlar ve şikayetler de silinir.
create or replace function public.hesabi_sil()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Giriş yapmalısın';
  end if;
  if exists (select 1 from public.yoneticiler where profil_id = auth.uid()) then
    raise exception 'Yönetici hesabı uygulamadan silinemez';
  end if;
  if exists (
    select 1 from public.talepler t
    where (t.musteri_id = auth.uid() or t.asci_id = auth.uid())
      and t.durum in ('bekliyor', 'kabul')
  ) then
    raise exception 'Devam eden talebin var';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.hesabi_sil() from public, anon;
grant execute on function public.hesabi_sil() to authenticated;

-- 3) Yönetici, silinen kişilerin fotoğraf dosyalarını depolamadan temizleyebilir.
drop policy if exists "yönetici dosya siler" on storage.objects;
create policy "yönetici dosya siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotograflar' and public.yonetici_mi());
