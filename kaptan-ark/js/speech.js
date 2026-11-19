// Sesli okuma yardımcıları: metni konuşma motoruna hazırlar ve cihazdaki en doğal sesi seçer.

// Türkçe ses motorları "Ark/ark" kelimesini "arkeoloji" kısaltması sanıp yanlış okuyor.
// Bu yüzden seslendirmede "ARK" hiç geçmez: maskot kendini sadece "Kaptan" diye tanıtır,
// klinik adı "kliniğimiz" diye okunur (bkz. clinicName). Ekrandaki yazılar değişmez.
// Uzun ifadeler önce uygulanır ("Kaptan Ark" → "Kaptan", sonra kalan "ARK" silinir).
export const DEFAULT_PRONUNCIATIONS = { 'Kaptan Ark': 'Kaptan', ARK: '', Ark: '' };

// "ARK Dental'de" → "kliniğimizde": Türkçe hâl ekine göre "kliniğimiz" kelimesinin doğru biçimi.
function clinicWord(suffix) {
  const s = String(suffix ?? '').toLocaleLowerCase('tr');
  if (!s) return 'kliniğimiz';
  if (/^y?[ea]$/.test(s)) return 'kliniğimize';
  if (/^[dt][ea]$/.test(s)) return 'kliniğimizde';
  if (/^[dt][ea]n$/.test(s)) return 'kliniğimizden';
  if (/^n?[ıiuü]n$/.test(s)) return 'kliniğimizin';
  if (/^y?[ıiuü]$/.test(s)) return 'kliniğimizi';
  if (/^y?l[ea]$/.test(s)) return 'kliniğimizle';
  return 'kliniğimiz';
}

/** Klinik adını seslendirmeye uygun hale getirir ("ARK" kelimesi okunmaz). */
function clinicName(text) {
  return (
    text
      // Karşılama: "ARK Dental'e hoş geldiniz" → "Hoş geldiniz"
      .replace(/(^|[^\p{L}\p{N}])ARK\s+Dental(?:\s+Clinic)?['’]?(?:y?[ea])\s+hoş\s*geldiniz/giu, '$1Hoş geldiniz')
      // Diğer yerler: "ARK Dental Clinic'in" → "kliniğimizin"
      .replace(/(^|[^\p{L}\p{N}])ARK\s+Dental(?:\s+Clinic)?(?:['’](\p{L}+))?(?=[^\p{L}\p{N}]|$)/giu, (_, before, suffix) => `${before}${clinicWord(suffix)}`)
  );
}

const NOT_WORD = '[^\\p{L}\\p{N}]';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectLang(text) {
  if (/[çğıöşüİ]/i.test(text)) return 'tr';
  if (/\b(the|you|your|and|appointment|hello|thank)\b/i.test(text)) return 'en';
  return 'tr';
}

/**
 * Emoji, bağlantı ve işaretleri temizler; telaffuz sözlüğündeki kelimeleri değiştirir.
 * Sözlük anahtarları büyük/küçük harfe duyarlıdır ve yalnızca tam kelime olarak eşleşir
 * ("Ark'ın" içindeki "Ark" değişir, "Arkadaş" değişmez).
 */
export function speechText(text, pronunciations = {}) {
  let out = String(text ?? '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[•*#_`>]/g, ' ');
  out = clinicName(out);
  const dict = { ...DEFAULT_PRONUNCIATIONS, ...(pronunciations ?? {}) };
  const entries = Object.entries(dict).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    if (!from || from.startsWith('_') || typeof to !== 'string') continue;
    const re = new RegExp(`(^|${NOT_WORD})${escapeRegExp(from)}(?=${NOT_WORD}|$)`, 'gu');
    out = out.replace(re, (_, before) => `${before}${to}`);
  }
  return (
    out
      // Cümle sonundaki "ark." kısaltma gibi okunmasın.
      .replace(new RegExp(`(^|${NOT_WORD})(ark)\\.(?=\\s|$)`, 'giu'), '$1$2!')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.!?;:])/g, '$1')
      .trim()
  );
}

/** Uzun metni parçalara böler (bazı tarayıcılar uzun cümleleri yarıda keser). */
export function chunk(text) {
  const parts = text.match(/[^.!?…\n]+[.!?…]*\s*/g) ?? [text];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > 180 && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Bir sesin ne kadar doğal olduğunu tahmin eder (adından ve türünden). null: dil uymuyor. */
export function voiceScore(voice, lang) {
  const vlang = String(voice?.lang ?? '').toLowerCase().replace('_', '-');
  if (!vlang.startsWith(lang)) return null;
  const name = String(voice.name ?? '');
  let score = 0;
  if (/natural|neural/i.test(name)) score += 100; // Edge: "Microsoft Emel Online (Natural)"
  if (/premium|enhanced|\bhd\b/i.test(name)) score += 70; // Apple: "Yelda (Gelişmiş)/(Premium)"
  if (/geli[şs]mi[şs]/i.test(name)) score += 70;
  if (/google/i.test(name)) score += 50; // Chrome / Android
  if (/online/i.test(name)) score += 30;
  if (/emel|ahmet|yelda|cem|filiz/i.test(name)) score += 10;
  if (/compact|espeak|eloquence|tolga/i.test(name)) score -= 40; // eski, robotik sesler
  if (voice.localService === false) score += 15; // bulut sesleri genelde daha doğal
  if (vlang === `${lang}-tr` || vlang === `${lang}-us`) score += 5;
  return score;
}

/** Cihazdaki en doğal sesi seçer. `preferred` verilirse adında bu metni içeren ses önce gelir. */
export function pickVoice(voices, lang, preferred = '') {
  const list = (voices ?? []).filter((v) => voiceScore(v, lang) !== null);
  if (preferred) {
    const wanted = list.find((v) => v.name.toLocaleLowerCase('tr').includes(preferred.toLocaleLowerCase('tr')));
    if (wanted) return wanted;
  }
  return list.sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0] ?? null;
}
