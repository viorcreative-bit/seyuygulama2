import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Dugme from '../components/Dugme';
import { supabase } from '../lib/supabase';
import { telefonuDuzenle } from '../lib/telefon';
import { colors, fontSize, radius, spacing } from '../theme';

export default function Giris() {
  const [telefon, setTelefon] = useState('');
  const [kod, setKod] = useState('');
  const [numara, setNumara] = useState<string | null>(null); // kod gönderildiyse dolu
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const kodGonder = async () => {
    const duzgun = telefonuDuzenle(telefon);
    if (!duzgun) {
      setHata('Lütfen geçerli bir cep telefonu numarası gir. Örnek: 5XX XXX XX XX');
      return;
    }
    setHata('');
    setYukleniyor(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: duzgun });
    setYukleniyor(false);
    if (error) setHata(`Kod gönderilemedi. (Sebep: ${error.message})`);
    else setNumara(duzgun);
  };

  const kodDogrula = async () => {
    if (!numara) return;
    setHata('');
    setYukleniyor(true);
    const { error } = await supabase.auth.verifyOtp({ phone: numara, token: kod.trim(), type: 'sms' });
    setYukleniyor(false);
    if (error) setHata(`Kod hatalı veya süresi dolmuş. (Sebep: ${error.message})`);
    // Başarılıysa AuthContext oturumu algılar ve App ekranı değiştirir.
  };

  return (
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <Text style={styles.baslik}>{numara ? 'Doğrulama kodu' : 'Giriş yap'}</Text>
      <Text style={styles.aciklama}>
        {numara
          ? `${numara} numarasına gönderilen kodu gir.`
          : 'Telefon numaranı yaz, sana SMS ile bir kod gönderelim.'}
      </Text>

      <View style={styles.form}>
        {numara ? (
          <TextInput
            style={styles.girdi}
            value={kod}
            onChangeText={setKod}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            autoFocus
          />
        ) : (
          <View style={styles.telSatir}>
            <Text style={styles.onEk}>+90</Text>
            <TextInput
              style={[styles.girdi, { flex: 1 }]}
              value={telefon}
              onChangeText={setTelefon}
              placeholder="5XX XXX XX XX"
              keyboardType="phone-pad"
              autoFocus
            />
          </View>
        )}
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <Dugme
          yazi={numara ? 'Giriş Yap' : 'Kod Gönder'}
          onPress={numara ? kodDogrula : kodGonder}
          yukleniyor={yukleniyor}
          pasif={numara ? kod.trim().length < 6 : telefon.length < 10}
        />
        {numara ? (
          <Dugme yazi="Numarayı değiştir" ikincil onPress={() => { setNumara(null); setKod(''); setHata(''); }} />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

export const girdiStili = {
  backgroundColor: colors.beyaz,
  borderRadius: radius.m,
  borderWidth: 1,
  borderColor: colors.cizgi,
  paddingHorizontal: spacing.m,
  paddingVertical: 14,
  fontSize: fontSize.baslik,
  color: colors.metin,
} as const;

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, padding: spacing.l, justifyContent: 'center' },
  logo: { width: 130, height: 130, alignSelf: 'center' },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, textAlign: 'center', marginTop: spacing.m },
  aciklama: { fontSize: fontSize.normal, color: colors.metin, textAlign: 'center', marginTop: spacing.s, marginBottom: spacing.l },
  form: { gap: spacing.m },
  telSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  onEk: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.metin },
  girdi: girdiStili,
  hata: { color: colors.kirmizi, fontSize: fontSize.kucuk, fontWeight: '600' },
});
