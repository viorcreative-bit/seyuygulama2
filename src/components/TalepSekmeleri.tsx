import { ReactNode, useEffect, useState } from 'react';
import Ekran from './Ekran';
import Segment from './Segment';

export type Gorunum = 'bireysel' | 'acik' | 'kurumsal';

type Props = {
  baslik: string;
  gorunum: Gorunum;
  degistir: (g: Gorunum) => void;
  /** Sekme başlıkları (müşteri ve aşçı için farklıdır). */
  etiketler: Record<Gorunum, string>;
  bireysel: ReactNode;
  acik: ReactNode;
  kurumsal: ReactNode;
  /** Sekmelerdeki rozet sayılarını getirir (örn. yeni fırsatlar). */
  rozetGetir?: Partial<Record<Gorunum, () => Promise<number>>>;
};

// Talepler sekmesinin ortak çerçevesi: üstte Doğrudan | Açık talepler | Kurumsal geçişi.
export default function TalepSekmeleri({ baslik, gorunum, degistir, etiketler, bireysel, acik, kurumsal, rozetGetir }: Props) {
  const [rozetler, setRozetler] = useState<Partial<Record<Gorunum, number>>>({});
  const acikGetir = rozetGetir?.acik;
  const kurumsalGetir = rozetGetir?.kurumsal;
  useEffect(() => {
    acikGetir?.().then((n) => setRozetler((r) => ({ ...r, acik: n }))).catch(() => {});
    kurumsalGetir?.().then((n) => setRozetler((r) => ({ ...r, kurumsal: n }))).catch(() => {});
  }, [acikGetir, kurumsalGetir, gorunum]);

  return (
    <Ekran baslik={baslik}>
      <Segment
        secenekler={[
          { deger: 'bireysel', yazi: etiketler.bireysel },
          { deger: 'acik', yazi: etiketler.acik, rozet: rozetler.acik },
          { deger: 'kurumsal', yazi: etiketler.kurumsal, rozet: rozetler.kurumsal },
        ]}
        secili={gorunum}
        degisti={degistir}
      />
      {gorunum === 'bireysel' ? bireysel : gorunum === 'acik' ? acik : kurumsal}
    </Ekran>
  );
}
