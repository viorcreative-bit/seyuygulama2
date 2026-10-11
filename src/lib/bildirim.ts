import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let kayitliToken: string | null = null;

// Telefondan bildirim izni ister ve bildirim adresini sunucuya kaydeder.
// Hiçbir hata uygulamayı bozmamalı: izin verilmediyse ya da cihaz desteklemiyorsa sessizce vazgeçer.
export async function bildirimKaydet(): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    const N = await import('expo-notifications');

    // Uygulama açıkken de bildirim üstte görünsün.
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'Aşçım Gelsin',
        importance: N.AndroidImportance.HIGH,
      });
    }

    let { status } = await N.getPermissionsAsync();
    if (status !== 'granted') status = (await N.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token) return;
    const { error } = await supabase.rpc('push_kaydet', { p_token: token, p_platform: Platform.OS });
    if (!error) kayitliToken = token;
  } catch {
    // Bildirim isteğe bağlıdır; sorun olursa uygulama normal çalışmaya devam eder.
  }
}

// Çıkış yaparken bu telefona başka kullanıcının bildirimi gitmesin.
export async function bildirimKaydiniSil(): Promise<void> {
  if (!kayitliToken) return;
  try {
    await supabase.rpc('push_sil', { p_token: kayitliToken });
  } catch {
    // önemli değil
  }
  kayitliToken = null;
}
