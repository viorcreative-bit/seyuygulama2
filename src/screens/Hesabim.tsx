import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Ekran from '../components/Ekran';
import ProfilResmi from '../components/ProfilResmi';
import { supabase } from '../lib/supabase';
import { telefonuGoster } from '../lib/telefon';
import { YASAL_ADLARI, YasalAnahtar } from '../yasal';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  profilDuzenle: () => void;
  sifreDegistir: () => void;
  yasal: (a: YasalAnahtar) => void;
  hesabiSil: () => void;
  avatarSec: () => void;
};

type SatirProps = { simge: keyof typeof Ionicons.glyphMap; yazi: string; onPress: () => void; tehlike?: boolean; ayirac?: boolean };

function Satir({ simge, yazi, onPress, tehlike, ayirac }: SatirProps) {
  const renk = tehlike ? colors.kirmiziAcik : colors.metin;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.satir, ayirac && styles.ayirac, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <View style={styles.simge}>
        <Ionicons name={simge} size={20} color={tehlike ? colors.kirmiziAcik : colors.sari} />
      </View>
      <Text style={[styles.satirYazi, { color: renk }]}>{yazi}</Text>
      {!tehlike ? <Ionicons name="chevron-forward" size={20} color={colors.metinSoluk} /> : null}
    </Pressable>
  );
}

export default function Hesabim({ profilDuzenle, sifreDegistir, yasal, hesabiSil, avatarSec }: Props) {
  const { profil, oturum, cikisYap } = useAuth();
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('fotograf')
      .eq('id', oturum?.user.id ?? '')
      .maybeSingle()
      .then(({ data }) => setFoto(data?.fotograf ?? null));
  }, [oturum?.user.id]);

  const cikis = () =>
    Alert.alert('Çıkış yap', 'Hesabından çıkmak istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: cikisYap },
    ]);

  const telefon = oturum?.user.phone ? telefonuGoster(`+${oturum.user.phone.replace(/^\+/, '')}`) : '';

  return (
    <Ekran baslik="Hesabım">
      <ScrollView contentContainerStyle={styles.icerik}>
        <View style={styles.kimlik}>
          <ProfilResmi uri={foto} kimlik={oturum?.user.id ?? ''} style={styles.foto} />
          <Text style={styles.ad}>{profil?.ad}</Text>
          {telefon ? <Text style={styles.telefon}>{telefon}</Text> : null}
          <View style={styles.rol}>
            <Text style={styles.rolYazi}>{profil?.rol === 'asci' ? 'Aşçı' : 'Müşteri'}</Text>
          </View>
        </View>

        <View style={styles.grup}>
          {profil?.rol === 'asci' ? <Satir simge="create-outline" yazi="Aşçı Profilimi Düzenle" onPress={profilDuzenle} /> : null}
          <Satir simge="happy-outline" yazi="Avatarımı Değiştir" onPress={avatarSec} ayirac={profil?.rol === 'asci'} />
          <Satir simge="lock-closed-outline" yazi="Şifremi Değiştir" onPress={sifreDegistir} ayirac />
        </View>

        <View style={styles.grup}>
          <Satir simge="shield-checkmark-outline" yazi={YASAL_ADLARI.kvkk} onPress={() => yasal('kvkk')} />
          <Satir simge="lock-open-outline" yazi={YASAL_ADLARI.gizlilik} onPress={() => yasal('gizlilik')} ayirac />
          <Satir simge="document-text-outline" yazi={YASAL_ADLARI.kosullar} onPress={() => yasal('kosullar')} ayirac />
        </View>

        <View style={styles.grup}>
          <Satir simge="log-out-outline" yazi="Çıkış Yap" onPress={cikis} tehlike />
          <Satir simge="trash-outline" yazi="Hesabımı Sil" onPress={hesabiSil} tehlike ayirac />
        </View>
      </ScrollView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, gap: spacing.l, paddingBottom: spacing.xl },
  kimlik: { alignItems: 'center', gap: 4 },
  foto: { width: 110, height: 110, borderRadius: radius.tam, marginBottom: spacing.s },
  ad: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.metin },
  telefon: { fontSize: fontSize.normal, color: colors.metinSoluk },
  rol: { marginTop: spacing.s, backgroundColor: colors.sari, borderRadius: radius.tam, paddingVertical: 4, paddingHorizontal: 16 },
  rolYazi: { color: colors.koyuMetin, fontWeight: '800', fontSize: fontSize.kucuk },
  grup: { backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, overflow: 'hidden' },
  satir: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, padding: spacing.m },
  ayirac: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cizgi },
  simge: { width: 38, height: 38, borderRadius: radius.tam, backgroundColor: colors.yuzeyUst, alignItems: 'center', justifyContent: 'center' },
  satirYazi: { flex: 1, fontSize: fontSize.normal + 1, fontWeight: '600' },
});
