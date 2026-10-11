import veri from './metinler.json';

export type YasalAnahtar = 'kvkk' | 'gizlilik' | 'kosullar';

type Bolum = { baslik: string; metin: string };
export type YasalBelge = { baslik: string; guncelleme: string; bolumler: Bolum[] };

/** Kullanıcının kabul ettiği metin sürümü. Metinler değişince metinler.json'daki "surum" güncellenir. */
export const YASAL_SURUMU: string = veri.surum;

const bilgiler = veri.bilgiler as Record<string, string>;
const doldur = (m: string) => m.replace(/\{\{(\w+)\}\}/g, (_, k: string) => bilgiler[k] ?? '');

export function yasalBelge(anahtar: YasalAnahtar): YasalBelge {
  const b = veri.belgeler[anahtar];
  return {
    baslik: b.baslik,
    guncelleme: b.guncelleme,
    bolumler: b.bolumler.map((x) => ({ baslik: x.baslik, metin: doldur(x.metin) })),
  };
}

export const YASAL_ADLARI: Record<YasalAnahtar, string> = {
  kvkk: 'KVKK Aydınlatma Metni',
  gizlilik: 'Gizlilik Politikası',
  kosullar: 'Kullanım Koşulları',
};
