import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { YildizSec } from '../components/Yildizlar';
import { yorumEkle } from '../lib/yorumlar';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = { talepId: string; asciId: string; asciAdi: string; geri: () => void; tamam: () => void };

export default function YorumYaz({ talepId, asciId, asciAdi, geri, tamam }: Props) {
  const { oturum } = useAuth();
  const [yildiz, setYildiz] = useState(0);
  const [yorum, setYorum] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');

  const gonder = async () => {
    if (!oturum) return;
    if (yildiz < 1) return setHata('Lütfen 1 ile 5 arasında yıldız ver.');
    setHata('');
    setGonderiliyor(true);
    try {
      await yorumEkle({ talepId, musteriId: oturum.user.id, asciId, yildiz, yorum: yorum.trim() });
      Alert.alert('Teşekkürler!', 'Yorumun yayınlandı.', [{ text: 'Tamam', onPress: tamam }]);
    } catch (e) {
      const mesaj = (e as { code?: string }).code === '23505'
        ? 'Bu hizmet için zaten yorum yazmışsın.'
        : 'Yorum gönderilemedi. Lütfen tekrar dene.';
      setHata(mesaj);
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        <Text style={styles.baslik}>Hizmeti değerlendir</Text>
        <Text style={styles.asci}>{asciAdi}</Text>
        <YildizSec deger={yildiz} degisti={setYildiz} />
        <TextInput
          style={styles.girdi}
          value={yorum}
          onChangeText={setYorum}
          placeholder="Deneyimini kısaca anlat (isteğe bağlı)"
          multiline
          maxLength={1000}
        />
        <Text style={styles.ipucu}>Yorumun herkese açık olarak, adının kısaltılmış haliyle (örn. "Ayşe K.") görünür.</Text>
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <Dugme yazi="Yorumu Gönder" onPress={gonder} yukleniyor={gonderiliyor} pasif={yildiz < 1} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  icerik: { padding: spacing.l, gap: spacing.m },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, textAlign: 'center' },
  asci: { fontSize: fontSize.baslik, fontWeight: '600', color: colors.metin, textAlign: 'center' },
  girdi: {
    backgroundColor: colors.beyaz,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: spacing.m,
    fontSize: fontSize.normal,
    color: colors.metin,
    height: 130,
    textAlignVertical: 'top',
  },
  ipucu: { fontSize: 13, color: colors.metin, opacity: 0.6 },
  hata: { color: colors.kirmizi, fontWeight: '600' },
});
