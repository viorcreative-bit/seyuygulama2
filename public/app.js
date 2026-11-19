// ARK Dental · Süper Diş asistanı — maskot animasyonu, sesli konuşma ve sohbet.

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
if (params.has('embed')) document.body.classList.add('embed');

const els = {
  mascot: $('#mascot'),
  jaw: $('#mascot .jaw'),
  eyes: [...document.querySelectorAll('#mascot .eye')],
  sparkles: $('#mascot .sparkles'),
  bubble: $('#bubble'),
  bubbleText: $('#bubbleText'),
  bubbleSpeak: $('#bubbleSpeak'),
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

function newSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}-x`;
}

let sessionId = storage.get('sessionStorage', 'ark-session', null) ?? newSessionId();
storage.set('sessionStorage', 'ark-session', sessionId);
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

  startTalking() {
    this.setState('talking');
    if (this.talkTimer) return;
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

function detectLang(text) {
  if (/[çğıöşüİ]/i.test(text)) return 'tr';
  if (/\b(the|you|your|and|appointment|hello|thank)\b/i.test(text)) return 'en';
  return 'tr';
}

function pickVoice(lang) {
  const list = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(lang));
  const preferred = /(natural|neural|online|google|yelda|emel|zira|aria|samantha)/i;
  return list.find((v) => preferred.test(v.name)) ?? list[0] ?? null;
}

function speechText(text) {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[•*#_`>]/g, ' ')
    .replace(/\bARK-([A-Z0-9])/g, 'ARK $1')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunk(text) {
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

/** Metni seslendirir; seslendirme bitince (veya iptal edilince) çözülür. */
function speak(text) {
  const token = ++speechToken;
  if (!synth || !soundOn) return Promise.resolve(false);
  synth.cancel();
  const clean = speechText(text);
  if (!clean) return Promise.resolve(false);
  const lang = detectLang(clean);
  const voice = pickVoice(lang);
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
      u.rate = 1.04;
      u.pitch = 1.25;
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
async function say(text, { voice = true } = {}) {
  const turn = ++sayToken;
  lastSpoken = text;
  els.bubble.dataset.state = 'text';
  const silentDuration = Math.min(9000, Math.max(1400, text.length * 42));
  typeInto(els.bubbleText, text, Math.min(silentDuration, 3800));
  mascot.startTalking();
  const spoke = voice ? await speak(text) : false;
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
function scrollDown() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function addMessage(role, text, { save = true } = {}) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  els.messages.append(div);
  if (save && role !== 'error') {
    transcript.push({ role, text });
    storage.set('sessionStorage', 'ark-transcript', transcript);
  }
  scrollDown();
  return div;
}

function formatDate(date) {
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

function downloadIcs(appt) {
  const [y, m, d] = appt.date.split('-');
  const [hh, mm] = appt.time.split(':').map(Number);
  const end = hh * 60 + mm + (config.slotMinutes ?? 30);
  const pad = (n) => String(n).padStart(2, '0');
  const dt = (h, min) => `${y}${m}${d}T${pad(h)}${pad(min)}00`;
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ARK Dental//Asistan//TR',
    'BEGIN:VEVENT',
    `UID:${appt.code}@ark-dental`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${dt(hh, mm)}`,
    `DTEND:${dt(Math.floor(end / 60), end % 60)}`,
    `SUMMARY:${esc(`${config.clinicName} – ${appt.service}`)}`,
    `DESCRIPTION:${esc(`Randevu kodu: ${appt.code}`)}`,
    `LOCATION:${esc(config.address ?? config.clinicName)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Diş randevusu',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `ark-dental-randevu-${appt.code}.ics` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function addAppointmentCard(appt, { cancelled = false, save = true } = {}) {
  const card = document.createElement('div');
  card.className = `appt${cancelled ? ' cancelled' : ''}`;
  const title = document.createElement('h4');
  title.textContent = cancelled ? 'Randevunuz iptal edildi' : '✅ Randevunuz oluşturuldu';
  const dl = document.createElement('dl');
  const rows = [
    ['Kod', appt.code, 'code'],
    ['Hizmet', appt.service],
    ['Tarih', formatDate(appt.date)],
    ['Saat', appt.time],
    ['Ad Soyad', appt.fullName],
  ];
  for (const [k, v, cls] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    if (cls) dd.className = cls;
    dl.append(dt, dd);
  }
  card.append(title, dl);
  if (!cancelled) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '📅 Takvime ekle';
    btn.addEventListener('click', () => downloadIcs(appt));
    card.append(btn);
  }
  els.messages.append(card);
  if (save) {
    transcript.push({ role: 'appt', appt, cancelled });
    storage.set('sessionStorage', 'ark-transcript', transcript);
  }
  scrollDown();
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

let busy = false;
let config = {};

function renderChips(list, onPick = send) {
  els.chips.replaceChildren(
    ...list.map((text) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', () => onPick(text));
      return b;
    }),
  );
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  greeted = true; // kullanıcı yazmaya başladıysa karşılama sesine gerek yok
  els.send.disabled = true;
  els.chips.replaceChildren();
  els.input.value = '';
  autosize();
  addMessage('user', text);
  const typing = showTyping();
  think(true);

  try {
    const res = await fetch('api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, message: text }),
    });
    const data = await res.json().catch(() => ({}));
    typing.remove();
    think(false);
    if (!res.ok) {
      const msg = data.message ?? 'Bir sorun oluştu, lütfen tekrar deneyin.';
      addMessage('error', msg);
      if (data.error === 'too_long') renderChips(['Yeni sohbet başlat'], resetChat);
      say(msg, { voice: false });
      return;
    }
    addMessage('bot', data.reply);
    if (data.appointment) {
      addAppointmentCard(data.appointment);
      mascot.celebrate();
    }
    if (data.cancelled) addAppointmentCard(data.cancelled, { cancelled: true });
    say(data.reply);
  } catch {
    typing.remove();
    think(false);
    const msg = 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
    addMessage('error', msg);
    say(msg, { voice: false });
  } finally {
    busy = false;
    els.send.disabled = false;
  }
}

async function resetChat() {
  sayToken++;
  stopSpeaking();
  mascot.stopTalking();
  const old = sessionId;
  sessionId = newSessionId();
  storage.set('sessionStorage', 'ark-session', sessionId);
  transcript = [];
  storage.remove('sessionStorage', 'ark-transcript');
  els.messages.replaceChildren();
  fetch('api/chat/reset', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: old }),
  }).catch(() => {});
  greet({ voice: true });
}

