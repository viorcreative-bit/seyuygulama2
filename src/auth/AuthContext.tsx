import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { bildirimKaydiniSil } from '../lib/bildirim';
import { supabase } from '../lib/supabase';

export type Rol = 'musteri' | 'asci';
export type Profil = { id: string; rol: Rol; ad: string; telefon: string | null; kvkk_onay_surumu: string | null; fotograf: string | null };

type Deger = {
  yukleniyor: boolean;
  oturum: Session | null;
  profil: Profil | null;
  /** Hesabın bir şifresi var mı? (yalnızca ekran yönlendirmesi için; güvenlik buna dayanmaz) */
  sifreVar: boolean;
  /** Yönetici şifreyi belirlediyse (geçici şifre) kullanıcı ilk girişte yeni şifre belirlemek zorundadır. */
  geciciSifre: boolean;
  /** SMS koduyla "şifremi unuttum" akışından girildi; yeni şifre belirlenmeden devam edilemez. */
  sifreSifirlaniyor: boolean;
  setSifreSifirlaniyor: (b: boolean) => void;
  /** Şifreyle giriş ekranında seçilen rol; hesabın rolü farklıysa girişe izin verilmez. */
  setGirisRolu: (r: Rol | null) => void;
  girisHatasi: string;
  setGirisHatasi: (m: string) => void;
  profilYenile: () => Promise<void>;
  cikisYap: () => Promise<void>;
};

const Ctx = createContext<Deger | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [oturum, setOturum] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [sifreSifirlaniyor, setSifreSifirlaniyor] = useState(false);
  const [girisHatasi, setGirisHatasi] = useState('');
  const girisRolu = useRef<Rol | null>(null);
  const sonKullanici = useRef<string | null>(null);

  const profilGetir = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, rol, ad, telefon, kvkk_onay_surumu, fotograf')
      .eq('id', s.user.id)
      .maybeSingle();
    const p = (data as Profil | null) ?? null;

    // Müşteri Girişi / Aşçı Girişi ekranlarında yanlış rol seçildiyse oturumu kapat.
    if (p && girisRolu.current && p.rol !== girisRolu.current) {
      setGirisHatasi(
        p.rol === 'asci'
          ? 'Bu numara bir aşçı hesabına ait. Lütfen "Aşçı Girişi"ni kullan.'
          : 'Bu numara bir müşteri hesabına ait. Lütfen "Müşteri Girişi"ni kullan.',
      );
      girisRolu.current = null;
      await supabase.auth.signOut();
      return;
    }
    girisRolu.current = null;
    setProfil(p);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      sonKullanici.current = data.session?.user.id ?? null;
      setOturum(data.session);
      await profilGetir(data.session);
      setYukleniyor(false);
    });
    const { data: abonelik } = supabase.auth.onAuthStateChange((_olay, s) => {
      // Giriş yapan kişi değiştiyse, profil yüklenene kadar bekleme ekranı göster.
      const yeniKullanici = s?.user.id ?? null;
      if (yeniKullanici !== sonKullanici.current) {
        sonKullanici.current = yeniKullanici;
        setProfil(null);
        if (yeniKullanici) setYukleniyor(true);
      }
      setOturum(s);
      if (!s) setSifreSifirlaniyor(false);
      // onAuthStateChange içinde await edilen Supabase çağrıları kilitlenebilir; ertele.
      setTimeout(async () => {
        await profilGetir(s);
        setYukleniyor(false);
      }, 0);
    });
    return () => abonelik.subscription.unsubscribe();
  }, [profilGetir]);

  const deger: Deger = {
    yukleniyor,
    oturum,
    profil,
    sifreVar: oturum?.user.user_metadata?.sifre_var === true,
    geciciSifre: oturum?.user.user_metadata?.gecici_sifre === true,
    sifreSifirlaniyor,
    setSifreSifirlaniyor,
    setGirisRolu: (r) => {
      girisRolu.current = r;
    },
    girisHatasi,
    setGirisHatasi,
    profilYenile: () => profilGetir(oturum),
    cikisYap: async () => {
      await bildirimKaydiniSil();
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={deger}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return c;
}
