import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { sikayetGonder } from '../lib/sikayet';
import { colors, fontSize, radius, spacing } from '../theme';

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
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.ust}>
        <Pressable onPress={geri} accessibilityRole="button">
          <Text style={styles.geri}>‹ Geri</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        <Text style={styles.baslik}>Şikayet Et</Text>
        <Text style={styles.ozet}>{ozet}</Text>
        <TextInput
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
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, paddingTop: 56 },
  ust: { paddingHorizontal: spacing.l },
  geri: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  icerik: { padding: spacing.l, gap: spacing.m },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi },
  ozet: { fontSize: fontSize.normal, color: colors.metin, opacity: 0.8 },
  girdi: {
    backgroundColor: colors.beyaz,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: spacing.m,
    fontSize: fontSize.normal,
    color: colors.metin,
    height: 160,
    textAlignVertical: 'top',
  },
  ipucu: { fontSize: 13, color: colors.metin, opacity: 0.6 },
  hata: { color: colors.kirmizi, fontWeight: '600' },
});
