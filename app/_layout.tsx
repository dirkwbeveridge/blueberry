import { useCallback, useEffect, useState } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { supabase } from '../lib/supabase';
import { useHouseholdStore } from '../store/household';
import LoadingScreen from '../components/shared/LoadingScreen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const [session,    setSession]    = useState<Session | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [hasUserRow, setHasUserRow] = useState(false);

  const { setHousehold, setCurrentUser, setPartnerUser, clearAll } = useHouseholdStore();

  const loadHousehold = useCallback(async (userId: string) => {
    try {
      const { data: user } = await supabase
        .from('users').select('*').eq('id', userId).maybeSingle();
      if (!user) { setHasUserRow(false); return; }
      setHasUserRow(true);
      setCurrentUser(user);
      const { data: hh } = await supabase
        .from('households').select('*').eq('id', user.household_id).single();
      if (hh) setHousehold(hh);
      const { data: partner } = await supabase
        .from('users').select('*').eq('household_id', user.household_id)
        .neq('id', userId).maybeSingle();
      if (partner) setPartnerUser(partner);
    } finally {
      setLoading(false);
      SplashScreen.hideAsync();
    }
  }, [setCurrentUser, setHousehold, setPartnerUser]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadHousehold(s.user.id);
      else { setLoading(false); SplashScreen.hideAsync(); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) { clearAll(); setHasUserRow(false); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [clearAll, loadHousehold]);

  if (loading || !fontsLoaded) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!session || !hasUserRow ? (
        <Stack.Screen name="(auth)" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
      <Stack.Screen name="(modals)" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
