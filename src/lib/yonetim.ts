import { supabase } from './supabase';

export type YonetimAsci = {
  id: string;
  ad: string;
  telefon: string | null;
  tanitim: string;
  uzmanliklar: string[];
  semtler: string[];
  baslangic_fiyati: number | null;
  onayli_mi: boolean;
  guncelleme_tarihi: string;
};

export type SikayetDurumu = 'acik' | 'inceleniyor' | 'cozuldu';

export const SIKAYET_DURUMU: Record<SikayetDurumu, string> = {
  acik: 'Açık',
  inceleniyor: 'İnceleniyor',
  cozuldu: 'Çözüldü',
};

export type YonetimSikayet = {
  id: string;
  durum: SikayetDurumu;
  aciklama: string;
  yonetici_notu: string | null;
  olusturma_tarihi: string;
  sikayet_eden_ad: string;
  sikayet_eden_rol: 'musteri' | 'asci';
  karsi_taraf_ad: string;
  talep_tarihi: string;
  talep_semt: string;
};

export async function yonetimAscilari(): Promise<YonetimAsci[]> {
  const { data, error } = await supabase
    .from('yonetici_ascilar')
    .select('*')
    .order('onayli_mi', { ascending: true })
    .order('guncelleme_tarihi', { ascending: false });
  if (error) throw error;
  return (data as YonetimAsci[]) ?? [];
}

export async function asciOnayla(id: string, onayli: boolean) {
  const { error } = await supabase.rpc('asci_onayla', { p_asci_id: id, p_onayli: onayli });
  if (error) throw error;
}

const SIRA: Record<SikayetDurumu, number> = { acik: 0, inceleniyor: 1, cozuldu: 2 };

export async function yonetimSikayetleri(): Promise<YonetimSikayet[]> {
  const { data, error } = await supabase.from('yonetici_sikayetleri').select('*');
  if (error) throw error;
  const l = (data as YonetimSikayet[]) ?? [];
  return l.sort((a, b) => SIRA[a.durum] - SIRA[b.durum] || b.olusturma_tarihi.localeCompare(a.olusturma_tarihi));
}

export async function sikayetGuncelle(id: string, durum: SikayetDurumu, not: string) {
  const { error } = await supabase.rpc('sikayet_guncelle', { p_id: id, p_durum: durum, p_not: not });
  if (error) throw error;
}

export async function sikayetGonder(talepId: string, kullaniciId: string, aciklama: string) {
  const { error } = await supabase
    .from('sikayetler')
    .insert({ talep_id: talepId, sikayet_eden_id: kullaniciId, aciklama });
  if (error) throw error;
}

export async function onayBekleyenAsciSayisi(): Promise<number> {
  const { count } = await supabase
    .from('yonetici_ascilar')
    .select('id', { count: 'exact', head: true })
    .eq('onayli_mi', false);
  return count ?? 0;
}
