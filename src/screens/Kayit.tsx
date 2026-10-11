import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Rol, useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { supabase } from '../lib/supabase';
import { colors, fontSize, radius, spacing } from '../theme';
import { girdiStili } from './Giris';

const roller: { rol: Rol; baslik: string; alt: string }[] = [
  { rol: 'musteri', baslik: 'Müşteriyim', alt: 'Evime aşçı çağırmak istiyorum' },
  { rol: 'asci', baslik: 'Aşçıyım', alt: 'Müşterilerin evinde yemek yapıyorum' },
];

// Telefonla ilk kez giren kullanıcının ad ve rol seçtiği ekran.
export default function Kayit() {
  const { oturum, profilYenile } = useAuth();
  const [ad, setAd] = useState('');
  const [rol, setRol] = useState<Rol | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const kaydet = async () => {
    if (!oturum || !rol) return;
    setYukleniyor(true);
    setHata('');
    const { error } = await supabase.from('profiles').insert({
      id: oturum.user.id,
      rol,
      ad: ad.trim(),
      telefon: oturum.user.phone ? `+${oturum.user.phone.replace(/^\+/, '')}` : null,
    });
    if (error) {
      setYukleniyor(false);
      setHata('Kayıt tamamlanamadı. Lütfen tekrar dene.');
      return;
    }
    await profilYenile();
    setYukleniyor(false);
  };

  return (
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <Text style={styles.baslik}>Hoş geldin!</Text>
      <Text style={styles.aciklama}>Seni tanıyalım.</Text>

      <View style={styles.form}>
        <TextInput style={girdiStili} value={ad} onChangeText={setAd} placeholder="Ad Soyad" autoCapitalize="words" />
        {roller.map((r) => {
          const secili = rol === r.rol;
          return (
            <Pressable key={r.rol} onPress={() => setRol(r.rol)} style={[styles.rolKart, secili && styles.rolSecili]}>
              <Text style={[styles.rolBaslik, secili && { color: colors.sari }]}>{r.baslik}</Text>
              <Text style={[styles.rolAlt, secili && { color: colors.krem }]}>{r.alt}</Text>
            </Pressable>
          );
        })}
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <Dugme yazi="Devam Et" onPress={kaydet} yukleniyor={yukleniyor} pasif={ad.trim().length < 2 || !rol} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, padding: spacing.l, justifyContent: 'center' },
  logo: { width: 110, height: 110, alignSelf: 'center' },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, textAlign: 'center', marginTop: spacing.s },
  aciklama: { fontSize: fontSize.normal, color: colors.metin, textAlign: 'center', marginBottom: spacing.l },
  form: { gap: spacing.m },
  rolKart: { backgroundColor: colors.beyaz, borderRadius: radius.m, borderWidth: 2, borderColor: '#E5D9BF', padding: spacing.m },
  rolSecili: { backgroundColor: colors.kirmizi, borderColor: colors.kirmizi },
  rolBaslik: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin },
  rolAlt: { fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.8, marginTop: 2 },
  hata: { color: colors.kirmizi, fontSize: fontSize.kucuk, fontWeight: '600' },
});
