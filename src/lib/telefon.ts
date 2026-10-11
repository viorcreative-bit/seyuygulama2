// Kullanıcının yazdığı numarayı +90 5XX XXX XX XX biçimine çevirir.
// Geçersizse null döner.
export function telefonuDuzenle(girdi: string): string | null {
  let s = girdi.replace(/\D/g, '');
  if (s.startsWith('90') && s.length === 12) s = s.slice(2);
  if (s.startsWith('0') && s.length === 11) s = s.slice(1);
  if (s.length !== 10 || !s.startsWith('5')) return null;
  return `+90${s}`;
}
