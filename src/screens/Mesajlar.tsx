import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Bos from '../components/Bos';
import Ekran from '../components/Ekran';
import ProfilResmi from '../components/ProfilResmi';
import { SohbetOzeti, sohbetler } from '../lib/sohbet';
import { tarihSaatYaz } from '../lib/talepler';
import { colors, fontSize, radius, spacing } from '../theme';

// Gün içindeyse saat, değilse tarih.
function zamanYaz(iso: string | null): string {
  if (!iso) return '';
  const y = tarihSaatYaz(iso);
  return y.slice(0, 10) === tarihSaatYaz(new Date().toISOString()).slice(0, 10) ? y.slice(11) : y.slice(0, 10);
}

// Mesajlar sekmesi: kişinin tüm sohbetleri.
export default function Mesajlar({ ac }: { ac: (s: SohbetOzeti) => void }) {
  const [liste, setListe] = useState<SohbetOzeti[] | null>(null);
  const [hata, setHata] = useState('');

  const yukle = useCallback(async () => {
    try {
      setListe(await sohbetler());
      setHata('');
    } catch {
      setHata('Mesajlar yüklenemedi. İnternetini kontrol edip tekrar dene.');
    }
  }, []);

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 10000);
    return () => clearInterval(t);
  }, [yukle]);

  return (
    <Ekran baslik="Mesajlar">
      <FlatList
        data={liste ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.l, paddingTop: 0, gap: spacing.s }}
        ListEmptyComponent={
          hata ? (
            <Bos mesaj={hata} simge="cloud-offline-outline" />
          ) : !liste ? (
            <Bos yukleniyor />
          ) : (
            <Bos
              mesaj="Henüz sohbetin yok. Bir aşçıdan teklif aldığında veya bir talep oluşturduğunda, talebinden 'Mesaj Gönder' ile sohbet başlatabilirsin."
              simge="chatbubbles-outline"
            />
          )
        }
        renderItem={({ item: s }) => (
          <Pressable onPress={() => ac(s)} style={({ pressed }) => [styles.satir, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <ProfilResmi uri={s.diger_foto} kimlik={s.diger_id} style={styles.foto} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.ustSatir}>
                <Text style={styles.ad} numberOfLines={1}>{s.diger_ad}</Text>
                <Text style={styles.zaman}>{zamanYaz(s.son_mesaj_tarihi)}</Text>
              </View>
              <View style={styles.ustSatir}>
                <Text style={[styles.mesaj, s.okunmamis > 0 && { color: colors.metin, fontWeight: '700' }]} numberOfLines={1}>
                  {s.son_mesaj ?? 'Henüz mesaj yok. Yazarak başla.'}
                </Text>
                {s.okunmamis > 0 ? (
                  <View style={styles.rozet}>
                    <Text style={styles.rozetYazi}>{s.okunmamis > 9 ? '9+' : s.okunmamis}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        )}
      />
    </Ekran>
  );
}

const styles = StyleSheet.create({
  satir: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m },
  foto: { width: 54, height: 54, borderRadius: radius.tam },
  ustSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s },
  ad: { flex: 1, fontSize: fontSize.normal + 1, fontWeight: '800', color: colors.metin },
  zaman: { fontSize: 12, color: colors.metinSoluk },
  mesaj: { flex: 1, fontSize: fontSize.kucuk + 1, color: colors.metinSoluk },
  rozet: { minWidth: 22, height: 22, borderRadius: radius.tam, backgroundColor: colors.kirmizi, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  rozetYazi: { color: colors.metin, fontSize: 12, fontWeight: '800' },
});
