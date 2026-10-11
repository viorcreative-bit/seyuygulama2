import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { supabaseHazir } from './src/lib/supabase';
import AnaSayfa from './src/screens/AnaSayfa';
import AsciProfilDuzenle from './src/screens/AsciProfilDuzenle';
import Giris from './src/screens/Giris';
import Kayit from './src/screens/Kayit';
import { colors, fontSize, spacing } from './src/theme';

function Ekranlar() {
  const { yukleniyor, oturum, profil } = useAuth();
  const [profilEkrani, setProfilEkrani] = useState(false);
  if (yukleniyor) {
    return (
      <View style={styles.orta}>
        <ActivityIndicator size="large" color={colors.kirmizi} />
      </View>
    );
  }
  if (!oturum) return <Giris />;
  if (!profil) return <Kayit />;
  if (profilEkrani && profil.rol === 'asci') return <AsciProfilDuzenle geri={() => setProfilEkrani(false)} />;
  return <AnaSayfa profilDuzenle={() => setProfilEkrani(true)} />;
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
