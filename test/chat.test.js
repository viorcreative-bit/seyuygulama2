import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import { AppointmentStore, createScheduler } from '../src/appointments.js';
import { ChatError, createAssistant } from '../src/assistant.js';
import { startMockAnthropic } from './mock-anthropic.js';

const clinic = JSON.parse(await readFile(new URL('../config/clinic.json', import.meta.url), 'utf8'));
const mock = await startMockAnthropic();
after(() => mock.server.close());

const clock = () => new Date('2026-11-19T07:00:00Z');

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), 'ark-chat-'));
  const file = path.join(dir, 'appointments.json');
  const store = new AppointmentStore(file);
  const scheduler = createScheduler({ clinic, store, clock });
  const client = new Anthropic({ apiKey: 'test-key', baseURL: `http://localhost:${mock.port}`, maxRetries: 0 });
  const assistant = createAssistant({ clinic, scheduler, client, model: 'claude-opus-5-5', effort: 'low' });
  return { assistant, file };
}

test('soru-cevap, müsaitlik kontrolü ve randevu oluşturma akışı', async () => {
  const { assistant, file } = await setup();
  const session = 'test-session-0000000001';
  mock.requests.length = 0;

  const a1 = await assistant.chat(session, 'Çalışma saatleriniz nedir?');
  assert.match(a1.reply, /09:00/);

  const a2 = await assistant.chat(session, 'Yarın diş temizliği için randevu almak istiyorum');
  assert.match(a2.reply, /uygun saatler/);

  const a3 = await assistant.chat(session, 'Evet onaylıyorum, adım Ayşe Yılmaz 0532 123 45 67');
  assert.ok(a3.appointment, 'randevu bilgisi arayüze dönmeli');
  assert.match(a3.appointment.code, /^ARK-/);
  assert.equal(a3.appointment.date, '2026-11-20');
  assert.match(a3.reply, new RegExp(a3.appointment.code));

  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].fullName, 'Ayşe Yılmaz');

  // İstek parametreleri
  const first = mock.requests[0];
  assert.equal(first.body.model, 'claude-opus-5-5');
  assert.deepEqual(first.body.output_config, { effort: 'low' });
  assert.equal(first.body.fallbacks, 'default');
  assert.match(first.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.deepEqual(
    first.body.tools.map((t) => t.name),
    ['check_availability', 'create_appointment', 'cancel_appointment', 'find_appointment'],
  );
  assert.match(first.body.system, /2026-11-19 = 19 Kasım 2026 Perşembe \(bugün\)/);

  // Geçmiş korunuyor: son istek, önceki tüm turları (araç çağrıları dahil) içermeli
  const last = mock.requests.at(-1).body.messages;
  const roles = last.map((m) => m.role).join(',');
  assert.equal(roles, 'user,assistant,user,assistant,user,assistant,user,assistant,user');
  // Sistem talimatı istekler arasında aynı kalmalı (önbellek için)
  assert.ok(mock.requests.every((r) => r.body.system === first.body.system));
});

test('aynı oturumda eşzamanlı mesaj reddedilir', async () => {
  const { assistant } = await setup();
  const session = 'test-session-0000000002';
  const p1 = assistant.chat(session, 'İmplant nedir?');
  await assert.rejects(assistant.chat(session, 'Merhaba'), (err) => err instanceof ChatError && err.code === 'busy');
  await p1;
});

test('API anahtarı yoksa anlaşılır hata döner', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ark-chat-'));
  const scheduler = createScheduler({ clinic, store: new AppointmentStore(path.join(dir, 'a.json')), clock });
  const assistant = createAssistant({ clinic, scheduler, model: 'claude-opus-5-5', configured: false });
  await assert.rejects(assistant.chat('test-session-0000000003', 'Merhaba'), (err) => err.code === 'not_configured');
});
