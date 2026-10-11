import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import Girdi from '../components/Girdi';
import { YildizSec } from '../components/Yildizlar';
import { yorumEkle } from '../lib/yorumlar';
import { colors, fontSize, spacing } from '../theme';

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
    <Ekran baslik="Hizmeti değerlendir" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text style={styles.asci}>{asciAdi}</Text>
          <YildizSec deger={yildiz} degisti={setYildiz} />
          <Girdi
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
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, gap: spacing.l },
  asci: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.sari, textAlign: 'center' },
  girdi: { height: 140 },
  ipucu: { fontSize: 13, color: colors.metinSoluk },
  hata: { color: colors.kirmiziAcik, fontWeight: '600' },
});
