import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = Platform.OS !== 'web'
  ? {
      getItem:    (key: string) => SecureStore.getItemAsync(key),
      setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    }
  : {
      getItem:    (key: string) => Promise.resolve(typeof window !== 'undefined' ? localStorage.getItem(key) : null),
      setItem:    (key: string, value: string) => Promise.resolve(typeof window !== 'undefined' ? localStorage.setItem(key, value) : undefined),
      removeItem: (key: string) => Promise.resolve(typeof window !== 'undefined' ? localStorage.removeItem(key) : undefined),
    };

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Untyped client — row types are applied at each call site via `as unknown as T`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnon, {
  auth: {
    storage:          ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
});
