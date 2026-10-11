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

const SIKAYET_ADI = { acik: 'Açık', inceleniyor: 'İnceleniyor', cozuldu: 'Çözüldü' };
const SIKAYET_SIRA = { acik: 0, inceleniyor: 1, cozuldu: 2 };

// ---------- Durum ----------
let sekme = 'ascilar';
let ascilar = [];
let sikayetler = [];
let filtre = { asci: 'bekleyen', sikayet: 'acik', arama: '' };

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
  const [a, s] = await Promise.all([
    supabase.from('yonetici_ascilar').select('*'),
    supabase.from('yonetici_sikayetleri').select('*'),
  ]);
  if (a.error || s.error) {
    $('liste').replaceChildren(el('p', { class: 'hata bos' }, 'Veriler yüklenemedi. Oturumun kapanmış olabilir, sayfayı yenileyip tekrar gir.'));
    return;
  }
  ascilar = a.data ?? [];
  sikayetler = s.data ?? [];
  ciz();
}

async function asciOnayla(asci, onayli) {
  const soru = onayli
    ? `${asci.ad} onaylansın mı? Müşterilere görünür olacak ve talep alabilecek.`
    : `${asci.ad} için onay kaldırılsın mı? Müşterilere görünmeyecek ve yeni talep alamayacak.`;
  if (!confirm(soru)) return;
  const { error } = await supabase.rpc('asci_onayla', { p_asci_id: asci.id, p_onayli: onayli });
  if (error) return alert('İşlem yapılamadı. Lütfen tekrar dene.');
  await yukle();
}

async function sikayetGuncelle(s, durum, not) {
  const { error } = await supabase.rpc('sikayet_guncelle', { p_id: s.id, p_durum: durum, p_not: not });
  if (error) return alert('İşlem yapılamadı. Lütfen tekrar dene.');
  await yukle();
}

// ---------- Çizim ----------
function ozetCiz() {
  const bekleyen = ascilar.filter((a) => !a.onayli_mi).length;
  const acik = sikayetler.filter((s) => s.durum !== 'cozuldu').length;
  $('ozet').replaceChildren(
    el('div', {}, el('b', {}, String(bekleyen)), 'Onay bekleyen aşçı'),
    el('div', {}, el('b', {}, String(ascilar.length - bekleyen)), 'Onaylı aşçı'),
    el('div', {}, el('b', {}, String(acik)), 'Açık şikayet'),
  );
  $('sekmeAscilar').textContent = `Aşçı Onayları${bekleyen ? ` (${bekleyen})` : ''}`;
  $('sekmeSikayetler').textContent = `Şikayetler${acik ? ` (${acik})` : ''}`;
}

function filtreCiz() {
  const alan = $('filtreAlani');
  if (sekme === 'ascilar') {
    const sec = el('select', { class: 'filtre', onchange: (e) => { filtre.asci = e.target.value; ciz(); } },
      el('option', { value: 'bekleyen' }, 'Onay bekleyenler'),
      el('option', { value: 'onayli' }, 'Onaylılar'),
      el('option', { value: 'hepsi' }, 'Hepsi'));
    sec.value = filtre.asci;
    const ara = el('input', { class: 'arama', placeholder: 'Ada veya telefona göre ara', value: filtre.arama });
    ara.addEventListener('input', (e) => { filtre.arama = e.target.value; listeCiz(); });
    alan.replaceChildren(sec, ara);
  } else {
    const sec = el('select', { class: 'filtre', onchange: (e) => { filtre.sikayet = e.target.value; ciz(); } },
      el('option', { value: 'acik' }, 'Çözülmemişler'),
      el('option', { value: 'cozuldu' }, 'Çözülenler'),
      el('option', { value: 'hepsi' }, 'Hepsi'));
    sec.value = filtre.sikayet;
    alan.replaceChildren(sec);
  }
}

function asciKarti(a) {
  const satir = (etiket, deger) => (deger ? el('p', {}, el('b', {}, `${etiket}: `), deger) : null);
  return el('div', { class: 'kart' },
    el('div', { class: 'ust' },
      el('h3', {}, a.ad),
      el('span', { class: `rozet ${a.onayli_mi ? 'onayli' : 'bekliyor'}` }, a.onayli_mi ? 'Onaylı' : 'Onay bekliyor')),
    satir('Telefon', a.telefon),
    satir('Uzmanlık', (a.uzmanliklar ?? []).join(', ')),
    satir('Semtler', (a.semtler ?? []).join(', ')),
    satir('Başlangıç fiyatı', a.baslangic_fiyati != null ? tl(a.baslangic_fiyati) : ''),
    a.tanitim ? el('p', {}, a.tanitim) : el('p', { class: 'soluk' }, 'Tanıtım yazısı yok.'),
    el('div', { class: 'eylemler' },
      a.onayli_mi
        ? el('button', { class: 'cerceveli kucuk', onclick: () => asciOnayla(a, false) }, 'Onayı Kaldır')
        : el('button', { class: 'kucuk', onclick: () => asciOnayla(a, true) }, 'Onayla')));
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
  if (sekme === 'ascilar') {
    const ara = filtre.arama.trim().toLocaleLowerCase('tr-TR');
    const gorunen = ascilar
      .filter((a) => filtre.asci === 'hepsi' || (filtre.asci === 'bekleyen' ? !a.onayli_mi : a.onayli_mi))
      .filter((a) => !ara || `${a.ad} ${a.telefon ?? ''}`.toLocaleLowerCase('tr-TR').includes(ara))
      .sort((x, y) => Number(x.onayli_mi) - Number(y.onayli_mi) || y.guncelleme_tarihi.localeCompare(x.guncelleme_tarihi));
    liste.replaceChildren(...(gorunen.length ? gorunen.map(asciKarti) : [el('p', { class: 'bos' }, 'Gösterilecek aşçı yok.')]));
  } else {
    const gorunen = sikayetler
      .filter((s) => filtre.sikayet === 'hepsi' || (filtre.sikayet === 'acik' ? s.durum !== 'cozuldu' : s.durum === 'cozuldu'))
      .sort((x, y) => SIKAYET_SIRA[x.durum] - SIKAYET_SIRA[y.durum] || y.olusturma_tarihi.localeCompare(x.olusturma_tarihi));
    liste.replaceChildren(...(gorunen.length ? gorunen.map(sikayetKarti) : [el('p', { class: 'bos' }, 'Gösterilecek şikayet yok.')]));
  }
}

function ciz() {
  ozetCiz();
  filtreCiz();
  listeCiz();
}

function sekmeSec(yeni) {
  sekme = yeni;
  $('sekmeAscilar').classList.toggle('acik', yeni === 'ascilar');
  $('sekmeSikayetler').classList.toggle('acik', yeni === 'sikayetler');
  ciz();
}
$('sekmeAscilar').addEventListener('click', () => sekmeSec('ascilar'));
$('sekmeSikayetler').addEventListener('click', () => sekmeSec('sikayetler'));
$('yenile').addEventListener('click', yukle);

// ---------- Açılış: açık oturum varsa doğrudan panele ----------
const { data: { session } } = await supabase.auth.getSession();
if (session) await panelAc(session);
else girisGoster();
