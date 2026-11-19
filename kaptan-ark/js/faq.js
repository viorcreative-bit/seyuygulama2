// Yapay zeka olmadan çalışan hazır cevap motoru. Soruyu anahtar kelimelerle eşleştirir ve
// cevabı clinic.json'daki bilgilerden üretir. Yapay zeka açıkken de acil durum ve randevu
// gibi kesin davranması gereken konular burada karşılanır.
import { WEEKDAYS_TR } from './time.js';

/** Türkçe karakterleri sadeleştirir: "İmplantı NE KADAR?" -> "implanti ne kadar" */
export function normalize(text) {
  return String(text ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kelime başı eşleşmesi: "implant" anahtarı "implantim", "implanti" ile de eşleşir. */
function has(n, keywords) {
  return keywords.some((k) => {
    const key = normalize(k);
    if (!key) return false;
    // Kısa anahtarlar ("hi", "tsk") yalnızca tam kelime olarak eşleşir.
    if (key.length <= 3) return ` ${n} `.includes(` ${key} `);
    return ` ${n}`.includes(` ${key}`);
  });
}

function count(n, keywords) {
  return keywords.reduce((c, k) => c + (has(n, [k]) ? 1 : 0), 0);
}

const KW = {
  emergency: [
    'acil', 'siddetli agri', 'cok agri', 'dayanilmaz', 'sislik', 'sisti', 'sismis', 'sisme', 'yuzum sis',
    'kanama durmuyor', 'kanamam durmuyor', 'durmayan kanama', 'travma', 'kaza', 'disim kirildi', 'dis kirildi',
    'nefes alamiyorum', 'yutkunamiyorum', 'emergency', 'swelling',
  ],
  cancel: ['iptal', 'ertele', 'degistir', 'degisiklik', 'saatini degis', 'cancel', 'reschedule'],
  booking: ['randevu', 'rezervasyon', 'appointment', 'book', 'muayene olmak', 'gelmek istiyorum', 'yer var mi', 'musait misiniz', 'bos yer'],
  price: ['fiyat', 'ucret', 'kac para', 'ne kadar tutar', 'tutar', 'maliyet', 'price', 'cost', 'how much', 'taksit', 'odeme', 'kredi kart', 'pahali', 'ucuz'],
  hours: ['saat', 'acik', 'kapali', 'calisma', 'mesai', 'pazar', 'cumartesi', 'hafta sonu', 'haftasonu', 'hafta ici', 'kacta', 'kaca kadar', 'opening', 'hours', 'open'],
  location: ['adres', 'nerede', 'konum', 'yol tarifi', 'harita', 'nasil gel', 'nasil gid', 'ulasim', 'otopark', 'location', 'address', 'where'],
  contact: ['telefon', 'numara', 'iletisim', 'ulas', 'whatsapp', 'mail', 'e posta', 'eposta', 'contact', 'phone', 'aramak', 'arayabilir'],
  doctors: ['doktor', 'hekim', 'dis hekimi', 'uzman', 'doctor', 'dentist'],
  language: ['ingilizce', 'english', 'yabanci dil', 'almanca', 'arapca', 'rusca', 'hangi dil'],
  services: ['hizmet', 'tedavi', 'neler yap', 'ne yapiyorsunuz', 'bolum', 'services', 'treatment'],
  pain: ['agri', 'agriyor', 'sizliyor', 'sizi', 'hassasiyet', 'hassas', 'zonkl', 'pain', 'hurt'],
  greeting: ['merhaba', 'selam', 'iyi gunler', 'gunaydin', 'iyi aksamlar', 'hello', 'hi', 'hey', 'mrb', 'slm', 'naber'],
  thanks: ['tesekkur', 'sagol', 'sag ol', 'eyvallah', 'thanks', 'thank', 'tsk', 'cok iyi', 'harika', 'super'],
  bye: ['gorusuruz', 'hosca kal', 'iyi gunler dilerim', 'bye'],
};

// Genel bilgilendirme metinleri (klinik iddiası içermez).
const GENERAL_INFO = {
  implant:
    'İmplant, eksik dişin yerine çene kemiğine yerleştirilen titanyum bir vida ve üzerine yapılan kalıcı dişten oluşur. Süreç genellikle muayene ve röntgen, implantın yerleştirilmesi, kemikle kaynaşması için birkaç aylık bekleme ve son olarak üst yapının takılması şeklinde ilerler. İşlem lokal anestezi ile yapıldığı için ağrı hissedilmez.',
  beyazlatma:
    'Profesyonel beyazlatmada dişlere özel bir jel uygulanarak tonları birkaç kademe açılır. Muayenede diş ve diş eti sağlığınız kontrol edilir; işlemden sonra bir süre hassasiyet olabilir ve renkli yiyeceklerden kaçınmanız önerilir.',
  zirkon:
    'Zirkonyum kaplama, metal içermeyen, ışığı doğal dişe benzer şekilde geçiren dayanıklı bir kaplamadır. Genellikle ölçü, prova ve yapıştırma olmak üzere birkaç seansta tamamlanır.',
  lamina:
    'Porselen lamina, ön dişlerin ön yüzüne yapıştırılan ince porselen yapraklardır. Renk, şekil ve aralık sorunlarını düzeltmek için kullanılır; gülüş tasarımı ile birlikte planlanır.',
  kanal:
    'Kanal tedavisinde dişin içindeki iltihaplı sinir dokusu temizlenir, kanallar dezenfekte edilip doldurulur. Lokal anestezi ile yapıldığından genellikle ağrısızdır ve dişin çekilmeden kurtarılmasını sağlar.',
  dolgu:
    'Dolguda çürük temizlenir ve diş, renginize uygun kompozit (beyaz) dolgu ile onarılır. Çoğu zaman tek seansta tamamlanır.',
  cekim:
    'Diş çekimi lokal anestezi ile yapılır. Gömülü yirmi yaş dişlerinde önce röntgenle dişin konumu değerlendirilir. Çekim sonrası hekimin önerilerine uymak iyileşmeyi hızlandırır.',
  ortodonti:
    'Ortodontik tedavide çapraşık dişler diş teli (braket) ya da şeffaf plaklarla düzeltilir. Süre kişiye göre değişir ve genellikle aylar sürer; muayenede size uygun yöntem belirlenir.',
  temizlik:
    'Diş taşı temizliğinde diş yüzeyindeki taşlar ve lekeler özel aletlerle temizlenir, ardından cila yapılır. Yılda en az bir kez önerilir ve diş eti sağlığı için önemlidir.',
  cocuk:
    'Çocuk diş hekimliğinde süt ve daimi dişlerin takibi, flor uygulaması, fissür örtücü ve çocuklara uygun tedaviler yapılır. İlk kontrolün ilk diş çıktıktan sonra yapılması önerilir.',
  'dis eti':
    'Diş eti kanaması ve çekilmesi çoğunlukla diş taşı ve iltihaba bağlıdır. Profesyonel temizlik ve gerekirse diş eti tedavisi ile kontrol altına alınır.',
};

function serviceInfo(service) {
  const n = normalize(`${service.name} ${(service.keywords ?? []).join(' ')}`);
  for (const [key, text] of Object.entries(GENERAL_INFO)) if (n.includes(normalize(key))) return text;
  return null;
}

/** Mesajda en çok geçen hizmeti bulur. */
export function detectService(clinic, text) {
  const n = normalize(text);
  let best = null;
  let bestScore = 0;
  for (const s of clinic.services ?? []) {
    const score = count(n, [s.name, ...(s.keywords ?? [])]);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

function hoursText(clinic) {
  const groups = [];
  for (const [day, h] of Object.entries(clinic.workingHours ?? {})) {
    const value = h ? `${h[0]}–${h[1]}` : 'kapalı';
    const last = groups.at(-1);
    if (last && last.value === value) last.days.push(day);
    else groups.push({ value, days: [day] });
  }
  const lines = groups.map((g) => {
    const names = g.days.map((d) => WEEKDAYS_TR[d]);
    const label = names.length > 2 ? `${names[0]}–${names.at(-1)}` : names.join(', ');
    return `• ${label}: ${g.value}`;
  });
  const breaks = (clinic.breaks ?? []).map(([s, e]) => `${s}–${e}`).join(', ');
  return `Çalışma saatlerimiz:\n${lines.join('\n')}${breaks ? `\nÖğle arası: ${breaks}` : ''}`;
}

function faqMatch(clinic, n) {
  const stop = new Set(['mi', 'mu', 'misiniz', 'musunuz', 'var', 'yok', 've', 'ile', 'bir', 'bu', 'ne', 'nasil', 'icin', 'da', 'de', 'ki']);
  let best = null;
  let bestScore = 0;
  for (const item of clinic.faq ?? []) {
    const words = normalize(item.q)
      .split(' ')
      .filter((w) => w.length >= 3 && !stop.has(w));
    if (!words.length) continue;
    const hits = words.filter((w) => ` ${n}`.includes(` ${w.slice(0, Math.max(4, w.length - 2))}`)).length;
    const score = hits / words.length;
    const strong = score >= 0.6 || (hits >= 2 && score >= 0.4);
    if (strong && score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

const CHIP_BOOK = { label: '📅 Randevu al', action: 'booking' };

function contactChips(clinic) {
  const chips = [];
  if (clinic.phone) chips.push({ label: '📞 Bizi arayın', href: `tel:${clinic.phone.replace(/[^\d+]/g, '')}` });
  const wa = String(clinic.whatsapp ?? '').replace(/\D/g, '');
  if (wa.length >= 10) chips.push({ label: '💬 WhatsApp', href: `https://wa.me/${wa}` });
  return chips;
}

/** Kesin davranılması gereken konular (yapay zeka açık olsa bile önce bunlara bakılır). */
export function priorityAnswer(clinic, text) {
  const n = normalize(text);
  if (has(n, KW.emergency)) {
    return {
      intent: 'emergency',
      text: `Geçmiş olsun! Yüzünüzde veya boynunuzda hızla büyüyen şişlik, ateşle birlikte şişlik, nefes alma ya da yutkunma güçlüğü, durmayan kanama veya ciddi bir darbe varsa lütfen hemen 112'yi arayın.\nŞiddetli diş ağrısı için bizi hemen arayabilirsiniz: ${clinic.phone}. İsterseniz en yakın randevu için de yardımcı olayım.`,
      chips: [{ label: '🚑 112', href: 'tel:112' }, ...contactChips(clinic), CHIP_BOOK],
    };
  }
  if (has(n, KW.cancel) && (has(n, KW.booking) || n.split(' ').length <= 3)) {
    return {
      intent: 'cancel',
      text: 'Randevunuzu iptal etmek ya da değiştirmek için bize WhatsApp\'tan yazabilir veya telefonla ulaşabilirsiniz. Yeni bir randevu talebi de oluşturabilirim.',
      chips: [...contactChips(clinic), CHIP_BOOK],
    };
  }
  if (has(n, KW.booking)) {
    const service = detectService(clinic, text);
    return { intent: 'booking', action: 'booking', service: service?.name ?? null };
  }
  return null;
}

/** Hazır cevap üretir. Her zaman bir cevap döner. */
export function answer(clinic, text) {
  const priority = priorityAnswer(clinic, text);
  if (priority) return priority;

  const n = normalize(text);
  const words = n.split(' ').filter(Boolean);
  const faq = faqMatch(clinic, n);
  if (faq) return { intent: 'faq', text: faq.a, chips: [CHIP_BOOK] };

  const service = detectService(clinic, text);

  const asksDuration = has(n, ['surer', 'suruyor', 'surmek', 'sure', 'zaman', 'kac gun', 'kac seans', 'how long']);
  if (has(n, KW.price) || (has(n, ['ne kadar']) && !asksDuration)) {
    const prices = Object.entries(clinic.prices?.items ?? {});
    const exact = service && prices.find(([k]) => normalize(k) === normalize(service.name));
    if (exact) return { intent: 'price', text: `${exact[0]}: ${exact[1]}. Kesin tutar muayeneden sonra netleşir.`, chips: [CHIP_BOOK] };
    if (prices.length && !service) {
      return {
        intent: 'price',
        text: `Paylaşabildiğimiz fiyatlar:\n${prices.map(([k, v]) => `• ${k}: ${v}`).join('\n')}\nDiğer tedavilerin ücreti muayeneden sonra belirlenir.`,
        chips: [CHIP_BOOK],
      };
    }
    return {
      intent: 'price',
      generic: true,
      text: `${service ? `${service.name} ücreti` : 'Tedavi ücretleri'}, muayenede ağız yapınıza göre hazırlanan tedavi planından sonra netleşir. Böylece size özel ve doğru bir fiyat verebiliriz. Muayene için randevu talebi oluşturmamı ister misiniz?`,
      chips: [CHIP_BOOK, ...contactChips(clinic)],
    };
  }

  if (service && !has(n, KW.hours) && !has(n, KW.location)) {
    const info = serviceInfo(service);
    return {
      intent: 'service',
      text: `${info ?? `${service.name}: ${service.description}`}\nSize en uygun tedaviyi muayenede hekimimiz belirler. Randevu talebi oluşturmamı ister misiniz?`,
      chips: [{ ...CHIP_BOOK, service: service.name }],
    };
  }

  if (has(n, KW.hours)) return { intent: 'hours', text: hoursText(clinic), chips: [CHIP_BOOK] };

  if (has(n, KW.location)) {
    const chips = [];
    if (clinic.mapsUrl) chips.push({ label: '🗺️ Yol tarifi', href: clinic.mapsUrl });
    return { intent: 'location', text: `Adresimiz: ${clinic.address}`, chips: [...chips, ...contactChips(clinic)] };
  }

  if (has(n, KW.contact)) {
    const parts = [`Telefon: ${clinic.phone}`];
    if (clinic.whatsapp) parts.push(`WhatsApp: +${String(clinic.whatsapp).replace(/\D/g, '')}`);
    if (clinic.email) parts.push(`E-posta: ${clinic.email}`);
    return { intent: 'contact', text: `Bize şuradan ulaşabilirsiniz:\n${parts.map((p) => `• ${p}`).join('\n')}`, chips: contactChips(clinic) };
  }

  if (has(n, KW.doctors)) {
    const docs = clinic.doctors ?? [];
    return {
      intent: 'doctors',
      text: docs.length
        ? `Hekimlerimiz:\n${docs.map((d) => `• ${typeof d === 'string' ? d : `${d.name}${d.title ? ` (${d.title})` : ''}`}`).join('\n')}`
        : 'Alanında deneyimli hekimlerimiz sizi muayene edip size en uygun tedaviyi planlar. Hekimlerimiz hakkında ayrıntılı bilgi için bizi arayabilirsiniz.',
      chips: [CHIP_BOOK],
    };
  }

  if (has(n, KW.language)) {
    return { intent: 'language', text: `Kliniğimizde ${(clinic.languages ?? ['Türkçe']).join(', ')} dillerinde hizmet veriyoruz.`, chips: [CHIP_BOOK] };
  }

  if (has(n, KW.services)) {
    return {
      intent: 'services',
      text: `Hizmetlerimiz:\n${(clinic.services ?? []).map((s) => `• ${s.name}`).join('\n')}\nHangisi hakkında bilgi almak istersiniz?`,
      chips: (clinic.services ?? []).slice(1, 5).map((s) => s.name),
    };
  }

  if (has(n, KW.pain)) {
    return {
      intent: 'pain',
      text: `Geçmiş olsun! Ağrının sebebini (çürük, diş eti, sinir vb.) en doğru şekilde muayenede anlayabiliriz. Ağrınız şiddetliyse bizi hemen arayın: ${clinic.phone}. Dilerseniz size en yakın randevu için talep oluşturalım.`,
      chips: [CHIP_BOOK, ...contactChips(clinic)],
    };
  }

  if (words.length <= 5 && has(n, KW.thanks)) {
    return { intent: 'thanks', text: 'Rica ederim! Başka bir sorunuz olursa buradayım. Sağlıklı gülüşler dilerim 😁', chips: [] };
  }
  if (words.length <= 5 && has(n, KW.bye)) {
    return { intent: 'bye', text: 'Görüşmek üzere! Sağlıklı gülüşler dilerim 😁', chips: [] };
  }
  if (words.length <= 5 && has(n, KW.greeting)) {
    return {
      intent: 'greeting',
      text: `Merhaba! Ben ${clinic.assistantName}. Size nasıl yardımcı olabilirim?`,
      chips: clinic.suggestions ?? [],
    };
  }

  return {
    intent: 'unknown',
    text: 'Bu soruyu tam anlayamadım 🙈 Şu konularda hemen yardımcı olabilirim. Dilerseniz bizi arayabilir veya WhatsApp\'tan yazabilirsiniz.',
    chips: [CHIP_BOOK, 'Hizmetleriniz neler?', 'Çalışma saatleri', 'Adresiniz nerede?', ...contactChips(clinic)],
  };
}
