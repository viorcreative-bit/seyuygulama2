import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  /** Sohbeti açıp kimliğini döner (talep ya da teklif üzerinden). */
  ac: () => Promise<string>;
  /** Sohbet açıldığında çağrılır. */
  git: (sohbetId: string) => void;
  yazi?: string;
};

// "Mesaj Gönder" düğmesi: ilgili talep/teklif için sohbeti açar ve sohbet ekranına geçirir.
export default function MesajDugmesi({ ac, git, yazi = 'Mesaj Gönder' }: Props) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const bas = async () => {
    setYukleniyor(true);
    try {
      git(await ac());
    } catch {
      Alert.alert('Sohbet açılamadı', 'İnternetini kontrol edip tekrar dene.');
    } finally {
      setYukleniyor(false);
    }
  };
  return (
    <Pressable onPress={bas} disabled={yukleniyor} style={({ pressed }) => [styles.dugme, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      {yukleniyor ? <ActivityIndicator color={colors.sari} /> : <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.sari} />}
      <Text style={styles.yazi}>{yazi}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dugme: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    borderWidth: 2,
    borderColor: colors.sari,
    borderRadius: radius.tam,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  yazi: { color: colors.sari, fontWeight: '800', fontSize: fontSize.kucuk + 1 },
});
