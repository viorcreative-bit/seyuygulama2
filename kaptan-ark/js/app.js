// ARK Dental · Kaptan Ark asistanı — maskot animasyonu, sesli konuşma, sohbet ve randevu talebi.
import { availableSlots, clinicNow, normalizePhone, openDays, validName, whatsappLink } from './booking.js';
import { answer, detectService, normalize, priorityAnswer } from './faq.js';
import { embedRecordings, PHRASES, phraseText, welcomeOf } from './recordings.js';
import { chunk, detectLang, pickVoice, speechText, voiceScore } from './speech.js';
import { formatDateTr } from './time.js';

// Sayfanın değiştirilmemiş hali: ses kayıt stüdyosu kayıtları buna gömüp yeni dosya üretir.
const PRISTINE_HTML = `<!doctype html>\n${document.documentElement.outerHTML}`;

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const embedded = params.has('embed');
if (embedded) {
  document.documentElement.classList.add('embed');
  document.body.classList.add('embed');
}

const els = {
  mascot: $('#mascot'),
  jaw: $('#mascot .jaw'),
  eyes: [...document.querySelectorAll('#mascot .eye')],
  sparkles: $('#mascot .sparkles'),
  bubble: $('#bubble'),
  bubbleText: $('#bubbleText'),
  widget: $('#widget'),
  panel: $('#chatPanel'),
  close: $('#closeBtn'),
  messages: $('#messages'),
  chips: $('#chips'),
  form: $('#composer'),
  input: $('#input'),
  send: $('#sendBtn'),
  mic: $('#micBtn'),
  sound: $('#soundBtn'),
  reset: $('#resetBtn'),
  status: $('#status'),
  name: $('#assistantName'),
  call: $('#callLink'),
  callText: $('#callText'),
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Küçük depolama yardımcıları (gizli pencerede hata verebilir) ----------
const storage = {
  get(area, key, fallback) {
    try {
      const v = window[area].getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(area, key, value) {
    try {
      window[area].setItem(key, JSON.stringify(value));
    } catch {
      /* yok say */
    }
  },
  remove(area, key) {
    try {
      window[area].removeItem(key);
    } catch {
      /* yok say */
    }
  },
};

let transcript = storage.get('sessionStorage', 'ark-transcript', []);

// ---------- Maskot ----------
const mascot = {
  state: 'intro',
  talkTimer: null,
  blinkTimer: null,

  setState(state) {
    this.state = state;
    els.mascot.dataset.state = state;
  },

  blink() {
    for (const eye of els.eyes) {
      eye.classList.remove('blink');
      void eye.offsetWidth; // animasyonu yeniden başlat
      eye.classList.add('blink');
    }
  },

  startBlinking() {
    const loop = () => {
      if (this.state !== 'happy') {
        this.blink();
        if (Math.random() < 0.18) setTimeout(() => this.blink(), 260); // arada çift kırpma
      }
      this.blinkTimer = setTimeout(loop, 2200 + Math.random() * 3800);
    };
    this.blinkTimer = setTimeout(loop, 1400);
  },

  rafId: null,

  /** analyser verilirse ağız gerçek sesin şiddetine göre açılır (kayıtlı sesler); yoksa rastgele. */
  startTalking(analyser = null) {
    this.setState('talking');
    if (analyser) {
      clearTimeout(this.talkTimer);
      this.talkTimer = null;
      cancelAnimationFrame(this.rafId);
      const data = new Uint8Array(analyser.fftSize);
      let level = 1;
      const frame = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        const target = 1 + Math.min(0.3, Math.sqrt(sum / data.length) * 3.4);
        level += (target - level) * 0.45;
        els.jaw.style.setProperty('--jaw', level.toFixed(3));
        els.jaw.style.setProperty('--jaw-x', (1 + (level - 1) * 0.12).toFixed(3));
        this.rafId = requestAnimationFrame(frame);
      };
      frame();
      return;
    }
    if (this.talkTimer || this.rafId) return;
    const step = () => {
      const pause = Math.random() < 0.16;
      const open = pause ? 1 : 1.04 + Math.random() * 0.24;
      els.jaw.style.setProperty('--jaw', open.toFixed(3));
      els.jaw.style.setProperty('--jaw-x', (pause ? 1 : 1 + Math.random() * 0.035).toFixed(3));
      this.talkTimer = setTimeout(step, 80 + Math.random() * 95);
    };
    step();
  },

  stopTalking(next = 'idle') {
    clearTimeout(this.talkTimer);
    this.talkTimer = null;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
    els.jaw.style.setProperty('--jaw', '1');
    els.jaw.style.setProperty('--jaw-x', '1');
    if (this.state === 'talking') this.setState(next);
  },

  wave() {
    els.mascot.classList.remove('wave');
    void els.mascot.offsetWidth;
    els.mascot.classList.add('wave');
    setTimeout(() => els.mascot.classList.remove('wave'), 1950);
  },

  celebrate() {
    els.mascot.classList.add('happy');
    setTimeout(() => els.mascot.classList.remove('happy'), 1700);
    if (reducedMotion) return;
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('i');
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
      const dist = 26 + Math.random() * 18;
      s.style.left = `${46 + Math.random() * 10}%`;
      s.style.top = `${28 + Math.random() * 10}%`;
      s.style.setProperty('--dx', `${Math.cos(angle) * dist}cqw`);
      s.style.setProperty('--dy', `${Math.sin(angle) * dist}cqw`);
      s.style.animationDelay = `${Math.random() * 0.25}s`;
      els.sparkles.append(s);
      setTimeout(() => s.remove(), 1700);
    }
  },
};

// ---------- Sesli okuma (tarayıcının Türkçe sesiyle) ----------
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
let soundOn = storage.get('localStorage', 'ark-sound', true);
let speechToken = 0;

if (synth) {
  const load = () => (voices = synth.getVoices());
  load();
  synth.addEventListener?.('voiceschanged', load);
}

/** Metni seslendirir; seslendirme bitince (veya iptal edilince) çözülür. */
function speak(text) {
  const token = ++speechToken;
  if (!synth || !soundOn) return Promise.resolve(false);
  synth.cancel();
  const settings = clinic.speech ?? {};
  const clean = speechText(text, settings.pronunciations);
  if (!clean) return Promise.resolve(false);
  const lang = detectLang(clean);
  const voice = pickVoice(voices, lang, lang === 'tr' ? settings.voice : '');
  const pieces = chunk(clean);
  return new Promise((resolve) => {
    let i = 0;
    let started = false;
    const next = () => {
      if (token !== speechToken) return resolve(started);
      if (i >= pieces.length) return resolve(started);
      const u = new SpeechSynthesisUtterance(pieces[i++]);
      u.lang = voice?.lang ?? (lang === 'tr' ? 'tr-TR' : 'en-US');
      if (voice) u.voice = voice;
      // Doğal konuşma için normal hız ve perde (yüksek perde sesi robotik yapıyor).
      u.rate = Number(settings.rate) || 1;
      u.pitch = Number(settings.pitch) || 1;
      u.onstart = () => {
        started = true;
        if (token === speechToken) mascot.startTalking();
      };
      u.onend = next;
      u.onerror = () => resolve(started);
      synth.speak(u);
    };
    next();
    // Bazı tarayıcılar izin olmadan konuşmaz ve hiçbir olay göndermez; sıradaki sesi de iptal et.
    setTimeout(() => {
      if (!started && token === speechToken) {
        synth.cancel();
        resolve(false);
      }
    }, 1500);
  });
}

function stopSpeaking() {
  speechToken++;
  synth?.cancel();
  stopAudio();
}

// ---------- Kayıtlı sesler ----------
let recordings = {};
let currentAudio = null;
let audioCtx = null;

function stopAudio() {
  const a = currentAudio;
  currentAudio = null;
  a?.pause();
}

/** Bu cümlenin güncel metniyle yapılmış ve bu cihazda çalınabilen kaydı. */
function recordingFor(id) {
  const rec = id && recordings[id];
  if (!rec?.src) return null;
  if (rec.text && rec.text.trim() !== (phraseText(id, clinic) ?? '').trim()) return null; // metin değişmiş
  const type = rec.mime || rec.src.slice(5, rec.src.indexOf(';'));
  return document.createElement('audio').canPlayType(type) ? rec : null;
}

/** Kaydı çalar; maskotun ağzı sesin şiddetine göre hareket eder. Çalamazsa false döner. */
function playRecording(rec) {
  const token = ++speechToken;
  synth?.cancel();
  stopAudio();
  return new Promise((resolve) => {
    const audio = new Audio(rec.src);
    currentAudio = audio;
    let analyser = null;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        audioCtx ??= new Ctx();
        audioCtx.resume?.();
        const source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
    } catch {
      analyser = null;
    }
    let finished = false;
    const done = (ok) => {
      if (finished) return;
      finished = true;
      if (currentAudio === audio) currentAudio = null;
      resolve(ok);
    };
    audio.addEventListener('playing', () => token === speechToken && mascot.startTalking(analyser), { once: true });
    audio.addEventListener('ended', () => done(true));
    audio.addEventListener('pause', () => done(true));
    audio.addEventListener('error', () => done(false));
    audio.play().catch(() => done(false));
  });
}

