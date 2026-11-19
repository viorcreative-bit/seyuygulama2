import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  availableSlots,
  bookingMessage,
  clinicNow,
  daySlots,
  normalizePhone,
  openDays,
  validName,
  whatsappLink,
} from '../kaptan-ark/js/booking.js';

const clinic = JSON.parse(await readFile(new URL('../kaptan-ark/clinic.json', import.meta.url), 'utf8'));
// 19 Kasım 2026 Perşembe, İstanbul saatiyle 10:00
const now = clinicNow(clinic, new Date('2026-11-19T07:00:00Z'));

test('İstanbul saatine göre şu an', () => {
  assert.deepEqual(now, { date: '2026-11-19', time: '10:00', minutes: 600, weekday: 'thursday' });
});

test('günün saatleri öğle arasını atlar', () => {
  const slots = daySlots(clinic, '2026-11-20');
  assert.equal(slots[0], '09:00');
  assert.ok(!slots.includes('12:30') && !slots.includes('13:00'));
  assert.ok(slots.includes('13:30'));
  assert.equal(slots.at(-1), '18:30');
  assert.equal(daySlots(clinic, '2026-11-21').at(-1), '14:30'); // cumartesi
  assert.deepEqual(daySlots(clinic, '2026-11-22'), []); // pazar
});

test('bugün için en az 60 dk sonrası önerilir', () => {
  assert.equal(availableSlots(clinic, '2026-11-19', now)[0], '11:00');
  assert.deepEqual(availableSlots(clinic, '2026-11-18', now), []);
  assert.deepEqual(availableSlots(clinic, '2026-12-31', now), []); // tatil
});

test('açık günler pazarı ve tatilleri atlar', () => {
  const days = openDays(clinic, now, 8);
  assert.equal(days.length, 8);
  assert.equal(days[0].date, '2026-11-19');
  assert.match(days[0].label, /^Bugün/);
  assert.match(days[1].label, /^Yarın/);
  assert.ok(!days.some((d) => d.date === '2026-11-22'));
  assert.equal(days[1].long, '20 Kasım 2026 Cuma');
});

test('telefon ve isim kontrolü', () => {
  assert.equal(normalizePhone('05321234567'), '0532 123 45 67');
  assert.equal(normalizePhone('+90 532 123 45 67'), '0532 123 45 67');
  assert.equal(normalizePhone('532 123 4567'), '0532 123 45 67');
  assert.equal(normalizePhone('+44 7700 900123'), '+447700900123');
  assert.equal(normalizePhone('12345'), null);
  assert.equal(validName('  ayşe   yılmaz '), 'ayşe yılmaz');
  assert.equal(validName('a'), null);
  assert.equal(validName('123'), null);
});

test('WhatsApp mesajı ve bağlantısı', () => {
  const req = { service: 'Diş Taşı Temizliği', date: '2026-11-20', time: '10:30', name: 'Ayşe Yılmaz', phone: '0532 123 45 67' };
  const msg = bookingMessage(clinic, req);
  assert.match(msg, /ARK Dental web sitesinden randevu talebi/);
  assert.match(msg, /Tarih: 20 Kasım 2026 Cuma/);
  assert.match(msg, /Saat: 10:30/);
  assert.equal(whatsappLink(clinic, req), null); // numara girilmemiş
  const link = whatsappLink({ ...clinic, whatsapp: '+90 532 000 11 22' }, req);
  assert.ok(link.startsWith('https://wa.me/905320001122?text='));
  assert.equal(decodeURIComponent(link.split('text=')[1]), msg);
});
