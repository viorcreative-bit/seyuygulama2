import { kur, semalar } from './kur.mjs';
const db = await kur();
await semalar(db, ['schema.sql','schema_4.sql','schema_5.sql','schema_6.sql','schema_7.sql','schema_8.sql','schema_9.sql','schema_10.sql','schema_11.sql','schema_12.sql','schema_13.sql','schema_14.sql','schema_15.sql','schema_16.sql','schema_17.sql','demo_veri.sql']);
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
  delete from reklamlar;
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

// --- Kurumsal toplu yemek ve teklifler
const ASCI3 = U('000000000003'), MUS3 = U('001000000003');
await db.exec(`update asci_profilleri set kurumsal_mi=true, kurumsal_kapasite=500 where profil_id='${ASCI}';
  update asci_profilleri set kurumsal_mi=true, kurumsal_kapasite=50 where profil_id='${ASCI2}';
  update asci_profilleri set kurumsal_mi=false where profil_id='${ASCI3}';`);
const gun = (n) => `now() + interval '${n} days'`;
const kurumsalTalep = (kisi = 100, baslangic = gun(10)) =>
  `select kurumsal_talep_olustur('Acme A.Ş.','Ayşe Yetkili','05551112233','Maslak','Büyükdere Cd. No 1 Kat 4', ${baslangic}, 'gunluk', 5, 'ogle', ${kisi}, 250, array['Türk mutfağı'], 'Vegan 5 kişi', 'Not')`;
await olarak(MUS, async () => {
  r = await dene(kurumsalTalep(100, gun(1))); kontrol('başlangıç 3 günden yakınsa kurumsal talep AÇILAMAZ', !r.ok, r.hata?.slice(0, 50));
  r = await dene(kurumsalTalep(5)); kontrol('10 kişiden az olamaz', !r.ok);
  r = await dene(kurumsalTalep(100)); kontrol('müşteri kurumsal talep açar', r.ok, r.hata ?? '');
  r = await dene(`insert into kurumsal_talepler (musteri_id, sirket_adi, semt, baslangic_tarihi, tekrar, ogun, kisi_sayisi, son_teklif_tarihi) values ('${MUS}','X Ltd','Kadıköy',${gun(9)},'tek_sefer','ogle',50,${gun(8)})`);
  kontrol('tabloya doğrudan yazılamaz (yalnızca fonksiyonla)', !r.ok, r.hata?.slice(0, 45));
});
await olarak(ASCI, async () => { r = await dene(kurumsalTalep(100)); kontrol('aşçı hesabıyla kurumsal talep açılamaz', !r.ok, r.hata?.slice(0, 50)); });
const kid = (await db.query(`select id from kurumsal_talepler where sirket_adi='Acme A.Ş.'`)).rows[0]?.id;
kontrol('teklif toplama süresi başlangıçtan 1 gün önce bitiyor', (await db.query(`select (baslangic_tarihi - son_teklif_tarihi) = interval '1 day' ok from kurumsal_talepler where id='${kid}'`)).rows[0].ok);
kontrol('tekrar sayısı kaydedildi (5 gün)', (await db.query(`select tekrar_sayisi n from kurumsal_talepler where id='${kid}'`)).rows[0].n === 5);

// Kim görür?
await olarak(ASCI, async () => kontrol('uygun kurumsal aşçı açık talebi görür', (await db.query(`select 1 from kurumsal_talepler where id='${kid}'`)).rows.length === 1));
await olarak(ASCI2, async () => kontrol('kapasitesi yetmeyen aşçı (50<100) talebi GÖRMEZ', (await db.query(`select 1 from kurumsal_talepler where id='${kid}'`)).rows.length === 0));
await olarak(ASCI3, async () => kontrol('kurumsal olmayan aşçı talebi GÖRMEZ', (await db.query(`select 1 from kurumsal_talepler where id='${kid}'`)).rows.length === 0));
await olarak(MUS3, async () => kontrol('başka müşteri talebi GÖRMEZ', (await db.query(`select 1 from kurumsal_talepler where id='${kid}'`)).rows.length === 0));

