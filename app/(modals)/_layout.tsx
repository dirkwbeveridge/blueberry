import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="log-symptom"       options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-todo"          options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-journal-entry" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-appointment"   options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-appointment"  options={{ presentation: 'modal' }} />
      <Stack.Screen name="baby-details"      options={{ presentation: 'modal' }} />
      <Stack.Screen name="baby-arrived"      options={{ presentation: 'modal' }} />
      <Stack.Screen name="baby-tracker"      options={{ presentation: 'modal' }} />
      <Stack.Screen name="household-settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="google-calendar-connect" options={{ presentation: 'modal' }} />
      <Stack.Screen name="contraction-timer" options={{ presentation: 'modal' }} />
      <Stack.Screen name="kick-counter"      options={{ presentation: 'modal' }} />
      <Stack.Screen name="privacy"           options={{ presentation: 'modal' }} />
      <Stack.Screen name="week-detail"       options={{ presentation: 'modal' }} />
      <Stack.Screen name="notifications"      options={{ presentation: 'modal' }} />
    </Stack>
  );
}
