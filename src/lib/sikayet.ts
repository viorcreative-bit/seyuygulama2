import { supabase } from './supabase';

export async function sikayetGonder(talepId: string, kullaniciId: string, aciklama: string) {
  const { error } = await supabase
    .from('sikayetler')
    .insert({ talep_id: talepId, sikayet_eden_id: kullaniciId, aciklama });
  if (error) throw error;
}
