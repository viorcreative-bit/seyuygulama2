import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import SifreGirdisi from '../components/SifreGirdisi';
import { sifreKontrol } from '../lib/sifre';
import { supabase } from '../lib/supabase';
import { colors, fontSize, spacing } from '../theme';

// SMS koduyla girildikten sonra zorunlu olarak yeni şifre belirlenen ekran.
export default function SifreBelirle() {
  const { setSifreSifirlaniyor, cikisYap } = useAuth();
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const kaydet = async () => {
    const h = sifreKontrol(sifre, tekrar);
    if (h) return setHata(h);
    setHata('');
    setYukleniyor(true);
    const { error } = await supabase.auth.updateUser({ password: sifre, data: { sifre_var: true } });
    setYukleniyor(false);
    if (error) {
      setHata(
        /different from the old|same/i.test(error.message)
          ? 'Yeni şifren eskisinden farklı olmalı.'
          : `Şifre kaydedilemedi. (Sebep: ${error.message})`,
      );
      return;
    }
    setSifreSifirlaniyor(false); // App ana sayfaya geçer
  };

  return (
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <Text style={styles.baslik}>Şifreni belirle</Text>
      <Text style={styles.aciklama}>
        Bundan sonra telefon numaran ve bu şifreyle giriş yapacaksın. En az 8 karakter, en az bir harf ve bir rakam.
      </Text>
      <View style={styles.form}>
        <SifreGirdisi deger={sifre} degisti={setSifre} placeholder="Yeni şifre" otomatik="new-password" />
        <SifreGirdisi deger={tekrar} degisti={setTekrar} placeholder="Yeni şifre (tekrar)" otomatik="new-password" />
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <Dugme yazi="Şifreyi Kaydet" onPress={kaydet} yukleniyor={yukleniyor} pasif={!sifre || !tekrar} />
        <Pressable onPress={cikisYap} accessibilityRole="button">
          <Text style={styles.link}>Vazgeç ve çıkış yap</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, padding: spacing.l, justifyContent: 'center' },
  logo: { width: 110, height: 110, alignSelf: 'center' },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, textAlign: 'center', marginTop: spacing.s },
  aciklama: { fontSize: fontSize.normal, color: colors.metin, textAlign: 'center', marginVertical: spacing.m },
  form: { gap: spacing.m },
  hata: { color: colors.kirmizi, fontSize: fontSize.kucuk + 1, fontWeight: '600' },
  link: { color: colors.kirmizi, fontWeight: '700', textAlign: 'center', marginTop: spacing.s },
});