function greet({ voice }) {
  const text = config.welcome;
  addMessage('bot', text);
  renderChips(config.suggestions ?? []);
  mascot.wave();
  say(text, { voice });
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
els.bubbleSpeak.addEventListener('click', (e) => {
  e.stopPropagation();
  greeted = true;
  if (!soundOn) setSound(true);
  if (lastSpoken) say(lastSpoken);
});

const pokeLines = [
  'Merhaba! 👋 Size nasıl yardımcı olabilirim?',
  'Bugün dişlerinizi fırçaladınız mı? 😄',
  'Randevu almak için bana yazmanız yeterli!',
  'Pelerinim hazır, sorularınızı bekliyorum!',
];
let pokeIndex = 0;
els.mascot.addEventListener('click', () => {
  greeted = true;
  if (busy) return;
  mascot.wave();
  mascot.blink();
  say(pokeLines[pokeIndex++ % pokeLines.length]);
});

// İlk dokunuşta karşılama mesajını sesli oku (tarayıcılar izinsiz ses çalmaya izin vermez).
let greeted = false;
window.addEventListener(
  'pointerdown',
  (e) => {
    if (greeted) return;
    greeted = true;
    if (e.target.closest('#mascot, .chips, .composer button, .chat-head, .bubble-speak')) return;
    if (soundOn && config.welcome) say(config.welcome);
  },
  { once: true, capture: true },
);

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

// ---------- Başlangıç ----------
async function init() {
  setSound(soundOn);
  mascot.startBlinking();
  setTimeout(() => mascot.state === 'intro' && mascot.setState('idle'), 2000);

  try {
    config = await (await fetch('api/config')).json();
  } catch {
    config = { welcome: "ARK Dental'e hoş geldiniz! Size nasıl yardımcı olabilirim?", suggestions: [] };
  }
  if (config.assistantName) els.name.textContent = config.assistantName;
  if (config.phone) {
    els.call.href = `tel:${config.phone.replace(/[^\d+]/g, '')}`;
    els.callText.textContent = config.phone;
  }
  if (config.aiReady === false) {
    els.status.classList.add('offline');
    els.status.lastChild.textContent = 'Kurulum bekleniyor';
  }

  if (transcript.length) {
    for (const item of transcript) {
      if (item.role === 'appt') addAppointmentCard(item.appt, { cancelled: item.cancelled, save: false });
      else addMessage(item.role, item.text, { save: false });
    }
    const lastBot = [...transcript].reverse().find((t) => t.role === 'bot');
    lastSpoken = lastBot?.text ?? config.welcome;
    els.bubbleText.textContent = lastSpoken;
    mascot.wave();
  } else {
    // Ses için kullanıcı etkileşimi gerekir; şimdilik sessizce konuşur, ilk dokunuşta sesli okunur.
    const canSpeak = navigator.userActivation?.hasBeenActive ?? false;
    greet({ voice: canSpeak });
  }
}

init();
