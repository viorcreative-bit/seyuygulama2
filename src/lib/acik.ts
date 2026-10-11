import { TeklifDurum } from './kurumsal';
import { supabase } from './supabase';

export type AcikDurum = 'acik' | 'secildi' | 'iptal';

export const ACIK_DURUM_ADI: Record<AcikDurum, string> = {
  acik: 'Teklifler toplanıyor',
  secildi: 'Aşçı seçildi',
  iptal: 'İptal edildi',
};

export type AcikTalep = {
  id: string;
  semt: string;
  tarih: string;
  kisi_sayisi: number;
  mutfak_tercihleri: string[];
  istenen_yemekler: string;
  alerjiler: string;
  notlar: string;
  durum: AcikDurum;
  secilen_teklif_id: string | null;
  talep_id: string | null;
  olusturma_tarihi: string;
};

export type AcikTeklif = {
  id: string;
  talep_id: string;
  asci_id: string;
  asci_ad: string;
  asci_foto: string | null;
  ortalama_puan: number | null;
  yorum_sayisi: number;
  fiyat: number;
  mesaj: string;
  durum: TeklifDurum;
  olusturma_tarihi: string;
};

const KOLONLAR =
  'id, semt, tarih, kisi_sayisi, mutfak_tercihleri, istenen_yemekler, alerjiler, notlar, durum, secilen_teklif_id, talep_id, olusturma_tarihi';

export type AcikGirdi = {
  semt: string; adres: string; tarih: Date; kisi: number; mutfak: string[]; yemekler: string; alerjiler: string; notlar: string;
};

export async function acikTalepOlustur(g: AcikGirdi): Promise<string> {
  const { data, error } = await supabase.rpc('acik_talep_olustur', {
    p_semt: g.semt, p_adres: g.adres, p_tarih: g.tarih.toISOString(), p_kisi: g.kisi,
    p_mutfak: g.mutfak, p_yemekler: g.yemekler, p_alerjiler: g.alerjiler, p_notlar: g.notlar,
  });
  if (error) throw error;
  return data as string;
}

export type OzetliAcik = AcikTalep & { teklifSayisi: number };

// Müşterinin kendi açık talepleri ve her birine gelen teklif sayısı.
export async function acikTaleplerim(kullaniciId: string): Promise<OzetliAcik[]> {
  const [t, te] = await Promise.all([
    supabase.from('acik_talepler').select(KOLONLAR).eq('musteri_id', kullaniciId).order('olusturma_tarihi', { ascending: false }),
    supabase.from('acik_teklif_listesi').select('talep_id'),
  ]);
  if (t.error) throw t.error;
  const sayilar: Record<string, number> = {};
  for (const x of (te.data ?? []) as { talep_id: string }[]) sayilar[x.talep_id] = (sayilar[x.talep_id] ?? 0) + 1;
  return ((t.data as AcikTalep[]) ?? []).map((x) => ({ ...x, teklifSayisi: sayilar[x.id] ?? 0 }));
}

export async function acikTalepGetir(id: string): Promise<AcikTalep | null> {
  const { data, error } = await supabase.from('acik_talepler').select(KOLONLAR).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as AcikTalep | null) ?? null;
}

export async function acikTeklifleri(talepId: string): Promise<AcikTeklif[]> {
  const { data, error } = await supabase
    .from('acik_teklif_listesi')
    .select('*')
    .eq('talep_id', talepId)
    .order('fiyat', { ascending: true });
  if (error) throw error;
  return (data as AcikTeklif[]) ?? [];
}

export type AcikFirsat = AcikTalep & { benimTeklifim: AcikTeklif | null };

// Aşçının görebildiği açık talepler (teklif verebildikleri + teklif verdikleri) ve kendi teklifleri.
export async function acikFirsatlar(asciId: string): Promise<AcikFirsat[]> {
  const [t, te] = await Promise.all([
    supabase.from('acik_talepler').select(KOLONLAR).order('tarih', { ascending: true }),
    supabase.from('acik_teklif_listesi').select('*').eq('asci_id', asciId),
  ]);
  if (t.error) throw t.error;
  const benim: Record<string, AcikTeklif> = {};
  for (const x of (te.data ?? []) as AcikTeklif[]) benim[x.talep_id] = x;
  return ((t.data as AcikTalep[]) ?? []).map((x) => ({ ...x, benimTeklifim: benim[x.id] ?? null }));
}

// Henüz teklif vermediğin açık taleplerin sayısı (rozet için).
export async function yeniAcikSayisi(asciId: string): Promise<number> {
  try {
    const l = await acikFirsatlar(asciId);
    return l.filter((f) => f.durum === 'acik' && !f.benimTeklifim && new Date(f.tarih) > new Date()).length;
  } catch {
    return 0;
  }
}

const rpc = async (ad: string, arg: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(ad, arg);
  if (error) throw error;
  return data;
};

export const acikTeklifVer = (talepId: string, fiyat: number, mesaj: string) =>
  rpc('acik_teklif_ver', { p_talep: talepId, p_fiyat: fiyat, p_mesaj: mesaj });
export const acikTeklifGeriCek = (teklifId: string) => rpc('acik_teklif_geri_cek', { p_teklif: teklifId });
export const acikTeklifSec = (teklifId: string) => rpc('acik_teklif_sec', { p_teklif: teklifId });
export const acikTalepIptal = (talepId: string) => rpc('acik_talep_iptal', { p_talep: talepId });