// Teklif
await olarak(ASCI3, async () => { r = await dene(`select kurumsal_teklif_ver('${kid}'::uuid, 150, 'merhaba')`); kontrol('uygun olmayan aşçı teklif VEREMEZ', !r.ok, r.hata?.slice(0, 50)); });
await olarak(ASCI2, async () => { r = await dene(`select kurumsal_teklif_ver('${kid}'::uuid, 150, 'merhaba')`); kontrol('kapasitesi yetmeyen aşçı teklif VEREMEZ', !r.ok); });
await olarak(ASCI, async () => {
  r = await dene(`select kurumsal_teklif_ver('${kid}'::uuid, 180, 'İlk teklif')`); kontrol('uygun aşçı teklif verir', r.ok, r.hata ?? '');
  r = await dene(`select kurumsal_teklif_ver('${kid}'::uuid, 165, 'Güncel teklif')`); kontrol('aynı aşçı teklifini günceller', r.ok);
  kontrol('tek teklif kaldı ve fiyat güncel', (await db.query(`select count(*)::int n, max(kisi_basi_fiyat) f from kurumsal_teklifler where talep_id='${kid}'`)).rows[0].f === 165);
  r = await dene(`update kurumsal_teklifler set kisi_basi_fiyat=1`); kontrol('teklif tablosu doğrudan değiştirilemez', !r.ok);
  r = await dene(`select adres from kurumsal_iletisim`); kontrol('seçilmeden aşçı adres/telefon GÖRMEZ', r.ok && r.rows.length === 0);
});
await olarak(MUS3, async () => kontrol('başkasının tekliflerini GÖRMEZ', (await db.query(`select 1 from kurumsal_teklif_listesi`)).rows.length === 0));
await olarak(MUS, async () => {
  const l = (await db.query(`select asci_ad, kisi_basi_fiyat from kurumsal_teklif_listesi where talep_id='${kid}'`)).rows;
  kontrol('şirket teklifleri aşçı adıyla görür', l.length === 1 && l[0].asci_ad === 'Ayşe Demir', JSON.stringify(l));
  kontrol('şirket kendi iletişim bilgisini görür', (await db.query(`select 1 from kurumsal_iletisim where talep_id='${kid}'`)).rows.length === 1);
});
// ikinci teklif (ASCI2 kapasitesini artır) ve seçim
await db.exec(`update asci_profilleri set kurumsal_kapasite=300 where profil_id='${ASCI2}'`);
await olarak(ASCI2, async () => { r = await dene(`select kurumsal_teklif_ver('${kid}'::uuid, 140, 'Daha uygun')`); kontrol('ikinci aşçı da teklif verir', r.ok, r.hata ?? ''); });
const t1 = (await db.query(`select id from kurumsal_teklifler where asci_id='${ASCI}' and talep_id='${kid}'`)).rows[0].id;
const t2 = (await db.query(`select id from kurumsal_teklifler where asci_id='${ASCI2}' and talep_id='${kid}'`)).rows[0].id;
await olarak(MUS3, async () => { r = await dene(`select kurumsal_teklif_sec('${t1}'::uuid)`); kontrol('başka müşteri teklif SEÇEMEZ', !r.ok, r.hata?.slice(0, 45)); });
await olarak(ASCI, async () => { r = await dene(`select kurumsal_teklif_sec('${t1}'::uuid)`); kontrol('aşçı kendi teklifini SEÇEMEZ', !r.ok); });
await olarak(MUS, async () => { r = await dene(`select kurumsal_teklif_sec('${t2}'::uuid)`); kontrol('şirket teklifi seçer', r.ok, r.hata ?? ''); });
kontrol('seçilen kabul, diğeri red, talep "secildi"', (await db.query(`select (select durum from kurumsal_teklifler where id='${t2}') a, (select durum from kurumsal_teklifler where id='${t1}') b, (select durum from kurumsal_talepler where id='${kid}') c`)).rows[0].a === 'kabul'
  && (await db.query(`select durum from kurumsal_teklifler where id='${t1}'`)).rows[0].durum === 'red');
