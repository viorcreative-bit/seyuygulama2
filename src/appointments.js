import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  addDays,
  daysBetween,
  formatDateTr,
  fromMinutes,
  isValidDate,
  isValidTime,
  nowIn,
  toMinutes,
  weekdayOf,
  WEEKDAYS_TR,
} from './time.js';

/** Randevuları bir JSON dosyasında saklar. Yazmalar sıraya alınır, dosya atomik olarak değiştirilir. */
export class AppointmentStore {
  #file;
  #items = null;
  #queue = Promise.resolve();

  constructor(file) {
    this.#file = file;
  }

  async #load() {
    if (this.#items) return this.#items;
    try {
      this.#items = JSON.parse(await readFile(this.#file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.#items = [];
    }
    return this.#items;
  }

  async #persist() {
    await mkdir(path.dirname(this.#file), { recursive: true });
    const tmp = `${this.#file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(this.#items, null, 2));
    await rename(tmp, this.#file);
  }

  /** Yazma işlemlerini tek tek çalıştırır; böylece aynı slota iki randevu yazılamaz. */
  #exclusive(fn) {
    const run = this.#queue.then(fn, fn);
    this.#queue = run.catch(() => {});
    return run;
  }

  async all() {
    return [...(await this.#load())];
  }

  async activeOn(date) {
    return (await this.#load()).filter((a) => a.date === date && a.status === 'confirmed');
  }

  /** check() true dönerse kaydı ekler; kontrol ve ekleme aynı kilit içinde yapılır. */
  add(record, check) {
    return this.#exclusive(async () => {
      const items = await this.#load();
      const problem = check ? check(items) : null;
      if (problem) return { ok: false, error: problem };
      items.push(record);
      await this.#persist();
      return { ok: true, record };
    });
  }

  update(match, change) {
    return this.#exclusive(async () => {
      const items = await this.#load();
      const item = items.find(match);
      if (!item) return null;
      Object.assign(item, change(item));
      await this.#persist();
      return { ...item };
    });
  }
}

/** Telefonu E.164 biçimine çevirir (+905xxxxxxxxx). Geçersizse null. */
export function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  const plus = trimmed.startsWith('+') || trimmed.startsWith('00');
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('00')) digits = digits.slice(2);
  if (!plus) {
    if (digits.length === 11 && digits.startsWith('05')) digits = `90${digits.slice(1)}`;
    else if (digits.length === 10 && digits.startsWith('5')) digits = `90${digits}`;
    else if (digits.length === 11 && digits.startsWith('0')) digits = `90${digits.slice(1)}`; // sabit hat
    else if (digits.length === 10 && /^[2-4]/.test(digits)) digits = `90${digits}`;
  }
  if (digits.startsWith('90') && digits.length !== 12) return null;
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `ARK-${code}`;
}

/** Bir günün çalışma aralığından mola saatleri çıkarılmış slot başlangıçlarını döndürür. */
function daySlots(clinic, date) {
  const hours = clinic.workingHours?.[weekdayOf(date)];
  if (!hours) return [];
  const step = clinic.appointment.slotMinutes;
  const [open, close] = hours.map(toMinutes);
  const breaks = (clinic.breaks ?? []).map(([s, e]) => [toMinutes(s), toMinutes(e)]);
  const slots = [];
  for (let t = open; t + step <= close; t += step) {
    const overlapsBreak = breaks.some(([s, e]) => t < e && t + step > s);
    if (!overlapsBreak) slots.push(fromMinutes(t));
  }
  return slots;
}

/** Tarihin randevuya uygun olup olmadığını kontrol eder; uygun değilse Türkçe sebebi döndürür. */
function dateProblem(clinic, date, now) {
  if (!isValidDate(date)) return 'Tarih YYYY-MM-DD biçiminde olmalı.';
  const ahead = daysBetween(now.date, date);
  if (ahead < 0) return 'Bu tarih geçmişte kaldı.';
  if (ahead > clinic.appointment.maxDaysAhead) {
    return `En fazla ${clinic.appointment.maxDaysAhead} gün sonrasına randevu verilebiliyor.`;
  }
  if ((clinic.closedDates ?? []).includes(date)) return 'Klinik bu tarihte kapalı (tatil).';
  if (!clinic.workingHours?.[weekdayOf(date)]) {
    return `Klinik ${WEEKDAYS_TR[weekdayOf(date)]} günleri kapalı.`;
  }
  return null;
}

function freeSlots(clinic, date, booked, now) {
  const counts = new Map();
  for (const a of booked) counts.set(a.time, (counts.get(a.time) ?? 0) + 1);
  const earliest = date === now.date ? now.minutes + clinic.appointment.minNoticeMinutes : -1;
  return daySlots(clinic, date).filter(
    (t) => toMinutes(t) >= earliest && (counts.get(t) ?? 0) < clinic.appointment.capacityPerSlot,
  );
}

export function createScheduler({ clinic, store, notify = async () => {}, clock = () => new Date() }) {
  const now = () => nowIn(clinic.timezone, clock());

  async function availability(startDate, days = 1) {
    const current = now();
    const result = [];
    for (let i = 0; i < Math.min(Math.max(days, 1), 14); i++) {
      const date = addDays(startDate, i);
      const base = { date, label: formatDateTr(date) };
      const problem = dateProblem(clinic, date, current);
      if (problem) {
        result.push({ ...base, open: false, reason: problem, slots: [] });
        continue;
      }
      const slots = freeSlots(clinic, date, await store.activeOn(date), current);
      result.push({
        ...base,
        open: true,
        slots,
        ...(slots.length === 0 && { reason: 'Bu gün için boş saat kalmadı.' }),
      });
    }
    return result;
  }

  async function book({ fullName, phone, date, time, service, note }) {
    const current = now();
    const name = String(fullName ?? '').trim().replace(/\s+/g, ' ');
    if (name.length < 3 || name.length > 80) return { ok: false, error: 'Ad soyad eksik veya geçersiz.' };
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return { ok: false, error: 'Telefon numarası geçersiz. Örnek: 0532 123 45 67' };
    const problem = dateProblem(clinic, date, current);
    if (problem) return { ok: false, error: problem };
    if (!isValidTime(time)) return { ok: false, error: 'Saat SS:DD biçiminde olmalı, ör. 14:30.' };
    if (!daySlots(clinic, date).includes(time)) {
      return { ok: false, error: 'Bu saat çalışma saatleri dışında ya da randevu saati değil.' };
    }

    const record = {
      id: randomUUID(),
      code: makeCode(),
      fullName: name,
      phone: normalizedPhone,
      service: String(service ?? 'Muayene ve Kontrol').trim().slice(0, 80) || 'Muayene ve Kontrol',
      date,
      time,
      note: String(note ?? '').trim().slice(0, 300),
      status: 'confirmed',
      source: 'chat',
      createdAt: new Date().toISOString(),
    };

    const result = await store.add(record, (items) => {
      const booked = items.filter((a) => a.date === date && a.status === 'confirmed');
      if (!freeSlots(clinic, date, booked, now()).includes(time)) {
        return 'Bu saat az önce doldu ya da artık uygun değil. Lütfen başka bir saat seçin.';
      }
      const duplicate = booked.some((a) => a.phone === normalizedPhone);
      if (duplicate) return 'Bu telefon numarasıyla aynı gün için zaten bir randevu var.';
      return null;
    });
    if (result.ok) {
      notify({ type: 'appointment.created', appointment: result.record }).catch((err) =>
        console.error('Bildirim gönderilemedi:', err.message),
      );
    }
    return result;
  }

  async function cancel({ code, phone }) {
    const normalizedPhone = normalizePhone(phone);
    const wanted = String(code ?? '').trim().toUpperCase();
    if (!normalizedPhone || !wanted) return { ok: false, error: 'Randevu kodu ve telefon gerekli.' };
    const updated = await store.update(
      (a) => a.code === wanted && a.phone === normalizedPhone && a.status === 'confirmed',
      () => ({ status: 'cancelled', cancelledAt: new Date().toISOString() }),
    );
    if (!updated) return { ok: false, error: 'Bu kod ve telefonla eşleşen aktif randevu bulunamadı.' };
    notify({ type: 'appointment.cancelled', appointment: updated }).catch(() => {});
    return { ok: true, record: updated };
  }

  async function lookup({ code, phone }) {
    const normalizedPhone = normalizePhone(phone);
    const wanted = String(code ?? '').trim().toUpperCase();
    const found = (await store.all()).find((a) => a.code === wanted && a.phone === normalizedPhone);
    return found ? { ok: true, record: found } : { ok: false, error: 'Eşleşen randevu bulunamadı.' };
  }

  return { now, availability, book, cancel, lookup };
}
