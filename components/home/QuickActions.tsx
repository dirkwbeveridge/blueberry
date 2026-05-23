import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii, spacing } from '../../constants/theme';

interface Action {
  emoji:  string;
  label:  string;
  route:  string;
}

const ACTIONS: Action[] = [
  { emoji: '💜', label: 'Log symptom',      route: '/(modals)/log-symptom'      },
  { emoji: '✅', label: 'Add task',         route: '/(modals)/add-todo'          },
  { emoji: '📅', label: 'Add appointment',  route: '/(modals)/add-appointment'   },
  { emoji: '⏱️', label: 'Contractions',    route: '/(modals)/contraction-timer' },
];

export function QuickActions() {
  return (
    <View style={styles.grid}>
      {ACTIONS.map(a => (
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
