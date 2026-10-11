import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';

const $ = (id) => document.getElementById(id);

// Kullanıcının yazdığı metinler her zaman textContent ile yazılır (HTML olarak yorumlanmaz).
function el(etiket, ozellikler = {}, ...cocuklar) {
  const e = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellikler)) {
    if (k === 'class') e.className = v;
    else if (k === 'onclick') e.addEventListener('click', v);
    else if (v !== undefined && v !== null) e[k] = v;
  }
  for (const c of cocuklar.flat()) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}

if (!window.AYAR || !window.AYAR.url) {
  document.body.prepend(el('p', { class: 'hata', style: 'text-align:center;padding:24px' },
    'Ayar dosyası (config.js) bulunamadı. Proje klasöründe "npm run yonetim" komutuyla başlat.'));
  throw new Error('config.js yok');
}

const supabase = createClient(window.AYAR.url, window.AYAR.anahtar, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ---------- Yardımcılar ----------
const iki = (n) => String(n).padStart(2, '0');
function tarihSaat(iso) {
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000); // Türkiye saati (UTC+3)
  return `${iki(d.getUTCDate())}.${iki(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${iki(d.getUTCHours())}:${iki(d.getUTCMinutes())}`;
}
const tl = (n) => `${Number(n).toLocaleString('tr-TR')} TL`;

function telefonDuzenle(girdi) {
  let s = girdi.replace(/\D/g, '');
  if (s.startsWith('90') && s.length === 12) s = s.slice(2);
  if (s.startsWith('0') && s.length === 11) s = s.slice(1);
  return s.length === 10 && s.startsWith('5') ? `+90${s}` : null;
}

// Yalnızca http(s) adreslerini resim olarak kullan.
const guvenliUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

function buyut(adres) {
  const perde = el('div', { class: 'perde', onclick: () => perde.remove() }, el('img', { src: adres, alt: '' }));
  document.body.append(perde);
}

function avatar(ad, foto) {
  if (guvenliUrl(foto)) return el('img', { class: 'avatar', src: foto, alt: ad, title: 'Büyütmek için tıkla', onclick: () => buyut(foto) });
  return el('div', { class: 'avatar harf' }, (ad ?? '?').trim().charAt(0).toLocaleUpperCase('tr-TR'));
}

function galeri(adresler) {
  const liste = (adresler ?? []).filter(guvenliUrl);
  if (!liste.length) return null;
  return el('div', { class: 'galeri' },
    liste.map((a) => el('img', { src: a, alt: 'Yemek fotoğrafı', loading: 'lazy', onclick: () => buyut(a) })));
}

const SIKAYET_ADI = { acik: 'Açık', inceleniyor: 'İnceleniyor', cozuldu: 'Çözüldü' };
const SIKAYET_SIRA = { acik: 0, inceleniyor: 1, cozuldu: 2 };

// ---------- Durum ----------
let sekme = 'ascilar';
let ascilar = [];
let sikayetler = [];
let uyeler = [];
let reklamlar = [];
let kurumsal = [];
let reklamFormuAcik = false;
let galeriler = {}; // aşçı id -> yemek fotoğrafı adresleri
let filtre = { asci: 'bekleyen', uye: 'hepsi', sikayet: 'acik', arama: '' };

// ---------- Giriş ----------
function girisGoster(mesaj = '') {
  $('giris').classList.remove('gizli');
  $('panel').classList.add('gizli');
  $('ust').classList.add('gizli');
  const h = $('hata');
  h.textContent = mesaj;
  h.classList.toggle('gizli', !mesaj);
  $('girisDugme').disabled = false;
}

async function yoneticiMi() {
  const { data, error } = await supabase.rpc('yonetici_mi');
  return !error && data === true;
}

async function panelAc(oturum) {
  if (!(await yoneticiMi())) {
    await supabase.auth.signOut();
    return girisGoster('Bu hesap yönetici değil.');
  }
  const { data } = await supabase.from('profiles').select('ad').eq('id', oturum.user.id).maybeSingle();
  $('kisi').textContent = data?.ad ?? '';
  $('giris').classList.add('gizli');
  $('ust').classList.remove('gizli');
  $('panel').classList.remove('gizli');
  await yukle();
}

