import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';

interface Action {
  emoji:  string;
  label:  string;
  route:  string;
}

const BASE_ACTIONS: Action[] = [
  { emoji: '💜', label: 'Log symptom',      route: '/(modals)/log-symptom'      },
  { emoji: '✅', label: 'Add task',         route: '/(modals)/add-todo'          },
  { emoji: '📅', label: 'Add appointment',  route: '/(modals)/add-appointment'   },
];

export function QuickActions() {
  const { isPregnant, isPostpartum } = useHousehold();

  const actions: Action[] = [...BASE_ACTIONS];
  if (isPregnant) {
    actions.push({ emoji: '⏱️', label: 'Contractions', route: '/(modals)/contraction-timer' });
  }
  if (isPostpartum) {
    actions.push({ emoji: '🍼', label: 'Baby hub', route: '/(tabs)/baby' });
  }

  return (
    <View style={styles.grid}>
      {actions.map(a => (
        <TouchableOpacity
          key={a.label}
          style={styles.btn}
          onPress={() => router.push(a.route as never)}
          activeOpacity={0.75}
        >
          <Text style={styles.emoji}>{a.emoji}</Text>
          <Text style={styles.label}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  btn:   {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface,
    borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs,
    shadowColor: colors.primary, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  emoji: { fontSize: 24 },
  label: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.text, textAlign: 'center' },
});
