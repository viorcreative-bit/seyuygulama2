import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { AppointmentStore, createScheduler, normalizePhone } from '../src/appointments.js';
import { nowIn } from '../src/time.js';

const clinic = {
  timezone: 'Europe/Istanbul',
  workingHours: {
    monday: ['09:00', '19:00'],
    tuesday: ['09:00', '19:00'],
    wednesday: ['09:00', '19:00'],
    thursday: ['09:00', '19:00'],
    friday: ['09:00', '19:00'],
    saturday: ['09:00', '15:00'],
    sunday: null,
  },
  breaks: [['12:30', '13:30']],
  closedDates: ['2026-12-31'],
  appointment: { slotMinutes: 30, capacityPerSlot: 1, maxDaysAhead: 60, minNoticeMinutes: 60 },
};

// 19 Kasım 2026 Perşembe, İstanbul saatiyle 10:00
const clock = () => new Date('2026-11-19T07:00:00Z');

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), 'ark-test-'));
  const file = path.join(dir, 'appointments.json');
  const store = new AppointmentStore(file);
  return { file, store, scheduler: createScheduler({ clinic, store, clock }) };
}

test('nowIn İstanbul saatini verir', () => {
  assert.deepEqual(nowIn('Europe/Istanbul', clock()), { date: '2026-11-19', time: '10:00', minutes: 600, weekday: 'thursday' });
});

test('telefon numaraları normalize edilir', () => {
  assert.equal(normalizePhone('0532 123 45 67'), '+905321234567');
  assert.equal(normalizePhone('532-123-4567'), '+905321234567');
  assert.equal(normalizePhone('+90 (532) 123 45 67'), '+905321234567');
  assert.equal(normalizePhone('+44 7700 900123'), '+447700900123');
  assert.equal(normalizePhone('0090 532 123 45 67'), '+905321234567');
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('+90 532 123'), null);
});

test('bugünün geçmiş saatleri, mola ve minimum süre listelenmez', async () => {
  const { scheduler } = await setup();
  const [today] = await scheduler.availability('2026-11-19');
  assert.equal(today.open, true);
  assert.equal(today.slots[0], '11:00'); // 10:00 + 60 dk ön bildirim
  assert.ok(!today.slots.includes('12:30'));
  assert.ok(!today.slots.includes('13:00'));
  assert.ok(today.slots.includes('13:30'));
  assert.equal(today.slots.at(-1), '18:30');
});

test('pazar, tatil, geçmiş ve çok ileri tarihler kapalıdır', async () => {
  const { scheduler } = await setup();
  const [sunday] = await scheduler.availability('2026-11-22');
  assert.equal(sunday.open, false);
  assert.match(sunday.reason, /Pazar/);
  const [holiday] = await scheduler.availability('2026-12-31');
  assert.match(holiday.reason, /tatil/);
  const [past] = await scheduler.availability('2026-11-18');
  assert.match(past.reason, /geçmiş/);
  const [far] = await scheduler.availability('2027-03-01');
  assert.match(far.reason, /60 gün/);
  const [saturday] = await scheduler.availability('2026-11-21');
  assert.equal(saturday.slots.at(-1), '14:30');
});

test('randevu oluşturulur, dolu saat tekrar verilmez ve iptal edilebilir', async () => {
  const { scheduler, file } = await setup();
  const first = await scheduler.book({
    fullName: 'Ayşe  Yılmaz',
    phone: '0532 123 45 67',
    date: '2026-11-20',
    time: '10:00',
    service: 'Diş Taşı Temizliği',
  });
  assert.equal(first.ok, true);
  assert.match(first.record.code, /^ARK-[A-Z2-9]{6}$/);
  assert.equal(first.record.fullName, 'Ayşe Yılmaz');
  assert.equal(first.record.phone, '+905321234567');

  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(saved.length, 1);

  const [day] = await scheduler.availability('2026-11-20');
  assert.ok(!day.slots.includes('10:00'));

  const clash = await scheduler.book({ fullName: 'Mehmet Kaya', phone: '05551112233', date: '2026-11-20', time: '10:00' });
  assert.equal(clash.ok, false);

  const sameDay = await scheduler.book({ fullName: 'Ayşe Yılmaz', phone: '05321234567', date: '2026-11-20', time: '11:00' });
  assert.equal(sameDay.ok, false);

  const wrong = await scheduler.cancel({ code: first.record.code, phone: '05550000000' });
  assert.equal(wrong.ok, false);
  const cancelled = await scheduler.cancel({ code: first.record.code.toLowerCase(), phone: '+90 532 123 45 67' });
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.record.status, 'cancelled');

  const [again] = await scheduler.availability('2026-11-20');
  assert.ok(again.slots.includes('10:00'));
});

test('aynı anda gelen iki istekten yalnızca biri aynı saati alır', async () => {
  const { scheduler } = await setup();
  const results = await Promise.all([
    scheduler.book({ fullName: 'Kişi Bir', phone: '05320000001', date: '2026-11-23', time: '15:00' }),
    scheduler.book({ fullName: 'Kişi İki', phone: '05320000002', date: '2026-11-23', time: '15:00' }),
  ]);
  assert.equal(results.filter((r) => r.ok).length, 1);
});

test('geçersiz girişler reddedilir', async () => {
  const { scheduler } = await setup();
  const base = { fullName: 'Ali Veli', phone: '05321234567', date: '2026-11-20', time: '10:00' };
  assert.equal((await scheduler.book({ ...base, time: '10:15' })).ok, false);
  assert.equal((await scheduler.book({ ...base, time: '12:30' })).ok, false);
  assert.equal((await scheduler.book({ ...base, date: '2026-11-22' })).ok, false);
  assert.equal((await scheduler.book({ ...base, phone: '123' })).ok, false);
  assert.equal((await scheduler.book({ ...base, fullName: 'A' })).ok, false);
  assert.equal((await scheduler.book({ ...base, date: '2026-02-30' })).ok, false);
});
