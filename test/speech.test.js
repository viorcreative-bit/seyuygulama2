import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chunk, detectLang, speechText } from '../kaptan-ark/js/speech.js';

const clinic = JSON.parse(await readFile(new URL('../kaptan-ark/clinic.json', import.meta.url), 'utf8'));

test('"Kaptan Ark." arkeoloji kısaltması gibi okunmaz', () => {
  const spoken = speechText(clinic.welcome);
  assert.match(spoken, /Ben Kaptan Ark! /);
  assert.doesNotMatch(spoken, /\bArk\./i);
  assert.equal(speechText('Merhaba! Ben Kaptan Ark.'), 'Merhaba! Ben Kaptan Ark!');
  assert.equal(speechText('Kaptan Ark. Size nasıl yardımcı olabilirim?'), 'Kaptan Ark! Size nasıl yardımcı olabilirim?');
});

test('büyük harfli ARK kelime olarak okunur, ekler korunur', () => {
  assert.equal(speechText("ARK Dental'e hoş geldiniz!"), "Ark Dental'e hoş geldiniz!");
  assert.equal(speechText("Kaptan Ark'ın pelerini"), "Kaptan Ark'ın pelerini");
  assert.equal(speechText('arkadaşım geldi.'), 'arkadaşım geldi.');
});

test('emoji, bağlantı ve madde işaretleri okunmaz', () => {
  assert.equal(speechText('Harika 🎉 bakınız https://wa.me/90532\n• Hizmet'), 'Harika bakınız Hizmet');
});

test('dil algılama ve parçalama', () => {
  assert.equal(detectLang(speechText(clinic.welcome)), 'tr');
  assert.equal(detectLang('Hello, how can I help you?'), 'en');
  const parts = chunk('Bir. '.repeat(60));
  assert.ok(parts.length > 1 && parts.every((p) => p.length <= 185));
});
