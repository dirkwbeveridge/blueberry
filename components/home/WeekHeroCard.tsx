import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { babyDevelopment } from '../../constants/babyDevelopment';
import type { Household } from '../../types';

interface WeekHeroCardProps {
  week:      number;
  household: Household | null;
}

export function WeekHeroCard({ week, household }: WeekHeroCardProps) {
  const dev = babyDevelopment.find(w => w.week === week) ?? babyDevelopment[14];

  const FRUIT_EMOJIS: Record<string, string> = {
    blueberry: '🫐', grape: '🍇', lime: '🍋', lemon: '🍋', peach: '🍑',
    avocado: '🥑', banana: '🍌', carrot: '🥕', coconut: '🥥', pineapple: '🍍',
    cantaloupe: '🍈', 'navel orange': '🍊', pear: '🍐', grapefruit: '🍊',
    'small watermelon': '🍉', 'mini watermelon': '🍉', 'small pumpkin': '🎃',
    papaya: '🥭', squash: '🥦', 'butternut squash': '🥦', 'kidney bean': '🫘',
    kumquat: '🍊', fig: '🫐', 'sweet pea': '🌱', 'apple seed': '🌱',
    'sesame seed': '🌱', 'poppy seed': '🌱', lentil: '🌱',
    cauliflower: '🥦', 'romaine lettuce': '🥬', 'winter melon': '🍈',
    'honeydew melon': '🍈', 'bell pepper': '🫑', 'heirloom tomato': '🍅',
    'ear of corn': '🌽', 'scallion bunch': '🌿', rutabaga: '🥔',
  };
  const emoji = FRUIT_EMOJIS[dev.size_fruit.toLowerCase()] ?? '🌿';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/(tabs)/weeks')}
      activeOpacity={0.9}
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
    shadowColor:     '#1A0F3A',
    shadowOpacity:   0.25,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 6 },
    elevation:       6,
  },
  left:       { flex: 1, gap: 4 },
  weekLabel:  { fontFamily: fonts.body.semibold, fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  weekNum:    { fontFamily: fonts.heading.bold, fontSize: 64, color: '#FFFFFF', lineHeight: 68 },
  babyName:   { fontFamily: fonts.body.medium, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headline:   { fontFamily: fonts.body.regular, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18, marginTop: 4, maxWidth: 180 },
  right:      { alignItems: 'flex-end', gap: 4 },
  emoji:      { fontSize: 44 },
  fruit:      { fontFamily: fonts.body.medium, fontSize: 13, color: 'rgba(255,255,255,0.9)', textTransform: 'capitalize' },
  stat:       { fontFamily: fonts.body.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
});
