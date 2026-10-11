import { useState } from 'react';
import { Rol } from '../auth/AuthContext';
import Karsilama from './Karsilama';
import KodGirisi, { KodAmaci } from './KodGirisi';
import SifreGiris from './SifreGiris';
import YasalMetin from './YasalMetin';
import { YasalAnahtar } from '../yasal';

type Adim = { ad: 'karsilama' } | { ad: 'yasal'; anahtar: YasalAnahtar } | { ad: 'sifre'; rol: Rol } | { ad: 'kod'; amac: KodAmaci; geriye: Adim };

// Oturum açılmamışken gösterilen ekranlar: Karşılama -> (Şifreyle giriş | SMS kodu).
export default function GirisAkisi() {
  const [adim, setAdim] = useState<Adim>({ ad: 'karsilama' });
  const basa = () => setAdim({ ad: 'karsilama' });

  if (adim.ad === 'sifre') {
    return (
      <SifreGiris
        rol={adim.rol}
        geri={basa}
        sifremiUnuttum={() => setAdim({ ad: 'kod', amac: 'sifirla', geriye: adim })}
      />
    );
  }
  if (adim.ad === 'yasal') return <YasalMetin anahtar={adim.anahtar} geri={basa} />;
  if (adim.ad === 'kod') return <KodGirisi amac={adim.amac} geri={() => setAdim(adim.geriye)} />;
  return (
    <Karsilama
      musteriGirisi={() => setAdim({ ad: 'sifre', rol: 'musteri' })}
      asciGirisi={() => setAdim({ ad: 'sifre', rol: 'asci' })}
      kaydol={() => setAdim({ ad: 'kod', amac: 'kaydol', geriye: { ad: 'karsilama' } })}
      yasal={(anahtar) => setAdim({ ad: 'yasal', anahtar })}
    />
  );
}