await olarak(ASCI2, async () => kontrol('seçilen aşçı adres ve yetkili bilgisini görür', (await db.query(`select adres, yetkili_ad from kurumsal_iletisim where talep_id='${kid}'`)).rows.length === 1));
await olarak(ASCI, async () => {
  kontrol('seçilmeyen aşçı adresi GÖRMEZ', (await db.query(`select 1 from kurumsal_iletisim where talep_id='${kid}'`)).rows.length === 0);
  r = await dene(`select kurumsal_teklif_ver('${kid}'::uuid, 100, 'geç')`); kontrol('seçim sonrası yeni teklif verilemez', !r.ok, r.hata?.slice(0, 45));
});
await olarak(MUS, async () => { r = await dene(`select kurumsal_teklif_sec('${t1}'::uuid)`); kontrol('ikinci kez seçim yapılamaz', !r.ok); });

// Hesap silme engeli
await olarak(MUS, async () => kontrol('açık/seçilmiş kurumsal talebi olan şirket hesabı silinemez', (await db.query(`select hesap_silme_engeli() e`)).rows[0].e === 'Devam eden talebin var'));
await olarak(ASCI2, async () => kontrol('kabul edilmiş kurumsal teklifi olan aşçı hesabı silinemez', (await db.query(`select hesap_silme_engeli() e`)).rows[0].e === 'Devam eden talebin var'));

// Tamamlama
await olarak(ASCI2, async () => { r = await dene(`select kurumsal_talep_tamamla('${kid}'::uuid)`); kontrol('son hizmet gününden önce tamamlanamaz', !r.ok, r.hata?.slice(0, 50)); });
await db.exec(`update kurumsal_talepler set baslangic_tarihi = now() - interval '10 days' where id='${kid}'`);
await olarak(ASCI, async () => { r = await dene(`select kurumsal_talep_tamamla('${kid}'::uuid)`); kontrol('seçilmeyen aşçı tamamlayamaz', !r.ok); });
await olarak(MUS, async () => { r = await dene(`select kurumsal_talep_tamamla('${kid}'::uuid)`); kontrol('şirket kendi talebini tamamlayamaz (aşçı yapar)', !r.ok); });
await olarak(ASCI2, async () => { r = await dene(`select kurumsal_talep_tamamla('${kid}'::uuid)`); kontrol('seçilen aşçı son günden sonra tamamlar', r.ok, r.hata ?? ''); });

// İptal ve geri çekme
await olarak(MUS3, async () => { r = await dene(kurumsalTalep(60)); });
const kid2 = (await db.query(`select id from kurumsal_talepler where musteri_id='${MUS3}'`)).rows[0]?.id;
await olarak(ASCI, async () => { r = await dene(`select kurumsal_teklif_ver('${kid2}'::uuid, 120, 'x')`); });
const t3 = (await db.query(`select id from kurumsal_teklifler where talep_id='${kid2}'`)).rows[0]?.id;
await olarak(ASCI, async () => { r = await dene(`select kurumsal_teklif_geri_cek('${t3}'::uuid)`); kontrol('aşçı bekleyen teklifini geri çeker', r.ok, r.hata ?? ''); r = await dene(`select kurumsal_teklif_ver('${kid2}'::uuid, 120, 'x')`); });
await olarak(MUS, async () => { r = await dene(`select kurumsal_talep_iptal('${kid2}'::uuid)`); kontrol('başkasının kurumsal talebini iptal EDEMEZ', !r.ok); });
await olarak(MUS3, async () => { r = await dene(`select kurumsal_talep_iptal('${kid2}'::uuid)`); kontrol('şirket kendi talebini iptal eder', r.ok, r.hata ?? ''); });
kontrol('iptalde bekleyen teklifler reddedilir', (await db.query(`select durum from kurumsal_teklifler where talep_id='${kid2}'`)).rows.every((x) => x.durum === 'red'));
await olarak(MUS3, async () => kontrol('iptal sonrası hesap silinebilir (engel yok)', (await db.query(`select hesap_silme_engeli() e`)).rows[0].e === null));

