import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Rol, useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { supabase } from '../lib/supabase';
import { colors, fontSize, radius, spacing } from '../theme';
import { girdiStili } from '../components/girdi';
import SifreGirdisi from '../components/SifreGirdisi';
import { sifreKontrol } from '../lib/sifre';

const roller: { rol: Rol; baslik: string; alt: string }[] = [
  { rol: 'musteri', baslik: 'Müşteriyim', alt: 'Evime aşçı çağırmak istiyorum' },
  { rol: 'asci', baslik: 'Aşçıyım', alt: 'Müşterilerin evinde yemek yapıyorum' },
];

// Telefonla ilk kez giren kullanıcının ad ve rol seçtiği ekran.
export default function Kayit() {
  const { oturum, profilYenile } = useAuth();
  const [ad, setAd] = useState('');
  const [rol, setRol] = useState<Rol | null>(null);
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const kaydet = async () => {
    if (!oturum || !rol) return;
    const sifreHatasi = sifreKontrol(sifre, tekrar);
    if (sifreHatasi) return setHata(sifreHatasi);
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
    // Şifre kaydedilemezse profil yine de oluşmuştur; bir sonraki ekran şifre belirlemeyi zorunlu tutar.
    await supabase.auth.updateUser({ password: sifre, data: { sifre_var: true } });
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
        <SifreGirdisi deger={sifre} degisti={setSifre} placeholder="Şifre belirle" otomatik="new-password" />
        <SifreGirdisi deger={tekrar} degisti={setTekrar} placeholder="Şifre (tekrar)" otomatik="new-password" />
        <Text style={styles.ipucu}>Şifre en az 8 karakter, en az bir harf ve bir rakam içermeli.</Text>
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <Dugme yazi="Kaydı Tamamla" onPress={kaydet} yukleniyor={yukleniyor} pasif={ad.trim().length < 2 || !rol || !sifre || !tekrar} />
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
  rolKart: { backgroundColor: colors.beyaz, borderRadius: radius.m, borderWidth: 2, borderColor: colors.cizgi, padding: spacing.m },
  rolSecili: { backgroundColor: colors.kirmizi, borderColor: colors.kirmizi },
  rolBaslik: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin },
  rolAlt: { fontSize: fontSize.kucuk, color: colors.metin, opacity: 0.8, marginTop: 2 },
  ipucu: { fontSize: 13, color: colors.metin, opacity: 0.6 },
  hata: { color: colors.kirmizi, fontSize: fontSize.kucuk, fontWeight: '600' },
});
