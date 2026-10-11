import { supabase } from './supabase';

export type SohbetOzeti = {
  id: string;
  diger_id: string;
  diger_ad: string;
  diger_foto: string | null;
  son_mesaj: string | null;
  son_mesaj_tarihi: string | null;
  okunmamis: number;
  olusturma_tarihi: string;
};

export type Mesaj = { id: string; sohbet_id: string; gonderen_id: string; metin: string; olusturma_tarihi: string; okundu_tarihi: string | null };

export async function sohbetler(): Promise<SohbetOzeti[]> {
  const { data, error } = await supabase.from('sohbet_listesi').select('*');
  if (error) throw error;
  const l = (data as SohbetOzeti[]) ?? [];
  // Mesajı olanlar en yeni mesaja göre, boş sohbetler sonda.
  return l.sort((a, b) => (b.son_mesaj_tarihi ?? b.olusturma_tarihi).localeCompare(a.son_mesaj_tarihi ?? a.olusturma_tarihi));
}

export async function sohbetBilgisi(id: string): Promise<SohbetOzeti | null> {
  const { data } = await supabase.from('sohbet_listesi').select('*').eq('id', id).maybeSingle();
  return (data as SohbetOzeti | null) ?? null;
}

// En yeni 100 mesaj (yeniden eskiye).
export async function mesajlar(sohbetId: string): Promise<Mesaj[]> {
  const { data, error } = await supabase
    .from('mesajlar')
    .select('id, sohbet_id, gonderen_id, metin, olusturma_tarihi, okundu_tarihi')
    .eq('sohbet_id', sohbetId)
    .order('olusturma_tarihi', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as Mesaj[]) ?? [];
}

export async function mesajGonder(sohbetId: string, metin: string) {
  const { error } = await supabase.from('mesajlar').insert({ sohbet_id: sohbetId, metin });
  if (error) throw error;
}

export async function okunduIsaretle(sohbetId: string) {
  await supabase.rpc('sohbet_okundu', { p_sohbet: sohbetId });
}

export async function okunmamisSayisi(): Promise<number> {
  try {
    return (await sohbetler()).reduce((t, s) => t + s.okunmamis, 0);
  } catch {
    return 0;
  }
}

const baslat = async (ad: string, arg: Record<string, string>): Promise<string> => {
  const { data, error } = await supabase.rpc(ad, arg);
  if (error) throw error;
  return data as string;
};

/** Doğrudan talep üzerinden sohbet açar (müşteri veya aşçı). Sohbet kimliğini döner. */
export const talepSohbeti = (talepId: string) => baslat('sohbet_baslat_talep', { p_talep: talepId });
/** Açık talebe verilen teklif üzerinden sohbet açar. */
export const teklifSohbeti = (teklifId: string) => baslat('sohbet_baslat_teklif', { p_teklif: teklifId });
/** Kurumsal talebe verilen teklif üzerinden sohbet açar. */
export const kurumsalSohbeti = (teklifId: string) => baslat('sohbet_baslat_kurumsal', { p_teklif: teklifId });
