import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type Deger = {
  favoriMi: (asciId: string) => boolean;
  /** Favoriye ekler ya da çıkarır. Başarısız olursa eski hâline döner. */
  degistir: (asciId: string) => Promise<void>;
  sayi: number;
};

const Ctx = createContext<Deger | null>(null);

// Müşterinin favori aşçıları. Aşçılar için boş çalışır.
export function FavoriProvider({ children }: { children: ReactNode }) {
  const { oturum, profil } = useAuth();
  const musteriId = profil?.rol === 'musteri' ? oturum?.user.id ?? null : null;
  const [idler, setIdler] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIdler(new Set());
    if (!musteriId) return;
    let iptal = false;
    supabase
      .from('favoriler')
      .select('asci_id')
      .eq('musteri_id', musteriId)
      .then(({ data }) => {
        if (!iptal) setIdler(new Set((data ?? []).map((f: { asci_id: string }) => f.asci_id)));
      });
    return () => {
      iptal = true;
    };
  }, [musteriId]);

  const degistir = useCallback(
    async (asciId: string) => {
      if (!musteriId) return;
      const vardi = idler.has(asciId);
      const ayarla = (ekle: boolean) =>
        setIdler((onceki) => {
          const yeni = new Set(onceki);
          if (ekle) yeni.add(asciId);
          else yeni.delete(asciId);
          return yeni;
        });
      ayarla(!vardi);
      const { error } = vardi
        ? await supabase.from('favoriler').delete().eq('musteri_id', musteriId).eq('asci_id', asciId)
        : await supabase.from('favoriler').insert({ musteri_id: musteriId, asci_id: asciId });
      if (error) ayarla(vardi);
    },
    [musteriId, idler],
  );

  const deger: Deger = { favoriMi: (id) => idler.has(id), degistir, sayi: idler.size };
  return <Ctx.Provider value={deger}>{children}</Ctx.Provider>;
}

export function useFavoriler() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFavoriler, FavoriProvider içinde kullanılmalı');
  return c;
}
