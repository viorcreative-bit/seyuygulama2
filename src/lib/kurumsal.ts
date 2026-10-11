import { supabase } from './supabase';

export type Tekrar = 'tek_sefer' | 'gunluk' | 'haftalik';
export type Ogun = 'kahvalti' | 'ogle' | 'aksam' | 'ikram';
export type KurumsalDurum = 'acik' | 'secildi' | 'tamamlandi' | 'iptal';
export type TeklifDurum = 'bekliyor' | 'kabul' | 'red';

export const TEKRAR_ADI: Record<Tekrar, string> = { tek_sefer: 'Tek sefer', gunluk: 'Her gün', haftalik: 'Haftada bir' };
export const OGUN_ADI: Record<Ogun, string> = { kahvalti: 'Kahvaltı', ogle: 'Öğle yemeği', aksam: 'Akşam yemeği', ikram: 'İkram / kokteyl' };
export const KURUMSAL_DURUM_ADI: Record<KurumsalDurum, string> = {
  acik: 'Teklifler toplanıyor',
  secildi: 'Aşçı seçildi',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal edildi',
};

export type KurumsalTalep = {
  id: string;
  sirket_adi: string;
  semt: string;
  baslangic_tarihi: string;
  tekrar: Tekrar;
  tekrar_sayisi: number;
  ogun: Ogun;
  kisi_sayisi: number;
  butce_kisi_basi: number | null;
  mutfak_tercihleri: string[];
  diyet_notlari: string;
  notlar: string;
  son_teklif_tarihi: string;
  durum: KurumsalDurum;
  secilen_teklif_id: string | null;
  olusturma_tarihi: string;
};

export type KurumsalTeklif = {
  id: string;
  talep_id: string;
  asci_id: string;
  asci_ad: string;
  asci_foto: string | null;
  ortalama_puan: number | null;
  yorum_sayisi: number;
  kisi_basi_fiyat: number;
  mesaj: string;
  durum: TeklifDurum;
  olusturma_tarihi: string;
  guncelleme_tarihi: string;
};

export type Iletisim = { adres: string; yetkili_ad: string; yetkili_telefon: string };

const iki = (n: number) => String(n);

/** Tekrar bilgisini okunur yazar: "5 gün boyunca her gün" gibi. */
export function tekrarYazisi(t: Pick<KurumsalTalep, 'tekrar' | 'tekrar_sayisi'>): string {
  if (t.tekrar === 'tek_sefer') return 'Tek sefer';
  return t.tekrar === 'gunluk' ? `${iki(t.tekrar_sayisi)} gün, her gün` : `${iki(t.tekrar_sayisi)} hafta, haftada bir`;
}

/** Toplam hizmet adedi (öğün sayısı): kişi sayısı çarpı tekrar. */
export const toplamFiyat = (kisiBasi: number, t: Pick<KurumsalTalep, 'kisi_sayisi' | 'tekrar_sayisi'>) =>
  kisiBasi * t.kisi_sayisi * t.tekrar_sayisi;

/** Son hizmet günü (tamamlandı yapılabilecek en erken zaman). */
export function sonHizmetGunu(t: Pick<KurumsalTalep, 'baslangic_tarihi' | 'tekrar' | 'tekrar_sayisi'>): Date {
  const d = new Date(t.baslangic_tarihi);
  const gun = t.tekrar === 'gunluk' ? t.tekrar_sayisi - 1 : t.tekrar === 'haftalik' ? (t.tekrar_sayisi - 1) * 7 : 0;
  return new Date(d.getTime() + gun * 86400000);
}

export type TalepGirdisi = {
  sirket: string; yetkili: string; telefon: string; semt: string; adres: string;
  baslangic: Date; tekrar: Tekrar; tekrarSayisi: number; ogun: Ogun; kisi: number;
  butce: number | null; mutfak: string[]; diyet: string; notlar: string;
};

export async function kurumsalTalepOlustur(g: TalepGirdisi): Promise<string> {
  const { data, error } = await supabase.rpc('kurumsal_talep_olustur', {
    p_sirket: g.sirket, p_yetkili: g.yetkili, p_telefon: g.telefon, p_semt: g.semt, p_adres: g.adres,
    p_baslangic: g.baslangic.toISOString(), p_tekrar: g.tekrar, p_tekrar_sayisi: g.tekrarSayisi, p_ogun: g.ogun,
    p_kisi: g.kisi, p_butce: g.butce, p_mutfak: g.mutfak, p_diyet: g.diyet, p_notlar: g.notlar,
  });
  if (error) throw error;
  return data as string;
}

