import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseHazir = Boolean(url && anahtar);

// Not: anon anahtarı herkese açık olacak şekilde tasarlanmıştır; güvenliği
// veritabanındaki Row Level Security kuralları sağlar (supabase/schema.sql).
export const supabase = createClient(url ?? 'http://localhost', anahtar ?? 'eksik', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
