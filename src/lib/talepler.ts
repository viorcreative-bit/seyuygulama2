import { supabase } from './supabase';

export type Durum = 'bekliyor' | 'kabul' | 'red' | 'tamamlandi' | 'iptal';

export const DURUM_ADI: Record<Durum, string> = {
  bekliyor: 'Bekliyor',
  kabul: 'Kabul edildi',
  red: 'Reddedildi',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal edildi',
};

export type Talep = {
  id: string;
  asci_id: string;
  semt: string;
  tarih: string;
  kisi_sayisi: number;
  durum: Durum;
  olusturma_tarihi: string;
  /** Açık talepte seçilen teklifin fiyatı (doğrudan taleplerde boş). */
  teklif_fiyati: number | null;
};

// Rakam yazdıkça "gg.aa.yyyy" biçimine çevirir.
export function tarihYazimi(girdi: string): string {
  const r = girdi.replace(/\D/g, '').slice(0, 8);
  if (r.length <= 2) return r;
  if (r.length <= 4) return `${r.slice(0, 2)}.${r.slice(2)}`;
  return `${r.slice(0, 2)}.${r.slice(2, 4)}.${r.slice(4)}`;
}

// Rakam yazdıkça "ss:dd" biçimine çevirir.
export function saatYazimi(girdi: string): string {
  const r = girdi.replace(/\D/g, '').slice(0, 4);
  return r.length <= 2 ? r : `${r.slice(0, 2)}:${r.slice(2)}`;
}

// "gg.aa.yyyy" + "ss:dd" (Türkiye saati, UTC+3) -> Date. Geçersizse null.
export function tarihSaatCoz(tarih: string, saat: string): Date | null {
  const t = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(tarih);
  const s = /^(\d{2}):(\d{2})$/.exec(saat);
  if (!t || !s) return null;
  const [gun, ay, yil, sa, dk] = [t[1], t[2], t[3], s[1], s[2]].map(Number);
  if (ay < 1 || ay > 12 || gun < 1 || sa > 23 || dk > 59) return null;
  const d = new Date(Date.UTC(yil, ay - 1, gun, sa - 3, dk));
  const turkiye = new Date(d.getTime() + 3 * 3600 * 1000);
  if (turkiye.getUTCDate() !== gun || turkiye.getUTCMonth() !== ay - 1) return null; // örn. 31.02
  return d;
}

// ISO tarihi "gg.aa.yyyy" (Türkiye saati) biçiminde yazar.
export function tarihYaz(iso: string): string {
  return tarihSaatYaz(iso).slice(0, 10);
}

const iki = (n: number) => String(n).padStart(2, '0');

// ISO tarihi "gg.aa.yyyy ss:dd" (Türkiye saati) biçiminde yazar.
export function tarihSaatYaz(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000);
  return `${iki(d.getUTCDate())}.${iki(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${iki(d.getUTCHours())}:${iki(d.getUTCMinutes())}`;
}

export type TalepGirdisi = {
  asciId: string;
  semt: string;
  adres: string;
  tarih: Date;
  kisi: number;
  mutfak: string[];
  yemekler: string;
  alerjiler: string;
  notlar: string;
};

export async function talepOlustur(g: TalepGirdisi) {
  const { error } = await supabase.rpc('talep_olustur', {
    p_asci_id: g.asciId,
    p_semt: g.semt,
    p_adres: g.adres,
    p_tarih: g.tarih.toISOString(),
    p_kisi: g.kisi,
    p_mutfak: g.mutfak,
    p_yemekler: g.yemekler,
    p_alerjiler: g.alerjiler,
    p_notlar: g.notlar,
  });
  if (error) throw error;
}

export async function taleplerim(): Promise<Talep[]> {
  const { data, error } = await supabase
    .from('talepler')
    .select('id, asci_id, semt, tarih, kisi_sayisi, durum, olusturma_tarihi, teklif_fiyati')
    .order('olusturma_tarihi', { ascending: false });
  if (error) throw error;
  return (data as Talep[]) ?? [];
}

export async function talebiIptalEt(id: string) {
  const { error } = await supabase.from('talepler').update({ durum: 'iptal' }).eq('id', id);
  if (error) throw error;
}

export type GelenTalep = {
  id: string;
  musteri_ad: string;
  semt: string;
  tarih: string;
  kisi_sayisi: number;
  mutfak_tercihleri: string[];
  istenen_yemekler: string;
  alerjiler: string;
  notlar: string;
  durum: Durum;
  adres: string | null;
  teklif_fiyati: number | null;
};

export async function gelenTalepler(): Promise<GelenTalep[]> {
  const { data, error } = await supabase
    .from('asci_talepleri')
    .select('*')
    .order('tarih', { ascending: true });
  if (error) throw error;
  return (data as GelenTalep[]) ?? [];
}

export async function bekleyenTalepSayisi(): Promise<number> {
  const { count } = await supabase
    .from('asci_talepleri')
    .select('id', { count: 'exact', head: true })
    .eq('durum', 'bekliyor');
  return count ?? 0;
}

export async function durumDegistir(id: string, durum: 'kabul' | 'red' | 'tamamlandi') {
  const { error } = await supabase.from('talepler').update({ durum }).eq('id', id);
  if (error) throw error;
}
