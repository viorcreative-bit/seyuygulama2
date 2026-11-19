// chat.php testleri: PHP'nin yerleşik sunucusu + sahte yapay zeka API'si.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { startMockAI } from './mock-ai.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'kaptan-ark');
const hasPhp = spawnSync('php', ['-v']).status === 0;

let mock;
let tmp;
const servers = [];
let nextPort = 18100 + Math.floor(Math.random() * 500);

let configCount = 0;
async function phpServer(config) {
  const id = configCount++;
  const file = path.join(tmp, `config-${id}.php`);
  const entries = Object.entries({ rate_limit_dir: path.join(tmp, `rl-${id}`), ...config })
    .map(([k, v]) => `  ${JSON.stringify(k)} => ${typeof v === 'number' ? v : JSON.stringify(v)},`)
    .join('\n');
  await writeFile(file, `<?php\nreturn [\n${entries}\n];\n`);
  const port = nextPort++;
  const proc = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root], {
    env: { ...process.env, KAPTAN_ARK_CONFIG: file },
    stdio: 'ignore',
  });
  servers.push(proc);
  const url = `http://127.0.0.1:${port}/chat.php`;
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(url);
      return url;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('PHP sunucusu açılmadı');
}

const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }).then(
    async (r) => ({ status: r.status, data: await r.json() }),
  );

describe('chat.php', { skip: !hasPhp && 'php yüklü değil' }, () => {
  let gemini;
  let openai;
  let noKey;
  let limited;
  let quota;

  before(async () => {
    mock = await startMockAI();
    tmp = await mkdtemp(path.join(tmpdir(), 'kaptan-ark-'));
    const base = `http://127.0.0.1:${mock.port}`;
    [gemini, openai, noKey, limited, quota] = await Promise.all([
      phpServer({ provider: 'gemini', gemini_api_key: 'test-gemini', gemini_base_url: base, gemini_model: 'gemini-flash-latest' }),
      phpServer({ provider: 'openai', openai_api_key: 'test-openai', openai_base_url: base, openai_model: 'gpt-test' }),
      phpServer({ provider: 'gemini', gemini_api_key: '' }),
      phpServer({ provider: 'gemini', gemini_api_key: 'k', gemini_base_url: base, per_minute_limit: 2 }),
      phpServer({ provider: 'gemini', gemini_api_key: 'quota', gemini_base_url: base }),
    ]);
  });

  after(() => {
    for (const s of servers) s.kill();
    mock?.server.close();
  });

  test('yalnızca POST kabul eder', async () => {
    const res = await fetch(gemini);
    assert.equal(res.status, 405);
  });

  test('anahtar yoksa not_configured döner', async () => {
    const { status, data } = await post(noKey, { messages: [{ role: 'user', content: 'merhaba' }] });
    assert.equal(status, 503);
    assert.equal(data.error, 'not_configured');
  });

  test('yoklama isteği yapay zekayı çağırmadan cevap verir', async () => {
    const before = mock.requests.length;
    const { status, data } = await post(gemini, { probe: true });
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(mock.requests.length, before);
    assert.equal((await post(noKey, { probe: true })).status, 503);
    assert.equal((await post(gemini, { messages: [] })).status, 400);
  });

  test('bozuk girdiler reddedilir', async () => {
    assert.equal((await post(gemini, 'bozuk')).status, 400);
    assert.equal((await post(gemini, { messages: [{ role: 'system', content: 'x' }] })).status, 400);
    assert.equal((await post(gemini, { messages: [{ role: 'user', content: 'x'.repeat(2000) }] })).status, 400);
    assert.equal((await post(gemini, { messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] })).status, 400);
  });

  test('Gemini: soruyu iletir, sistem talimatını ekler', async () => {
    mock.requests.length = 0;
    const { status, data } = await post(gemini, {
      messages: [
        { role: 'assistant', content: "ARK Dental'e hoş geldiniz!" },
        { role: 'user', content: 'Merhaba' },
        { role: 'assistant', content: 'Merhaba! Size nasıl yardımcı olayım?' },
        { role: 'user', content: 'İmplant nedir?' },
      ],
    });
    assert.equal(status, 200);
    assert.match(data.reply, /titanyum/);
    assert.match(data.reply, /\[RANDEVU\]/);

    const sent = mock.requests.at(-1);
    assert.equal(sent.url, '/v1beta/models/gemini-flash-latest:generateContent');
    assert.equal(sent.headers['x-goog-api-key'], 'test-gemini');
    assert.deepEqual(
      sent.body.contents.map((c) => c.role),
      ['user', 'model', 'user'],
    );
    const system = sent.body.system_instruction.parts[0].text;
    assert.match(system, /Adın "Kaptan Ark"/);
    assert.match(system, /\(bugün\)/);
    assert.match(system, /"Diş Taşı Temizliği"/);
    assert.match(system, /\[RANDEVU\]/);
    assert.doesNotMatch(system, /_faq_ornek|keywords|"endpoint"|_not/);
  });

  test('OpenAI sağlayıcısı da çalışır', async () => {
    const { status, data } = await post(openai, { messages: [{ role: 'user', content: 'Merhaba' }] });
    assert.equal(status, 200);
    assert.match(data.reply, /openai/);
    const sent = mock.requests.at(-1);
    assert.equal(sent.url, '/v1/chat/completions');
    assert.equal(sent.headers.authorization, 'Bearer test-openai');
    assert.equal(sent.body.model, 'gpt-test');
    assert.equal(sent.body.messages[0].role, 'system');
  });

  test('kota dolunca 429 döner', async () => {
    const { status, data } = await post(quota, { messages: [{ role: 'user', content: 'Merhaba' }] });
    assert.equal(status, 429);
    assert.equal(data.error, 'quota');
  });

  test('dakika sınırı aşılınca 429 döner', async () => {
    const msg = { messages: [{ role: 'user', content: 'Merhaba' }] };
    assert.equal((await post(limited, msg)).status, 200);
    assert.equal((await post(limited, msg)).status, 200);
    const third = await post(limited, msg);
    assert.equal(third.status, 429);
    assert.equal(third.data.error, 'rate_limited');
  });
});