const KOLONLAR =
  'id, sirket_adi, semt, baslangic_tarihi, tekrar, tekrar_sayisi, ogun, kisi_sayisi, butce_kisi_basi, mutfak_tercihleri, diyet_notlari, notlar, son_teklif_tarihi, durum, secilen_teklif_id, olusturma_tarihi';

export type OzetliTalep = KurumsalTalep & { teklifSayisi: number };

// Şirketin kendi kurumsal talepleri ve her birine gelen teklif sayısı.
export async function kurumsalTaleplerim(kullaniciId: string): Promise<OzetliTalep[]> {
  const [t, te] = await Promise.all([
    supabase.from('kurumsal_talepler').select(KOLONLAR).eq('musteri_id', kullaniciId).order('olusturma_tarihi', { ascending: false }),
    supabase.from('kurumsal_teklif_listesi').select('talep_id'),
  ]);
  if (t.error) throw t.error;
  const sayilar: Record<string, number> = {};
  for (const x of (te.data ?? []) as { talep_id: string }[]) sayilar[x.talep_id] = (sayilar[x.talep_id] ?? 0) + 1;
  return ((t.data as KurumsalTalep[]) ?? []).map((x) => ({ ...x, teklifSayisi: sayilar[x.id] ?? 0 }));
}

export async function kurumsalTalepGetir(id: string): Promise<KurumsalTalep | null> {
  const { data, error } = await supabase.from('kurumsal_talepler').select(KOLONLAR).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as KurumsalTalep | null) ?? null;
}

export async function kurumsalTeklifleri(talepId: string): Promise<KurumsalTeklif[]> {
  const { data, error } = await supabase
    .from('kurumsal_teklif_listesi')
    .select('*')
    .eq('talep_id', talepId)
    .order('kisi_basi_fiyat', { ascending: true });
  if (error) throw error;
  return (data as KurumsalTeklif[]) ?? [];
}

export async function kurumsalIletisim(talepId: string): Promise<Iletisim | null> {
  const { data } = await supabase.from('kurumsal_iletisim').select('adres, yetkili_ad, yetkili_telefon').eq('talep_id', talepId).maybeSingle();
  return (data as Iletisim | null) ?? null;
}

export type Firsat = KurumsalTalep & { benimTeklifim: KurumsalTeklif | null };

// Aşçının görebildiği kurumsal talepler (açık fırsatlar + teklif verdikleri) ve kendi teklifleri.
export async function kurumsalFirsatlar(asciId: string): Promise<Firsat[]> {
  const [t, te] = await Promise.all([
    supabase.from('kurumsal_talepler').select(KOLONLAR).order('baslangic_tarihi', { ascending: true }),
    supabase.from('kurumsal_teklif_listesi').select('*').eq('asci_id', asciId),
  ]);
  if (t.error) throw t.error;
  const benim: Record<string, KurumsalTeklif> = {};
  for (const x of (te.data ?? []) as KurumsalTeklif[]) benim[x.talep_id] = x;
  return ((t.data as KurumsalTalep[]) ?? []).map((x) => ({ ...x, benimTeklifim: benim[x.id] ?? null }));
}

// Henüz teklif vermediğin açık fırsatların sayısı (alt menüdeki rozet için).
export async function yeniFirsatSayisi(asciId: string): Promise<number> {
  try {
    const l = await kurumsalFirsatlar(asciId);
    return l.filter((f) => f.durum === 'acik' && !f.benimTeklifim && new Date(f.son_teklif_tarihi) > new Date()).length;
  } catch {
    return 0;
  }
}

const rpc = async (ad: string, arg: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(ad, arg);
  if (error) throw error;
  return data;
};

export const teklifVer = (talepId: string, fiyat: number, mesaj: string) =>
  rpc('kurumsal_teklif_ver', { p_talep: talepId, p_fiyat: fiyat, p_mesaj: mesaj });
export const teklifGeriCek = (teklifId: string) => rpc('kurumsal_teklif_geri_cek', { p_teklif: teklifId });
export const teklifSec = (teklifId: string) => rpc('kurumsal_teklif_sec', { p_teklif: teklifId });
export const kurumsalTalepIptal = (talepId: string) => rpc('kurumsal_talep_iptal', { p_talep: talepId });
export const kurumsalTalepTamamla = (talepId: string) => rpc('kurumsal_talep_tamamla', { p_talep: talepId });
