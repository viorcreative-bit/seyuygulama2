import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chunk, detectLang, pickVoice, speechText, voiceScore } from '../kaptan-ark/js/speech.js';

const clinic = JSON.parse(await readFile(new URL('../kaptan-ark/clinic.json', import.meta.url), 'utf8'));
const say = (text) => speechText(text, clinic.speech.pronunciations);

test('seslendirmede "ARK" hiç geçmez: "Hoş geldiniz! Ben Kaptan"', () => {
  const spoken = say(clinic.welcome);
  assert.equal(
    spoken,
    'Hoş geldiniz! Ben Kaptan. Sorularınızı yanıtlayabilir, randevu talebinizi hemen oluşturabilirim. Size nasıl yardımcı olayım?',
  );
  assert.doesNotMatch(spoken, /ark/i);
  assert.equal(say('Merhaba! Ben Kaptan Ark.'), 'Merhaba! Ben Kaptan.');
  assert.equal(say('Kaptan Ark göreve hazır!'), 'Kaptan göreve hazır!');
  assert.equal(say("Kaptan Ark'ın pelerini"), "Kaptan'ın pelerini");
  // ayar dosyası olmasa da varsayılan kurallar geçerli
  assert.equal(speechText("ARK Dental'e hoş geldiniz! Ben Kaptan Ark."), 'Hoş geldiniz! Ben Kaptan.');
});

test('klinik adı ekine göre "kliniğimiz" diye okunur', () => {
  assert.equal(say("ARK Dental Clinic'e hoş geldiniz!"), 'Hoş geldiniz!');
  assert.equal(say('ARK Dental Clinic olarak buradayız.'), 'kliniğimiz olarak buradayız.');
  assert.equal(say("ARK Dental'de implant yapılıyor."), 'kliniğimizde implant yapılıyor.');
  assert.equal(say("ARK Dental'in adresi"), 'kliniğimizin adresi');
  assert.equal(say("ARK Dental'den randevu"), 'kliniğimizden randevu');
  assert.equal(say("ARK Dental'i arayın"), 'kliniğimizi arayın');
  assert.equal(say("ARK Dental'e gelin"), 'kliniğimize gelin');
  assert.equal(say('ARK ekibi'), 'ekibi');
});

test('benzer kelimeler bozulmaz', () => {
  assert.equal(say('Arkadaşınızla gelebilirsiniz. Arka kapıdan girin.'), 'Arkadaşınızla gelebilirsiniz. Arka kapıdan girin.');
  assert.equal(say('PARK yeri var'), 'PARK yeri var');
});

test('telaffuz sözlüğüne kelime eklenebilir', () => {
  assert.equal(speechText('Zirkonyum kaplama', { Zirkonyum: 'zirkon yum' }), 'zirkon yum kaplama');
  assert.equal(speechText('ARK Dental', {}), 'kliniğimiz'); // varsayılanlar her zaman geçerli
});

test('emoji, bağlantı ve madde işaretleri okunmaz', () => {
  assert.equal(say('Harika 🎉 bakınız https://wa.me/90532\n• Hizmet'), 'Harika bakınız Hizmet');
});

test('en doğal ses seçilir', () => {
  const voices = [
    { name: 'Microsoft Tolga - Turkish (Turkey)', lang: 'tr-TR', localService: true },
    { name: 'Google Türkçe', lang: 'tr-TR', localService: false },
    { name: 'Microsoft Emel Online (Natural) - Turkish (Turkey)', lang: 'tr-TR', localService: false },
    { name: 'Google US English', lang: 'en-US', localService: false },
  ];
  assert.equal(pickVoice(voices, 'tr').name, 'Microsoft Emel Online (Natural) - Turkish (Turkey)');
  assert.equal(pickVoice(voices.slice(0, 2), 'tr').name, 'Google Türkçe');
  assert.equal(pickVoice(voices, 'tr', 'tolga').name, 'Microsoft Tolga - Turkish (Turkey)');
  assert.equal(pickVoice(voices, 'en').name, 'Google US English');
  assert.equal(pickVoice([{ name: 'Yelda', lang: 'tr_TR' }], 'tr').name, 'Yelda');
  assert.ok(voiceScore({ name: 'Yelda (Gelişmiş)', lang: 'tr-TR' }, 'tr') > voiceScore({ name: 'Yelda', lang: 'tr-TR' }, 'tr'));
  assert.equal(pickVoice([{ name: 'Anna', lang: 'de-DE' }], 'tr'), null);
});

test('dil algılama ve parçalama', () => {
  assert.equal(detectLang(say(clinic.welcome)), 'tr');
  assert.equal(detectLang('Hello, how can I help you?'), 'en');
  const parts = chunk('Bir. '.repeat(60));
  assert.ok(parts.length > 1 && parts.every((p) => p.length <= 185));
});
