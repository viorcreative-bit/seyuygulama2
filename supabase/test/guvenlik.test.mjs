import { kur, semalar } from './kur.mjs';
const db = await kur();
await semalar(db, ['schema.sql','schema_4.sql','schema_5.sql','schema_6.sql','schema_7.sql','schema_8.sql','schema_9.sql','schema_10.sql','schema_11.sql','schema_12.sql','schema_13.sql','demo_veri.sql']);
const U = (n) => `dddddddd-0000-4000-8000-${n}`;
const ASCI = U('000000000001'), ASCI2 = U('000000000002'), MUS = U('001000000001'), MUS2 = U('001000000002');
const YENI = 'eeeeeeee-0000-4000-8000-000000000001', ADM = 'eeeeeeee-0000-4000-8000-000000000009';
// onaysız aşçı ve yönetici (süper kullanıcı olarak)
await db.exec(`
  insert into auth.users (id, phone) values ('${YENI}','90111'),('${ADM}','90222');
  insert into profiles (id, rol, ad, telefon, kvkk_onay_surumu) values ('${YENI}','asci','Onaysiz Asci','+90111','x'),('${ADM}','musteri','Yonetici','+90222','x');
  insert into asci_profilleri (profil_id, tanitim) values ('${YENI}','merhaba');
  insert into yoneticiler (profil_id) values ('${ADM}');`);

