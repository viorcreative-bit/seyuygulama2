import { supabase } from './supabase';

export type Yorum = {
  id: string;
  asci_id: string;
  musteri_ad: string;
  yildiz: number;
  yorum: string;
  asci_cevabi: string | null;
  cevap_tarihi: string | null;
  olusturma_tarihi: string;
};

export async function asciYorumlari(asciId: string): Promise<Yorum[]> {
  const { data, error } = await supabase
    .from('yorum_listesi')
    .select('*')
    .eq('asci_id', asciId)
    .order('olusturma_tarihi', { ascending: false });
  if (error) throw error;
  return (data as Yorum[]) ?? [];
}

export async function yorumEkle(g: { talepId: string; musteriId: string; asciId: string; yildiz: number; yorum: string }) {
  const { error } = await supabase.from('yorumlar').insert({
    talep_id: g.talepId,
    musteri_id: g.musteriId,
    asci_id: g.asciId,
    yildiz: g.yildiz,
    yorum: g.yorum,
  });
  if (error) throw error;
}

export async function cevapYaz(yorumId: string, metin: string) {
  const { error } = await supabase.from('yorumlar').update({ asci_cevabi: metin }).eq('id', yorumId);
  if (error) throw error;
}

// Verilen taleplerden hangilerine yorum yazılmış? (talep_id -> yıldız)
export async function yorumYazilanTalepler(talepIdleri: string[]): Promise<Record<string, number>> {
  if (talepIdleri.length === 0) return {};
  const { data } = await supabase.from('yorumlar').select('talep_id, yildiz').in('talep_id', talepIdleri);
  return Object.fromEntries((data ?? []).map((y: { talep_id: string; yildiz: number }) => [y.talep_id, y.yildiz]));
}
