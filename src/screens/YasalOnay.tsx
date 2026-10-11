import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import GirisKabuk from '../components/GirisKabuk';
import Onay from '../components/Onay';
import { sebep } from '../lib/hata';
import { supabase } from '../lib/supabase';
import { colors, fontSize, spacing } from '../theme';
import { YASAL_ADLARI, YASAL_SURUMU, YasalAnahtar } from '../yasal';
import YasalMetin from './YasalMetin';

// Yasal metinler yenilendiğinde (veya eski hesaplarda) kabul istenen ekran.
export default function YasalOnay() {
  const { profilYenile, cikisYap } = useAuth();
  const [kabul, setKabul] = useState(false);
  const [acik, setAcik] = useState<YasalAnahtar | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  if (acik) return <YasalMetin anahtar={acik} geri={() => setAcik(null)} />;

  const onayla = async () => {
    setYukleniyor(true);
    setHata('');
    const { error } = await supabase.rpc('yasal_onayla', { p_surum: YASAL_SURUMU });
    if (error) {
      setYukleniyor(false);
      setHata(`Kaydedilemedi. Lütfen tekrar dene.${sebep(error)}`);
      return;
    }
    await profilYenile();
    setYukleniyor(false);
  };

  const baglanti = (a: YasalAnahtar) => (
    <Text style={styles.baglanti} onPress={() => setAcik(a)}>{YASAL_ADLARI[a]}</Text>
  );

  return (
    <GirisKabuk
      baslik="Güncellenen metinler"
      aciklama="Devam etmeden önce yasal metinlerimizi okuyup kabul etmen gerekiyor."
      logoBoyu={100}
    >
      <Onay secili={kabul} degisti={setKabul}>
        <Text style={styles.metin}>
          {baglanti('kosullar')}, {baglanti('gizlilik')} ve {baglanti('kvkk')}'ni okudum, kabul ediyorum.
        </Text>
      </Onay>
      {hata ? <Text style={styles.hata}>{hata}</Text> : null}
      <Dugme yazi="Kabul Et ve Devam Et" onPress={onayla} yukleniyor={yukleniyor} pasif={!kabul} />
      <Pressable onPress={cikisYap} accessibilityRole="button">
        <Text style={styles.cikis}>Kabul etmiyorum, çıkış yap</Text>
      </Pressable>
    </GirisKabuk>
  );
}

const styles = StyleSheet.create({
  metin: { color: colors.metin, fontSize: fontSize.kucuk + 1, lineHeight: 22 },
  baglanti: { color: colors.sari, fontWeight: '700', textDecorationLine: 'underline' },
  hata: { color: colors.kirmiziAcik, fontWeight: '600', fontSize: fontSize.kucuk + 1 },
  cikis: { color: colors.metinSoluk, fontWeight: '600', textAlign: 'center', marginTop: spacing.s },
});
