import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import SifreGirdisi from '../components/SifreGirdisi';
import { AktifTalepVar, hesabiSil } from '../lib/hesap';
import { sebep } from '../lib/hata';
import { supabase } from '../lib/supabase';
import { colors, fontSize, radius, spacing } from '../theme';

// Hesabı ve tüm verileri kalıcı olarak silme. Şifre doğrulanır ve son bir onay istenir.
export default function HesabiSil({ geri }: { geri: () => void }) {
  const { oturum } = useAuth();
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const sil = async () => {
    const telefon = oturum?.user.phone;
    if (!oturum || !telefon) return setHata('Telefon numaran bulunamadı. Lütfen çıkış yapıp tekrar gir.');
    setHata('');
    setYukleniyor(true);
    const kontrol = await supabase.auth.signInWithPassword({ phone: `+${telefon.replace(/^\+/, '')}`, password: sifre });
    if (kontrol.error) {
      setYukleniyor(false);
      return setHata('Şifren hatalı.');
    }
    Alert.alert('Son onay', 'Hesabın ve tüm verilerin kalıcı olarak silinecek. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel', onPress: () => setYukleniyor(false) },
      {
        text: 'Hesabımı Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await hesabiSil(oturum.user.id);
            // Oturum kapanınca uygulama otomatik olarak karşılama ekranına döner.
          } catch (e) {
            setYukleniyor(false);
            setHata(
              e instanceof AktifTalepVar
                ? 'Devam eden (bekleyen veya kabul edilmiş) talebin var. Hesabı silmeden önce onları sonuçlandır veya iptal et.'
                : `Hesap silinemedi. Lütfen tekrar dene.${sebep(e)}`,
            );
          }
        },
      },
    ]);
  };

  return (
    <Ekran baslik="Hesabımı Sil" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <View style={styles.uyari}>
            <Ionicons name="warning" size={26} color={colors.kirmiziAcik} />
            <Text style={styles.uyariYazi}>
              Hesabını silersen şunlar kalıcı olarak silinir: profilin ve fotoğrafların, tüm taleplerin, yazdığın veya aldığın yorumlar ve şikayetlerin. Bu işlem geri alınamaz.
            </Text>
          </View>
          <Text style={styles.ipucu}>
            Devam eden (bekleyen veya kabul edilmiş) talebin varsa hesabı silemezsin; önce onları sonuçlandır veya iptal et.
          </Text>
          <SifreGirdisi deger={sifre} degisti={setSifre} placeholder="Şifreni yaz" />
          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          <Dugme yazi="Hesabımı Kalıcı Olarak Sil" tehlike onPress={sil} yukleniyor={yukleniyor} pasif={!sifre} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, gap: spacing.m },
  uyari: {
    flexDirection: 'row',
    gap: spacing.m,
    alignItems: 'flex-start',
    backgroundColor: colors.yuzey,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.kirmiziAcik,
    padding: spacing.m,
  },
  uyariYazi: { flex: 1, color: colors.metin, fontSize: fontSize.normal, lineHeight: 23 },
  ipucu: { color: colors.metinSoluk, fontSize: fontSize.kucuk + 1, lineHeight: 21 },
  hata: { color: colors.kirmiziAcik, fontWeight: '600', fontSize: fontSize.kucuk + 1 },
});
