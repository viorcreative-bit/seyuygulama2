import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

// Galeriden bir fotoğraf seçtirir, Supabase'e yükler ve herkese açık adresini döner.
// İptal edilirse veya izin verilmezse null döner.
export async function fotografSecVeYukle(uid: string, kare: boolean): Promise<string | null> {
  const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!izin.granted) throw new Error('izin');

  const sonuc = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: kare,
    aspect: kare ? [1, 1] : undefined,
    quality: 0.6,
    base64: true,
  });
  if (sonuc.canceled || !sonuc.assets[0]?.base64) return null;

  const yol = `${uid}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('fotograflar')
    .upload(yol, decode(sonuc.assets[0].base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('fotograflar').getPublicUrl(yol).data.publicUrl;
}
