import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { varsayilanAvatar } from '../data/avatarlar';

type Props = { uri?: string | null; kimlik: string; style: StyleProp<ImageStyle> };

// Profil resmi: adres yoksa veya resim yüklenemezse kişiye göre sabit bir avatar gösterir.
export default function ProfilResmi({ uri, kimlik, style }: Props) {
  const [bozuk, setBozuk] = useState(false);
  useEffect(() => setBozuk(false), [uri]);
  return (
    <Image
      source={uri && !bozuk ? { uri } : varsayilanAvatar(kimlik)}
      style={style}
      onError={() => setBozuk(true)}
    />
  );
}
