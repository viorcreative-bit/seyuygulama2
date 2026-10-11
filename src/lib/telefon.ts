// Kullanıcının yazdığı numarayı +90 5XX XXX XX XX biçimine çevirir.
// Geçersizse null döner.
export function telefonuDuzenle(girdi: string): string | null {
  let s = girdi.replace(/\D/g, '');
  if (s.startsWith('90') && s.length === 12) s = s.slice(2);
  if (s.startsWith('0') && s.length === 11) s = s.slice(1);
  if (s.length !== 10 || !s.startsWith('5')) return null;
  return `+90${s}`;
}

// "+905551112233" -> "+90 555 111 22 33" (gösterim için).
export function telefonuGoster(t: string): string {
  const s = t.replace(/\D/g, '');
  if (s.length !== 12 || !s.startsWith('90')) return t;
  return `+90 ${s.slice(2, 5)} ${s.slice(5, 8)} ${s.slice(8, 10)} ${s.slice(10)}`;
}