function setSound(on) {
  soundOn = on;
  if (!on) sayToken++;
  storage.set('localStorage', 'ark-sound', on);
  els.sound.setAttribute('aria-pressed', String(on));
  els.sound.title = on ? 'Sesi kapat' : 'Sesi aç';
  els.sound.setAttribute('aria-label', on ? 'Sesli yanıtları kapat' : 'Sesli yanıtları aç');
  if (!on) {
    stopSpeaking();
    mascot.stopTalking();
  }
}

// ---------- Konuşma balonu ----------
let typeTimer = null;
let lastSpoken = '';
let lastAudio = null;
let sayToken = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function typeInto(el, text, duration) {
  clearInterval(typeTimer);
  if (reducedMotion) {
    el.textContent = text;
    return;
  }
  const total = text.length;
  const stepMs = 16;
  const perStep = Math.max(1, Math.ceil(total / Math.max(1, duration / stepMs)));
  let shown = 0;
  el.textContent = '';
  typeTimer = setInterval(() => {
    shown = Math.min(total, shown + perStep);
    el.textContent = text.slice(0, shown);
    el.scrollTop = el.scrollHeight;
    if (shown >= total) clearInterval(typeTimer);
  }, stepMs);
}

/** Maskota bir cümle söyletir: balonda yazar, ağzını oynatır, ses açıksa seslendirir. */
async function say(text, { voice = true, audio = null } = {}) {
  const turn = ++sayToken;
  lastSpoken = text;
  lastAudio = audio;
  els.bubble.dataset.state = 'text';
  const silentDuration = Math.min(9000, Math.max(1400, text.length * 42));
  typeInto(els.bubbleText, text, Math.min(silentDuration, 3800));
  mascot.startTalking();
  let spoke = false;
  const rec = voice && soundOn ? recordingFor(audio) : null;
  if (rec) {
    spoke = await playRecording(rec);
    if (turn !== sayToken) return;
  }
  if (!spoke && voice) spoke = await speak(text);
  if (turn !== sayToken) return; // bu arada yeni bir konuşma başladı
  if (!spoke) {
    await sleep(silentDuration);
    if (turn !== sayToken) return;
  }
  mascot.stopTalking();
}

