// Aşçım Gelsin tasarım dili: koyu bordo zemin, sarı vurgu, kırmızı marka rengi.
// Hiçbir ekranda renk kodunu elle yazma; hepsi buradan gelir.
export const colors = {
  // Zemin ve yüzeyler
  zemin: '#160606',
  zeminUst: '#2B0B0B',
  yuzey: '#2A1010',
  yuzeyUst: '#3A1818',
  cizgi: '#4D2626',
  // Metin
  metin: '#FFF8E7',
  metinSoluk: '#BFA99A',
  koyuMetin: '#2B1A12',
  // Marka
  kirmizi: '#A30909',
  kirmiziAcik: '#FF6B5E',
  sari: '#FEC010',
  siyah: '#000000',
} as const;

export const spacing = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
export const radius = { s: 12, m: 20, l: 28, tam: 999 } as const;
export const fontSize = { kucuk: 14, normal: 16, baslik: 22, buyuk: 28 } as const;