$('form').addEventListener('submit', async (olay) => {
  olay.preventDefault();
  const telefon = telefonDuzenle($('tel').value);
  const sifre = $('sifre').value;
  if (!telefon) return girisGoster('Lütfen geçerli bir cep telefonu numarası gir. Örnek: 5XX XXX XX XX');
  if (!sifre) return girisGoster('Lütfen şifreni yaz.');
  $('girisDugme').disabled = true;
  const { data, error } = await supabase.auth.signInWithPassword({ phone: telefon, password: sifre });
  if (error) return girisGoster('Telefon numarası veya şifre hatalı.');
  $('sifre').value = '';
  await panelAc(data.session);
});

$('cikis').addEventListener('click', async () => {
  await supabase.auth.signOut();
  girisGoster();
});

// ---------- Veri ----------
async function yukle() {
  $('liste').replaceChildren(el('p', { class: 'bos' }, 'Yükleniyor...'));
  const [a, s, u, g, rk, ku] = await Promise.all([
    supabase.from('yonetici_ascilar').select('*'),
    supabase.from('yonetici_sikayetleri').select('*'),
    supabase.from('yonetici_uyeler').select('*'),
    supabase.from('asci_fotograflari').select('asci_id, adres').order('sira'),
    supabase.from('reklamlar').select('*').order('olusturma_tarihi', { ascending: false }),
    supabase.from('yonetici_kurumsal').select('*').order('olusturma_tarihi', { ascending: false }),
  ]);
  kurumsal = ku.error ? [] : ku.data ?? []; // schema_14.sql çalıştırılmadıysa sekme boş kalır
  reklamlar = rk.error ? [] : rk.data ?? []; // schema_13.sql çalıştırılmadıysa sekme boş kalır
  if (a.error || s.error || u.error) {
    $('liste').replaceChildren(el('p', { class: 'hata bos' }, 'Veriler yüklenemedi. Oturumun kapanmış olabilir, sayfayı yenileyip tekrar gir.'));
    return;
  }
  ascilar = a.data ?? [];
  sikayetler = s.data ?? [];
  uyeler = u.data ?? [];
  galeriler = {};
  for (const f of g.data ?? []) (galeriler[f.asci_id] ||= []).push(f.adres);
  ciz();
}

async function rpc(ad, args) {
  const { error } = await supabase.rpc(ad, args);
  if (error) {
    alert('İşlem yapılamadı. Lütfen tekrar dene.');
    return false;
  }
  await yukle();
  return true;
}

// Geri alınamayan işlemlerde, kullanıcının "SİL" yazmasını ister.
function silmeOnayi(mesaj) {
  if (!confirm(mesaj)) return false;
  const yanit = prompt('Onaylamak için büyük harfle SİL yaz:');
  return yanit !== null && yanit.trim() === 'SİL';
}

function asciOnayla(asci, onayli) {
  const soru = onayli
    ? `${asci.ad} onaylansın mı? Müşterilere görünür olacak ve talep alabilecek.`
    : `${asci.ad} için onay kaldırılsın mı? Müşterilere görünmeyecek ve yeni talep alamayacak.`;
  if (confirm(soru)) return rpc('asci_onayla', { p_asci_id: asci.id, p_onayli: onayli });
}

function asciReddet(asci) {
  const neden = prompt(`${asci.ad} reddedilsin mi? Aşçıya gösterilecek sebebi yaz (boş bırakabilirsin):`);
  if (neden === null) return;
  return rpc('asci_reddet', { p_asci_id: asci.id, p_neden: neden });
}

// Fotoğraf adresinden depodaki dosya yolunu çıkarır: .../fotograflar/<kullanıcı>/<dosya>
const dosyaYolu = (adres) => {
  const i = typeof adres === 'string' ? adres.indexOf('/fotograflar/') : -1;
  return i >= 0 ? decodeURIComponent(adres.slice(i + '/fotograflar/'.length).split('?')[0]) : null;
};