function think(on) {
  if (on) {
    sayToken++;
    stopSpeaking();
    mascot.stopTalking('thinking');
    mascot.setState('thinking');
    els.bubble.dataset.state = 'thinking';
  } else if (mascot.state === 'thinking') {
    mascot.setState('idle');
  }
}

// ---------- Sohbet ----------
let clinic = {};
let aiEndpoint = null; // yapay zeka ara katmanı çalışıyorsa adresi
let busy = false;
let flow = null; // randevu sihirbazının durumu

const CHIP_BOOK = { label: '📅 Randevu al', action: 'booking' };
const DEFAULT_PLACEHOLDER = 'Sorunuzu yazın…';

function scrollDown() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function remember(item) {
  transcript.push(item);
  if (transcript.length > 80) transcript = transcript.slice(-80);
  storage.set('sessionStorage', 'ark-transcript', transcript);
}

function addMessage(role, text, { save = true } = {}) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  els.messages.append(div);
  if (save && role !== 'error') remember({ role, text });
  scrollDown();
  return div;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot typing';
  div.setAttribute('aria-label', 'Yazıyor');
  div.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
  els.messages.append(div);
  scrollDown();
  return div;
}

function chipElement(chip) {
  if (typeof chip === 'string') chip = { label: chip, text: chip };
  if (chip.href) {
    const a = document.createElement('a');
    a.href = chip.href;
    a.textContent = chip.label;
    if (!chip.href.startsWith('tel:')) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    return a;
  }
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chip.label;
  b.addEventListener('click', () => {
    greeted = true;
    if (busy) return;
    if (chip.onPick) chip.onPick();
    else if (chip.action === 'booking') {
      addMessage('user', chip.label.replace(/^\S+\s/, ''));
      startBooking(chip.service ?? null);
    } else send(chip.text ?? chip.label);
  });
  return b;
}

function renderChips(list = []) {
  els.chips.replaceChildren(...list.map(chipElement));
  els.chips.scrollLeft = 0;
}

/** Bot cevabını gösterir ve maskota söyletir. */
const INTENT_AUDIO = {
  emergency: 'emergency',
  cancel: 'cancel_info',
  service: 'service_info',
  hours: 'hours',
  location: 'location',
  contact: 'contact',
  services: 'services',
  pain: 'pain',
  thanks: 'thanks',
  bye: 'bye',
  greeting: 'greeting',
  unknown: 'unknown',
};

function audioFor(result) {
  if (result.intent === 'price') return result.generic ? 'price' : null;
  return INTENT_AUDIO[result.intent] ?? null;
}

function botSay(text, chips, audio = null) {
  addMessage('bot', text);
  renderChips(chips ?? [CHIP_BOOK]);
  say(text, { audio });
}

// ---------- Yapay zeka ----------
function aiHistory() {
  return transcript
    .filter((t) => t.role === 'user' || t.role === 'bot')
    .slice(-12)
    .map((t) => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.text }));
}

/** Ara katmanın çalışıp çalışmadığını yapay zekayı çağırmadan kontrol eder. */
async function probeAI(url) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"probe":true}',
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => null);
    return res.ok && data?.ok === true;
  } catch {
    return false;
  }
}

async function askAI() {
  try {
    const res = await fetch(aiEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: aiHistory() }),
      signal: AbortSignal.timeout(40000),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && typeof data?.reply === 'string' && data.reply.trim()) return data.reply.trim();
    if (!data || data.error === 'not_configured') setAI(null);
  } catch {
    /* ağ hatası: hazır cevaba geç */
  }
  return null;
}

function setAI(url) {
  aiEndpoint = url;
  els.status.classList.remove('offline');
  els.status.lastChild.textContent = url ? 'Yapay zeka asistanı · çevrimiçi' : 'Dijital asistan · çevrimiçi';
}

