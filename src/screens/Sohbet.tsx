import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Bos from '../components/Bos';
import Ekran from '../components/Ekran';
import { sebep } from '../lib/hata';
import { Mesaj, SohbetOzeti, mesajGonder, mesajlar, okunduIsaretle, sohbetBilgisi } from '../lib/sohbet';
import { supabase } from '../lib/supabase';
import { tarihSaatYaz } from '../lib/talepler';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = { sohbetId: string; geri: () => void };

// Müşteri ile aşçı arasındaki sohbet. Yeni mesajlar anında gelir; bağlantı yoksa birkaç saniyede bir yenilenir.
export default function Sohbet({ sohbetId, geri }: Props) {
  const { oturum } = useAuth();
  const ben = oturum!.user.id;
  const [bilgi, setBilgi] = useState<SohbetOzeti | null>(null);
  const [liste, setListe] = useState<Mesaj[] | null>(null);
  const [yazi, setYazi] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');
  const sonOkundu = useRef(0);

  const yukle = useCallback(async () => {
    try {
      const m = await mesajlar(sohbetId);
      setListe(m);
      setHata('');
      // Karşı tarafın okunmamış mesajı varsa okundu işaretle.
      if (m.some((x) => x.gonderen_id !== ben && !x.okundu_tarihi) && Date.now() - sonOkundu.current > 1500) {
        sonOkundu.current = Date.now();
        okunduIsaretle(sohbetId);
      }
    } catch {
      setHata('Mesajlar yüklenemedi. İnternetini kontrol et.');
    }
  }, [sohbetId, ben]);

  useEffect(() => {
    sohbetBilgisi(sohbetId).then(setBilgi);
    yukle();
    const kanal = supabase
      .channel(`sohbet-${sohbetId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesajlar', filter: `sohbet_id=eq.${sohbetId}` }, () => yukle())
      .subscribe();
    const t = setInterval(yukle, 5000);
    return () => {
      clearInterval(t);
      supabase.removeChannel(kanal);
    };
  }, [sohbetId, yukle]);

  const gonder = async () => {
    const metin = yazi.trim();
    if (!metin || gonderiliyor) return;
    setGonderiliyor(true);
    setHata('');
    try {
      await mesajGonder(sohbetId, metin);
      setYazi('');
      await yukle();
    } catch (e) {
      setHata(`Mesaj gönderilemedi. Lütfen tekrar dene.${sebep(e)}`);
    } finally {
      setGonderiliyor(false);
    }
  };

  const bilgilendirme = () =>
    Alert.alert('Güvenlik', 'Telefon numarası, adres ve ödeme bilgilerini yalnızca güvendiğin kişiyle paylaş. Uygulama dışı ödeme taleplerine dikkat et. Sorun yaşarsan Taleplerim bölümünden şikayet edebilirsin.');

  return (
    <Ekran
      baslik={bilgi?.diger_ad ?? 'Sohbet'}
      geri={geri}
      sag={
        <Pressable onPress={bilgilendirme} hitSlop={10} accessibilityLabel="Güvenlik bilgisi">
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.sari} />
        </Pressable>
      }
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <FlatList
          data={liste ?? []}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.l, gap: spacing.s }}
          ListEmptyComponent={
            !liste ? (
              <Bos yukleniyor />
            ) : (
              <View style={{ transform: [{ scaleY: -1 }] }}>
                <Bos mesaj={hata || 'Henüz mesaj yok. İlk mesajı sen yaz.'} simge="chatbubbles-outline" />
              </View>
            )
          }
          renderItem={({ item: m }) => {
            const benim = m.gonderen_id === ben;
            return (
              <View style={[styles.baloncuk, benim ? styles.benim : styles.onun]}>
                <Text style={[styles.metin, benim && { color: colors.koyuMetin }]}>{m.metin}</Text>
                <Text style={[styles.saat, benim && { color: colors.koyuMetin, opacity: 0.6 }]}>
                  {tarihSaatYaz(m.olusturma_tarihi).slice(11)}
                  {benim && m.okundu_tarihi ? '  ✓✓' : ''}
                </Text>
              </View>
            );
          }}
        />
        {hata && liste && liste.length > 0 ? <Text style={styles.hata}>{hata}</Text> : null}
        <View style={styles.giris}>
          <TextInput
            style={styles.girdi}
            value={yazi}
            onChangeText={setYazi}
            placeholder="Mesajını yaz"
            placeholderTextColor={colors.metinSoluk}
            selectionColor={colors.sari}
            keyboardAppearance="dark"
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={gonder}
            disabled={!yazi.trim() || gonderiliyor}
            style={[styles.gonder, (!yazi.trim() || gonderiliyor) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Gönder"
          >
            <Ionicons name="send" size={20} color={colors.koyuMetin} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  baloncuk: { maxWidth: '82%', borderRadius: radius.m, paddingVertical: 8, paddingHorizontal: 12, gap: 2 },
  benim: { alignSelf: 'flex-end', backgroundColor: colors.sari, borderBottomRightRadius: 4 },
  onun: { alignSelf: 'flex-start', backgroundColor: colors.yuzey, borderWidth: 1, borderColor: colors.cizgi, borderBottomLeftRadius: 4 },
  metin: { fontSize: fontSize.normal + 1, color: colors.metin, lineHeight: 22 },
  saat: { fontSize: 11, color: colors.metinSoluk, alignSelf: 'flex-end' },
  hata: { color: colors.kirmiziAcik, fontWeight: '600', paddingHorizontal: spacing.l, paddingBottom: spacing.s },
  giris: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.s, paddingHorizontal: spacing.l, paddingTop: spacing.s, paddingBottom: spacing.l },
  girdi: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.yuzey,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.cizgi,
    paddingHorizontal: spacing.m,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: fontSize.normal + 1,
    color: colors.metin,
  },
  gonder: { width: 48, height: 48, borderRadius: radius.tam, backgroundColor: colors.sari, alignItems: 'center', justifyContent: 'center' },
});
