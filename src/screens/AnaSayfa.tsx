import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AsciKarti from '../components/AsciKarti';
import Ekran from '../components/Ekran';
import { UZMANLIKLAR } from '../data/secenekler';
import { supabase } from '../lib/supabase';
import { EN_AZ_YORUM, Vitrin, enSevilenAscilar, vitrindenKarta, yeniAscilar } from '../lib/vitrin';
import { colors, fontSize, radius, spacing } from '../theme';
import { sebep } from '../lib/hata';

type Props = { asciAc: (id: string) => void; talepEt: () => void };

const KENAR = spacing.l;
const bosluk = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

export default function AnaSayfa({ asciAc, talepEt }: Props) {
  const { profil, oturum } = useAuth();
  const { width } = useWindowDimensions();
  const ikiliGenislik = (width - KENAR * 2 - spacing.m) / 2;

  const [tumu, setTumu] = useState<Vitrin[]>([]);
  const [sevilenler, setSevilenler] = useState<Vitrin[]>([]);
  const [durum, setDurum] = useState('');
  const [arama, setArama] = useState('');
  const [kategori, setKategori] = useState<string | null>(null);
  const [asciDurumu, setAsciDurumu] = useState<{ onayli: boolean; reddedildi: boolean; neden: string | null } | null>(null);

  useEffect(() => {
    Promise.all([yeniAscilar(), enSevilenAscilar()])
      .then(([hepsi, sevilen]) => {
        setTumu(hepsi);
        setSevilenler(sevilen);
        setDurum(hepsi.length === 0 ? 'Henüz profili kaydedilmiş aşçı yok.' : '');
      })
      .catch((e: unknown) => setDurum(`Aşçı listesi yüklenemedi. İnternetini kontrol edip tekrar dene.${sebep(e)}`));
  }, []);

  useEffect(() => {
    if (profil?.rol !== 'asci') return;
    supabase
      .from('asci_profilleri')
      .select('onayli_mi, reddedildi_mi, red_nedeni')
      .eq('profil_id', oturum?.user.id ?? '')
      .maybeSingle()
      .then(({ data }) =>
        setAsciDurumu(data ? { onayli: data.onayli_mi, reddedildi: data.reddedildi_mi, neden: data.red_nedeni } : null),
      );
  }, [profil?.rol, oturum?.user.id]);

  const suzulen = useMemo(() => {
    const a = bosluk(arama);
    return tumu.filter(
      (v) =>
        (!kategori || v.uzmanliklar.includes(kategori)) &&
        (!a || bosluk(`${v.ad} ${v.uzmanliklar.join(' ')} ${v.semtler.join(' ')}`).includes(a)),
    );
  }, [tumu, arama, kategori]);

  const filtreVar = arama.trim() !== '' || kategori !== null;
  const ilkAd = profil?.ad.split(' ')[0] ?? '';

  return (
    <Ekran>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.l }} keyboardShouldPersistTaps="handled">
        <View style={styles.ust}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <View style={{ flex: 1 }}>
            <Text style={styles.merhaba}>Merhaba, {ilkAd}</Text>
            <Text style={styles.slogan}>Ev yemeği, şef elinden.</Text>
          </View>
        </View>

        <View style={styles.arama}>
          <Ionicons name="search" size={20} color={colors.metinSoluk} />
          <TextInput
            style={styles.aramaGirdi}
            value={arama}
            onChangeText={setArama}
            placeholder="Aşçı, mutfak veya semt ara"
            placeholderTextColor={colors.metinSoluk}
            selectionColor={colors.sari}
            returnKeyType="search"
          />
          {arama ? (
            <Pressable onPress={() => setArama('')} accessibilityLabel="Aramayı temizle" hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.metinSoluk} />
            </Pressable>
          ) : null}
        </View>

        {profil?.rol === 'asci' && asciDurumu && !asciDurumu.onayli ? (
          <View style={styles.uyari}>
            <Ionicons name="information-circle" size={22} color={colors.koyuMetin} />
            <Text style={styles.uyariYazi}>
              {asciDurumu.reddedildi
                ? `Profilin onaylanmadı.${asciDurumu.neden ? ` Neden: ${asciDurumu.neden}` : ''} Profilini düzenleyip kaydedersen yeniden incelenir.`
                : 'Profilin yönetici onayı bekliyor. Onaylanana kadar müşteriler seni göremez ve talep gönderemez.'}
            </Text>
          </View>
        ) : null}

        {profil?.rol === 'musteri' ? (
          <Pressable
            onPress={talepEt}
            style={({ pressed }) => [styles.talep, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Ionicons name="restaurant" size={26} color={colors.koyuMetin} />
            <View style={{ flex: 1 }}>
              <Text style={styles.talepBaslik}>Hemen Aşçı Talep Et</Text>
              <Text style={styles.talepAlt}>Aşçı evinize gelsin, yemekler orada pişsin</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={32} color={colors.koyuMetin} />
          </Pressable>
        ) : null}

        <FlatList
          horizontal
          data={[null, ...UZMANLIKLAR]}
          keyExtractor={(k) => k ?? 'tumu'}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.kategoriler}
          renderItem={({ item }) => {
            const acik = item === kategori;
            return (
              <Pressable onPress={() => setKategori(item)} style={[styles.kategori, acik && styles.kategoriAcik]}>
                <Text style={[styles.kategoriYazi, acik && { color: colors.koyuMetin }]}>{item ?? 'Tümü'}</Text>
              </Pressable>
            );
          }}
        />

        {!filtreVar ? (
          <>
            <Text style={styles.bolum}>En Sevilen Aşçılar</Text>
            {sevilenler.length > 0 ? (
              <FlatList
                horizontal
                data={sevilenler}
                keyExtractor={(a) => a.id}
                renderItem={({ item }) => (
                  <AsciKarti asci={vitrindenKarta(item)} genislik={170} onPress={() => asciAc(item.id)} />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: KENAR }}
                ItemSeparatorComponent={() => <View style={{ width: spacing.m }} />}
              />
            ) : (
              <Text style={styles.durum}>
                Aşçılar en az {EN_AZ_YORUM} yorum aldığında en yüksek puanlılar burada listelenecek.
              </Text>
            )}
          </>
        ) : null}

        <Text style={styles.bolum}>{filtreVar ? 'Sonuçlar' : 'Aşçılarımız'}</Text>
        {durum ? <Text style={styles.durum}>{durum}</Text> : null}
        {!durum && suzulen.length === 0 ? <Text style={styles.durum}>Aramana uyan aşçı bulunamadı.</Text> : null}
        <View style={styles.izgara}>
          {suzulen.map((v) => (
            <AsciKarti key={v.id} asci={vitrindenKarta(v)} genislik={ikiliGenislik} onPress={() => asciAc(v.id)} />
          ))}
        </View>
      </ScrollView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  ust: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingHorizontal: KENAR, paddingBottom: spacing.m },
  logo: { width: 56, height: 56, borderRadius: radius.tam },
  merhaba: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin },
  slogan: { fontSize: fontSize.kucuk, color: colors.metinSoluk, marginTop: 2 },
  arama: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginHorizontal: KENAR,
    backgroundColor: colors.yuzey,
    borderRadius: radius.tam,
    borderWidth: 1,
    borderColor: colors.cizgi,
    paddingHorizontal: spacing.m,
  },
  aramaGirdi: { flex: 1, paddingVertical: 14, fontSize: fontSize.normal, color: colors.metin },
  uyari: {
    flexDirection: 'row',
    gap: spacing.s,
    alignItems: 'flex-start',
    marginHorizontal: KENAR,
    marginTop: spacing.m,
    backgroundColor: colors.sari,
    borderRadius: radius.m,
    padding: spacing.m,
  },
  uyariYazi: { flex: 1, fontSize: fontSize.kucuk + 1, fontWeight: '600', color: colors.koyuMetin },
  talep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginHorizontal: KENAR,
    marginTop: spacing.m,
    backgroundColor: colors.sari,
    borderRadius: radius.l,
    padding: spacing.m + 4,
  },
  talepBaslik: { fontSize: fontSize.normal + 4, fontWeight: '800', color: colors.koyuMetin },
  talepAlt: { fontSize: 13, color: colors.koyuMetin, opacity: 0.8, marginTop: 2 },
  kategoriler: { paddingHorizontal: KENAR, gap: spacing.s, paddingVertical: spacing.m },
  kategori: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: radius.tam,
    backgroundColor: colors.yuzey,
    borderWidth: 1,
    borderColor: colors.cizgi,
  },
  kategoriAcik: { backgroundColor: colors.sari, borderColor: colors.sari },
  kategoriYazi: { fontSize: fontSize.kucuk, fontWeight: '700', color: colors.metin },
  bolum: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.metin, marginTop: spacing.m, marginBottom: spacing.m, marginHorizontal: KENAR },
  durum: { marginHorizontal: KENAR, fontSize: fontSize.kucuk, color: colors.metinSoluk },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m, paddingHorizontal: KENAR },
});