// ---------- Mesaj gönderme ----------
async function send(text) {
  text = String(text ?? '').trim();
  if (!text || busy) return;
  greeted = true;
  els.input.value = '';
  autosize();

  if (flow) {
    addMessage('user', text);
    if (handleFlowText(text)) return;
    // Anlaşılmayan cevapta adımı tekrar sor; başka bir soruysa sihirbazı kapatıp cevapla.
    if (answer(clinic, text).intent === 'unknown' && !priorityAnswer(clinic, text)) {
      repeatStep();
      return;
    }
    endFlow();
  } else {
    addMessage('user', text);
  }
  renderChips([]);

  const priority = priorityAnswer(clinic, text);
  if (priority?.action === 'booking') {
    startBooking(priority.service);
    return;
  }
  if (priority) {
    botSay(priority.text, priority.chips, audioFor(priority));
    return;
  }

  busy = true;
  els.send.disabled = true;
  const typing = showTyping();
  think(true);
  let reply = null;
  if (aiEndpoint) reply = await askAI();
  if (!reply) await sleep(450); // hazır cevapta da kısa bir "düşünme" anı
  typing.remove();
  think(false);
  busy = false;
  els.send.disabled = false;

  if (reply) {
    const wantsBooking = /\[RANDEVU\]/i.test(reply);
    const clean = reply.replace(/\[RANDEVU\]/gi, '').trim();
    const service = detectService(clinic, text);
    botSay(clean, wantsBooking ? [{ ...CHIP_BOOK, service: service?.name }] : [CHIP_BOOK]);
  } else {
    const result = answer(clinic, text);
    botSay(result.text, result.chips, audioFor(result));
  }
}

// ---------- Randevu sihirbazı ----------
function setInputMode(mode) {
  if (mode === 'name') {
    els.input.placeholder = 'Adınız ve soyadınız';
    els.input.setAttribute('inputmode', 'text');
    els.input.setAttribute('autocomplete', 'name');
  } else if (mode === 'phone') {
    els.input.placeholder = 'Telefon, ör. 0532 123 45 67';
    els.input.setAttribute('inputmode', 'tel');
    els.input.setAttribute('autocomplete', 'tel');
  } else {
    els.input.placeholder = DEFAULT_PLACEHOLDER;
    els.input.removeAttribute('inputmode');
    els.input.setAttribute('autocomplete', 'off');
  }
  if (mode && matchMedia('(pointer: fine)').matches) els.input.focus();
}

const cancelChip = { label: 'Vazgeç', onPick: () => cancelFlow() };

function startBooking(service) {
  flow = { step: null, req: {} };
  if (service) {
    flow.req.service = service;
    askDay(`Tabii! ${service} için randevu talebi oluşturalım. Hangi gün size uygun?`);
  } else {
    askService();
  }
}

function askService() {
  flow.step = 'service';
  const chips = (clinic.services ?? []).map((s) => ({ label: s.name, onPick: () => pickService(s.name) }));
  botSay('Tabii, hemen randevu talebi oluşturalım! Hangi hizmet için gelmek istersiniz? Emin değilseniz "Muayene ve Kontrol" seçebilirsiniz.', [
    ...chips,
    cancelChip,
  ], 'booking_service');
}

function pickService(name) {
  addMessage('user', name);
  flow.req.service = name;
  askDay('Harika! Hangi gün size uygun?');
}

function askDay(text) {
  flow.step = 'day';
  setInputMode(null);
  const days = openDays(clinic, clinicNow(clinic), 8);
  if (!days.length) {
    endFlow();
    botSay(`Önümüzdeki günlerde çevrim içi randevu seçeneği göremedim. Lütfen bizi arayın: ${clinic.phone}`, contactChips());
    return;
  }
  flow.days = days;
  botSay(text, [...days.map((d) => ({ label: d.label, onPick: () => pickDay(d) })), cancelChip], 'booking_day');
}

function pickDay(day) {
  addMessage('user', day.long);
  flow.req.date = day.date;
  askTime();
}

function askTime() {
  flow.step = 'time';
  const slots = availableSlots(clinic, flow.req.date, clinicNow(clinic));
  flow.slots = slots;
  botSay(`${formatDateTr(flow.req.date)} için hangi saat size uygun? Kesin onayı ekibimiz WhatsApp üzerinden verecek.`, [
    ...slots.map((t) => ({ label: t, onPick: () => pickTime(t) })),
    { label: '← Başka gün', onPick: () => askDay('Hangi gün size uygun?') },
    cancelChip,
  ], 'booking_time');
}

function pickTime(time) {
  addMessage('user', time);
  flow.req.time = time;
  askName();
}

function askName() {
  flow.step = 'name';
  setInputMode('name');
  botSay('Son iki adım! Adınızı ve soyadınızı yazar mısınız?', [cancelChip], 'booking_name');
}

function askPhone() {
  flow.step = 'phone';
  setInputMode('phone');
  botSay('Teşekkürler! Size ulaşabilmemiz için telefon numaranızı yazar mısınız?', [cancelChip], 'booking_phone');
}

