-- Aşçım Gelsin veritabanı: 19. aşama (yöneticinin üye şifresi belirlemesi)
-- Yönetici panelinden bir aşçının ya da müşterinin şifresi değiştirilebilir. Üye bu şifreyle girince hemen yeni şifre belirler.
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas. Tekrar çalıştırılabilir.

-- Yönetici işlemlerinin kaydı (şifrenin kendisi ASLA saklanmaz). Uygulamadan okunamaz; SQL Editor'den bakılır.
create table if not exists public.yonetici_kayitlari (
  id uuid primary key default gen_random_uuid(),
  yonetici_id uuid references public.profiles (id) on delete set null,
  hedef_id uuid references public.profiles (id) on delete set null,
  islem text not null,
  tarih timestamptz not null default now()
);
alter table public.yonetici_kayitlari enable row level security;
revoke all on public.yonetici_kayitlari from anon, authenticated;

create or replace function public.uye_sifre_degistir(p_id uuid, p_sifre text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.yonetici_mi() then
    raise exception 'Bu işlem için yönetici olmalısın';
  end if;
  if p_id = auth.uid() or exists (select 1 from public.yoneticiler where profil_id = p_id) then
    raise exception 'Yönetici hesaplarının şifresi buradan değiştirilemez';
  end if;
  if not exists (select 1 from auth.users where id = p_id) then
    raise exception 'Üye bulunamadı';
  end if;
  if p_sifre is null or char_length(p_sifre) < 8 or char_length(p_sifre) > 72
     or p_sifre !~ '[A-Za-zÇĞİÖŞÜçğıöşü]' or p_sifre !~ '[0-9]' then
    raise exception 'Şifre en az 8 karakter olmalı ve en az bir harf ile bir rakam içermeli';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_sifre, extensions.gen_salt('bf')),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"sifre_var": true, "gecici_sifre": true}'::jsonb,
      updated_at = now()
  where id = p_id;

  delete from auth.sessions where user_id = p_id; -- açık oturumlar kapanır
  insert into public.yonetici_kayitlari (yonetici_id, hedef_id, islem) values (auth.uid(), p_id, 'sifre_degistirildi');
end;
$$;
revoke execute on function public.uye_sifre_degistir(uuid, text) from public, anon;
grant execute on function public.uye_sifre_degistir(uuid, text) to authenticated;
