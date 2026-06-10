import { useCallback, useEffect, useRef, useState } from 'react';
import { SplashScreen, Stack, router, useSegments } from 'expo-router';
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

  // Auth gate. Only navigate when we must CHANGE groups — never re-navigate to
  // /(auth)/login while already inside the (auth) group, or we'd reset the
  // multi-step signup flow (role → household) every time signUp sets a session
  // before the users row exists.
  const segments = useSegments();
  useEffect(() => {
    if (loading || !fontsLoaded) return;
    const group   = segments[0]; // '(auth)' | '(tabs)' | '(modals)' | undefined (index)
    const authed  = !!session && hasUserRow;
    // Authed users belong in (tabs). Send them there unless they're already in
    // tabs or have a modal open (a modal must not bounce closed). This also
    // covers the initial `index` route (group === undefined).
    if (authed && group !== '(tabs)' && group !== '(modals)') {
      router.replace('/(tabs)/home');
    // Unauthed users belong in (auth). Don't re-navigate while already there,
    // or the multi-step signup flow (role → household) resets.
    } else if (!authed && group !== '(auth)') {
      router.replace('/(auth)/login');
    }
  }, [loading, fontsLoaded, session, hasUserRow, segments]);

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