/** Sihirbaz açıkken yazılan metni işler. true dönerse metin sihirbaza aitti. */
function handleFlowText(text) {
  const n = normalize(text);
  if (/^(vazgec|iptal|cancel|bosver|istemiyorum)/.test(n)) {
    cancelFlow({ echo: false });
    return true;
  }
  if (flow.step === 'name') {
    const name = validName(text);
    if (!name || /\d/.test(text)) {
      botSay('Adınızı ve soyadınızı harflerle yazar mısınız? Örneğin: Ayşe Yılmaz', [cancelChip]);
      return true;
    }
    flow.req.name = name;
    askPhone();
    return true;
  }
  if (flow.step === 'phone') {
    const phone = normalizePhone(text);
    if (!phone) {
      botSay('Telefon numarası geçerli görünmüyor. Örnek: 0532 123 45 67', [cancelChip]);
      return true;
    }
    flow.req.phone = phone;
    showSummary();
    return true;
  }
  if (flow.step === 'service') {
    const service = detectService(clinic, text);
    if (service) {
      flow.req.service = service.name;
      askDay(`${service.name} için hangi gün size uygun?`);
      return true;
    }
    return false;
  }
  if (flow.step === 'day') {
    const words = n.split(' ');
    const matches = flow.days.filter((d) => {
      const label = normalize(`${d.long} ${d.label}`);
      if (words.includes('bugun')) return label.includes('bugun');
      if (words.includes('yarin')) return label.includes('yarin');
      return words.some((w) => w.length >= 3 && ` ${label}`.includes(` ${w}`)) || words.some((w) => /^\d{1,2}$/.test(w) && label.split(' ').includes(w));
    });
    if (matches.length >= 1) {
      // "cuma" gibi birden çok güne uyan cevapta en yakın gün seçilir.
      flow.req.date = matches[0].date;
      askTime();
      return true;
    }
    return false;
  }
  if (flow.step === 'time') {
    const m = /(\d{1,2})(?:[:.](\d{2}))?/.exec(text);
    if (m) {
      const t = `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`;
      if (flow.slots.includes(t)) {
        flow.req.time = t;
        askName();
        return true;
      }
      botSay(`${t} için randevu seçeneği yok. Lütfen listeden bir saat seçin.`, [
        ...flow.slots.map((s) => ({ label: s, onPick: () => pickTime(s) })),
        cancelChip,
      ]);
      return true;
    }
    return false;
  }
  return false;
}

function repeatStep() {
  if (flow.step === 'day') return askDay('Bu günü anlayamadım. Lütfen aşağıdan bir gün seçin ya da "cuma", "yarın" gibi yazın.');
  addMessage('bot', flow.step === 'time' ? 'Bu saati anlayamadım, lütfen listeden seçin.' : 'Bu hizmeti bulamadım, lütfen listeden seçin.', { save: false });
  if (flow.step === 'time') askTime();
  else askService();
}

function endFlow() {
  flow = null;
  setInputMode(null);
}

function cancelFlow({ echo = true } = {}) {
  if (echo) addMessage('user', 'Vazgeç');
  endFlow();
  botSay('Tamam, randevu talebini iptal ettim. Başka bir konuda yardımcı olabilir miyim?', [CHIP_BOOK, ...(clinic.suggestions ?? []).slice(1, 3)], 'booking_cancel');
}

function contactChips() {
  const chips = [];
  if (clinic.phone) chips.push({ label: '📞 Bizi arayın', href: `tel:${clinic.phone.replace(/[^\d+]/g, '')}` });
  return chips;
}

function summaryCard(req, { save = true } = {}) {
  const card = document.createElement('div');
  card.className = 'appt';
  const title = document.createElement('h4');
  title.textContent = '📋 Randevu talebiniz';
  const dl = document.createElement('dl');
  for (const [k, v] of [
    ['Hizmet', req.service],
    ['Tarih', formatDateTr(req.date)],
    ['Saat', req.time],
    ['Ad Soyad', req.name],
    ['Telefon', req.phone],
  ]) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
  card.append(title, dl);
  const actions = document.createElement('div');
  actions.className = 'appt-actions';
  const link = whatsappLink(clinic, req);
  if (link) {
    const a = document.createElement('a');
    a.className = 'wa';
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.8 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a17 17 0 0 1-1.7-.6 13.3 13.3 0 0 1-5.1-4.5c-.4-.5-1-1.5-1-2.8 0-1.3.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.7-.1 1.4Z"/></svg><span>WhatsApp ile gönder</span>';
    a.addEventListener('click', () => {
      if (!save) return;
      setTimeout(() => {
        mascot.celebrate();
        botSay('Harika! WhatsApp açıldı; mesajı göndermeniz yeterli. Ekibimiz en kısa sürede size dönüş yapacak. Sağlıklı gülüşler! 😁', [
          ...(clinic.suggestions ?? []).slice(1, 3),
        ], 'booking_sent');
      }, 300);
    });
    actions.append(a);
  } else {
    const note = document.createElement('p');
    note.className = 'appt-note';
    note.textContent = `Talebinizi iletmek için bizi arayabilirsiniz: ${clinic.phone}`;
    actions.append(note);
    const call = document.createElement('a');
    call.className = 'wa';
    call.href = `tel:${String(clinic.phone ?? '').replace(/[^\d+]/g, '')}`;
    call.textContent = '📞 Bizi arayın';
    actions.append(call);
  }
  card.append(actions);
  els.messages.append(card);
  if (save) remember({ role: 'summary', req });
  scrollDown();
}

function showSummary() {
  const req = { ...flow.req };
  endFlow();
  const hasWa = Boolean(whatsappLink(clinic, req));
  const text = hasWa
    ? 'Bilgileriniz hazır! Aşağıdaki "WhatsApp ile gönder" düğmesine basın; talebiniz kliniğimize iletilsin, ekibimiz uygunluğu onaylasın.'
    : 'Bilgileriniz hazır! Talebinizi iletmek için lütfen bizi arayın.';
  addMessage('bot', text);
  summaryCard(req);
  renderChips([{ label: '✏️ Düzenle', onPick: () => startBooking(req.service) }]);
  say(text, { audio: 'booking_summary' });
}

