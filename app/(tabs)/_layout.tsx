import { Tabs } from 'expo-router';
import { colors, fonts } from '../../constants/theme';
import { Text } from 'react-native';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle:            { backgroundColor: colors.surface, borderTopColor: colors.border, height: 80, paddingBottom: 16 },
        tabBarActiveTintColor:  colors.primary,
        tabBarInactiveTintColor:colors.textMuted,
        tabBarLabelStyle:       { fontFamily: fonts.body.medium, fontSize: 11, marginTop: -2 },
      }}
    >
      <Tabs.Screen name="home"    options={{ title: 'Home',    tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="weeks"   options={{ title: 'Weeks',   tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }} />
      <Tabs.Screen name="health"  options={{ title: 'Health',  tabBarIcon: ({ focused }) => <TabIcon emoji="💜" focused={focused} /> }} />
      <Tabs.Screen name="plan"    options={{ title: 'Plan',    tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} /> }} />
      <Tabs.Screen name="partner" options={{ title: 'Partner', tabBarIcon: ({ focused }) => <TabIcon emoji="💙" focused={focused} /> }} />
    </Tabs>
  );
}
