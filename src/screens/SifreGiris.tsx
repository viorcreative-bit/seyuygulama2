import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Rol, useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import Girdi from '../components/Girdi';
import GirisKabuk from '../components/GirisKabuk';
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
    <GirisKabuk geri={geri} baslik={baslik} aciklama="Telefon numaran ve şifrenle giriş yap." logoBoyu={110}>
      <View style={styles.telSatir}>
        <Text style={styles.onEk}>+90</Text>
        <Girdi
          style={{ flex: 1 }}
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
    </GirisKabuk>
  );
}

const styles = StyleSheet.create({
  telSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  onEk: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.metin },
  hata: { color: colors.kirmiziAcik, fontSize: fontSize.kucuk + 1, fontWeight: '600' },
  link: { color: colors.sari, fontWeight: '700', textAlign: 'center', fontSize: fontSize.kucuk + 1, marginTop: spacing.s },
});
