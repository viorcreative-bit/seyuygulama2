import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius } from '../theme';

type Props = { yazi: string; onPress: () => void; yukleniyor?: boolean; pasif?: boolean; ikincil?: boolean; cerceveli?: boolean };

export default function Dugme({ yazi, onPress, yukleniyor, pasif, ikincil, cerceveli }: Props) {
  const kapali = pasif || yukleniyor;
  return (
    <Pressable
      onPress={onPress}
      disabled={kapali}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.buton,
        ikincil && styles.ikincil,
        cerceveli && styles.cerceveli,
        kapali && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {yukleniyor ? (
        <ActivityIndicator color={ikincil || cerceveli ? colors.kirmizi : colors.sari} />
      ) : (
        <Text style={[styles.yazi, (ikincil || cerceveli) && { color: colors.kirmizi }]}>{yazi}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buton: {
    paddingVertical: 16,
    borderRadius: radius.l,
    backgroundColor: colors.kirmizi,
    alignItems: 'center',
  },
  ikincil: { backgroundColor: 'transparent' },
  cerceveli: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.kirmizi },
  yazi: { color: colors.sari, fontSize: fontSize.normal + 2, fontWeight: '800' },
});
