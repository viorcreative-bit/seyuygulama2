import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import Dugme from '../components/Dugme';
import Ekran from '../components/Ekran';
import Girdi from '../components/Girdi';
import Secimler from '../components/Secimler';
import { GUNLER, UZMANLIKLAR } from '../data/secenekler';
import { fotografSecVeYukle } from '../lib/fotograf';
import { supabase } from '../lib/supabase';
import { colors, fontSize, radius, spacing } from '../theme';

type Foto = { id: string; adres: string };

export default function AsciProfilDuzenle({ geri }: { geri: () => void }) {
  const { oturum, profil, profilYenile } = useAuth();
  const uid = oturum!.user.id;

  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [ad, setAd] = useState(profil?.ad ?? '');
  const [profilFoto, setProfilFoto] = useState<string | null>(null);
  const [tanitim, setTanitim] = useState('');
  const [uzmanliklar, setUzmanliklar] = useState<string[]>([]);
  const [semtler, setSemtler] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [gunler, setGunler] = useState<string[]>([]);
  const [kurumsal, setKurumsal] = useState(false);
  const [kapasite, setKapasite] = useState('');
  const [galeri, setGaleri] = useState<Foto[]>([]);
  const [fotoYukleniyor, setFotoYukleniyor] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, a, f] = await Promise.all([
        supabase.from('profiles').select('fotograf').eq('id', uid).maybeSingle(),
        supabase.from('asci_profilleri').select('*').eq('profil_id', uid).maybeSingle(),
        supabase.from('asci_fotograflari').select('id, adres').eq('asci_id', uid).order('sira').order('olusturma_tarihi'),
      ]);
      setProfilFoto(p.data?.fotograf ?? null);
      if (a.data) {
        setTanitim(a.data.tanitim ?? '');
        setUzmanliklar(a.data.uzmanliklar ?? []);
        setSemtler((a.data.semtler ?? []).join(', '));
        setFiyat(a.data.baslangic_fiyati != null ? String(a.data.baslangic_fiyati) : '');
        setGunler(a.data.musait_gunler ?? []);
        setKurumsal(a.data.kurumsal_mi ?? false);
        setKapasite(a.data.kurumsal_kapasite != null ? String(a.data.kurumsal_kapasite) : '');
      }
      setGaleri((f.data as Foto[]) ?? []);
      setYukleniyor(false);
    })();
  }, [uid]);

  const fotoHatasi = (e: unknown) =>
    Alert.alert(
      'Fotoğraf yüklenemedi',
      e instanceof Error && e.message === 'izin'
        ? 'Galerine erişim izni vermen gerekiyor. Telefonun ayarlarından izin verebilirsin.'
        : 'Lütfen tekrar dene.',
    );

  const profilFotoDegistir = async () => {
    try {
      setFotoYukleniyor(true);
      const adres = await fotografSecVeYukle(uid, true);
      if (adres) {
        const { error } = await supabase.from('profiles').update({ fotograf: adres }).eq('id', uid);
        if (error) throw error;
        setProfilFoto(adres);
      }
    } catch (e) {
      fotoHatasi(e);
    } finally {
      setFotoYukleniyor(false);
    }
  };

  // Galeriye fotoğraf eklemek için aşçı profil satırının var olması gerekir; önce kaydet.
  const galeriyeEkle = async () => {
    try {
      setFotoYukleniyor(true);
      await profilKaydet();
      const adres = await fotografSecVeYukle(uid, false);
      if (adres) {
        const { data, error } = await supabase
          .from('asci_fotograflari')
          .insert({ asci_id: uid, adres, sira: galeri.length })
          .select('id, adres')
          .single();
        if (error) throw error;
        setGaleri((g) => [...g, data as Foto]);
      }
    } catch (e) {
      fotoHatasi(e);
    } finally {
      setFotoYukleniyor(false);
    }
  };

  const fotoSil = (foto: Foto) =>
    Alert.alert('Fotoğrafı sil', 'Bu fotoğrafı galeriden kaldırmak istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('asci_fotograflari').delete().eq('id', foto.id);
          if (!error) setGaleri((g) => g.filter((x) => x.id !== foto.id));
        },
      },
    ]);

  const profilKaydet = async () => {
    const semtListesi = semtler.split(',').map((s) => s.trim()).filter(Boolean);
    const fiyatSayi = fiyat.trim() === '' ? null : parseInt(fiyat.replace(/\D/g, ''), 10);
    const [a, b] = await Promise.all([
      supabase.from('asci_profilleri').upsert({
        profil_id: uid,
        tanitim: tanitim.trim(),
        uzmanliklar,
        semtler: semtListesi,
        baslangic_fiyati: fiyatSayi,
        musait_gunler: gunler,
        kurumsal_mi: kurumsal,
        kurumsal_kapasite: kurumsal && kapasite.trim() ? parseInt(kapasite.replace(/\D/g, ''), 10) : null,
        guncelleme_tarihi: new Date().toISOString(),
      }),
      supabase.from('profiles').update({ ad: ad.trim() }).eq('id', uid),
    ]);
    if (a.error || b.error) throw a.error ?? b.error;
  };

  const kaydet = async () => {
    if (ad.trim().length < 2) {
      setHata('Lütfen adını soyadını yaz.');
      return;
    }
    const kap = kapasite.trim() ? parseInt(kapasite.replace(/\D/g, ''), 10) : null;
    if (kurumsal && kap !== null && (!kap || kap < 10 || kap > 5000)) {
      setHata('Kurumsal kapasite 10 ile 5000 kişi arasında olmalı.');
      return;
    }
    setHata('');
    setKaydediliyor(true);
    try {
      await profilKaydet();
      await profilYenile();
      Alert.alert('Kaydedildi', 'Profilin güncellendi.', [{ text: 'Tamam', onPress: geri }]);
    } catch {
      setHata('Kaydedilemedi. İnternetini kontrol edip tekrar dene.');
    } finally {
      setKaydediliyor(false);
    }
  };

  if (yukleniyor) {
    return (
      <Ekran baslik="Profilim" geri={geri}>
        <ActivityIndicator size="large" color={colors.sari} style={{ marginTop: 60 }} />
      </Ekran>
    );
  }

  return (
    <Ekran baslik="Profilim" geri={geri}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Pressable onPress={profilFotoDegistir} style={styles.fotoAlan}>
            {profilFoto ? (
              <Image source={{ uri: profilFoto }} style={styles.profilFoto} />
            ) : (
              <View style={[styles.profilFoto, styles.fotoBos]}>
                <Ionicons name="camera" size={34} color={colors.sari} />
              </View>
            )}
            <Text style={styles.fotoLink}>{profilFoto ? 'Fotoğrafı değiştir' : 'Profil fotoğrafı seç'}</Text>
          </Pressable>

          <Text style={styles.etiket}>Ad soyad</Text>
          <Girdi value={ad} onChangeText={setAd} autoCapitalize="words" />

          <Text style={styles.etiket}>Kısa tanıtım</Text>
          <Girdi
            style={{ height: 110 }}
            value={tanitim}
            onChangeText={setTanitim}
            placeholder="Kendini ve mutfağını kısaca anlat"
            multiline
            maxLength={1000}
          />

          <Text style={styles.etiket}>Uzmanlık alanları</Text>
          <Secimler secenekler={UZMANLIKLAR} secili={uzmanliklar} degisti={setUzmanliklar} />

          <Text style={styles.etiket}>Hizmet verdiğin semtler</Text>
          <Girdi value={semtler} onChangeText={setSemtler} placeholder="Örn: Kadıköy, Beşiktaş, Ataşehir" />
          <Text style={styles.ipucu}>Semtleri virgülle ayır.</Text>

          <Text style={styles.etiket}>Başlangıç fiyatı (bir haftalık hizmet, TL)</Text>
          <Girdi value={fiyat} onChangeText={setFiyat} placeholder="Örn: 5000" keyboardType="number-pad" />

          <Text style={styles.etiket}>Müsait olduğun günler</Text>
          <Secimler secenekler={GUNLER} secili={gunler} degisti={setGunler} />

          <Text style={styles.etiket}>Kurumsal hizmet</Text>
          <Pressable onPress={() => setKurumsal((k) => !k)} style={styles.anahtarSatir} accessibilityRole="switch" accessibilityState={{ checked: kurumsal }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.anahtarYazi}>Şirketlere toplu yemek yapıyorum</Text>
              <Text style={styles.ipucu}>Açarsan şirketlerin kurumsal taleplerini görür ve fiyat teklifi verebilirsin.</Text>
            </View>
            <View style={[styles.anahtar, kurumsal && styles.anahtarAcik]}>
              <View style={[styles.anahtarTop, kurumsal && { alignSelf: 'flex-end' }]} />
            </View>
          </Pressable>
          {kurumsal ? (
            <>
              <Text style={styles.etiket}>Tek seferde en fazla kaç kişilik yapabilirsin?</Text>
              <Girdi value={kapasite} onChangeText={setKapasite} placeholder="Örn: 200 (boş bırakırsan sınırsız)" keyboardType="number-pad" maxLength={4} />
            </>
          ) : null}

          <Text style={styles.etiket}>Yemek fotoğraflarım</Text>
          <View style={styles.galeri}>
            {galeri.map((f) => (
              <Pressable key={f.id} onPress={() => fotoSil(f)}>
                <Image source={{ uri: f.adres }} style={styles.galeriFoto} />
              </Pressable>
            ))}
            <Pressable onPress={galeriyeEkle} disabled={fotoYukleniyor} style={[styles.galeriFoto, styles.ekle]}>
              {fotoYukleniyor ? <ActivityIndicator color={colors.sari} /> : <Ionicons name="add" size={36} color={colors.sari} />}
            </Pressable>
          </View>
          <Text style={styles.ipucu}>Silmek için fotoğrafa dokun.</Text>

          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          <View style={{ marginTop: spacing.l }}>
            <Dugme yazi="Kaydet" onPress={kaydet} yukleniyor={kaydediliyor} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Ekran>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.l, paddingTop: spacing.s, paddingBottom: 60, gap: spacing.s },
  fotoAlan: { alignItems: 'center', marginBottom: spacing.m },
  profilFoto: { width: 110, height: 110, borderRadius: radius.tam },
  fotoBos: { backgroundColor: colors.yuzey, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.sari, alignItems: 'center', justifyContent: 'center' },
  fotoLink: { marginTop: spacing.s, color: colors.sari, fontWeight: '700', fontSize: fontSize.normal },
  etiket: { fontSize: fontSize.normal, fontWeight: '700', color: colors.metin, marginTop: spacing.m },
  ipucu: { fontSize: 13, color: colors.metinSoluk },
  galeri: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  galeriFoto: { width: 100, height: 100, borderRadius: radius.s },
  ekle: { backgroundColor: colors.yuzey, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.sari, alignItems: 'center', justifyContent: 'center' },
  anahtarSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, backgroundColor: colors.yuzey, borderRadius: radius.m, borderWidth: 1, borderColor: colors.cizgi, padding: spacing.m },
  anahtarYazi: { color: colors.metin, fontWeight: '700', fontSize: fontSize.normal },
  anahtar: { width: 52, height: 30, borderRadius: radius.tam, backgroundColor: colors.cizgi, padding: 3, justifyContent: 'center' },
  anahtarAcik: { backgroundColor: colors.sari },
  anahtarTop: { width: 24, height: 24, borderRadius: radius.tam, backgroundColor: colors.metin },
  hata: { color: colors.kirmiziAcik, fontWeight: '600', marginTop: spacing.m },
});