// Veri tabanı kaydı silindikten sonra dosyaları depodan da temizler (başarısız olursa uyarır).
async function dosyalariSil(yollar) {
  const liste = yollar.filter(Boolean);
  if (!liste.length) return;
  const { error } = await supabase.storage.from('fotograflar').remove(liste);
  if (error) alert('Kayıtlar silindi ama bazı fotoğraf dosyaları depodan silinemedi. Lütfen Supabase Storage bölümünden kontrol et.');
}

async function asciProfiliSil(asci) {
  const mesaj =
    `${asci.ad} adlı aşçının profili SİLİNECEK.\n\n` +
    `Bu aşçıya ait ${asci.talep_sayisi} talep, ${asci.yorum_sayisi} yorum ve yemek fotoğrafları da kalıcı olarak silinir. ` +
    `Aşçının hesabı kalır, isterse yeni profil oluşturabilir.\n\nBu işlem geri alınamaz.`;
  if (!silmeOnayi(mesaj)) return;
  const yollar = (galeriler[asci.id] ?? []).map(dosyaYolu);
  if (await rpc('asci_profili_sil', { p_asci_id: asci.id })) await dosyalariSil(yollar);
}

function uyeAskiya(uye, askida) {
  const soru = askida
    ? `${uye.ad} askıya alınsın mı? Giriş yapamaz, açık oturumları kapanır. Verileri silinmez.`
    : `${uye.ad} tekrar aktif edilsin mi?`;
  if (confirm(soru)) return rpc('uye_askiya_al', { p_id: uye.id, p_askida: askida });
}

async function uyeSil(uye) {
  const mesaj =
    `${uye.ad} (${uye.rol === 'asci' ? 'aşçı' : 'müşteri'}) hesabı SİLİNECEK.\n\n` +
    `Profili, ${uye.talep_sayisi} talebi, yorumları, şikayetleri ve yüklediği fotoğraflar kalıcı olarak silinir.\n\nBu işlem geri alınamaz.`;
  if (!silmeOnayi(mesaj)) return;
  const { data } = await supabase.storage.from('fotograflar').list(uye.id, { limit: 1000 });
  const yollar = (data ?? []).map((d) => `${uye.id}/${d.name}`);
  if (await rpc('uye_sil', { p_id: uye.id })) await dosyalariSil(yollar);
}

async function sikayetGuncelle(s, durum, not) {
  const { error } = await supabase.rpc('sikayet_guncelle', { p_id: s.id, p_durum: durum, p_not: not });
  if (error) return alert('İşlem yapılamadı. Lütfen tekrar dene.');
  await yukle();
}

// ---------- Çizim ----------
function ozetCiz() {
  const bekleyen = ascilar.filter((a) => !a.onayli_mi && !a.reddedildi_mi).length;
  const acik = sikayetler.filter((s) => s.durum !== 'cozuldu').length;
  const musteriler = uyeler.filter((u) => u.rol === 'musteri').length;
  $('ozet').replaceChildren(
    el('div', {}, el('b', {}, String(bekleyen)), 'Onay bekleyen aşçı'),
    el('div', {}, el('b', {}, String(ascilar.filter((a) => a.onayli_mi).length)), 'Onaylı aşçı'),
    el('div', {}, el('b', {}, String(musteriler)), 'Müşteri'),
    el('div', {}, el('b', {}, String(acik)), 'Açık şikayet'),
    el('div', {}, el('b', {}, String(reklamlar.filter(reklamYayinda).length)), 'Yayındaki reklam'),
  );
  $('sekmeAscilar').textContent = `Aşçılar${bekleyen ? ` (${bekleyen})` : ''}`;
  $('sekmeUyeler').textContent = `Üyeler (${uyeler.length})`;
  $('sekmeReklamlar').textContent = `Reklamlar (${reklamlar.length})`;
  $('sekmeKurumsal').textContent = `Kurumsal (${kurumsal.length})`;
  $('sekmeSikayetler').textContent = `Şikayetler${acik ? ` (${acik})` : ''}`;
}

