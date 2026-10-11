import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import Girdi from '../components/Girdi';
import GirisKabuk from '../components/GirisKabuk';
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
    <GirisKabuk
      geri={geri}
      baslik={numara ? 'Doğrulama kodu' : METIN[amac].baslik}
      aciklama={numara ? `${numara} numarasına gönderilen kodu gir.` : METIN[amac].aciklama}
    >
      {numara ? (
        <Girdi
          value={kod}
          onChangeText={setKod}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoFocus
          style={styles.kod}
        />
      ) : (
        <View style={styles.telSatir}>
          <Text style={styles.onEk}>+90</Text>
          <Girdi
            style={{ flex: 1 }}
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
    </GirisKabuk>
  );
}

const styles = StyleSheet.create({
  telSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  onEk: { fontSize: fontSize.baslik, fontWeight: '700', color: colors.metin },
  kod: { textAlign: 'center', fontSize: fontSize.buyuk, letterSpacing: 8 },
  hata: { color: colors.kirmiziAcik, fontSize: fontSize.kucuk + 1, fontWeight: '600' },
});
