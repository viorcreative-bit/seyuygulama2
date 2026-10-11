export type Asci = {
  id: string;
  ad: string;
  uzmanlik: string;
  puan: number | null;
  yorumSayisi: number;
  foto?: string | null;
};

// Geçici örnek veriler. 9. aşamada Supabase'den gelen gerçek verilerle değişecek.
export const ornekAscilar: Asci[] = [
  { id: '1', ad: 'Ayşe Demir', uzmanlik: 'Ege mutfağı', puan: 4.9, yorumSayisi: 42 },
  { id: '2', ad: 'Fatma Yılmaz', uzmanlik: 'Türk mutfağı', puan: 4.8, yorumSayisi: 35 },
  { id: '3', ad: 'Mehmet Kaya', uzmanlik: 'Antep mutfağı', puan: 4.8, yorumSayisi: 28 },
  { id: '4', ad: 'Zeynep Arslan', uzmanlik: 'Diyet ve vegan', puan: 4.7, yorumSayisi: 19 },
  { id: '5', ad: 'Hasan Çelik', uzmanlik: 'Çocuk yemekleri', puan: 4.6, yorumSayisi: 11 },
];

export const EN_AZ_YORUM = 3;

export function enSevilenAscilar(liste: Asci[]): Asci[] {
  return liste
    .filter((a) => a.yorumSayisi >= EN_AZ_YORUM)
    .sort((a, b) => (b.puan ?? 0) - (a.puan ?? 0) || b.yorumSayisi - a.yorumSayisi);
}
