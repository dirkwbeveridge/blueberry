import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { babyDevelopment } from '../../constants/babyDevelopment';
import { getFruitEmoji } from '../../constants/fruitEmojis';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import type { Household } from '../../types';

interface WeekHeroCardProps {
  week:      number;
  household: Household | null;
}

export function WeekHeroCard({ week, household }: WeekHeroCardProps) {
  const dev = babyDevelopment.find(w => w.week === week) ?? babyDevelopment[14];
  const emoji = getFruitEmoji(dev.size_fruit);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/(modals)/week-detail')}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Open week ${week} detail`}
    >
      <View style={styles.left}>
        <Text style={styles.weekLabel}>WEEK</Text>
        <Text style={styles.weekNum}>{week}</Text>
        {household?.baby_name ? (
          <Text style={styles.babyName}>{household.baby_name}</Text>
        ) : null}
        <Text style={styles.headline} numberOfLines={2}>{dev.headline}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.fruit}>{dev.size_fruit}</Text>
        <Text style={styles.stat}>{dev.size_cm} cm</Text>
        {dev.weight_g > 0 && <Text style={styles.stat}>{dev.weight_g}g</Text>}
        <Text style={styles.hint}>Tap for details</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius:    radii.lg,
    padding:         spacing.lg,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    shadowColor:     colors.shadow,
    shadowOpacity:   0.25,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 6 },
    elevation:       6,
  },
  left:       { flex: 1, gap: 4 },
  weekLabel:  { fontFamily: fonts.body.semibold, fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  weekNum:    { fontFamily: fonts.heading.bold, fontSize: 64, color: colors.surface, lineHeight: 68 },
  babyName:   { fontFamily: fonts.body.medium, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headline:   { fontFamily: fonts.body.regular, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18, marginTop: 4, maxWidth: 180 },
  right:      { alignItems: 'flex-end', gap: 4 },
  emoji:      { fontSize: 44 },
  fruit:      { fontFamily: fonts.body.medium, fontSize: 13, color: 'rgba(255,255,255,0.9)', textTransform: 'capitalize' },
  stat:       { fontFamily: fonts.body.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  hint:       { fontFamily: fonts.body.medium, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
