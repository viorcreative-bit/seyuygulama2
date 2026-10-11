import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Yemek, asciYemekleri, malzemeListesi } from '../lib/yemekler';
import { colors, fontSize, radius, spacing } from '../theme';
import Dugme from './Dugme';
import Girdi from './Girdi';

type Props = {
  asciId: string;
  /** Yemek eklemeden önce aşçı profil satırının var olması gerekir. */
  profilHazirla: () => Promise<void>;
};

// Aşçının yapacağı yemekleri ve kullanacağı malzemeleri eklediği/düzenlediği bölüm.
export default function YemekDuzenleyici({ asciId, profilHazirla }: Props) {
  const [liste, setListe] = useState<Yemek[]>([]);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [ad, setAd] = useState('');
  const [malzemeler, setMalzemeler] = useState('');
  const [hata, setHata] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    asciYemekleri(asciId).then(setListe).catch(() => setHata('Yemekler yüklenemedi.'));
  }, [asciId]);

  const temizle = () => {
    setDuzenlenen(null);
    setAd('');
    setMalzemeler('');
    setHata('');
  };

  const kaydet = async () => {
    if (ad.trim().length < 2) return setHata('Yemeğin adını yaz.');
    if (malzemeListesi(malzemeler).length === 0) return setHata('Kullanacağın malzemeleri virgülle ayırarak yaz.');
    setHata('');
    setKaydediliyor(true);
    try {
      if (duzenlenen) {
        const { error } = await supabase
          .from('asci_yemekleri')
          .update({ ad: ad.trim(), malzemeler: malzemeler.trim() })
          .eq('id', duzenlenen);
        if (error) throw error;
        setListe((l) => l.map((y) => (y.id === duzenlenen ? { ...y, ad: ad.trim(), malzemeler: malzemeler.trim() } : y)));
      } else {
        await profilHazirla();
        const { data, error } = await supabase
          .from('asci_yemekleri')
          .insert({ asci_id: asciId, ad: ad.trim(), malzemeler: malzemeler.trim(), sira: liste.length })
          .select('id, ad, malzemeler, sira')
          .single();
        if (error) throw error;
        setListe((l) => [...l, data as Yemek]);
      }
      temizle();
    } catch (e) {
      const m = e instanceof Error ? e.message : (e as { message?: string })?.message ?? '';
      setHata(m.includes('En fazla 40') ? 'En fazla 40 yemek ekleyebilirsin.' : 'Kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setKaydediliyor(false);
    }
  };

  const sil = (y: Yemek) =>
    Alert.alert('Yemeği sil', `"${y.ad}" yemeğini kaldırmak istiyor musun?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('asci_yemekleri').delete().eq('id', y.id);
          if (!error) {
            setListe((l) => l.filter((x) => x.id !== y.id));
            if (duzenlenen === y.id) temizle();
          }
        },
      },
    ]);

  return (
    <View style={{ gap: spacing.s }}>
      {liste.map((y) => (
        <View key={y.id} style={styles.kart}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ad}>{y.ad}</Text>
            <Text style={styles.malzeme}>{malzemeListesi(y.malzemeler).join(', ')}</Text>
          </View>
          <Pressable onPress={() => { setDuzenlenen(y.id); setAd(y.ad); setMalzemeler(y.malzemeler); setHata(''); }} hitSlop={8} accessibilityLabel="Düzenle">
            <Ionicons name="create-outline" size={22} color={colors.sari} />
          </Pressable>
          <Pressable onPress={() => sil(y)} hitSlop={8} accessibilityLabel="Sil">
            <Ionicons name="trash-outline" size={22} color={colors.kirmiziAcik} />
          </Pressable>
        </View>
      ))}

      <View style={styles.form}>
        <Text style={styles.formBaslik}>{duzenlenen ? 'Yemeği düzenle' : 'Yeni yemek ekle'}</Text>
        <Girdi value={ad} onChangeText={setAd} placeholder="Yemeğin adı (örn. Izgara köfte)" maxLength={80} />
        <Girdi
          style={{ height: 90 }}
          value={malzemeler}
          onChangeText={setMalzemeler}
          placeholder="Kullanacağın malzemeler, virgülle ayır (örn. dana kıyma, soğan, galeta unu, maydanoz)"
          multiline
          maxLength={600}
        />
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <Dugme yazi={duzenlenen ? 'Değişikliği Kaydet' : 'Yemeği Ekle'} onPress={kaydet} yukleniyor={kaydediliyor} />
        {duzenlenen ? <Dugme yazi="Vazgeç" cerceveli onPress={temizle} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.yuzey,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.cizgi,
    padding: spacing.m,
  },
  ad: { color: colors.metin, fontWeight: '800', fontSize: fontSize.normal },
  malzeme: { color: colors.metinSoluk, fontSize: 13, marginTop: 2 },
  form: { gap: spacing.s, backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.sari, padding: spacing.m },
  formBaslik: { color: colors.sari, fontWeight: '800', fontSize: fontSize.normal },
  hata: { color: colors.kirmiziAcik, fontWeight: '600' },
});
