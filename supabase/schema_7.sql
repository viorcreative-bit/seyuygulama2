-- Aşçım Gelsin veritabanı: 7. aşama (aşçının talepleri yönetmesi)
-- Supabase panelinde SQL Editor'e yapıştırıp "Run" tuşuna bas.

-- 1) Aşçı, kendisine gelen talebin durumunu değiştirebilir.
create policy "aşçı talebin durumunu günceller" on public.talepler
  for update
  using (auth.uid() = asci_id and durum in ('bekliyor', 'kabul'))
  with check (auth.uid() = asci_id);

-- 2) Durum değişikliği kuralları (veritabanı seviyesinde zorunlu):
--    Aşçı:    bekliyor -> kabul / red,  kabul -> tamamlandi (hizmet tarihinden sonra)
--    Müşteri: bekliyor / kabul -> iptal
create or replace function public.talep_durum_kontrol()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.durum = old.durum then
    return new;
  end if;

  if auth.uid() = old.asci_id then
    if old.durum = 'bekliyor' and new.durum in ('kabul', 'red') then
      return new;
    end if;
    if old.durum = 'kabul' and new.durum = 'tamamlandi' then
      if old.tarih > now() then
        raise exception 'Hizmet tarihinden önce tamamlandı yapılamaz';
      end if;
      return new;
    end if;
  elsif auth.uid() = old.musteri_id then
    if old.durum in ('bekliyor', 'kabul') and new.durum = 'iptal' then
      return new;
    end if;
  end if;

  raise exception 'Bu durum değişikliğine izin verilmiyor';
end;
$$;

drop trigger if exists talep_durum_kontrol on public.talepler;
create trigger talep_durum_kontrol
  before update on public.talepler
  for each row execute function public.talep_durum_kontrol();

-- 3) Aşçının gelen talepler görünümü.
--    Müşterinin yalnızca adı gösterilir (telefon yok). Açık adres yalnızca
--    talep "kabul" veya "tamamlandi" ise dolu gelir (KVKK).
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
  case when t.durum in ('kabul', 'tamamlandi') then a.adres else null end as adres
from public.talepler t
join public.profiles p on p.id = t.musteri_id
left join public.talep_adresleri a on a.talep_id = t.id
where t.asci_id = auth.uid();

revoke all on public.asci_talepleri from anon;
grant select on public.asci_talepleri to authenticated;
