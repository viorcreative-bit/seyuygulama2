import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { answer, normalize, priorityAnswer } from '../kaptan-ark/js/faq.js';

const base = JSON.parse(await readFile(new URL('../kaptan-ark/clinic.json', import.meta.url), 'utf8'));
const clinic = {
  ...base,
  whatsapp: '905320001122',
  faq: [
    { q: 'Kredi kartına taksit yapıyor musunuz?', a: 'Evet, anlaşmalı kartlara taksit yapıyoruz.' },
    { q: 'Otopark var mı?', a: 'Binanın önünde ücretsiz otopark var.' },
  ],
};

test('Türkçe karakterler sadeleştirilir', () => {
  assert.equal(normalize('İMPLANTI Ne Kadar? Çok Şişti!'), 'implanti ne kadar cok sisti');
});

const cases = [
  ['Çalışma saatleriniz nedir?', 'hours'],
  ['Pazar günü açık mısınız', 'hours'],
  ['İmplant tedavisi nasıl yapılır?', 'service'],
  ['implant ne kadar sürer', 'service'],
  ['İmplant fiyatı ne kadar?', 'price'],
  ['kaç para', 'price'],
  ['Randevu almak istiyorum', 'booking'],
  ['randevumu iptal etmek istiyorum', 'cancel'],
  ['Yüzüm çok şişti', 'emergency'],
  ['dişim kırıldı', 'emergency'],
  ['Telefon numaranız nedir', 'contact'],
  ['Adresiniz nerede?', 'location'],
  ['Hangi hizmetleri veriyorsunuz?', 'services'],
  ['Dişim ağrıyor', 'pain'],
  ['Merhaba', 'greeting'],
  ['teşekkürler', 'thanks'],
  ['taksit yapıyor musunuz', 'faq'],
  ['otopark var mı', 'faq'],
  ['hiç anlamadım bunu', 'unknown'],
  ['Bugün hava nasıl?', 'unknown'],
];

for (const [question, intent] of cases) {
  test(`"${question}" → ${intent}`, () => {
    assert.equal(answer(clinic, question).intent, intent);
  });
}

test('randevu isteğinde hizmet algılanır', () => {
  assert.equal(priorityAnswer(clinic, 'Diş teli için randevu almak istiyorum').service, 'Ortodonti (Diş Teli / Şeffaf Plak)');
  assert.equal(priorityAnswer(clinic, 'Randevu istiyorum').service, null);
});

test('cevaplar klinik bilgilerini kullanır', () => {
  assert.match(answer(clinic, 'saatler').text, /Pazartesi–Cuma: 09:00–19:00/);
  assert.match(answer(clinic, 'saatler').text, /Pazar: kapalı/);
  assert.match(answer(clinic, 'implant fiyatı').text, /muayene/);
  assert.match(answer({ ...clinic, prices: { items: { 'İmplant Tedavisi': '20.000 TL\'den başlayan' } } }, 'implant fiyatı').text, /20\.000 TL/);
  const emergency = answer(clinic, 'yüzüm şişti');
  assert.match(emergency.text, /112/);
  assert.ok(emergency.chips.some((c) => c.href === 'tel:112'));
  assert.ok(answer(clinic, 'telefon').chips.some((c) => c.href === 'https://wa.me/905320001122'));
});
