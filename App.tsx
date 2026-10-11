import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { supabaseHazir } from './src/lib/supabase';
import AnaSayfa from './src/screens/AnaSayfa';
import AsciProfil from './src/screens/AsciProfil';
import AsciProfilDuzenle from './src/screens/AsciProfilDuzenle';
import AsciSec from './src/screens/AsciSec';
import Giris from './src/screens/Giris';
import Kayit from './src/screens/Kayit';
import TalepOlustur from './src/screens/TalepOlustur';
import Taleplerim from './src/screens/Taleplerim';
import { colors, fontSize, spacing } from './src/theme';

type Ekran =
  | { ad: 'ana' }
  | { ad: 'profilDuzenle' }
  | { ad: 'asci'; id: string }
  | { ad: 'asciSec' }
  | { ad: 'talep'; asciId: string }
  | { ad: 'taleplerim' };

function Ekranlar() {
  const { yukleniyor, oturum, profil } = useAuth();
  const [ekran, setEkran] = useState<Ekran>({ ad: 'ana' });
  const ana = () => setEkran({ ad: 'ana' });

  if (yukleniyor) {
    return (
      <View style={styles.orta}>
        <ActivityIndicator size="large" color={colors.kirmizi} />
      </View>
    );
  }
  if (!oturum) return <Giris />;
  if (!profil) return <Kayit />;

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
      return <Taleplerim geri={ana} />;
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
