import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = { baslik: string; aciklama?: string; geri?: () => void; logoBoyu?: number; children: React.ReactNode };

// Giriş, kayıt ve şifre ekranlarının ortak çerçevesi: logo, başlık, açıklama ve form alanı.
export default function GirisKabuk({ baslik, aciklama, geri, logoBoyu = 130, children }: Props) {
  return (
    <View style={styles.kap}>
      <LinearGradient colors={[colors.zeminUst, colors.zemin]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          {geri ? (
            <Pressable onPress={geri} style={styles.geri} accessibilityRole="button" accessibilityLabel="Geri">
              <Ionicons name="chevron-back" size={22} color={colors.metin} />
            </Pressable>
          ) : null}
          <Image source={require('../../assets/logo.png')} style={[styles.logo, { width: logoBoyu, height: logoBoyu }]} />
          <Text style={styles.baslik}>{baslik}</Text>
          {aciklama ? <Text style={styles.aciklama}>{aciklama}</Text> : null}
          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.zemin },
  icerik: { flexGrow: 1, justifyContent: 'center', padding: spacing.l, paddingTop: 72 },
  geri: {
    position: 'absolute',
    top: 56,
    left: spacing.l,
    width: 42,
    height: 42,
    borderRadius: radius.tam,
    backgroundColor: colors.yuzey,
    borderWidth: 1,
    borderColor: colors.cizgi,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logo: { alignSelf: 'center', borderRadius: radius.tam },
  baslik: { fontSize: fontSize.buyuk + 4, fontWeight: '800', color: colors.metin, textAlign: 'center', marginTop: spacing.m },
  aciklama: { fontSize: fontSize.normal, color: colors.metinSoluk, textAlign: 'center', marginTop: spacing.s, lineHeight: 22 },
  form: { gap: spacing.m, marginTop: spacing.l },
});
