import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Rol, useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { supabase } from '../lib/supabase';
import { colors, fontSize, radius, spacing } from '../theme';
import Girdi from '../components/Girdi';
import GirisKabuk from '../components/GirisKabuk';
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
    <GirisKabuk baslik="Hoş geldin!" aciklama="Seni tanıyalım." logoBoyu={100}>
      <Girdi value={ad} onChangeText={setAd} placeholder="Ad Soyad" autoCapitalize="words" />
      {roller.map((r) => {
        const secili = rol === r.rol;
        return (
          <Pressable key={r.rol} onPress={() => setRol(r.rol)} style={[styles.rolKart, secili && styles.rolSecili]}>
            <Text style={[styles.rolBaslik, secili && { color: colors.koyuMetin }]}>{r.baslik}</Text>
            <Text style={[styles.rolAlt, secili && { color: colors.koyuMetin }]}>{r.alt}</Text>
          </Pressable>
        );
      })}
      <SifreGirdisi deger={sifre} degisti={setSifre} placeholder="Şifre belirle" otomatik="new-password" />
      <SifreGirdisi deger={tekrar} degisti={setTekrar} placeholder="Şifre (tekrar)" otomatik="new-password" />
      <Text style={styles.ipucu}>Şifre en az 8 karakter, en az bir harf ve bir rakam içermeli.</Text>
      {hata ? <Text style={styles.hata}>{hata}</Text> : null}
      <Dugme yazi="Kaydı Tamamla" onPress={kaydet} yukleniyor={yukleniyor} pasif={ad.trim().length < 2 || !rol || !sifre || !tekrar} />
    </GirisKabuk>
  );
}

const styles = StyleSheet.create({
  rolKart: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 2, borderColor: colors.cizgi, padding: spacing.m },
  rolSecili: { backgroundColor: colors.sari, borderColor: colors.sari },
  rolBaslik: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin },
  rolAlt: { fontSize: fontSize.kucuk, color: colors.metinSoluk, marginTop: 2 },
  ipucu: { fontSize: 13, color: colors.metinSoluk },
  hata: { color: colors.kirmiziAcik, fontSize: fontSize.kucuk + 1, fontWeight: '600' },
});
