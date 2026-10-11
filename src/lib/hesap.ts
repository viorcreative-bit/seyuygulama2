import { supabase } from './supabase';

export class AktifTalepVar extends Error {}

// Kullanıcı kendi hesabını ve verilerini siler.
// Sıra önemli: önce kontrol, sonra dosyalar (hesap silinince yetki gider), sonra hesap.
export async function hesabiSil(kullaniciId: string) {
  const { data: engel } = await supabase.rpc('hesap_silme_engeli');
  if (engel) throw new AktifTalepVar();

  const depo = supabase.storage.from('fotograflar');
  const { data: dosyalar } = await depo.list(kullaniciId, { limit: 1000 });
  if (dosyalar && dosyalar.length > 0) {
    await depo.remove(dosyalar.map((d) => `${kullaniciId}/${d.name}`));
  }

  const { error } = await supabase.rpc('hesabi_sil');
  if (error) {
    if (/Devam eden talep/i.test(error.message)) throw new AktifTalepVar();
    throw error;
  }
  await supabase.auth.signOut();
}
