import { timingSafeEqual, createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { AppointmentStore, createScheduler } from './src/appointments.js';
import { ChatError, createAssistant } from './src/assistant.js';
import { welcomeMessage } from './src/prompt.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.AI_EFFORT || 'low';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const WEBHOOK_URL = process.env.APPOINTMENT_WEBHOOK_URL ?? '';
const CLINIC_FILE = process.env.CLINIC_CONFIG ?? path.join(here, 'config', 'clinic.json');
const DATA_FILE = process.env.DATA_FILE ?? path.join(here, 'data', 'appointments.json');

const clinic = JSON.parse(readFileSync(CLINIC_FILE, 'utf8'));

// SDK; ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN veya `ant auth login` profiliyle çalışır.
const configured = Boolean(
  process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.ANTHROPIC_PROFILE ||
    existsSync(path.join(homedir(), '.config', 'anthropic')),
);

async function notify(event) {
  if (!WEBHOOK_URL) return;
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(5000),
  });
}

const store = new AppointmentStore(DATA_FILE);
const scheduler = createScheduler({ clinic, store, notify });
const assistant = createAssistant({ clinic, scheduler, model: MODEL, effort: EFFORT, configured });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Basit IP başına istek sınırı (dakikada 20 mesaj).
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip ?? 'unknown';
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) {
    return res.status(429).json({ error: 'rate_limited', message: 'Çok hızlı mesaj gönderiyorsunuz, lütfen biraz bekleyin.' });
  }
  recent.push(now);
  hits.set(key, recent);
  next();
}
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, v] of hits) if (!v.some((t) => t > cutoff)) hits.delete(k);
}, 60_000).unref();

const SESSION_RE = /^[A-Za-z0-9-]{16,64}$/;

app.get('/api/config', (req, res) => {
  res.json({
    clinicName: clinic.name,
    shortName: clinic.shortName ?? clinic.name,
    assistantName: clinic.assistantName,
    phone: clinic.phone,
    address: clinic.address,
    slotMinutes: clinic.appointment.slotMinutes,
    welcome: welcomeMessage(clinic),
    aiReady: configured,
    suggestions: [
      'Randevu almak istiyorum',
      'Hangi hizmetleri veriyorsunuz?',
      'Çalışma saatleriniz nedir?',
      'İmplant tedavisi nasıl yapılır?',
    ],
  });
});

app.post('/api/chat', rateLimit, async (req, res) => {
  const { sessionId, message } = req.body ?? {};
  if (typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) {
    return res.status(400).json({ error: 'bad_session', message: 'Geçersiz oturum.' });
  }
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return res.status(400).json({ error: 'empty', message: 'Lütfen bir mesaj yazın.' });
  if (text.length > 1000) {
    return res.status(400).json({ error: 'too_long', message: 'Mesajınız çok uzun (en fazla 1000 karakter).' });
  }
  try {
    res.json(await assistant.chat(sessionId, text));
  } catch (err) {
    if (err instanceof ChatError) return res.status(err.status).json({ error: err.code, message: err.message });
    console.error(err);
    res.status(500).json({ error: 'internal', message: 'Beklenmeyen bir hata oluştu.' });
  }
});

app.post('/api/chat/reset', (req, res) => {
  const { sessionId } = req.body ?? {};
  if (typeof sessionId === 'string' && SESSION_RE.test(sessionId)) assistant.reset(sessionId);
  res.json({ ok: true });
});

// --- Yönetim paneli API'si ---
function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}
function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'admin_disabled', message: 'Yönetim paneli için ADMIN_PASSWORD ayarlanmalı.' });
  }
  const given = (req.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!timingSafeEqual(digest(given), digest(ADMIN_PASSWORD))) {
    return res.status(401).json({ error: 'unauthorized', message: 'Şifre hatalı.' });
  }
  next();
}

app.get('/api/admin/appointments', requireAdmin, async (req, res) => {
  const items = (await store.all()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  res.json({ today: scheduler.now().date, items });
});

app.post('/api/admin/appointments/:id/cancel', requireAdmin, async (req, res) => {
  const updated = await store.update(
    (a) => a.id === req.params.id && a.status === 'confirmed',
    () => ({ status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: 'admin' }),
  );
  if (!updated) return res.status(404).json({ error: 'not_found', message: 'Randevu bulunamadı.' });
  res.json({ ok: true, item: updated });
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(here, 'public'), { extensions: ['html'], maxAge: '1h' }));

app.listen(PORT, () => {
  console.log(`ARK Dental asistanı http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`Model: ${MODEL} (effort: ${EFFORT})`);
  if (!configured) console.warn('UYARI: ANTHROPIC_API_KEY ayarlı değil; sohbet cevap veremeyecek.');
  if (!ADMIN_PASSWORD) console.warn('UYARI: ADMIN_PASSWORD ayarlı değil; /admin paneli kapalı.');
});
