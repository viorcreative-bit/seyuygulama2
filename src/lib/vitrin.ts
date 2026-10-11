import { Asci } from '../data/ornekAscilar';
import { supabase } from './supabase';

export type Vitrin = {
  id: string;
  ad: string;
  fotograf: string | null;
  tanitim: string;
  uzmanliklar: string[];
  semtler: string[];
  baslangic_fiyati: number | null;
  musait_gunler: string[];
};

export const tl = (n: number) => `${n.toLocaleString('tr-TR')} TL`;

export function vitrindenKarta(v: Vitrin): Asci {
  return {
    id: v.id,
    ad: v.ad,
    uzmanlik: v.uzmanliklar.slice(0, 2).join(', ') || 'Aşçı',
    puan: null, // Yorumlar 8. aşamada gelecek
    yorumSayisi: 0,
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