// Yönetici izleme
await olarak(ADM, async () => kontrol('yönetici kurumsal izleme listesini görür', (await db.query(`select 1 from yonetici_kurumsal`)).rows.length === 2));
await olarak(MUS, async () => kontrol('müşteri izleme listesini GÖRMEZ', (await db.query(`select 1 from yonetici_kurumsal`)).rows.length === 0));

// --- Bildirimler (sahte HTTP eklentisiyle: gönderilen mesajları kaydeder)
await db.exec(`
  create schema net; create table public.http_kayit (url text, body jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds integer default 5000)
    returns bigint language sql as $$ insert into public.http_kayit values (url, body) returning 1::bigint $$;
  grant usage on schema net to authenticated;`);
const TOK_A = 'ExponentPushToken[asci-1]', TOK_B = 'ExponentPushToken[musteri-3]';
await olarak(ASCI, async () => {
  r = await dene(`select push_kaydet('${TOK_A}', 'ios')`); kontrol('aşçı bildirim adresini kaydeder', r.ok, r.hata ?? '');
  r = await dene(`select push_kaydet('sahte-adres', 'ios')`); kontrol('geçersiz bildirim adresi reddedilir', !r.ok);
  r = await dene(`select * from push_tokenlari`); kontrol('bildirim adresleri doğrudan OKUNAMAZ', !r.ok);
  r = await dene(`select bildirim_gonder(array['${ASCI}']::uuid[], 'x', 'y')`); kontrol('bildirim_gonder dışarıdan ÇAĞRILAMAZ', !r.ok);
});
await olarak(MUS3, async () => { r = await dene(`select push_kaydet('${TOK_B}', 'android')`); kontrol('müşteri bildirim adresini kaydeder', r.ok, r.hata ?? ''); });
await db.exec(`delete from http_kayit`);
await olarak(MUS, async () => { r = await dene(rpcTalep(ASCI)); });
{
  const k = (await db.query(`select body from http_kayit`)).rows;
  kontrol('yeni talepte yalnızca ilgili aşçıya bildirim gider', k.length === 1 && k[0].body.length === 1 && k[0].body[0].to === TOK_A, JSON.stringify(k));
  kontrol('bildirimde açık adres YOK', !JSON.stringify(k).includes('Cd. No'));
}
await olarak(ASCI, async () => { r = await dene(`select push_sil('${TOK_B}')`); });
kontrol('başkasının bildirim adresi silinemez', (await db.query(`select 1 from push_tokenlari where token='${TOK_B}'`)).rows.length === 1);
await olarak(MUS3, async () => { r = await dene(`select push_sil('${TOK_B}')`); });
kontrol('kullanıcı kendi bildirim adresini siler', (await db.query(`select 1 from push_tokenlari where token='${TOK_B}'`)).rows.length === 0);
await db.exec(`drop schema net cascade; drop table http_kayit;`);
await olarak(MUS, async () => { r = await dene(rpcTalep(ASCI)); kontrol('bildirim eklentisi yokken talep yine de açılır', r.ok, r.hata ?? ''); });

// --- Favoriler
await olarak(MUS, async () => {
  r = await dene(`insert into favoriler (musteri_id, asci_id) values ('${MUS}','${ASCI}')`); kontrol('müşteri aşçıyı favoriye ekler', r.ok, r.hata ?? '');
  r = await dene(`insert into favoriler (musteri_id, asci_id) values ('${MUS}','${YENI}')`); kontrol('onaysız aşçı favoriye eklenemez', !r.ok);
  r = await dene(`insert into favoriler (musteri_id, asci_id) values ('${MUS3}','${ASCI2}')`); kontrol('başkası adına favori eklenemez', !r.ok);
});
await olarak(MUS3, async () => {
  kontrol('başkasının favorilerini GÖRMEZ', (await db.query(`select 1 from favoriler`)).rows.length === 0);
  r = await dene(`delete from favoriler where asci_id='${ASCI}'`); 
});
kontrol('başkasının favorisi silinemez', (await db.query(`select 1 from favoriler where musteri_id='${MUS}'`)).rows.length === 1);
await olarak(ASCI2, async () => { r = await dene(`insert into favoriler (musteri_id, asci_id) values ('${ASCI2}','${ASCI}')`); kontrol('aşçı favori ekleyemez', !r.ok); });
await olarak(MUS, async () => { r = await dene(`delete from favoriler where asci_id='${ASCI}'`); kontrol('müşteri favoriyi kaldırır', r.ok && (await db.query(`select 1 from favoriler`)).rows.length === 0); });

