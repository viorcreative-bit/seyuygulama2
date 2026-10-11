import { ImageSourcePropType } from 'react-native';

export type Avatar = { anahtar: string; ad: string; kaynak: ImageSourcePropType };

// Kayıt sırasında seçilebilen hazır avatarlar (assets/avatars; scripts/avatar-uret.py ile çizilir).
export const AVATARLAR: Avatar[] = [
  { anahtar: 'kadin1', ad: 'Kadın 1', kaynak: require('../../assets/avatars/kadin1.png') },
  { anahtar: 'kadin2', ad: 'Kadın 2', kaynak: require('../../assets/avatars/kadin2.png') },
  { anahtar: 'kadin3', ad: 'Kadın 3', kaynak: require('../../assets/avatars/kadin3.png') },
  { anahtar: 'erkek1', ad: 'Erkek 1', kaynak: require('../../assets/avatars/erkek1.png') },
  { anahtar: 'erkek2', ad: 'Erkek 2', kaynak: require('../../assets/avatars/erkek2.png') },
  { anahtar: 'erkek3', ad: 'Erkek 3', kaynak: require('../../assets/avatars/erkek3.png') },
];