function secimKutusu(secenekler, deger, degisti) {
  const sec = el('select', { class: 'filtre', onchange: (e) => degisti(e.target.value) },
    ...secenekler.map(([v, y]) => el('option', { value: v }, y)));
  sec.value = deger;
  return sec;
}

function filtreCiz() {
  const alan = $('filtreAlani');
  const aramaKutusu = () => {
    const ara = el('input', { class: 'arama', placeholder: 'Ada veya telefona göre ara', value: filtre.arama });
    ara.addEventListener('input', (e) => { filtre.arama = e.target.value; listeCiz(); });
    return ara;
  };
  if (sekme === 'ascilar') {
    alan.replaceChildren(
      secimKutusu([['bekleyen', 'Onay bekleyenler'], ['onayli', 'Onaylılar'], ['red', 'Reddedilenler'], ['hepsi', 'Hepsi']], filtre.asci, (v) => { filtre.asci = v; ciz(); }),
      aramaKutusu());
  } else if (sekme === 'reklamlar') {
    alan.replaceChildren(el('button', { class: 'kucuk', onclick: () => { reklamFormuAcik = !reklamFormuAcik; listeCiz(); } }, 'Yeni reklam ekle'));
  } else if (sekme === 'uyeler') {
    alan.replaceChildren(
      secimKutusu([['hepsi', 'Tüm üyeler'], ['musteri', 'Müşteriler'], ['asci', 'Aşçılar'], ['askida', 'Askıdakiler']], filtre.uye, (v) => { filtre.uye = v; ciz(); }),
      aramaKutusu());
  } else {
    alan.replaceChildren(
      secimKutusu([['acik', 'Çözülmemişler'], ['cozuldu', 'Çözülenler'], ['hepsi', 'Hepsi']], filtre.sikayet, (v) => { filtre.sikayet = v; ciz(); }));
  }
}

function asciKarti(a) {
  const satir = (etiket, deger) => (deger ? el('p', {}, el('b', {}, `${etiket}: `), deger) : null);
  const rozet = a.onayli_mi ? ['onayli', 'Onaylı'] : a.reddedildi_mi ? ['red', 'Reddedildi'] : ['bekliyor', 'Onay bekliyor'];
  return el('div', { class: 'kart' },
    el('div', { class: 'ust' },
      el('div', { class: 'kimlik' }, avatar(a.ad, a.fotograf), el('h3', {}, a.ad)),
      el('span', { class: `rozet ${rozet[0]}` }, rozet[1])),
    satir('Telefon', a.telefon),
    satir('Uzmanlık', (a.uzmanliklar ?? []).join(', ')),
    satir('Semtler', (a.semtler ?? []).join(', ')),
    satir('Başlangıç fiyatı', a.baslangic_fiyati != null ? tl(a.baslangic_fiyati) : ''),
    satir('Talep / yorum', `${a.talep_sayisi} talep, ${a.yorum_sayisi} yorum`),
    a.reddedildi_mi && a.red_nedeni ? satir('Red nedeni', a.red_nedeni) : null,
    a.tanitim ? el('p', {}, a.tanitim) : el('p', { class: 'soluk' }, 'Tanıtım yazısı yok.'),
    galeri(galeriler[a.id]),
    el('div', { class: 'eylemler' },
      a.onayli_mi
        ? el('button', { class: 'cerceveli kucuk', onclick: () => asciOnayla(a, false) }, 'Onayı Kaldır')
        : [
            el('button', { class: 'kucuk', onclick: () => asciOnayla(a, true) }, 'Onayla'),
            a.reddedildi_mi ? null : el('button', { class: 'cerceveli kucuk', onclick: () => asciReddet(a) }, 'Reddet'),
          ],
      el('button', { class: 'tehlike kucuk', onclick: () => asciProfiliSil(a) }, 'Profili Sil')));
}

