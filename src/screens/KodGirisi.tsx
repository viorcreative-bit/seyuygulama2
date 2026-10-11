import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import { girdiStili } from '../components/girdi';
import { supabase } from '../lib/supabase';
import { telefonuDuzenle } from '../lib/telefon';
import { colors, fontSize, spacing } from '../theme';

export type KodAmaci = 'kaydol' | 'sifirla';

const METIN: Record<KodAmaci, { baslik: string; aciklama: string }> = {
  kaydol: { baslik: 'Kaydol', aciklama: 'Telefon numaranı yaz, sana SMS ile bir doğrulama kodu gönderelim.' },
  sifirla: {
    baslik: 'Şifre oluştur / yenile',
    aciklama: 'İlk kez giriyorsan ya da şifreni unuttuysan numaranı yaz. SMS ile gelen kodla girip yeni şifreni belirleyeceksin.',
  },
};

// SMS koduyla doğrulama: yeni kayıt ve "şifremi unuttum / ilk kez giriyorum" için.
export default function KodGirisi({ amac, geri }: { amac: KodAmaci; geri: () => void }) {
  const { setSifreSifirlaniyor } = useAuth();
  const [telefon, setTelefon] = useState('');
  const [kod, setKod] = useState('');
  const [numara, setNumara] = useState<string | null>(null);
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
    if (amac === 'sifirla') setSifreSifirlaniyor(true); // oturum açılınca yeni şifre ekranı gelsin
    const { error } = await supabase.auth.verifyOtp({ phone: numara, token: kod.trim(), type: 'sms' });
    setYukleniyor(false);
    if (error) {
      setSifreSifirlaniyor(false);
      setHata(`Kod hatalı veya süresi dolmuş. (Sebep: ${error.message})`);
    }
    // Başarılıysa oturum açılır ve App sıradaki ekranı gösterir.
  };

  return (
    <KeyboardAvoidingView style={styles.kap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable onPress={geri} style={styles.geri} accessibilityRole="button">
        <Text style={styles.geriYazi}>‹ Geri</Text>
      </Pressable>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <Text style={styles.baslik}>{numara ? 'Doğrulama kodu' : METIN[amac].baslik}</Text>
      <Text style={styles.aciklama}>
        {numara ? `${numara} numarasına gönderilen kodu gir.` : METIN[amac].aciklama}
      </Text>

      <View style={styles.form}>
        {numara ? (
          <TextInput
            style={girdiStili}
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
              style={[girdiStili, { flex: 1 }]}
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
          yazi={numara ? 'Doğrula' : 'Kod Gönder'}
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

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.krem, padding: spacing.l, justifyContent: 'center' },
  geri: { position: 'absolute', top: 56, left: spacing.l },
  geriYazi: { fontSize: fontSize.baslik, color: colors.kirmizi, fontWeight: '700' },
  logo: { width: 130, height: 130, alignSelf: 'center' },
  baslik: { fontSize: fontSize.buyuk, fontWeight: '800', color: colors.kirmizi, textAlign: 'center', marginTop: spacing.m },
  aciklama: { fontSize: fontSize.normal, color: colors.metin, textAlign: 'center', marginTop: spacing.s, marginBottom: spacing.l },
  form: { gap: spacing.m },
  telSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  onEk: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.metin },
  hata: { color: colors.kirmizi, fontSize: fontSize.kucuk, fontWeight: '600' },
});
