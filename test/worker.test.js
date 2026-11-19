// Cloudflare Worker testleri: global fetch sahte cevaplarla değiştirilir.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import worker from '../cloudflare-worker/worker.js';

const clinicText = await readFile(new URL('../kaptan-ark/clinic.json', import.meta.url), 'utf8');
const realFetch = globalThis.fetch;
const calls = [];

before(() => {
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u === 'https://site.test/kaptan-ark/clinic.json') return new Response(clinicText, { headers: { 'content-type': 'application/json' } });
    if (u.includes(':generateContent')) {
      return Response.json({ candidates: [{ content: { parts: [{ text: 'Merhaba! Ben Kaptan Ark.' }] } }] });
    }
    if (u.endsWith('/v1/chat/completions')) return Response.json({ choices: [{ message: { content: 'Hello from OpenAI' } }] });
    return new Response('not found', { status: 404 });
  };
});
after(() => {
  globalThis.fetch = realFetch;
});

const env = {
  GEMINI_API_KEY: 'test',
  CLINIC_JSON_URL: 'https://site.test/kaptan-ark/clinic.json',
  ALLOWED_ORIGINS: 'https://site.test, https://www.site.test',
};

function request(body, { origin = 'https://site.test', method = 'POST' } = {}) {
  return new Request('https://worker.test/', {
    method,
    headers: { 'content-type': 'application/json', origin },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

test('CORS ön isteği', async () => {
  const res = await worker.fetch(request(null, { method: 'OPTIONS' }), env);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://site.test');
});

test('izin verilmeyen alan adı reddedilir', async () => {
  const res = await worker.fetch(request({ messages: [] }, { origin: 'https://evil.test' }), env);
  assert.equal(res.status, 403);
});

test('anahtar yoksa not_configured', async () => {
  const res = await worker.fetch(request({ messages: [] }), { ...env, GEMINI_API_KEY: '' });
  assert.equal(res.status, 503);
});

test('yoklama isteği ve boş mesaj', async () => {
  const probe = await worker.fetch(request({ probe: true }), env);
  assert.equal(probe.status, 200);
  assert.equal((await probe.json()).ok, true);
  assert.equal((await worker.fetch(request({ messages: [] }), env)).status, 400);
});

test('Gemini cevabı ve sistem talimatı', async () => {
  calls.length = 0;
  const res = await worker.fetch(request({ messages: [{ role: 'user', content: 'Merhaba' }] }), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { reply: 'Merhaba! Ben Kaptan Ark.' });
  const ai = calls.find((c) => c.url.includes(':generateContent'));
  assert.ok(ai.url.endsWith('/v1beta/models/gemini-flash-latest:generateContent'));
  assert.equal(ai.init.headers['x-goog-api-key'], 'test');
  const system = JSON.parse(ai.init.body).system_instruction.parts[0].text;
  assert.match(system, /Kaptan Ark/);
  assert.match(system, /\(bugün\)/);
  assert.doesNotMatch(system, /_faq_ornek|keywords/);
});

test('OpenAI sağlayıcısı', async () => {
  const res = await worker.fetch(request({ messages: [{ role: 'user', content: 'Hi' }] }, { origin: 'https://www.site.test' }), {
    ...env,
    PROVIDER: 'openai',
    OPENAI_API_KEY: 'sk-test',
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).reply, 'Hello from OpenAI');
});