function uyeKarti(u) {
  const satir = (etiket, deger) => (deger ? el('p', {}, el('b', {}, `${etiket}: `), deger) : null);
  return el('div', { class: 'kart' },
    el('div', { class: 'ust' },
      el('div', { class: 'kimlik' }, avatar(u.ad, u.fotograf), el('h3', {}, u.ad)),
      el('span', {},
        u.yonetici ? el('span', { class: 'rozet onayli' }, 'Yönetici ') : null,
        u.askida ? el('span', { class: 'rozet red' }, 'Askıda ') : null,
        el('span', { class: 'rozet' }, u.rol === 'asci' ? 'Aşçı' : 'Müşteri'))),
    satir('Telefon', u.telefon),
    satir('Kayıt tarihi', tarihSaat(u.kayit_tarihi)),
    satir('Talep sayısı', String(u.talep_sayisi)),
    u.rol === 'asci' ? galeri(galeriler[u.id]) : null,
    u.yonetici
      ? el('p', { class: 'soluk' }, 'Yönetici hesapları buradan askıya alınamaz veya silinemez.')
      : el('div', { class: 'eylemler' },
          u.askida
            ? el('button', { class: 'kucuk', onclick: () => uyeAskiya(u, false) }, 'Aktif Et')
            : el('button', { class: 'cerceveli kucuk', onclick: () => uyeAskiya(u, true) }, 'Askıya Al'),
          el('button', { class: 'tehlike kucuk', onclick: () => uyeSil(u) }, 'Hesabı Sil')));
}

// ---------- Reklamlar ----------
const reklamYayinda = (r) => r.aktif && new Date(r.baslangic) <= new Date() && (!r.bitis || new Date(r.bitis) > new Date());

function reklamDurumu(r) {
  if (!r.aktif) return ['', 'Kapalı'];
  if (new Date(r.baslangic) > new Date()) return ['planli', 'Planlandı'];
  if (r.bitis && new Date(r.bitis) <= new Date()) return ['', 'Süresi doldu'];
  return ['onayli', 'Yayında'];
}

async function reklamAktifDegistir(r) {
  const { error } = await supabase.from('reklamlar').update({ aktif: !r.aktif }).eq('id', r.id);
  if (error) return alert('İşlem yapılamadı. Lütfen tekrar dene.');
  await yukle();
}

async function reklamSil(r) {
  if (!confirm(`"${r.baslik}" reklamı silinsin mi? Bu işlem geri alınamaz.`)) return;
  const { error } = await supabase.from('reklamlar').delete().eq('id', r.id);
  if (error) return alert('İşlem yapılamadı. Lütfen tekrar dene.');
  const i = r.gorsel_adres.indexOf('/reklamlar/');
  if (i >= 0) await supabase.storage.from('reklamlar').remove([decodeURIComponent(r.gorsel_adres.slice(i + '/reklamlar/'.length))]);
  await yukle();
}

function reklamKarti(r) {
  const [sinif, ad] = reklamDurumu(r);
  const ctr = r.gosterim_sayisi > 0 ? ((r.tiklama_sayisi / r.gosterim_sayisi) * 100).toFixed(1) : '0.0';
  const satir = (e, d) => (d ? el('p', {}, el('b', {}, `${e}: `), d) : null);
  return el('div', { class: 'kart' },
    el('div', { class: 'ust' }, el('h3', {}, r.baslik), el('span', { class: `rozet ${sinif}` }, ad)),
    guvenliUrl(r.gorsel_adres) ? el('img', { class: 'reklamGorsel', src: r.gorsel_adres, alt: r.baslik, onclick: () => buyut(r.gorsel_adres) }) : null,
    satir('Reklamveren', r.reklamveren),
    satir('Bağlantı', r.hedef_adres),
    satir('Yayın', `${tarihSaat(r.baslangic)} → ${r.bitis ? tarihSaat(r.bitis) : 'süresiz'}`),
    satir('İstatistik', `${r.gosterim_sayisi} gösterim · ${r.tiklama_sayisi} tıklama · %${ctr} tıklanma oranı`),
    el('div', { class: 'eylemler' },
      el('button', { class: 'cerceveli kucuk', onclick: () => reklamAktifDegistir(r) }, r.aktif ? 'Kapat' : 'Aç'),
      el('button', { class: 'tehlike kucuk', onclick: () => reklamSil(r) }, 'Sil')));
}

