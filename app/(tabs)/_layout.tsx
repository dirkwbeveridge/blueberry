import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useHousehold } from '../../hooks/useHousehold';
import { colors, fonts } from '../../constants/theme';

// Role-aware tab shell.
//
// Both roles share Home / To Do / Memories / More.
// Mom variant — Daily Companion:  Home · Health · To Do · Memories · More
// Partner variant — Couple OS:    Home · Together · To Do · Memories · More
//
// Health and Together both live in this stack. We hide whichever does not
// belong in the active role's tab bar via `href: null` — the route is still
// reachable for Mom to peek at Together via More (privacy-safe, no logs), but
// Health stays out of Partner's bar AND a guard inside health.tsx blocks the
// route to defend Mom's logs even if Partner deep-links there.
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { isPartnerRole } = useHousehold();

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarStyle:             { backgroundColor: colors.surface, borderTopColor: colors.border, height: 80, paddingBottom: 16 },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle:        { fontFamily: fonts.body.medium, fontSize: 11, marginTop: -2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title:        'Health',
          tabBarIcon:   ({ focused }) => <TabIcon emoji="💜" focused={focused} />,
          href:         isPartnerRole ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="together"
        options={{
          title:        'Together',
          tabBarIcon:   ({ focused }) => <TabIcon emoji="💙" focused={focused} />,
          href:         isPartnerRole ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{ title: 'To Do', tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} /> }}
      />
      <Tabs.Screen
        name="memories"
        options={{ title: 'Memories', tabBarIcon: ({ focused }) => <TabIcon emoji="📓" focused={focused} /> }}
      />
      <Tabs.Screen
        name="journal"
        options={{ title: 'Journal', tabBarIcon: ({ focused }) => <TabIcon emoji="📝" focused={focused} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'More', tabBarIcon: ({ focused }) => <TabIcon emoji="⋯" focused={focused} /> }}
      />
    </Tabs>
  );
}
