import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { embedRecordings, PHRASES, phraseText, welcomeOf } from '../kaptan-ark/js/recordings.js';

const clinic = JSON.parse(await readFile(new URL('../kaptan-ark/clinic.json', import.meta.url), 'utf8'));
const appSource = await readFile(new URL('../kaptan-ark/js/app.js', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../kaptan-ark/index.html', import.meta.url), 'utf8');

test('cümle kimlikleri benzersiz ve metinler dolu', () => {
  const ids = PHRASES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of PHRASES) assert.ok(p.text(clinic).length > 5, p.id);
  assert.equal(phraseText('welcome', clinic), clinic.welcome);
  assert.equal(welcomeOf({ shortName: 'X Klinik', assistantName: 'Y' }).startsWith("X Klinik'e hoş geldiniz! Ben Y."), true);
  assert.equal(phraseText('yok', clinic), null);
});

test('uygulamadaki her ses kimliğinin kayıt cümlesi var', () => {
  const used = new Set();
  for (const m of appSource.matchAll(/audio:\s*'(\w+)'|, '(\w+)'\);|^\s+\w+: '(\w+)',$/gm)) used.add(m[1] ?? m[2] ?? m[3]);
  for (const m of appSource.matchAll(/'(poke\d)'/g)) used.add(m[1]);
  const known = new Set(PHRASES.map((p) => p.id));
  const audioLike = [...used].filter((id) => /^(welcome|greeting|poke\d|booking_\w+|hours|location|contact|services|service_info|price|cancel_info|emergency|pain|thanks|bye|unknown)$/.test(id));
  assert.ok(audioLike.length >= 20, `beklenenden az ses kimliği bulundu: ${audioLike.length}`);
  for (const id of audioLike) assert.ok(known.has(id), `kayıt listesinde yok: ${id}`);
});

test('kayıtlar sayfa kaynağına gömülür', () => {
  const recs = { welcome: { src: 'data:audio/mp4;base64,AAAA', mime: 'audio/mp4', text: clinic.welcome } };
  const out = embedRecordings(indexHtml, recs);
  const block = /<script type="application\/json" id="voice-recordings">([\s\S]*?)<\/script>/.exec(out)[1];
  assert.deepEqual(JSON.parse(block), recs);
  // ikinci kez gömmek eskisini değiştirir
  const again = embedRecordings(out, {});
  assert.equal(/<script type="application\/json" id="voice-recordings">([\s\S]*?)<\/script>/.exec(again)[1], '{}');
  assert.throws(() => embedRecordings('<html></html>', recs));
  // "<" karakteri JSON içinde kaçışlanır, script etiketi erken kapanmaz
  assert.ok(!embedRecordings(indexHtml, { x: { src: '</script>' } }).includes('{"x":{"src":"</script>'));
});
