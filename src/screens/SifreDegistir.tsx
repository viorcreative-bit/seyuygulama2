import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
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
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        <Text style={styles.baslik}>Şifremi Değiştir</Text>
        <SifreGirdisi deger={eski} degisti={setEski} placeholder="Mevcut şifre" />
        <SifreGirdisi deger={yeni} degisti={setYeni} placeholder="Yeni şifre" otomatik="new-password" />
        <SifreGirdisi deger={tekrar} degisti={setTekrar} placeholder="Yeni şifre (tekrar)" otomatik="new-password" />
        <Text style={styles.ipucu}>En az 8 karakter, en az bir harf ve bir rakam.</Text>
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <Dugme yazi="Şifreyi Değiştir" onPress={kaydet} yukleniyor={yukleniyor} pasif={!eski || !yeni || !tekrar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  icerik: { padding: spacing.l, gap: spacing.m },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi },
  ipucu: { fontSize: 13, color: colors.metin, opacity: 0.6 },
  hata: { color: colors.kirmizi, fontSize: fontSize.kucuk + 1, fontWeight: '600' },
});
