import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Rol, useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { girdiStili } from '../components/girdi';
import SifreGirdisi from '../components/SifreGirdisi';
import { supabase } from '../lib/supabase';
import { telefonuDuzenle } from '../lib/telefon';
import { colors, fontSize, spacing } from '../theme';

type Props = { rol: Rol; geri: () => void; sifremiUnuttum: () => void };

// Müşteri Girişi ve Aşçı Girişi: telefon numarası + şifre.
export default function SifreGiris({ rol, geri, sifremiUnuttum }: Props) {
  const { setGirisRolu, girisHatasi, setGirisHatasi } = useAuth();
  const [telefon, setTelefon] = useState('');
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    setGirisHatasi('');
  }, [setGirisHatasi]);

  const giris = async () => {
    const duzgun = telefonuDuzenle(telefon);
    if (!duzgun) return setHata('Lütfen geçerli bir cep telefonu numarası gir. Örnek: 5XX XXX XX XX');
    if (!sifre) return setHata('Lütfen şifreni yaz.');
    setHata('');
    setGirisHatasi('');
    setYukleniyor(true);
    setGirisRolu(rol);
    const { error } = await supabase.auth.signInWithPassword({ phone: duzgun, password: sifre });
    setYukleniyor(false);
    if (error) {
      setGirisRolu(null);
      setHata(
        /invalid login|credentials/i.test(error.message)
          ? 'Telefon numarası veya şifre hatalı. Şifren yoksa ya da unuttuysan aşağıdaki bağlantıyı kullan.'
          : `Giriş yapılamadı. (Sebep: ${error.message})`,
      );
    }
    // Başarılıysa oturum açılır; rol uyuşmazsa AuthContext oturumu kapatıp girisHatasi'ni doldurur.
  };

  const baslik = rol === 'asci' ? 'Aşçı Girişi' : 'Müşteri Girişi';
  return (
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.baslik}>{baslik}</Text>

        <View style={styles.form}>
          <View style={styles.telSatir}>
            <Text style={styles.onEk}>+90</Text>
            <TextInput
              style={[girdiStili, { flex: 1 }]}
              value={telefon}
              onChangeText={setTelefon}
              placeholder="5XX XXX XX XX"
              keyboardType="phone-pad"
            />
          </View>
          <SifreGirdisi deger={sifre} degisti={setSifre} placeholder="Şifre" />
          {hata || girisHatasi ? <Text style={styles.hata}>{hata || girisHatasi}</Text> : null}
          <Dugme yazi="Giriş Yap" onPress={giris} yukleniyor={yukleniyor} pasif={telefon.length < 10 || sifre.length < 1} />
          <Pressable onPress={sifremiUnuttum} accessibilityRole="button">
            <Text style={styles.link}>İlk kez mi giriyorsun veya şifreni mi unuttun?</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem },
  icerik: { padding: spacing.l, paddingTop: 56, flexGrow: 1 },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginTop: spacing.m },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, textAlign: 'center', marginVertical: spacing.m },
  form: { gap: spacing.m },
  telSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  onEk: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.metin },
  hata: { color: colors.kirmizi, fontSize: fontSize.kucuk + 1, fontWeight: '600' },
  link: { color: colors.kirmizi, fontWeight: '700', textAlign: 'center', fontSize: fontSize.kucuk + 1, marginTop: spacing.s },
});
