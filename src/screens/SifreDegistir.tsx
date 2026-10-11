import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import SifreGirdisi from '../components/SifreGirdisi';
import { sifreKontrol } from '../lib/sifre';
import { supabase } from '../lib/supabase';
import { colors, fontSize, spacing } from '../theme';

// Profilden şifre değiştirme: önce mevcut şifre doğrulanır.
export default function SifreDegistir({ geri }: { geri: () => void }) {
  const { oturum } = useAuth();
  const [eski, setEski] = useState('');
  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const kaydet = async () => {
    const telefon = oturum?.user.phone;
    if (!telefon) return setHata('Telefon numaran bulunamadı. Lütfen çıkış yapıp tekrar gir.');
    const h = sifreKontrol(yeni, tekrar);
    if (h) return setHata(h);
    if (yeni === eski) return setHata('Yeni şifren eskisinden farklı olmalı.');

    setHata('');
    setYukleniyor(true);
    // 1) Mevcut şifreyi doğrula (başkası telefonunu eline geçirse bile şifreyi değiştiremesin).
    const kontrol = await supabase.auth.signInWithPassword({ phone: `+${telefon.replace(/^\+/, '')}`, password: eski });
    if (kontrol.error) {
      setYukleniyor(false);
      return setHata('Mevcut şifren hatalı.');
    }
    // 2) Yeni şifreyi kaydet.
    const { error } = await supabase.auth.updateUser({ password: yeni, data: { sifre_var: true } });
    setYukleniyor(false);
    if (error) return setHata(`Şifre değiştirilemedi. (Sebep: ${error.message})`);
    Alert.alert('Şifren değişti', 'Bundan sonra yeni şifrenle giriş yapabilirsin.', [{ text: 'Tamam', onPress: geri }]);
  };

  return (
    <Ekran baslik="Şifremi Değiştir" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <SifreGirdisi deger={eski} degisti={setEski} placeholder="Mevcut şifre" />
          <SifreGirdisi deger={yeni} degisti={setYeni} placeholder="Yeni şifre" otomatik="new-password" />
          <SifreGirdisi deger={tekrar} degisti={setTekrar} placeholder="Yeni şifre (tekrar)" otomatik="new-password" />
          <Text style={styles.ipucu}>En az 8 karakter, en az bir harf ve bir rakam.</Text>
          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          <Dugme yazi="Şifreyi Değiştir" onPress={kaydet} yukleniyor={yukleniyor} pasif={!eski || !yeni || !tekrar} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, gap: spacing.m },
  ipucu: { fontSize: 13, color: colors.metinSoluk },
  hata: { color: colors.kirmiziAcik, fontSize: fontSize.kucuk + 1, fontWeight: '600' },
});
