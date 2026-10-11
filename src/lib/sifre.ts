export const EN_AZ_SIFRE = 8;

// Geçerliyse null, değilse kullanıcıya gösterilecek hata metni döner.
export function sifreKontrol(sifre: string, tekrar?: string): string | null {
  if (sifre.length < EN_AZ_SIFRE) return `Şifre en az ${EN_AZ_SIFRE} karakter olmalı.`;
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(sifre) || !/\d/.test(sifre)) return 'Şifre en az bir harf ve bir rakam içermeli.';
  if (tekrar !== undefined && sifre !== tekrar) return 'Şifreler birbiriyle aynı değil.';
  return null;
}
