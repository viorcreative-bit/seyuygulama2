import { ReactNode, useEffect, useState } from 'react';
import Ekran from './Ekran';
import Segment from './Segment';

export type Gorunum = 'bireysel' | 'kurumsal';

type Props = {
  baslik: string;
  gorunum: Gorunum;
  degistir: (g: Gorunum) => void;
  bireysel: ReactNode;
  kurumsal: ReactNode;
  /** Kurumsal sekmesindeki rozet sayısını getirir (örn. yeni fırsatlar). */
  rozetGetir?: () => Promise<number>;
};

// Talepler sekmesinin ortak çerçevesi: üstte Bireysel | Kurumsal geçişi.
export default function TalepSekmeleri({ baslik, gorunum, degistir, bireysel, kurumsal, rozetGetir }: Props) {
  const [rozet, setRozet] = useState(0);
  useEffect(() => {
    rozetGetir?.().then(setRozet).catch(() => {});
  }, [rozetGetir, gorunum]);

  return (
    <Ekran baslik={baslik}>
      <Segment
        secenekler={[
          { deger: 'bireysel', yazi: 'Bireysel' },
          { deger: 'kurumsal', yazi: 'Kurumsal', rozet },
        ]}
        secili={gorunum}
        degisti={degistir}
      />
      {gorunum === 'bireysel' ? bireysel : kurumsal}
    </Ekran>
  );
}
