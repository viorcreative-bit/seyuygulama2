import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Rol = 'musteri' | 'asci';
export type Profil = { id: string; rol: Rol; ad: string; telefon: string | null };

type Deger = {
  yukleniyor: boolean;
  oturum: Session | null;
  profil: Profil | null;
  profilYenile: () => Promise<void>;
  cikisYap: () => Promise<void>;
};

const Ctx = createContext<Deger | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [oturum, setOturum] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);

  const profilGetir = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, rol, ad, telefon')
      .eq('id', s.user.id)
      .maybeSingle();
    setProfil((data as Profil | null) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setOturum(data.session);
      await profilGetir(data.session);
      setYukleniyor(false);
    });
    const { data: abonelik } = supabase.auth.onAuthStateChange((_olay, s) => {
      setOturum(s);
      // onAuthStateChange içinde await edilen Supabase çağrıları kilitlenebilir; ertele.
      setTimeout(() => profilGetir(s), 0);
    });
    return () => abonelik.subscription.unsubscribe();
  }, [profilGetir]);

  const deger: Deger = {
    yukleniyor,
    oturum,
    profil,
    profilYenile: () => profilGetir(oturum),
    cikisYap: async () => {
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