const KURUMSAL_DURUM = { acik: 'Teklifler toplanıyor', secildi: 'Aşçı seçildi', tamamlandi: 'Tamamlandı', iptal: 'İptal edildi' };
const KURUMSAL_TEKRAR = { tek_sefer: 'Tek sefer', haftalik: 'Haftada bir', gunluk: 'Her gün' };
const KURUMSAL_OGUN = { ogle: 'Öğle yemeği', aksam: 'Akşam yemeği', kahvalti: 'Kahvaltı', ikram: 'İkram / kokteyl' };

function kurumsalKarti(t) {
  const satir = (e, d) => (d ? el('p', {}, el('b', {}, `${e}: `), d) : null);
  const sinif = t.durum === 'acik' ? 'bekliyor' : t.durum === 'iptal' ? 'red' : 'onayli';
  return el('div', { class: 'kart' },
    el('div', { class: 'ust' }, el('h3', {}, t.sirket_adi), el('span', { class: `rozet ${sinif}` }, KURUMSAL_DURUM[t.durum] ?? t.durum)),
    satir('Yetkili hesap', t.musteri_ad),
    satir('Semt', t.semt),
    satir('Başlangıç', tarihSaat(t.baslangic_tarihi)),
    satir('Tekrar', `${KURUMSAL_TEKRAR[t.tekrar] ?? t.tekrar}${t.tekrar === 'tek_sefer' ? '' : ` · ${t.tekrar_sayisi} kez`} · ${KURUMSAL_OGUN[t.ogun] ?? t.ogun}`),
    satir('Kişi sayısı', String(t.kisi_sayisi)),
    satir('Gelen teklif', String(t.teklif_sayisi)),
    satir('Seçilen aşçı', t.secilen_asci),
    satir('Oluşturma', tarihSaat(t.olusturma_tarihi)));
}

