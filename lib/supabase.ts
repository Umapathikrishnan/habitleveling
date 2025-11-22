import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const result = await SecureStore.getItemAsync(key);
    if (!result) return null;

    // Check if it's a chunked value
    if (result.startsWith('{"chunks":')) {
      try {
        const metadata = JSON.parse(result);
        let fullValue = '';
        for (let i = 0; i < metadata.chunks; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
          if (chunk) fullValue += chunk;
        }
        return fullValue;
      } catch (e) {
        // Fallback if parse fails
        return result;
      }
    }

    return result;
  },
  setItem: async (key: string, value: string) => {
    const MAX_CHUNK_SIZE = 2000;

    if (value.length <= MAX_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunkCount = Math.ceil(value.length / MAX_CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
      const chunk = value.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_${i}`, chunk);
    }

    await SecureStore.setItemAsync(key, JSON.stringify({ chunks: chunkCount }));
  },
  removeItem: async (key: string) => {
    const result = await SecureStore.getItemAsync(key);
    if (result && result.startsWith('{"chunks":')) {
      try {
        const metadata = JSON.parse(result);
        for (let i = 0; i < metadata.chunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
      } catch (e) {
        // Ignore
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