let gecen = 0, kalan = 0;
const kontrol = (ad, ok, ek = '') => { (ok ? gecen++ : kalan++); console.log(ok ? 'GEÇTİ ' : 'KALDI ', ad, ek); };
const olarak = async (uid, f) => { await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);`); try { return await f(); } finally { await db.exec('reset role'); } };
const dene = async (sql) => { try { const r = await db.query(sql); return { ok: true, rows: r.rows }; } catch (e) { return { ok: false, hata: e.message }; } };
const gelecek = "now() + interval '3 days'";
const rpcTalep = (asci) => `select talep_olustur('${asci}'::uuid,'Kadıköy','Cd. No 5 Daire 2', ${gelecek}, 4, array['Ege'], 'x','', '')`;

// --- Görünürlük
await olarak(MUS, async () => {
  kontrol('müşteri onaysız aşçıyı vitrinde GÖRMEZ', (await db.query(`select 1 from asci_vitrini where id='${YENI}'`)).rows.length === 0);
  kontrol('müşteri onaysız aşçı tablosunu GÖRMEZ', (await db.query(`select 1 from asci_profilleri where profil_id='${YENI}'`)).rows.length === 0);
  kontrol('müşteri başkasının profiles satırını GÖRMEZ', (await db.query(`select 1 from profiles where id='${MUS2}'`)).rows.length === 0);
  kontrol('müşteri telefon içeren yonetici_ascilar görünümünde 0 satır görür', (await db.query(`select 1 from yonetici_ascilar`)).rows.length === 0);
});
await olarak(YENI, async () => kontrol('onaysız aşçı KENDİ profilini görür', (await db.query(`select 1 from asci_profilleri where profil_id='${YENI}'`)).rows.length === 1));

// --- Talep
let r;
await olarak(MUS, async () => {
  r = await dene(rpcTalep(YENI)); kontrol('onaysız aşçıdan talep AÇILAMAZ', !r.ok, r.hata?.slice(0, 60));
  r = await dene(rpcTalep(ASCI)); kontrol('onaylı aşçıdan talep açılır', r.ok, r.hata ?? '');
});
const tid = (await db.query(`select id from talepler where musteri_id='${MUS}' and durum='bekliyor'`)).rows[0]?.id;
await olarak(ASCI, async () => {
  r = await dene(`update talepler set durum='tamamlandi' where id='${tid}'`); kontrol('aşçı bekleyeni doğrudan "tamamlandı" yapamaz', !r.ok, r.hata?.slice(0, 50));
  r = await dene(`update talepler set durum='kabul' where id='${tid}'`); kontrol('aşçı bekleyen talebi kabul eder', r.ok, r.hata ?? '');
  r = await dene(`update talepler set durum='tamamlandi' where id='${tid}'`); kontrol('aşçı gelecekteki hizmeti "tamamlandı" yapamaz', !r.ok, r.hata?.slice(0, 50));
});
await olarak(ASCI2, async () => {
  r = await dene(`update talepler set durum='red' where id='${tid}'`); kontrol('başka aşçı bu talebe dokunamaz (0 satır)', r.ok && (await db.query(`select durum from talepler where id='${tid}'`)).rows.length === 0 || !r.ok);
});

// --- Adres gizliliği
let adres = (await db.query(`select adres from asci_talepleri`).catch(() => null));
await olarak(ASCI, async () => {
  const a = (await db.query(`select durum, adres from asci_talepleri where id='${tid}'`)).rows[0];
  kontrol('kabul sonrası aşçı açık adresi görür', a?.adres === 'Cd. No 5 Daire 2', JSON.stringify(a));
});
await olarak(MUS, async () => { r = await dene(`update talepler set durum='iptal' where id='${tid}'`); kontrol('müşteri kabul edilmiş talebi iptal eder', r.ok, r.hata ?? ''); });
await olarak(MUS, async () => { r = await dene(rpcTalep(ASCI)); });
const tid2 = (await db.query(`select id from talepler where musteri_id='${MUS}' and durum='bekliyor'`)).rows[0]?.id;
await olarak(ASCI, async () => {
  const a = (await db.query(`select adres from asci_talepleri where id='${tid2}'`)).rows[0];
  kontrol('bekleyen talepte aşçı adresi GÖRMEZ', a && a.adres === null, JSON.stringify(a));
  r = await dene(`select adres from talep_adresleri where talep_id='${tid2}'`); kontrol('aşçı talep_adresleri tablosundan da okuyamaz', r.ok && r.rows.length === 0);
});

// --- Yorum
await db.exec(`alter table talepler disable trigger talep_durum_kontrol; update talepler set durum='tamamlandi', tarih=now()-interval '2 days' where id='${tid2}'; alter table talepler enable trigger talep_durum_kontrol;`);
await olarak(MUS2, async () => { r = await dene(`insert into yorumlar (talep_id, musteri_id, asci_id, yildiz) values ('${tid2}','${MUS2}','${ASCI}',5)`); kontrol('başkasının talebine yorum yazılamaz', !r.ok); });
await olarak(MUS, async () => {
  r = await dene(`insert into yorumlar (talep_id, musteri_id, asci_id, yildiz, yorum) values ('${tid2}','${MUS}','${ASCI}',5,'süper')`); kontrol('tamamlanan hizmete yorum yazılır', r.ok, r.hata ?? '');
  r = await dene(`insert into yorumlar (talep_id, musteri_id, asci_id, yildiz) values ('${tid2}','${MUS}','${ASCI}',4)`); kontrol('aynı hizmete 2. yorum yazılamaz', !r.ok);
  r = await dene(`update yorumlar set yildiz=1 where talep_id='${tid2}'`); kontrol('müşteri yorumunu sonradan değiştiremez', !r.ok || (await db.query(`select yildiz from yorumlar where talep_id='${tid2}'`)).rows[0].yildiz === 5);
});
const yid = (await db.query(`select id from yorumlar where talep_id='${tid2}'`)).rows[0]?.id;
await olarak(ASCI, async () => {
  r = await dene(`update yorumlar set asci_cevabi='Teşekkürler' where id='${yid}'`); kontrol('aşçı yoruma cevap yazar', r.ok, r.hata ?? '');
  r = await dene(`update yorumlar set asci_cevabi='Değiştirdim' where id='${yid}'`);
  kontrol('aşçı ikinci kez cevap yazamaz', (await db.query(`select asci_cevabi from yorumlar where id='${yid}'`)).rows[0].asci_cevabi === 'Teşekkürler');
  r = await dene(`update yorumlar set yildiz=1 where id='${yid}'`); kontrol('aşçı yıldızı değiştiremez', !r.ok);
});
kontrol('cevap tarihi sunucuda yazıldı', (await db.query(`select cevap_tarihi from yorumlar where id='${yid}'`)).rows[0].cevap_tarihi != null);

// --- Yönetici ve şikayet
await olarak(MUS2, async () => { r = await dene(`select asci_onayla('${YENI}'::uuid, true)`); kontrol('yönetici olmayan onay VEREMEZ', !r.ok, r.hata?.slice(0, 50)); });
await olarak(ADM, async () => {
  kontrol('yönetici yonetici_ascilar listesini görür', (await db.query(`select 1 from yonetici_ascilar`)).rows.length === 21);
  r = await dene(`select asci_onayla('${YENI}'::uuid, true)`); kontrol('yönetici aşçıyı onaylar', r.ok, r.hata ?? '');
  r = await dene(`select asci_reddet('${YENI}'::uuid, 'Fotoğraf eksik')`); kontrol('yönetici aşçıyı reddeder', r.ok, r.hata ?? '');
  r = await dene(`select uye_sil('${ADM}'::uuid)`); kontrol('yönetici kendini silemez', !r.ok);
  r = await dene(`select uye_askiya_al('${MUS2}'::uuid, true)`); kontrol('yönetici üyeyi askıya alır', r.ok, r.hata ?? '');
});
kontrol('reddedilen aşçı bayrağı yazıldı', (await db.query(`select reddedildi_mi, onayli_mi from asci_profilleri where profil_id='${YENI}'`)).rows[0].reddedildi_mi === true);
await olarak(YENI, async () => {
  await dene(`update asci_profilleri set tanitim='yeni metin' where profil_id='${YENI}'`);
  kontrol('reddedilen aşçı profili düzenleyince yeniden incelemeye düşer', (await db.query(`select reddedildi_mi from asci_profilleri where profil_id='${YENI}'`)).rows[0].reddedildi_mi === false);
  r = await dene(`update asci_profilleri set onayli_mi=true where profil_id='${YENI}'`); kontrol('aşçı kendi kendini ONAYLAYAMAZ', !r.ok, r.hata?.slice(0, 50));
});
await olarak(MUS, async () => {
  r = await dene(`insert into sikayetler (talep_id, sikayet_eden_id, aciklama) values ('${tid2}','${MUS}','Uzun bir şikayet metni burada')`); kontrol('müşteri kendi talebi için şikayet eder', r.ok, r.hata ?? '');
  r = await dene(`insert into sikayetler (talep_id, sikayet_eden_id, aciklama) values ('${tid2}','${MUS}','İkinci şikayet metni de uzun')`); kontrol('aynı talep için 2. şikayet yok', !r.ok);
  kontrol('müşteri yonetici_sikayetleri görünümünde veri GÖRMEZ', (await db.query(`select 1 from yonetici_sikayetleri`)).rows.length === 0);
});
await olarak(MUS2, async () => { r = await dene(`insert into sikayetler (talep_id, sikayet_eden_id, aciklama) values ('${tid2}','${MUS2}','Başkasının talebi hakkında şikayet')`); kontrol('talebe dahil olmayan şikayet edemez', !r.ok); });
await olarak(ADM, async () => { kontrol('yönetici şikayeti görür', (await db.query(`select 1 from yonetici_sikayetleri`)).rows.length === 1); });

// --- Hesap silme
await olarak(MUS2, async () => { r = await dene(`select hesabi_sil()`); kontrol('aktif talebi olmayan hesabı silebilir', r.ok, r.hata ?? ''); });
await db.exec("insert into auth.users (id, phone) values ('ffffffff-0000-4000-8000-000000000001','90333'); insert into profiles (id, rol, ad, kvkk_onay_surumu) values ('ffffffff-0000-4000-8000-000000000001','musteri','Aktif Talepli','x');");
await db.exec(`insert into talepler (musteri_id, asci_id, semt, tarih, kisi_sayisi, durum) values ('ffffffff-0000-4000-8000-000000000001','${ASCI}','Kadıköy', now()+interval '1 day', 2, 'bekliyor')`);
await olarak('ffffffff-0000-4000-8000-000000000001', async () => { r = await dene(`select hesabi_sil()`); kontrol('devam eden talebi olan hesap SİLİNEMEZ', !r.ok, r.hata?.slice(0, 50)); });
await olarak(ADM, async () => { r = await dene(`select hesabi_sil()`); kontrol('yönetici hesabı uygulamadan silinemez', !r.ok, r.hata?.slice(0, 50)); });

// --- Reklamlar
await db.exec(`
  insert into reklamlar (baslik, gorsel_adres, hedef_adres, aktif) values ('Yayında','https://x.test/a.png','https://x.test',true);
  insert into reklamlar (baslik, gorsel_adres, aktif) values ('Kapalı','https://x.test/b.png',false);
  insert into reklamlar (baslik, gorsel_adres, baslangic, bitis) values ('Süresi dolmuş','https://x.test/c.png', now()-interval '10 days', now()-interval '1 day');
  insert into reklamlar (baslik, gorsel_adres, baslangic) values ('Henüz başlamadı','https://x.test/d.png', now()+interval '5 days');`);
await db.exec("select set_config('request.jwt.claim.sub','',false); set role anon;");
kontrol('ziyaretçi yalnızca yayındaki reklamı görür', (await db.query('select baslik from reklamlar')).rows.map((x) => x.baslik).join() === 'Yayında');
r = await dene(`insert into reklamlar (baslik, gorsel_adres) values ('Sahte','https://x.test/z.png')`); kontrol('ziyaretçi reklam EKLEYEMEZ', !r.ok);
await db.exec('reset role');
await olarak(MUS, async () => {
  r = await dene(`insert into reklamlar (baslik, gorsel_adres) values ('Sahte','https://x.test/z.png')`); kontrol('müşteri reklam EKLEYEMEZ', !r.ok, r.hata?.slice(0, 45));
  r = await dene(`update reklamlar set aktif=false`); kontrol('müşteri reklam GÜNCELLEYEMEZ (0 satır)', !r.ok || (await db.query(`select count(*)::int n from reklamlar where aktif`)).rows[0].n === 1);
  r = await dene(`delete from reklamlar`); kontrol('müşteri reklam SİLEMEZ', (await db.query(`select count(*)::int n from reklamlar`)).rows[0].n === 1);
  const id = (await db.query(`select id from reklamlar`)).rows[0].id;
  await db.query(`select reklam_goster('${id}'::uuid)`); await db.query(`select reklam_tikla('${id}'::uuid)`);
});
kontrol('gösterim ve tıklama sayaçları artar', (await db.query(`select gosterim_sayisi g, tiklama_sayisi t from reklamlar where baslik='Yayında'`)).rows[0].g === 1);
await db.query(`select reklam_tikla((select id from reklamlar where baslik='Kapalı'))`);
kontrol('kapalı reklamın sayacı artmaz', (await db.query(`select tiklama_sayisi t from reklamlar where baslik='Kapalı'`)).rows[0].t === 0);
await olarak(ADM, async () => {
  kontrol('yönetici tüm reklamları görür', (await db.query(`select 1 from reklamlar`)).rows.length === 4);
  r = await dene(`insert into reklamlar (baslik, gorsel_adres, hedef_adres) values ('Yeni','https://x.test/n.png','https://x.test/n')`); kontrol('yönetici reklam ekler', r.ok, r.hata ?? '');
  r = await dene(`insert into reklamlar (baslik, gorsel_adres, hedef_adres) values ('Kötü','https://x.test/n.png','javascript:alert(1)')`); kontrol('https olmayan bağlantı reddedilir', !r.ok);
  r = await dene(`insert into reklamlar (baslik, gorsel_adres, baslangic, bitis) values ('Ters','https://x.test/n.png', now(), now()-interval '1 day')`); kontrol('bitiş başlangıçtan önce olamaz', !r.ok);
  r = await dene(`delete from reklamlar where baslik='Yeni'`); kontrol('yönetici reklam siler', r.ok);
});
console.log(`\nSONUÇ: ${gecen} geçti, ${kalan} kaldı`);
