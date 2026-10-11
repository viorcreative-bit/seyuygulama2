import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Rol, useAuth } from '../auth/AuthContext';
import { yeniFirsatSayisi } from '../lib/kurumsal';
import { okunmamisSayisi } from '../lib/sohbet';
import { bekleyenTalepSayisi } from '../lib/talepler';
import { colors, fontSize, radius, spacing } from '../theme';

export type Sekme = 'ana' | 'taleplerim' | 'gelenTalepler' | 'mesajlar' | 'asciYorumlari' | 'hesap';

type Oge = { sekme: Sekme; yazi: string; simge: keyof typeof Ionicons.glyphMap; aktifSimge: keyof typeof Ionicons.glyphMap };

const MUSTERI: Oge[] = [
  { sekme: 'ana', yazi: 'Ana Sayfa', simge: 'home-outline', aktifSimge: 'home' },
  { sekme: 'taleplerim', yazi: 'Taleplerim', simge: 'receipt-outline', aktifSimge: 'receipt' },
  { sekme: 'mesajlar', yazi: 'Mesajlar', simge: 'chatbubbles-outline', aktifSimge: 'chatbubbles' },
  { sekme: 'hesap', yazi: 'Hesabım', simge: 'person-outline', aktifSimge: 'person' },
];

const ASCI: Oge[] = [
  { sekme: 'ana', yazi: 'Ana Sayfa', simge: 'home-outline', aktifSimge: 'home' },
  { sekme: 'gelenTalepler', yazi: 'Talepler', simge: 'receipt-outline', aktifSimge: 'receipt' },
  { sekme: 'mesajlar', yazi: 'Mesajlar', simge: 'chatbubbles-outline', aktifSimge: 'chatbubbles' },
  { sekme: 'asciYorumlari', yazi: 'Yorumlar', simge: 'star-outline', aktifSimge: 'star' },
  { sekme: 'hesap', yazi: 'Hesabım', simge: 'person-outline', aktifSimge: 'person' },
];

type Props = { rol: Rol; aktif: Sekme; sec: (s: Sekme) => void };

// Ekranın altındaki ana gezinme çubuğu.
export default function AltMenu({ rol, aktif, sec }: Props) {
  const ogeler = rol === 'asci' ? ASCI : MUSTERI;
  const { oturum } = useAuth();
  const [bekleyen, setBekleyen] = useState(0);
  const [mesajSayisi, setMesajSayisi] = useState(0);

  // Okunmamış mesaj sayısı (rozet için) birkaç saniyede bir yenilenir.
  useEffect(() => {
    if (!oturum) return;
    const getir = () => okunmamisSayisi().then(setMesajSayisi);
    getir();
    const t = setInterval(getir, 10000);
    return () => clearInterval(t);
  }, [oturum, aktif]);

  useEffect(() => {
    if (rol !== 'asci' || !oturum) return;
    Promise.all([bekleyenTalepSayisi(), yeniFirsatSayisi(oturum.user.id)]).then(([a, b]) => setBekleyen(a + b));
  }, [rol, aktif, oturum]);

  return (
    <View style={styles.dis}>
      <View style={styles.kap}>
        {ogeler.map((o) => {
          const acik = o.sekme === aktif;
          return (
            <Pressable
              key={o.sekme}
              onPress={() => sec(o.sekme)}
              style={styles.oge}
              accessibilityRole="tab"
              accessibilityState={{ selected: acik }}
            >
              <View>
                <Ionicons name={acik ? o.aktifSimge : o.simge} size={24} color={acik ? colors.sari : colors.metinSoluk} />
                {(() => {
                  const n = o.sekme === 'gelenTalepler' ? bekleyen : o.sekme === 'mesajlar' ? mesajSayisi : 0;
                  return n > 0 ? (
                    <View style={styles.rozet}>
                      <Text style={styles.rozetYazi}>{n > 9 ? '9+' : n}</Text>
                    </View>
                  ) : null;
                })()}
              </View>
              <Text style={[styles.yazi, acik && { color: colors.sari, fontWeight: '700' }]}>{o.yazi}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dis: { paddingHorizontal: spacing.m, paddingBottom: spacing.l, paddingTop: spacing.s },
  kap: {
    flexDirection: 'row',
    backgroundColor: colors.yuzey,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.cizgi,
    paddingVertical: 10,
  },
  oge: { flex: 1, alignItems: 'center', gap: 2 },
  yazi: { fontSize: 12, color: colors.metinSoluk },
  rozet: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: radius.tam,
    backgroundColor: colors.kirmizi,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  rozetYazi: { color: colors.metin, fontSize: 11, fontWeight: '800' },
});
