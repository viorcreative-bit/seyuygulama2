import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fontSize, radius, spacing } from '../theme';

type Reklam = { id: string; baslik: string; reklamveren: string; gorsel_adres: string; hedef_adres: string | null };

const YENILEME_MS = 5 * 60 * 1000;
const DONUS_MS = 6000;
let onbellek: { zaman: number; liste: Reklam[] } | null = null;
const gosterilenler = new Set<string>(); // her reklam, uygulama açıkken bir kez "gösterildi" sayılır

async function reklamlariGetir(): Promise<Reklam[]> {
  if (onbellek && Date.now() - onbellek.zaman < YENILEME_MS) return onbellek.liste;
  // Yayında olmayan reklamları veritabanı zaten döndürmez (güvenlik kuralı).
  const { data } = await supabase
    .from('reklamlar')
    .select('id, baslik, reklamveren, gorsel_adres, hedef_adres')
    .order('sira', { ascending: true })
    .order('olusturma_tarihi', { ascending: false })
    .limit(10);
  const liste = (data as Reklam[] | null) ?? [];
  onbellek = { zaman: Date.now(), liste };
  return liste;
}

// Alt menünün üstünde dönen reklam bandı. Yayında reklam yoksa hiçbir şey göstermez.
export default function ReklamBandi() {
  const { width } = useWindowDimensions();
  const [liste, setListe] = useState<Reklam[]>(onbellek?.liste ?? []);
  const [sira, setSira] = useState(0);

  useEffect(() => {
    let acik = true;
    reklamlariGetir().then((l) => acik && setListe(l)).catch(() => {});
    return () => {
      acik = false;
    };
  }, []);

  useEffect(() => {
    if (liste.length < 2) return;
    const t = setInterval(() => setSira((s) => (s + 1) % liste.length), DONUS_MS);
    return () => clearInterval(t);
  }, [liste.length]);

  const reklam = liste.length > 0 ? liste[sira % liste.length] : null;

  useEffect(() => {
    if (reklam && !gosterilenler.has(reklam.id)) {
      gosterilenler.add(reklam.id);
      supabase.rpc('reklam_goster', { p_id: reklam.id }).then(() => {}, () => {});
    }
  }, [reklam]);

  if (!reklam) return null;

  const genislik = width - spacing.m * 2;
  const tikla = () => {
    if (!reklam.hedef_adres) return;
    supabase.rpc('reklam_tikla', { p_id: reklam.id }).then(() => {}, () => {});
    Linking.openURL(reklam.hedef_adres).catch(() => {});
  };

  return (
    <View style={styles.kap}>
      <Pressable
        onPress={tikla}
        disabled={!reklam.hedef_adres}
        accessibilityRole={reklam.hedef_adres ? 'link' : 'image'}
        accessibilityLabel={`Reklam: ${reklam.baslik}`}
        style={[styles.banner, { width: genislik, height: genislik / 4 }]}
      >
        <Image source={{ uri: reklam.gorsel_adres }} style={styles.gorsel} resizeMode="cover" />
        <View style={styles.etiket}>
          <Text style={styles.etiketYazi}>Reklam</Text>
        </View>
      </Pressable>
      {liste.length > 1 ? (
        <View style={styles.noktalar}>
          {liste.map((r, i) => (
            <View key={r.id} style={[styles.nokta, i === sira % liste.length && styles.noktaAktif]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { alignItems: 'center', paddingTop: spacing.s },
  banner: { borderRadius: radius.m, overflow: 'hidden', backgroundColor: colors.yuzey, borderWidth: 1, borderColor: colors.cizgi },
  gorsel: { width: '100%', height: '100%' },
  etiket: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.zemin,
    borderRadius: radius.tam,
    paddingVertical: 2,
    paddingHorizontal: 8,
    opacity: 0.85,
  },
  etiketYazi: { color: colors.metinSoluk, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  noktalar: { flexDirection: 'row', gap: 5, paddingTop: 6 },
  nokta: { width: 6, height: 6, borderRadius: radius.tam, backgroundColor: colors.cizgi },
  noktaAktif: { backgroundColor: colors.sari },
});
