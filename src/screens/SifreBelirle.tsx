import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import GirisKabuk from '../components/GirisKabuk';
import SifreGirdisi from '../components/SifreGirdisi';
import { sifreKontrol } from '../lib/sifre';
import { supabase } from '../lib/supabase';
import { colors, fontSize, spacing } from '../theme';
import { sebep } from '../lib/hata';

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
    const { error } = await supabase.auth.updateUser({ password: sifre, data: { sifre_var: true, gecici_sifre: false } });
    setYukleniyor(false);
    if (error) {
      setHata(
        /different from the old|same/i.test(error.message)
          ? 'Yeni şifren eskisinden farklı olmalı.'
          : `Şifre kaydedilemedi. Lütfen tekrar dene.${sebep(error)}`,
      );
      return;
    }
    setSifreSifirlaniyor(false); // App ana sayfaya geçer
  };

  return (
    <GirisKabuk
      baslik="Şifreni belirle"
      aciklama="Bundan sonra telefon numaran ve bu şifreyle giriş yapacaksın. En az 8 karakter, en az bir harf ve bir rakam."
      logoBoyu={110}
    >
      <SifreGirdisi deger={sifre} degisti={setSifre} placeholder="Yeni şifre" otomatik="new-password" />
      <SifreGirdisi deger={tekrar} degisti={setTekrar} placeholder="Yeni şifre (tekrar)" otomatik="new-password" />
      {hata ? <Text style={styles.hata}>{hata}</Text> : null}
      <Dugme yazi="Şifreyi Kaydet" onPress={kaydet} yukleniyor={yukleniyor} pasif={!sifre || !tekrar} />
      <Pressable onPress={cikisYap} accessibilityRole="button">
        <Text style={styles.link}>Vazgeç ve çıkış yap</Text>
      </Pressable>
    </GirisKabuk>
  );
}

const styles = StyleSheet.create({
  hata: { color: colors.kirmiziAcik, fontSize: fontSize.kucuk + 1, fontWeight: '600' },
  link: { color: colors.sari, fontWeight: '700', textAlign: 'center', marginTop: spacing.s },
});
