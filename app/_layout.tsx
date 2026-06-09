import { useCallback, useEffect, useRef, useState } from 'react';
import { SplashScreen, Stack, router } from 'expo-router';
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

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const { setHousehold, setCurrentUser, setPartnerUser, clearAll } = useHouseholdStore();
  // Derive the auth-gate trigger directly from the store so any path that
  // populates currentUser (root-layout hydration, signin, signup → household
  // insert in login.tsx) flips the gate without needing local state sync.
  const hasUserRow = useHouseholdStore((s) => s.currentUser !== null);

  const loadHousehold = useCallback(async (userId: string) => {
    try {
      const { data: user } = await supabase
        .from('users').select('*').eq('id', userId).maybeSingle();
      if (!user) return; // currentUser stays null → (auth) stack
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
      if (!s) { clearAll(); setLoading(false); }
      // On sign-in we don't re-hydrate here — login.tsx populates the store
      // directly via setCurrentUser/setHousehold during its multi-step flow,
      // and that triggers the gate via the store selector above.
    });

    return () => subscription.unsubscribe();
  }, [clearAll, loadHousehold]);

  // Navigate to the correct root whenever auth state settles.
  const didNavigate = useRef(false);
  useEffect(() => {
    if (loading || !fontsLoaded) return;
    const dest = !session || !hasUserRow ? '/(auth)/login' : '/(tabs)/home';
    if (!didNavigate.current) {
      didNavigate.current = true;
      router.replace(dest);
    } else {
      router.replace(dest);
    }
  }, [loading, fontsLoaded, session, hasUserRow]);

  if (loading || !fontsLoaded) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="index" />
      <Stack.Screen name="(modals)" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
