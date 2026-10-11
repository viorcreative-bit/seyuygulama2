-- Demo verisini siler (örnek aşçılar, müşteriler, talepler, yorumlar). Gerçek kullanıcılara dokunmaz.
delete from auth.users where id::text like 'dddddddd-%';
-- Ardından Storage > fotograflar > demo klasörünü de silmeyi unutma.
