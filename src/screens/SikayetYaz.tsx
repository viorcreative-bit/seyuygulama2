import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import Girdi from '../components/Girdi';
import { sikayetGonder } from '../lib/sikayet';
import { colors, fontSize, spacing } from '../theme';

type Props = { talepId: string; ozet: string; geri: () => void };

// Müşteri veya aşçı, katıldığı bir talep hakkında yöneticiye şikayet iletir.
export default function SikayetYaz({ talepId, ozet, geri }: Props) {
  const { oturum } = useAuth();
  const [metin, setMetin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');

  const gonder = async () => {
    if (!oturum) return;
    if (metin.trim().length < 10) return setHata('Lütfen şikayetini en az 10 karakterle anlat.');
    setHata('');
    setGonderiliyor(true);
    try {
      await sikayetGonder(talepId, oturum.user.id, metin.trim());
      Alert.alert('Şikayetin iletildi', 'Yöneticilerimiz inceleyecek. Teşekkür ederiz.', [{ text: 'Tamam', onPress: geri }]);
    } catch (e) {
      setHata(
        (e as { code?: string }).code === '23505'
          ? 'Bu hizmet için zaten bir şikayet ilettin.'
          : 'Şikayet gönderilemedi. Lütfen tekrar dene.',
      );
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran baslik="Şikayet Et" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text style={styles.ozet}>{ozet}</Text>
          <Girdi
            style={styles.girdi}
            value={metin}
            onChangeText={setMetin}
            placeholder="Ne oldu? Lütfen ayrıntılı anlat."
            multiline
            maxLength={1000}
          />
          <Text style={styles.ipucu}>Şikayetin yalnızca Aşçım Gelsin yöneticilerine iletilir, karşı tarafa gösterilmez.</Text>
          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          <Dugme yazi="Şikayeti Gönder" onPress={gonder} yukleniyor={gonderiliyor} pasif={metin.trim().length < 10} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, gap: spacing.m },
  ozet: { fontSize: fontSize.normal, color: colors.sari, fontWeight: '600' },
  girdi: { height: 170 },
  ipucu: { fontSize: 13, color: colors.metinSoluk },
  hata: { color: colors.kirmiziAcik, fontWeight: '600' },
});
