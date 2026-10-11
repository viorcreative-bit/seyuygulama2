import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AvatarSecici from '../components/AvatarSecici';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import { AVATARLAR } from '../data/avatarlar';
import { hazirResmiYukle } from '../lib/fotograf';
import { supabase } from '../lib/supabase';
import { colors, fontSize, spacing } from '../theme';

type Props = {
  /** Verilirse üstte geri düğmesi çıkar (Hesabım'dan açıldığında). */
  geri?: () => void;
  /** Avatar kaydedildiğinde çağrılır. */
  bitti: () => void;
  /** Verilirse "Şimdilik geç" bağlantısı çıkar (profil fotoğrafı olmayan mevcut üyeler için). */
  atla?: () => void;
};

// Profil fotoğrafı olmayan (veya avatarını değiştirmek isteyen) üyelerin avatar seçtiği ekran.
export default function AvatarSec({ geri, bitti, atla }: Props) {
  const { oturum, profilYenile } = useAuth();
  const [secili, setSecili] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kaydet = async () => {
    const a = AVATARLAR.find((x) => x.anahtar === secili);
    if (!a || !oturum) return;
    setKaydediliyor(true);
    try {
      const adres = await hazirResmiYukle(oturum.user.id, a.kaynak as number);
      const { error } = await supabase.from('profiles').update({ fotograf: adres }).eq('id', oturum.user.id);
      if (error) throw error;
      await profilYenile();
      bitti();
    } catch {
      Alert.alert('Kaydedilemedi', 'İnternetini kontrol edip tekrar dene.');
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Ekran baslik="Avatarım" geri={geri}>
      <ScrollView contentContainerStyle={styles.icerik}>
        <Text style={styles.giris}>Profilinde görünecek bir avatar seç. İstersen sonra Hesabım'dan değiştirebilirsin.</Text>
        <AvatarSecici secili={secili} degisti={setSecili} />
        <Dugme yazi="Avatarı Kaydet" onPress={kaydet} yukleniyor={kaydediliyor} pasif={!secili} />
        {atla ? <Dugme yazi="Şimdilik geç" ikincil onPress={atla} /> : null}
      </ScrollView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, gap: spacing.l, paddingBottom: 60 },
  giris: { fontSize: fontSize.normal, color: colors.metinSoluk, lineHeight: 22 },
});
