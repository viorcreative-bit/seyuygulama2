// Randevu talebi yardımcıları: boş gün/saat listesi ve WhatsApp mesajı.
// Sunucu olmadığı için dolu saatler bilinemez; çalışma saatlerine göre seçenek sunulur,
// kesin onayı klinik WhatsApp üzerinden verir.
import { addDays, daysBetween, formatDateTr, fromMinutes, isValidDate, nowIn, toMinutes, weekdayOf, WEEKDAYS_TR } from './time.js';

export function daySlots(clinic, date) {
  const hours = clinic.workingHours?.[weekdayOf(date)];
  if (!hours) return [];
  const step = clinic.appointment?.slotMinutes ?? 30;
  const [open, close] = hours.map(toMinutes);
  const breaks = (clinic.breaks ?? []).map(([s, e]) => [toMinutes(s), toMinutes(e)]);
  const slots = [];
  for (let t = open; t + step <= close; t += step) {
    if (!breaks.some(([s, e]) => t < e && t + step > s)) slots.push(fromMinutes(t));
  }
  return slots;
}

export function dateProblem(clinic, date, now) {
  if (!isValidDate(date)) return 'Geçersiz tarih.';
  const ahead = daysBetween(now.date, date);
  if (ahead < 0) return 'Bu tarih geçmişte kaldı.';
  if (ahead > (clinic.appointment?.maxDaysAhead ?? 30)) return 'Bu tarih randevu takviminin dışında.';
  if ((clinic.closedDates ?? []).includes(date)) return 'Klinik bu tarihte kapalı.';
  if (!clinic.workingHours?.[weekdayOf(date)]) return `Klinik ${WEEKDAYS_TR[weekdayOf(date)]} günleri kapalı.`;
  return null;
}

/** Bir gün için seçilebilecek saatler (bugünse yakın saatler hariç). */
export function availableSlots(clinic, date, now) {
  if (dateProblem(clinic, date, now)) return [];
  const earliest = date === now.date ? now.minutes + (clinic.appointment?.minNoticeMinutes ?? 60) : -1;
  return daySlots(clinic, date).filter((t) => toMinutes(t) >= earliest);
}

function shortLabel(date, now) {
  const d = new Date(`${date}T12:00:00Z`);
  const text = new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'short', weekday: 'short' }).format(d);
  const ahead = daysBetween(now.date, date);
  if (ahead === 0) return `Bugün · ${text}`;
  if (ahead === 1) return `Yarın · ${text}`;
  return text;
}

/** Randevu verilebilen ilk `count` gün. */
export function openDays(clinic, now, count = 8) {
  const days = [];
  const max = clinic.appointment?.maxDaysAhead ?? 30;
  for (let i = 0; i <= max && days.length < count; i++) {
    const date = addDays(now.date, i);
    if (availableSlots(clinic, date, now).length) days.push({ date, label: shortLabel(date, now), long: formatDateTr(date) });
  }
  return days;
}

export function clinicNow(clinic, at = new Date()) {
  return nowIn(clinic.timezone ?? 'Europe/Istanbul', at);
}

/** Telefonu okunaklı hale getirir; geçersizse null. */
export function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  const plus = trimmed.startsWith('+') || trimmed.startsWith('00');
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('00')) digits = digits.slice(2);
  if (!plus) {
    if (digits.length === 11 && digits.startsWith('0')) digits = `90${digits.slice(1)}`;
    else if (digits.length === 10 && /^[2-5]/.test(digits)) digits = `90${digits}`;
  }
  if (digits.startsWith('90') && digits.length !== 12) return null;
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith('90')) {
    const n = digits.slice(2);
    return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
  }
  return `+${digits}`;
}

export function validName(input) {
  const name = String(input ?? '').trim().replace(/\s+/g, ' ');
  return name.length >= 3 && name.length <= 80 && /\p{L}/u.test(name) ? name : null;
}

export function whatsappNumber(clinic) {
  const digits = String(clinic.whatsapp ?? '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function bookingMessage(clinic, req) {
  const lines = [
    `Merhaba, ${clinic.shortName ?? clinic.name} web sitesinden randevu talebi:`,
    `• Hizmet: ${req.service}`,
    `• Tarih: ${formatDateTr(req.date)}`,
    `• Saat: ${req.time}`,
    `• Ad Soyad: ${req.name}`,
    `• Telefon: ${req.phone}`,
  ];
  if (req.note) lines.push(`• Not: ${req.note}`);
  lines.push('Uygunluk durumunu bildirmenizi rica ederim.');
  return lines.join('\n');
}

export function whatsappLink(clinic, req) {
  const number = whatsappNumber(clinic);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(bookingMessage(clinic, req))}`;
}
