import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AVATARLAR } from '../data/avatarlar';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = { secili: string | null; degisti: (anahtar: string | null) => void };

// Kayıt ekranında kendine bir avatar seçtiren sıra (3 kadın, 3 erkek). İsteğe bağlıdır; yeniden dokununca seçim kalkar.
export default function AvatarSecici({ secili, degisti }: Props) {
  return (
    <View style={{ gap: spacing.s }}>
      <Text style={styles.baslik}>Avatarını seç</Text>
      <View style={styles.izgara}>
        {AVATARLAR.map((a) => {
          const acik = a.anahtar === secili;
          return (
            <Pressable
              key={a.anahtar}
              onPress={() => degisti(acik ? null : a.anahtar)}
              style={[styles.oge, acik && styles.ogeAcik]}
              accessibilityRole="button"
              accessibilityLabel={a.ad}
              accessibilityState={{ selected: acik }}
            >
              <Image source={a.kaynak} style={styles.resim} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.ipucu}>İsteğe bağlı. Daha sonra istersen kendi fotoğrafını ekleyebilirsin.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baslik: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.s },
  oge: { width: '31%', aspectRatio: 1, borderRadius: radius.tam, borderWidth: 3, borderColor: colors.cizgi, padding: 2 },
  ogeAcik: { borderColor: colors.sari },
  resim: { width: '100%', height: '100%', borderRadius: radius.tam },
  ipucu: { fontSize: 13, color: colors.metinSoluk },
});
