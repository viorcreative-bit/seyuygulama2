import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import ReklamBandi from './src/components/ReklamBandi';
import HataSinirlayici from './src/components/HataSinirlayici';
import AltMenu, { Sekme } from './src/components/AltMenu';
import { supabaseHazir } from './src/lib/supabase';
import { tarihSaatYaz } from './src/lib/talepler';
import AnaSayfa from './src/screens/AnaSayfa';
import AsciProfil from './src/screens/AsciProfil';
import AsciProfilDuzenle from './src/screens/AsciProfilDuzenle';
import AsciSec from './src/screens/AsciSec';
import AsciYorumlari from './src/screens/AsciYorumlari';
import GelenTalepler from './src/screens/GelenTalepler';
import GirisAkisi from './src/screens/GirisAkisi';
import Hesabim from './src/screens/Hesabim';
import Kayit from './src/screens/Kayit';
import SifreBelirle from './src/screens/SifreBelirle';
import SifreDegistir from './src/screens/SifreDegistir';
import SikayetYaz from './src/screens/SikayetYaz';
import TalepOlustur from './src/screens/TalepOlustur';
import Taleplerim from './src/screens/Taleplerim';
import YasalMetin from './src/screens/YasalMetin';
import YasalOnay from './src/screens/YasalOnay';
import HesabiSil from './src/screens/HesabiSil';
import YorumYaz from './src/screens/YorumYaz';
import { YASAL_SURUMU, YasalAnahtar } from './src/yasal';
import { colors, fontSize, spacing } from './src/theme';

type Ekran =
  | { ad: Sekme }
  | { ad: 'profilDuzenle' }
  | { ad: 'asci'; id: string }
  | { ad: 'asciSec' }
  | { ad: 'talep'; asciId: string }
  | { ad: 'sifreDegistir' }
  | { ad: 'hesapSil' }
  | { ad: 'yasal'; anahtar: YasalAnahtar }
  | { ad: 'yorumYaz'; talepId: string; asciId: string; asciAdi: string }
  | { ad: 'sikayet'; talepId: string; ozet: string; geriye: 'taleplerim' | 'gelenTalepler' };

const SEKMELER: Sekme[] = ['ana', 'taleplerim', 'gelenTalepler', 'asciYorumlari', 'hesap'];

function Ekranlar() {
  const { yukleniyor, oturum, profil, sifreVar, sifreSifirlaniyor } = useAuth();
  const [ekran, setEkran] = useState<Ekran>({ ad: 'ana' });
  const git = (ad: Sekme) => () => setEkran({ ad });
  const ana = git('ana');

  if (yukleniyor) {
    return (
      <View style={styles.orta}>
        <ActivityIndicator size="large" color={colors.sari} />
      </View>
    );
  }
  if (!oturum) return <GirisAkisi />;
  if (!profil) return <Kayit />;
  // Yasal metinler yenilendiyse (veya eski hesapsa) önce kabul alınır.
  if (profil.kvkk_onay_surumu !== YASAL_SURUMU) return <YasalOnay />;
  // Şifresi olmayan (eski) hesaplar ve "şifremi unuttum" ile girenler yeni şifre belirlemeden ilerleyemez.
  if (!sifreVar || sifreSifirlaniyor) return <SifreBelirle />;

  const musteri = profil.rol === 'musteri';
  const asci = profil.rol === 'asci';

  // Ana gezinme sekmeleri (alt menü görünür)
  if (SEKMELER.includes(ekran.ad as Sekme)) {
    let icerik: React.ReactNode;
    switch (ekran.ad) {
      case 'taleplerim':
        icerik = musteri ? (
          <Taleplerim
            yorumYap={(t, asciAdi) => setEkran({ ad: 'yorumYaz', talepId: t.id, asciId: t.asci_id, asciAdi })}
            sikayetEt={(t, asciAdi) =>
              setEkran({ ad: 'sikayet', talepId: t.id, ozet: `${asciAdi} · ${tarihSaatYaz(t.tarih)}`, geriye: 'taleplerim' })
            }
          />
        ) : null;
        break;
      case 'gelenTalepler':
        icerik = asci ? (
          <GelenTalepler
            sikayetEt={(t) =>
              setEkran({ ad: 'sikayet', talepId: t.id, ozet: `${t.musteri_ad} · ${tarihSaatYaz(t.tarih)}`, geriye: 'gelenTalepler' })
            }
          />
        ) : null;
        break;
      case 'asciYorumlari':
        icerik = asci ? <AsciYorumlari /> : null;
        break;
      case 'hesap':
        icerik = (
          <Hesabim
            profilDuzenle={() => setEkran({ ad: 'profilDuzenle' })}
            sifreDegistir={() => setEkran({ ad: 'sifreDegistir' })}
            yasal={(anahtar) => setEkran({ ad: 'yasal', anahtar })}
            hesabiSil={() => setEkran({ ad: 'hesapSil' })}
          />
        );
        break;
      default:
        icerik = <AnaSayfa asciAc={(id) => setEkran({ ad: 'asci', id })} talepEt={() => setEkran({ ad: 'asciSec' })} />;
    }
    // Rolüne uymayan bir sekmeye düşülürse ana sayfaya dön.
    if (!icerik) return <AnaSayfa asciAc={(id) => setEkran({ ad: 'asci', id })} talepEt={() => setEkran({ ad: 'asciSec' })} />;
    return (
      <View style={styles.kap}>
        <View style={{ flex: 1 }}>{icerik}</View>
        <ReklamBandi />
        <AltMenu rol={profil.rol} aktif={ekran.ad as Sekme} sec={(s) => setEkran({ ad: s })} />
      </View>
    );
  }

  // Tam ekran sayfalar (alt menü yok, geri düğmesi var)
  switch (ekran.ad) {
    case 'profilDuzenle':
      return asci ? <AsciProfilDuzenle geri={git('hesap')} /> : <Hesabim profilDuzenle={() => {}} sifreDegistir={() => {}} yasal={() => {}} hesabiSil={() => {}} />;
    case 'sifreDegistir':
      return <SifreDegistir geri={git('hesap')} />;
    case 'hesapSil':
      return <HesabiSil geri={git('hesap')} />;
    case 'yasal':
      return <YasalMetin anahtar={ekran.anahtar} geri={git('hesap')} />;
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
      return <TalepOlustur asciId={ekran.asciId} geri={ana} gonderildi={git('taleplerim')} />;
    case 'yorumYaz':
      return (
        <YorumYaz
          talepId={ekran.talepId}
          asciId={ekran.asciId}
          asciAdi={ekran.asciAdi}
          geri={git('taleplerim')}
          tamam={git('taleplerim')}
        />
      );
    case 'sikayet':
      return <SikayetYaz talepId={ekran.talepId} ozet={ekran.ozet} geri={git(ekran.geriye)} />;
    default:
      return null;
  }
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
    <HataSinirlayici>
      <AuthProvider>
        <View style={styles.kap}>
          <Ekranlar />
        </View>
        <StatusBar style="light" />
      </AuthProvider>
    </HataSinirlayici>
  );
}

const styles = StyleSheet.create({
  kap: { flex: 1, backgroundColor: colors.zemin },
  orta: { flex: 1, backgroundColor: colors.zemin, alignItems: 'center', justifyContent: 'center', padding: spacing.l },
  baslik: { fontSize: fontSize.baslik, fontWeight: '800', color: colors.sari, marginBottom: spacing.m },
  yazi: { fontSize: fontSize.normal, color: colors.metin, textAlign: 'center' },
});
