import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';

// Role-aware tab shell.
//
// Both roles share Home / To Do / Memories / Journal / More.
// Pregnancy:
// - Mom bar: Home · Health · To Do · Memories · Journal · More
// - Partner bar: Home · Together · To Do · Memories · Journal · More
// Postpartum:
// - Baby tab is added for both roles when stage = postpartum.
//
// Health and Together both live in this stack. Health remains mother-only.
// Together becomes shared during postpartum because handoffs and baby rhythm
// are household coordination surfaces, not private notes.
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { currentUser, isPartnerRole, isPostpartum } = useHousehold();
  const insets = useSafeAreaInsets();
  const roleResolved = Boolean(currentUser?.role);

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarStyle:             {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(12, insets.bottom),
        },
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
        name="baby"
        options={{
          title: 'Baby',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍼" focused={focused} />,
          href: isPostpartum ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title:        'Health',
          tabBarIcon:   ({ focused }) => <TabIcon emoji="💜" focused={focused} />,
          href:         !roleResolved || isPartnerRole ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="together"
        options={{
          title:        'Together',
          tabBarIcon:   ({ focused }) => <TabIcon emoji="💙" focused={focused} />,
          href:         !roleResolved ? null : isPostpartum ? undefined : isPartnerRole ? undefined : null,
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
        options={{ title: 'More', tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }}
      />
    </Tabs>
  );
}
