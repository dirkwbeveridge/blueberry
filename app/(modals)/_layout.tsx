import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="log-symptom"      options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-todo"         options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-appointment"  options={{ presentation: 'modal' }} />
      <Stack.Screen name="contraction-timer" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