// ---------- Yeni sohbet ve karşılama ----------
function resetChat() {
  sayToken++;
  stopSpeaking();
  mascot.stopTalking();
  endFlow();
  transcript = [];
  storage.remove('sessionStorage', 'ark-transcript');
  els.messages.replaceChildren();
  greet({ voice: true });
}

function welcomeText() {
  return welcomeOf(clinic);
}

function greet({ voice }) {
  const text = welcomeText();
  addMessage('bot', text);
  renderChips([CHIP_BOOK, ...(clinic.suggestions ?? []).filter((s) => !/randevu/i.test(s))]);
  mascot.wave();
  say(text, { voice, audio: 'welcome' });
}

// ---------- Giriş alanı ----------
function autosize() {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight, 140)}px`;
}

els.input.addEventListener('input', autosize);
els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    send(els.input.value);
  }
});
els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  send(els.input.value);
});

els.sound.addEventListener('click', () => setSound(!soundOn));
els.reset.addEventListener('click', resetChat);
// ---------- Sohbeti açma / kapama ----------
let greeted = false;
let isOpen = false;

// Dar ekran düzeni. Gömülüyse çerçevenin değil, ziyaretçinin ekran genişliği esas alınır.
function setCompact(on) {
  els.widget.classList.toggle('compact', on);
}
if (embedded) {
  window.addEventListener('message', (e) => {
    if (e.source === window.parent && e.data?.type === 'kaptan-ark:host') setCompact(Boolean(e.data.compact));
  });
} else {
  const narrow = matchMedia('(max-width: 640px)');
  setCompact(narrow.matches);
  narrow.addEventListener?.('change', (e) => setCompact(e.matches));
}

/** Başka bir siteye gömülüyse, çerçevenin boyutunu ayarlaması için üst sayfaya haber verir. */
function notifyParent() {
  if (!embedded || window.parent === window) return;
  window.parent.postMessage({ type: 'kaptan-ark:layout', open: isOpen, bubble: els.bubble.classList.contains('show') }, '*');
}

let bubbleTimer = null;
function showBubble(text, { audio = null, duration = 7000 } = {}) {
  if (isOpen) return;
  clearTimeout(bubbleTimer);
  els.bubble.classList.add('show');
  notifyParent();
  say(text, { voice: false, audio });
  bubbleTimer = setTimeout(hideBubble, duration);
}
function hideBubble() {
  clearTimeout(bubbleTimer);
  els.bubble.classList.remove('show');
  notifyParent();
}

function openChat({ animate = true } = {}) {
  if (isOpen) return;
  isOpen = true;
  hideBubble();
  els.widget.dataset.open = 'true';
  els.panel.setAttribute('aria-hidden', 'false');
  els.mascot.setAttribute('aria-expanded', 'true');
  els.mascot.setAttribute('aria-label', 'Sohbeti kapat');
  storage.set('sessionStorage', 'ark-open', true);
  notifyParent();
  if (animate) {
    mascot.celebrate();
    mascot.wave();
  }
  if (!greeted) {
    greeted = true;
    if (!transcript.length) greet({ voice: true });
  }
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => els.input.focus({ preventScroll: true }), 350);
}

function closeChat() {
  if (!isOpen) return;
  isOpen = false;
  sayToken++;
  stopSpeaking();
  mascot.stopTalking();
  els.widget.dataset.open = 'false';
  els.panel.setAttribute('aria-hidden', 'true');
  els.mascot.setAttribute('aria-expanded', 'false');
  els.mascot.setAttribute('aria-label', 'Kaptan Ark ile sohbeti aç');
  storage.set('sessionStorage', 'ark-open', false);
  mascot.wave();
  // Kapanma animasyonu bitince çerçeveyi küçült
  setTimeout(notifyParent, 480);
}

els.mascot.addEventListener('click', () => (isOpen ? closeChat() : openChat()));
els.mascot.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    isOpen ? closeChat() : openChat();
  }
});
els.bubble.addEventListener('click', () => openChat());
els.close.addEventListener('click', () => {
  closeChat();
  els.mascot.focus({ preventScroll: true });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen && !document.querySelector('.rec-panel, .voice-panel')) closeChat();
});

// Sohbet kapalıyken arada bir el sallayıp dikkat çeker (en fazla 3 kez).
const nudgeLines = ['poke3', 'poke1', 'poke4'];
let nudges = 0;
function scheduleNudge() {
  setTimeout(() => {
    if (greeted || nudges >= nudgeLines.length) return; // sohbet bir kez açıldıysa artık rahatsız etmez
    if (isOpen || document.hidden) return scheduleNudge();
    const id = nudgeLines[nudges++];
    mascot.wave();
    showBubble(phraseText(id, clinic), { audio: id, duration: 6000 });
    scheduleNudge();
  }, 30000);
}

// ---------- Mikrofonla yazma ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
  els.mic.hidden = false;
  let rec = null;
  els.mic.addEventListener('click', () => {
    greeted = true;
    if (rec) {
      rec.stop();
      return;
    }
    sayToken++;
    stopSpeaking();
    mascot.stopTalking();
    rec = new Recognition();
    rec.lang = 'tr-TR';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onstart = () => {
      els.mic.classList.add('listening');
      mascot.setState('listening');
      els.bubble.dataset.state = 'text';
      els.bubbleText.textContent = 'Dinliyorum… 👂';
    };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      els.input.value = (finalText + interim).trim();
      autosize();
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') addMessage('error', 'Mikrofon izni verilmedi.', { save: false });
    };
    rec.onend = () => {
      els.mic.classList.remove('listening');
      if (mascot.state === 'listening') mascot.setState('idle');
      rec = null;
      if (finalText.trim()) send(finalText);
    };
    rec.start();
  });
}

// ---------- Ses kayıt stüdyosu (adresin sonuna ?kayit ekleyin) ----------
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function recorderMime() {
  if (!window.MediaRecorder) return null;
  const types = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

function recorderPanel() {
  const panel = document.createElement('div');
  panel.className = 'rec-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ses kayıt stüdyosu');
  let stream = null;
  let active = null; // { id, recorder, timer }

  const fileName = () => decodeURIComponent(location.pathname.split('/').pop() || '') || 'index.html';

  async function start(id) {
    if (active) return;
    const mime = recorderMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      alert('Bu tarayıcı ses kaydını desteklemiyor. Güncel Chrome, Edge veya Safari kullanın.');
      return;
    }
    try {
      stream ??= await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch {
      alert('Mikrofon izni verilmedi. Tarayıcının adres çubuğundaki mikrofon simgesinden izin verin.');
      return;
    }
    stopSpeaking();
    const chunks = [];
    const recorder = new MediaRecorder(stream, { ...(mime && { mimeType: mime }), audioBitsPerSecond: 48000 });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' });
      if (blob.size > 0) {
        recordings[id] = { src: await blobToDataUrl(blob), mime: blob.type, text: phraseText(id, clinic), at: new Date().toISOString() };
      }
      active = null;
      render();
    };
    recorder.start();
    active = { id, recorder, timer: setTimeout(() => recorder.state === 'recording' && recorder.stop(), 30000) };
    render();
  }

  function stop() {
    if (!active) return;
    clearTimeout(active.timer);
    if (active.recorder.state === 'recording') active.recorder.stop();
  }

  function download() {
    const html = embedRecordings(PRISTINE_HTML, recordings);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName() });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function button(label, onClick, cls = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', onClick);
    return b;
  }

  function render() {
    panel.replaceChildren();
    const head = document.createElement('div');
    head.className = 'rec-head';
    const h = document.createElement('h3');
    h.textContent = '🎙️ Kaptan Ark ses kayıt stüdyosu';
    const done = PHRASES.filter((p) => recordingFor(p.id)).length;
    const count = document.createElement('span');
    count.className = 'rec-count';
    count.textContent = `${done} / ${PHRASES.length} kayıtlı`;
    head.append(h, count);

    const help = document.createElement('ol');
    help.className = 'rec-help';
    for (const t of [
      'Sessiz bir odada, mikrofona 20–30 cm uzaklıkta, gülümseyerek ve sohbet eder gibi okuyun.',
      '"Kaydet"e basın, cümleyi okuyun, bitince "Durdur"a basın. Beğenmezseniz yeniden kaydedin.',
      'İstediğiniz kadar cümleyi kaydedin; kaydı olmayan cümleleri cihaz sesi okur.',
      `Bitince "Kayıtlı dosyayı indir"e basın. İnen ${fileName()} dosyası kayıtları içerir; eskisinin yerine onu kullanın.`,
    ]) {
      const li = document.createElement('li');
      li.textContent = t;
      help.append(li);
    }
    panel.append(head, help);

    let group = '';
    for (const p of PHRASES) {
      if (p.group !== group) {
        group = p.group;
        const g = document.createElement('h4');
        g.textContent = group;
        panel.append(g);
      }
      const row = document.createElement('div');
      row.className = 'rec-row';
      const text = document.createElement('p');
      text.textContent = p.text(clinic);
      const status = document.createElement('span');
      status.className = 'rec-status';
      const hasRec = recordingFor(p.id);
      const outdated = recordings[p.id] && !hasRec;
      status.textContent = active?.id === p.id ? '● Kaydediliyor…' : hasRec ? '✅ Kayıtlı' : outdated ? '⚠️ Metin değişti, yeniden kaydedin' : 'Kayıt yok';
      if (active?.id === p.id) status.classList.add('live');
      const actions = document.createElement('div');
      actions.className = 'rec-actions';
      if (active?.id === p.id) {
        actions.append(button('⏹ Durdur', stop, 'stop'));
      } else {
        actions.append(button(hasRec ? '🎙 Yeniden kaydet' : '🎙 Kaydet', () => start(p.id), 'rec'));
        if (hasRec) {
          actions.append(button('▶ Dinle', () => say(p.text(clinic), { audio: p.id })));
          actions.append(button('🗑', () => {
            delete recordings[p.id];
            render();
          }, 'del'));
        }
      }
      if (active && active.id !== p.id) actions.querySelectorAll('button').forEach((b) => (b.disabled = true));
      row.append(text, status, actions);
      panel.append(row);
    }

    const foot = document.createElement('div');
    foot.className = 'rec-foot';
    const dl = button('💾 Kayıtlı dosyayı indir', download, 'primary');
    dl.disabled = Boolean(active);
    foot.append(dl, button('Kapat', () => {
      stop();
      stream?.getTracks().forEach((t) => t.stop());
      panel.remove();
    }));
    panel.append(foot);
  }

  render();
  document.body.append(panel);
}

// ---------- Ses deneme paneli (adresin sonuna ?sesler ekleyin) ----------
function voicePanel() {
  const panel = document.createElement('div');
  panel.className = 'voice-panel';
  const render = () => {
    const list = voices
      .filter((v) => voiceScore(v, 'tr') !== null)
      .sort((a, b) => voiceScore(b, 'tr') - voiceScore(a, 'tr'));
    const chosen = pickVoice(voices, 'tr', clinic.speech?.voice);
    panel.replaceChildren();
    const h = document.createElement('h3');
    h.textContent = 'Bu cihazdaki Türkçe sesler';
    const p = document.createElement('p');
    p.textContent = list.length
      ? 'Dinleyip en doğal bulduğunuz sesin adını ayarlardaki "speech.voice" alanına yazın (adın bir kısmı yeterli, ör. "Emel"). Ziyaretçiler kendi cihazlarındaki en doğal sesi otomatik duyar.'
      : 'Bu tarayıcıda Türkçe ses bulunamadı. Microsoft Edge (Emel/Ahmet "Natural" sesleri) veya Google Chrome deneyin.';
    panel.append(h, p);
    for (const v of list) {
      const row = document.createElement('div');
      row.className = 'voice-row';
      const name = document.createElement('span');
      name.textContent = `${v === chosen ? '✅ ' : ''}${v.name} (${v.lang})${v.localService === false ? ' · bulut' : ''}`;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '▶ Dinle';
      b.addEventListener('click', () => {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(speechText(welcomeText(), clinic.speech?.pronunciations));
        u.voice = v;
        u.lang = v.lang;
        u.rate = Number(clinic.speech?.rate) || 1;
        u.pitch = Number(clinic.speech?.pitch) || 1;
        u.onstart = () => mascot.startTalking();
        u.onend = () => mascot.stopTalking();
        synth.speak(u);
      });
      row.append(name, b);
      panel.append(row);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'voice-close';
    close.textContent = 'Kapat';
    close.addEventListener('click', () => panel.remove());
    panel.append(close);
  };
  render();
  synth?.addEventListener?.('voiceschanged', render);
  document.body.append(panel);
}

// ---------- Başlangıç ----------
async function init() {
  setSound(soundOn);
  mascot.startBlinking();
  setTimeout(() => mascot.state === 'intro' && mascot.setState('idle'), 2000);

  try {
    // Tek dosyalık sürümde ayarlar sayfanın içindeki <script id="clinic-config"> etiketindedir.
    const inline = document.getElementById('clinic-config');
    clinic = inline ? JSON.parse(inline.textContent) : await (await fetch('clinic.json', { cache: 'no-cache' })).json();
  } catch {
    clinic = { name: 'ARK Dental Clinic', shortName: 'ARK Dental', assistantName: 'Kaptan Ark', services: [], suggestions: [] };
  }
  if (clinic.assistantName) els.name.textContent = clinic.assistantName;
  if (clinic.phone) {
    els.call.href = `tel:${clinic.phone.replace(/[^\d+]/g, '')}`;
    els.callText.textContent = clinic.phone;
  }
  setAI(null);
  const endpoint = clinic.ai?.endpoint ? new URL(clinic.ai.endpoint, location.href).href : null;
  if (endpoint) probeAI(endpoint).then((ok) => ok && setAI(endpoint));

  try {
    recordings = JSON.parse(document.getElementById('voice-recordings')?.textContent || '{}') ?? {};
  } catch {
    recordings = {};
  }
  if (params.has('sesler') && synth) voicePanel();
  if (params.has('kayit')) recorderPanel();

  if (transcript.length) {
    // Sayfa yenilendiyse önceki sohbet geri gelir; sohbet açıksa açık kalır.
    greeted = true;
    for (const item of transcript) {
      if (item.role === 'summary') summaryCard(item.req, { save: false });
      else addMessage(item.role, item.text, { save: false });
    }
    const lastBot = [...transcript].reverse().find((t) => t.role === 'bot');
    lastSpoken = lastBot?.text ?? welcomeText();
    renderChips([CHIP_BOOK, ...(clinic.suggestions ?? []).filter((s) => !/randevu/i.test(s)).slice(0, 2)]);
    if (storage.get('sessionStorage', 'ark-open', false)) openChat({ animate: false });
  }
  if (!isOpen) {
    // Sohbet kapalı: maskot köşede el sallar ve kısa bir karşılama baloncuğu gösterir.
    setTimeout(() => {
      if (isOpen) return;
      mascot.wave();
      showBubble(clinic.launcherText ?? `${clinic.shortName ?? clinic.name}'e hoş geldiniz! 👋\nSohbet için bana dokunun.`, { duration: 9000 });
    }, 900);
    scheduleNudge();
  }
  notifyParent();
}

init();

