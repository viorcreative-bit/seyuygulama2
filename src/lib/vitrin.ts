import { supabase } from './supabase';

// Ana sayfada ve listelerde gösterilen aşçı kartı bilgisi.
export type Asci = {
  id: string;
  ad: string;
  uzmanlik: string;
  puan: number | null;
  yorumSayisi: number;
  foto?: string | null;
};

// "En Sevilen Aşçılar" listesine girmek için gereken en az yorum sayısı.
export const EN_AZ_YORUM = 3;

export type Vitrin = {
  id: string;
  ad: string;
  fotograf: string | null;
  tanitim: string;
  uzmanliklar: string[];
  semtler: string[];
  baslangic_fiyati: number | null;
  musait_gunler: string[];
  ortalama_puan: number | null;
  yorum_sayisi: number;
};

export const tl = (n: number) => `${n.toLocaleString('tr-TR')} TL`;

export function vitrindenKarta(v: Vitrin): Asci {
  return {
    id: v.id,
    ad: v.ad,
    uzmanlik: v.uzmanliklar.slice(0, 2).join(', ') || 'Aşçı',
    puan: v.ortalama_puan != null ? Number(v.ortalama_puan) : null,
    yorumSayisi: v.yorum_sayisi ?? 0,
    foto: v.fotograf,
  };
}

export async function yeniAscilar(): Promise<Vitrin[]> {
  const { data, error } = await supabase
    .from('asci_vitrini')
    .select('*')
    .order('guncelleme_tarihi', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data as Vitrin[]) ?? [];
}

// Ortalama puana göre en sevilen aşçılar (en az EN_AZ_YORUM yorumu olanlar).
export async function enSevilenAscilar(): Promise<Vitrin[]> {
  const { data, error } = await supabase
    .from('asci_vitrini')
    .select('*')
    .gte('yorum_sayisi', EN_AZ_YORUM)
    .order('ortalama_puan', { ascending: false })
    .order('yorum_sayisi', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data as Vitrin[]) ?? [];
}