// --- Aşçı yemekleri ve malzemeleri
await olarak(ASCI, async () => {
  r = await dene(`insert into asci_yemekleri (asci_id, ad, malzemeler) values ('${ASCI}','Test yemeği','domates, biber')`); kontrol('aşçı kendi yemeğini ekler', r.ok, r.hata ?? '');
  r = await dene(`insert into asci_yemekleri (asci_id, ad, malzemeler) values ('${ASCI2}','Başkası','x')`); kontrol('başkası adına yemek eklenemez', !r.ok);
  r = await dene(`update asci_yemekleri set malzemeler='domates, biber, zzzmalzeme' where asci_id='${ASCI}' and ad='Test yemeği'`); kontrol('aşçı yemeğini düzenler', r.ok && (await db.query(`select 1 from asci_yemekleri where malzemeler like '%zzzmalzeme%'`)).rows.length === 1);
  r = await dene(`insert into asci_yemekleri (asci_id, ad) values ('${ASCI}','a')`); kontrol('çok kısa yemek adı reddedilir', !r.ok);
});
await olarak(MUS, async () => kontrol('müşteri onaylı aşçının yemeklerini görür', (await db.query(`select 1 from asci_yemekleri where ad='Test yemeği'`)).rows.length === 1));
await olarak(ASCI2, async () => {
  r = await dene(`update asci_yemekleri set ad='Hack' where asci_id='${ASCI}'`);
  kontrol('başka aşçı yemeği değiştiremez', (await db.query(`select 1 from asci_yemekleri where ad='Hack'`)).rows.length === 0);
  r = await dene(`delete from asci_yemekleri where asci_id='${ASCI}'`);
});
kontrol('başka aşçı yemeği silemez', (await db.query(`select 1 from asci_yemekleri where ad='Test yemeği'`)).rows.length === 1);
await db.exec(`insert into asci_yemekleri (asci_id, ad) values ('${YENI}','Gizli yemek')`);
await olarak(MUS, async () => kontrol('onaysız aşçının yemeği GÖRÜNMEZ', (await db.query(`select 1 from asci_yemekleri where ad='Gizli yemek'`)).rows.length === 0));
await olarak(YENI, async () => kontrol('onaysız aşçı kendi yemeğini görür', (await db.query(`select 1 from asci_yemekleri where ad='Gizli yemek'`)).rows.length === 1));
await olarak(ASCI, async () => { r = await dene(`delete from asci_yemekleri where ad='Test yemeği'`); kontrol('aşçı yemeğini siler', r.ok && (await db.query(`select 1 from asci_yemekleri where ad='Test yemeği'`)).rows.length === 0); });
await db.exec(`delete from asci_yemekleri where ad='Gizli yemek'`);

