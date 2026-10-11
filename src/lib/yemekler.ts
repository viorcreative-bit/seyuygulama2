import { supabase } from './supabase';

export type Yemek = { id: string; ad: string; malzemeler: string; sira: number };

// "domates, biber\nsoğan" gibi yazılmış malzeme metnini listeye çevirir.
export const malzemeListesi = (metin: string): string[] =>
  metin.split(/[,\n]/).map((m) => m.trim()).filter(Boolean);

export async function asciYemekleri(asciId: string): Promise<Yemek[]> {
  const { data, error } = await supabase
    .from('asci_yemekleri')
    .select('id, ad, malzemeler, sira')
    .eq('asci_id', asciId)
    .order('sira')
    .order('olusturma_tarihi');
  if (error) throw error;
  return (data as Yemek[]) ?? [];
}
