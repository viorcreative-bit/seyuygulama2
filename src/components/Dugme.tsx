import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius } from '../theme';

type Props = {
  yazi: string;
  onPress: () => void;
  yukleniyor?: boolean;
  pasif?: boolean;
  /** Yazı gibi görünen, zemini olmayan düğme */
  ikincil?: boolean;
  /** Sarı çerçeveli düğme */
  cerceveli?: boolean;
  /** Dikkat çeken kırmızı çerçeveli düğme (silme, iptal gibi) */
  tehlike?: boolean;
};

export default function Dugme({ yazi, onPress, yukleniyor, pasif, ikincil, cerceveli, tehlike }: Props) {
  const kapali = pasif || yukleniyor;
  const doldur = !ikincil && !cerceveli && !tehlike;
  const yaziRengi = doldur ? colors.koyuMetin : tehlike ? colors.kirmiziAcik : colors.sari;
  return (
    <Pressable
      onPress={onPress}
      disabled={kapali}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.buton,
        doldur && styles.dolu,
        cerceveli && styles.cerceveli,
        tehlike && styles.tehlike,
        kapali && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {yukleniyor ? (
        <ActivityIndicator color={yaziRengi} />
      ) : (
        <Text style={[styles.yazi, { color: yaziRengi }]}>{yazi}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buton: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: radius.tam, alignItems: 'center', justifyContent: 'center' },
  dolu: { backgroundColor: colors.sari },
  cerceveli: { borderWidth: 2, borderColor: colors.sari },
  tehlike: { borderWidth: 2, borderColor: colors.kirmiziAcik },
  yazi: { fontSize: fontSize.normal + 2, fontWeight: '800' },
});