// --- Açık talep ve teklifler
const acikTalep = (gun = 3) => `select acik_talep_olustur('Kadıköy','Moda Cd. No 9 Daire 4', now() + interval '${gun} days', 4, array['Ege'], 'Mercimek çorbası, fırında tavuk', 'fıstık', 'not')`;
let aid;
await olarak(MUS3, async () => {
  r = await dene(acikTalep()); kontrol('müşteri açık talep oluşturur', r.ok, r.hata ?? '');
  aid = (await db.query(`select id from acik_talepler where musteri_id='${MUS3}' order by olusturma_tarihi desc limit 1`)).rows[0]?.id;
  r = await dene(`select acik_talep_olustur('Kadıköy','Moda Cd. No 9', now() + interval '30 minutes', 4, '{}', 'çorba', '', '')`); kontrol('çok yakın zamana talep açılamaz', !r.ok, r.hata?.slice(0, 40));
  r = await dene(`select acik_talep_olustur('Kadıköy','Moda Cd. No 9', now() + interval '3 days', 4, '{}', 'x', '', '')`); kontrol('çok kısa yemek yazısı reddedilir', !r.ok);
  r = await dene(`insert into acik_talepler (musteri_id, semt, tarih, kisi_sayisi, istenen_yemekler) values ('${MUS3}','x', now() + interval '3 days', 2, 'abc')`); kontrol('acik_talepler tablosuna doğrudan yazılamaz', !r.ok);
});
await olarak(ASCI, async () => { r = await dene(acikTalep()); kontrol('aşçı hesabı açık talep AÇAMAZ', !r.ok); });
await olarak(ASCI, async () => {
  kontrol('onaylı aşçı açık talebi görür', (await db.query(`select 1 from acik_talepler where id='${aid}'`)).rows.length === 1);
  kontrol('aşçı talebin adresini GÖRMEZ', (await db.query(`select 1 from acik_talep_adresleri`)).rows.length === 0);
});
await olarak(YENI, async () => kontrol('onaysız aşçı açık talebi GÖRMEZ', (await db.query(`select 1 from acik_talepler where id='${aid}'`)).rows.length === 0));
await olarak(YENI, async () => { r = await dene(`select acik_teklif_ver('${aid}'::uuid, 900, 'x')`); kontrol('onaysız aşçı teklif veremez', !r.ok); });
await olarak(MUS, async () => {
  kontrol('başka müşteri açık talebi GÖRMEZ', (await db.query(`select 1 from acik_talepler where id='${aid}'`)).rows.length === 0);
  r = await dene(`select acik_teklif_ver('${aid}'::uuid, 900, 'x')`); kontrol('müşteri teklif veremez', !r.ok);
});
await db.exec(`delete from http_kayit`).catch(() => {});
await olarak(ASCI, async () => { r = await dene(`select acik_teklif_ver('${aid}'::uuid, 1500, 'Menü önerim hazır')`); kontrol('aşçı teklif verir', r.ok, r.hata ?? ''); });
await olarak(ASCI2, async () => { r = await dene(`select acik_teklif_ver('${aid}'::uuid, 1200, 'Daha uygun')`); kontrol('ikinci aşçı teklif verir', r.ok, r.hata ?? ''); });
await olarak(ASCI, async () => {
  r = await dene(`select acik_teklif_ver('${aid}'::uuid, 1400, 'güncel')`); kontrol('aşçı teklifini günceller', r.ok && (await db.query(`select 1 from acik_teklifler where asci_id='${ASCI}' and fiyat=1400`)).rows.length === 1);
  kontrol('aşçı yalnızca kendi teklifini görür', (await db.query(`select 1 from acik_teklif_listesi`)).rows.length === 1);
  r = await dene(`update acik_teklifler set fiyat=1 where asci_id='${ASCI}'`); kontrol('teklif tablosuna doğrudan yazılamaz', !r.ok);
});
await olarak(MUS3, async () => kontrol('müşteri tüm teklifleri görür', (await db.query(`select 1 from acik_teklif_listesi where talep_id='${aid}'`)).rows.length === 2));
await olarak(MUS, async () => kontrol('başka müşteri teklifleri GÖRMEZ', (await db.query(`select 1 from acik_teklif_listesi`)).rows.length === 0));
const at1 = (await db.query(`select id from acik_teklifler where asci_id='${ASCI}' and talep_id='${aid}'`)).rows[0].id;
const at2 = (await db.query(`select id from acik_teklifler where asci_id='${ASCI2}' and talep_id='${aid}'`)).rows[0].id;
await olarak(MUS, async () => { r = await dene(`select acik_teklif_sec('${at1}'::uuid)`); kontrol('başka müşteri teklif SEÇEMEZ', !r.ok); });
await olarak(ASCI, async () => { r = await dene(`select acik_teklif_sec('${at1}'::uuid)`); kontrol('aşçı kendi teklifini SEÇEMEZ', !r.ok); });
await olarak(MUS3, async () => { r = await dene(`select acik_teklif_sec('${at2}'::uuid)`); kontrol('müşteri teklifi seçer', r.ok, r.hata ?? ''); });
kontrol('seçilen kabul, diğeri red, talep "secildi"', (await db.query(`select durum from acik_teklifler where id='${at2}'`)).rows[0].durum === 'kabul'
  && (await db.query(`select durum from acik_teklifler where id='${at1}'`)).rows[0].durum === 'red'
  && (await db.query(`select durum from acik_talepler where id='${aid}'`)).rows[0].durum === 'secildi');
