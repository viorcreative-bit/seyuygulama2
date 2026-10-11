import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { supabaseHazir } from './src/lib/supabase';
import { tarihSaatYaz } from './src/lib/talepler';
import AnaSayfa from './src/screens/AnaSayfa';
import AsciProfil from './src/screens/AsciProfil';
import AsciProfilDuzenle from './src/screens/AsciProfilDuzenle';
import AsciYorumlari from './src/screens/AsciYorumlari';
import AsciSec from './src/screens/AsciSec';
import GelenTalepler from './src/screens/GelenTalepler';
import GirisAkisi from './src/screens/GirisAkisi';
import Kayit from './src/screens/Kayit';
import SifreBelirle from './src/screens/SifreBelirle';
import SifreDegistir from './src/screens/SifreDegistir';
import YorumYaz from './src/screens/YorumYaz';
import SikayetYaz from './src/screens/SikayetYaz';
import YoneticiPaneli from './src/screens/YoneticiPaneli';
import TalepOlustur from './src/screens/TalepOlustur';
import Taleplerim from './src/screens/Taleplerim';
import { colors, fontSize, spacing } from './src/theme';

type Ekran =
  | { ad: 'ana' }
  | { ad: 'profilDuzenle' }
  | { ad: 'asci'; id: string }
  | { ad: 'asciSec' }
  | { ad: 'talep'; asciId: string }
  | { ad: 'taleplerim' }
  | { ad: 'gelenTalepler' }
  | { ad: 'sifreDegistir' }
  | { ad: 'asciYorumlari' }
  | { ad: 'yonetici' }
  | { ad: 'sikayet'; talepId: string; ozet: string; geriye: 'taleplerim' | 'gelenTalepler' }
  | { ad: 'yorumYaz'; talepId: string; asciId: string; asciAdi: string };

function Ekranlar() {
  const { yukleniyor, oturum, profil, sifreVar, sifreSifirlaniyor, yonetici } = useAuth();
  const [ekran, setEkran] = useState<Ekran>({ ad: 'ana' });
  const ana = () => setEkran({ ad: 'ana' });

  if (yukleniyor) {
    return (
      <View style={styles.orta}>
        <ActivityIndicator size="large" color={colors.kirmizi} />
      </View>
    );
  }
  if (!oturum) return <GirisAkisi />;
  if (!profil) return <Kayit />;
  // Şifresi olmayan (eski) hesaplar ve "şifremi unuttum" ile girenler yeni şifre belirlemeden ilerleyemez.
  if (!sifreVar || sifreSifirlaniyor) return <SifreBelirle />;

  const musteri = profil.rol === 'musteri';
  switch (ekran.ad) {
    case 'profilDuzenle':
      return profil.rol === 'asci' ? <AsciProfilDuzenle geri={ana} /> : <AnaSayfa {...anaProps(setEkran)} />;
    case 'asci':
      return (
        <AsciProfil
          asciId={ekran.id}
          geri={ana}
          talepEt={musteri ? () => setEkran({ ad: 'talep', asciId: ekran.id }) : undefined}
        />
      );
    case 'asciSec':
      return <AsciSec sec={(id) => setEkran({ ad: 'talep', asciId: id })} geri={ana} />;
    case 'talep':
      return <TalepOlustur asciId={ekran.asciId} geri={ana} gonderildi={() => setEkran({ ad: 'taleplerim' })} />;
    case 'taleplerim':
      return (
        <Taleplerim
          geri={ana}
          sikayetEt={(t, asciAdi) =>
            setEkran({ ad: 'sikayet', talepId: t.id, ozet: `${asciAdi} · ${tarihSaatYaz(t.tarih)}`, geriye: 'taleplerim' })
          }
          yorumYap={(t, asciAdi) => setEkran({ ad: 'yorumYaz', talepId: t.id, asciId: t.asci_id, asciAdi })}
        />
      );
    case 'yorumYaz':
      return (
        <YorumYaz
          talepId={ekran.talepId}
          asciId={ekran.asciId}
          asciAdi={ekran.asciAdi}
          geri={() => setEkran({ ad: 'taleplerim' })}
          tamam={() => setEkran({ ad: 'taleplerim' })}
        />
      );
    case 'asciYorumlari':
      return profil.rol === 'asci' ? <AsciYorumlari geri={ana} /> : <AnaSayfa {...anaProps(setEkran)} />;
    case 'sifreDegistir':
      return <SifreDegistir geri={ana} />;
    case 'gelenTalepler':
      return profil.rol === 'asci' ? (
        <GelenTalepler
          geri={ana}
          sikayetEt={(t) =>
            setEkran({ ad: 'sikayet', talepId: t.id, ozet: `${t.musteri_ad} · ${tarihSaatYaz(t.tarih)}`, geriye: 'gelenTalepler' })
          }
        />
      ) : (
        <AnaSayfa {...anaProps(setEkran)} />
      );
    case 'sikayet':
      return <SikayetYaz talepId={ekran.talepId} ozet={ekran.ozet} geri={() => setEkran({ ad: ekran.geriye })} />;
    case 'yonetici':
      return yonetici ? <YoneticiPaneli geri={ana} /> : <AnaSayfa {...anaProps(setEkran)} />;
    default:
      return <AnaSayfa {...anaProps(setEkran)} />;
  }
}

function anaProps(setEkran: (e: Ekran) => void) {
  return {
    profilDuzenle: () => setEkran({ ad: 'profilDuzenle' }),
    asciAc: (id: string) => setEkran({ ad: 'asci', id }),
    talepEt: () => setEkran({ ad: 'asciSec' }),
    taleplerim: () => setEkran({ ad: 'taleplerim' }),
    gelenTalepler: () => setEkran({ ad: 'gelenTalepler' }),
    sifreDegistir: () => setEkran({ ad: 'sifreDegistir' }),
    yorumlarim: () => setEkran({ ad: 'asciYorumlari' }),
    yoneticiPaneli: () => setEkran({ ad: 'yonetici' }),
  };
}

export default function App() {
  if (!supabaseHazir) {
    return (
      <View style={styles.orta}>
        <Text style={styles.baslik}>Supabase ayarı eksik</Text>
        <Text style={styles.yazi}>
          Proje klasöründe ".env" dosyası oluşturup içine Supabase adresini ve anahtarını yazman gerekiyor.
          .env.example dosyasına bak, sonra "npx expo start -c" ile yeniden başlat.
        </Text>
      </View>
    );
  }
  return (
    <AuthProvider>
      <Ekranlar />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  orta: { flex: 1, backgroundColor: colors.krem, alignItems: 'center', justifyContent: 'center', padding: spacing.l },
  baslik: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.kirmizi, marginBottom: spacing.m },
  yazi: { fontSize: fontSize.normal, color: colors.metin, textAlign: 'center' },
});
