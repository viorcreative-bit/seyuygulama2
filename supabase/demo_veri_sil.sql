-- Demo verisini siler (örnek aşçılar, müşteriler, talepler, yorumlar). Gerçek kullanıcılara dokunmaz.
delete from auth.users where id::text like 'dddddddd-%';
do $$ begin if to_regclass('public.reklamlar') is not null then delete from public.reklamlar where baslik like 'DEMO %'; end if; end $$;
-- Ardından Storage > fotograflar > demo klasörünü de silmeyi unutma.