const yt = (await db.query(`select talep_id from acik_talepler where id='${aid}'`)).rows[0].talep_id;
kontrol('seçimden normal talep oluşur (kabul, fiyat, doğru aşçı)', !!yt && (await db.query(`select 1 from talepler where id='${yt}' and asci_id='${ASCI2}' and musteri_id='${MUS3}' and durum='kabul' and teklif_fiyati=1200`)).rows.length === 1);
await olarak(ASCI2, async () => {
  const a = (await db.query(`select adres, teklif_fiyati from asci_talepleri where id='${yt}'`)).rows[0];
  kontrol('seçilen aşçı açık adresi ve fiyatı görür', a?.adres === 'Moda Cd. No 9 Daire 4' && a?.teklif_fiyati === 1200, JSON.stringify(a));
});
await olarak(ASCI, async () => kontrol('seçilmeyen aşçı normal talebi/adresi GÖRMEZ', (await db.query(`select 1 from asci_talepleri where id='${yt}'`)).rows.length === 0));
await olarak(MUS3, async () => { r = await dene(`select acik_teklif_sec('${at1}'::uuid)`); kontrol('ikinci kez seçim yapılamaz', !r.ok); });
await olarak(ASCI, async () => { r = await dene(`select acik_teklif_ver('${aid}'::uuid, 100, 'geç')`); kontrol('seçim sonrası yeni teklif verilemez', !r.ok); });
await olarak(ASCI2, async () => { r = await dene(`update talepler set durum='tamamlandi' where id='${yt}'`); kontrol('hizmet tarihinden önce tamamlanamaz (mevcut kural)', !r.ok); });
await olarak(MUS3, async () => { r = await dene(`update talepler set durum='iptal' where id='${yt}'`); kontrol('müşteri seçilen talebi iptal edebilir', r.ok, r.hata ?? ''); });
// iptal ve geri çekme
await olarak(MUS3, async () => { r = await dene(acikTalep(4)); });
const aid2 = (await db.query(`select id from acik_talepler where musteri_id='${MUS3}' and durum='acik'`)).rows[0]?.id;
await olarak(ASCI, async () => { r = await dene(`select acik_teklif_ver('${aid2}'::uuid, 800, 'x')`); });
const at3 = (await db.query(`select id from acik_teklifler where talep_id='${aid2}'`)).rows[0]?.id;
await olarak(ASCI, async () => { r = await dene(`select acik_teklif_geri_cek('${at3}'::uuid)`); kontrol('aşçı bekleyen teklifini geri çeker', r.ok, r.hata ?? ''); r = await dene(`select acik_teklif_ver('${aid2}'::uuid, 800, 'x')`); });
await olarak(MUS, async () => { r = await dene(`select acik_talep_iptal('${aid2}'::uuid)`); kontrol('başkasının açık talebini iptal EDEMEZ', !r.ok); });
await olarak(MUS3, async () => { r = await dene(`select acik_talep_iptal('${aid2}'::uuid)`); kontrol('müşteri açık talebini iptal eder', r.ok, r.hata ?? ''); });
kontrol('iptalde bekleyen teklifler reddedilir', (await db.query(`select durum from acik_teklifler where talep_id='${aid2}'`)).rows.every((x) => x.durum === 'red'));
await olarak(MUS3, async () => {
  for (let i = 0; i < 5; i++) await dene(acikTalep(5 + i));
  r = await dene(acikTalep(12)); kontrol('en fazla 5 açık talep sınırı', !r.ok, r.hata?.slice(0, 40));
});
console.log(`\nSONUÇ: ${gecen} geçti, ${kalan} kaldı`);