function reklamFormu() {
  const yerel = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const baslik = el('input', { placeholder: 'Reklam adı (yalnızca sende görünür)', maxLength: 80 });
  const veren = el('input', { placeholder: 'Reklamveren (isteğe bağlı)', maxLength: 80 });
  const hedef = el('input', { placeholder: 'https://... (dokununca açılacak adres, isteğe bağlı)', type: 'url' });
  const bas = el('input', { type: 'datetime-local', value: yerel(new Date()) });
  const bit = el('input', { type: 'datetime-local' });
  const dosya = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
  const mesaj = el('div', { class: 'hata gizli' });
  const kaydet = el('button', {}, 'Reklamı Kaydet');
  const hata = (m) => { mesaj.textContent = m; mesaj.classList.toggle('gizli', !m); };

  kaydet.addEventListener('click', async () => {
    hata('');
    const f = dosya.files[0];
    if (baslik.value.trim().length < 2) return hata('Reklam adı en az 2 karakter olmalı.');
    if (!f) return hata('Lütfen bir banner görseli seç.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return hata('Görsel JPG, PNG veya WebP olmalı.');
    if (f.size > 1024 * 1024) return hata('Görsel en fazla 1 MB olmalı.');
    if (hedef.value && !/^https:\/\//i.test(hedef.value)) return hata('Bağlantı https:// ile başlamalı.');
    if (bit.value && new Date(bit.value) <= new Date(bas.value)) return hata('Bitiş, başlangıçtan sonra olmalı.');
    const boyut = await new Promise((tamam) => { const i = new Image(); i.onload = () => tamam([i.naturalWidth, i.naturalHeight]); i.onerror = () => tamam(null); i.src = URL.createObjectURL(f); });
    if (!boyut) return hata('Görsel okunamadı.');
    const oran = boyut[0] / boyut[1];
    if ((oran < 3.2 || oran > 4.8) && !confirm(`Görselin oranı (${boyut[0]}×${boyut[1]}) önerilen 4:1'den farklı; uygulamada kırpılabilir. Yine de devam edilsin mi?`)) return;

    kaydet.disabled = true;
    const uzanti = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[f.type];
    const yol = `${crypto.randomUUID()}.${uzanti}`;
    const yukleme = await supabase.storage.from('reklamlar').upload(yol, f, { contentType: f.type });
    if (yukleme.error) { kaydet.disabled = false; return hata('Görsel yüklenemedi. Lütfen tekrar dene.'); }
    const adres = supabase.storage.from('reklamlar').getPublicUrl(yol).data.publicUrl;
    const { error } = await supabase.from('reklamlar').insert({
      baslik: baslik.value.trim(), reklamveren: veren.value.trim(), gorsel_adres: adres,
      hedef_adres: hedef.value.trim() || null,
      baslangic: new Date(bas.value).toISOString(), bitis: bit.value ? new Date(bit.value).toISOString() : null,
    });
    kaydet.disabled = false;
    if (error) { await supabase.storage.from('reklamlar').remove([yol]); return hata('Reklam kaydedilemedi. Lütfen tekrar dene.'); }
    reklamFormuAcik = false;
    await yukle();
  });

  const alan = (e, k) => el('div', {}, el('label', {}, e), k);
  return el('div', { class: 'form' },
    el('h3', { style: 'margin:0 0 6px' }, 'Yeni reklam'),
    alan('Reklam adı', baslik), alan('Reklamveren', veren), alan('Bağlantı (dokununca açılır)', hedef),
    el('div', { class: 'iki' }, alan('Yayın başlangıcı', bas), alan('Yayın bitişi (boşsa süresiz)', bit)),
    alan('Banner görseli', dosya),
    el('small', {}, 'Önerilen boyut: 1200×300 piksel (4:1), JPG/PNG/WebP, en fazla 1 MB. Uygulamada alt menünün üstünde, "Reklam" etiketiyle görünür.'),
    mesaj, el('div', { class: 'eylemler' }, kaydet, el('button', { class: 'cerceveli', onclick: () => { reklamFormuAcik = false; listeCiz(); } }, 'Vazgeç')));
}

function sikayetKarti(s) {
  const not = el('textarea', { placeholder: 'Yönetici notu (isteğe bağlı)', value: s.yonetici_notu ?? '' });
  const rozetSinifi = s.durum === 'acik' ? 'bekliyor' : s.durum === 'inceleniyor' ? 'inceleniyor' : '';
  return el('div', { class: 'kart' },
    el('div', { class: 'ust' },
      el('h3', {}, `${s.sikayet_eden_ad} → ${s.karsi_taraf_ad}`),
      el('span', { class: `rozet ${rozetSinifi}` }, SIKAYET_ADI[s.durum])),
    el('p', { class: 'soluk' },
      `${s.sikayet_eden_rol === 'asci' ? 'Aşçı' : 'Müşteri'} şikayet etti · ${tarihSaat(s.olusturma_tarihi)} · Hizmet: ${tarihSaat(s.talep_tarihi)}, ${s.talep_semt}`),
    el('p', {}, s.aciklama),
    el('div', { style: 'margin-top:12px' }, not),
    el('div', { class: 'eylemler' },
      s.durum !== 'inceleniyor' ? el('button', { class: 'kucuk', onclick: () => sikayetGuncelle(s, 'inceleniyor', not.value) }, 'İnceleniyor') : null,
      s.durum !== 'cozuldu'
        ? el('button', { class: 'cerceveli kucuk', onclick: () => sikayetGuncelle(s, 'cozuldu', not.value) }, 'Çözüldü')
        : el('button', { class: 'cerceveli kucuk', onclick: () => sikayetGuncelle(s, 'cozuldu', not.value) }, 'Notu Kaydet')));
}

function listeCiz() {
  const liste = $('liste');
  const ara = filtre.arama.trim().toLocaleLowerCase('tr-TR');
  const eslesir = (x) => !ara || `${x.ad} ${x.telefon ?? ''}`.toLocaleLowerCase('tr-TR').includes(ara);
  const bos = (m) => [el('p', { class: 'bos' }, m)];
  if (sekme === 'ascilar') {
    const durum = (a) => (a.onayli_mi ? 'onayli' : a.reddedildi_mi ? 'red' : 'bekleyen');
    const gorunen = ascilar
      .filter((a) => filtre.asci === 'hepsi' || durum(a) === filtre.asci)
      .filter(eslesir)
      .sort((x, y) => Number(x.onayli_mi) - Number(y.onayli_mi) || y.guncelleme_tarihi.localeCompare(x.guncelleme_tarihi));
    liste.replaceChildren(...(gorunen.length ? gorunen.map(asciKarti) : bos('Gösterilecek aşçı yok.')));
  } else if (sekme === 'kurumsal') {
    liste.replaceChildren(...(kurumsal.length ? kurumsal.map(kurumsalKarti) : bos('Henüz kurumsal talep yok.')));
  } else if (sekme === 'reklamlar') {
    liste.replaceChildren(...[reklamFormuAcik ? reklamFormu() : null, ...(reklamlar.length ? reklamlar.map(reklamKarti) : bos('Henüz reklam yok. "Yeni reklam ekle" ile başlayabilirsin.'))].filter(Boolean));
  } else if (sekme === 'uyeler') {
    const gorunen = uyeler
      .filter((u) => filtre.uye === 'hepsi' || (filtre.uye === 'askida' ? u.askida : u.rol === filtre.uye))
      .filter(eslesir)
      .sort((x, y) => y.kayit_tarihi.localeCompare(x.kayit_tarihi));
    liste.replaceChildren(...(gorunen.length ? gorunen.map(uyeKarti) : bos('Gösterilecek üye yok.')));
  } else {
    const gorunen = sikayetler
      .filter((s) => filtre.sikayet === 'hepsi' || (filtre.sikayet === 'acik' ? s.durum !== 'cozuldu' : s.durum === 'cozuldu'))
      .sort((x, y) => SIKAYET_SIRA[x.durum] - SIKAYET_SIRA[y.durum] || y.olusturma_tarihi.localeCompare(x.olusturma_tarihi));
    liste.replaceChildren(...(gorunen.length ? gorunen.map(sikayetKarti) : bos('Gösterilecek şikayet yok.')));
  }
}

function ciz() {
  ozetCiz();
  filtreCiz();
  listeCiz();
}

function sekmeSec(yeni) {
  sekme = yeni;
  filtre.arama = '';
  $('sekmeAscilar').classList.toggle('acik', yeni === 'ascilar');
  $('sekmeUyeler').classList.toggle('acik', yeni === 'uyeler');
  $('sekmeReklamlar').classList.toggle('acik', yeni === 'reklamlar');
  $('sekmeKurumsal').classList.toggle('acik', yeni === 'kurumsal');
  $('sekmeSikayetler').classList.toggle('acik', yeni === 'sikayetler');
  ciz();
}
$('sekmeAscilar').addEventListener('click', () => sekmeSec('ascilar'));
$('sekmeUyeler').addEventListener('click', () => sekmeSec('uyeler'));
$('sekmeReklamlar').addEventListener('click', () => sekmeSec('reklamlar'));
$('sekmeKurumsal').addEventListener('click', () => sekmeSec('kurumsal'));
$('sekmeSikayetler').addEventListener('click', () => sekmeSec('sikayetler'));
$('yenile').addEventListener('click', yukle);

// ---------- Açılış: açık oturum varsa doğrudan panele ----------
const { data: { session } } = await supabase.auth.getSession();
if (session) await panelAc(session);
else girisGoster();
