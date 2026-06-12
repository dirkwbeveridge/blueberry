import React, { useRef, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, FlatList, LayoutAnimation,
} from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../../hooks/useHousehold';
import { babyDevelopment } from '../../constants/babyDevelopment';
import { weekContent } from '../../constants/weekContent';
import { Card }       from '../../components/ui/Card';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { colors, fonts, radii, spacing } from '../../constants/theme';

const WEEKS = Array.from({ length: 40 }, (_, i) => i + 1);

const FRUIT_EMOJIS: Record<string, string> = {
  blueberry: '🫐', grape: '🍇', lime: '🍋', lemon: '🍋', peach: '🍑',
  avocado: '🥑', banana: '🍌', carrot: '🥕', coconut: '🥥', pineapple: '🍍',
  cantaloupe: '🍈', 'navel orange': '🍊', pear: '🍐', grapefruit: '🍊',
  'small watermelon': '🍉', 'mini watermelon': '🍉', 'small pumpkin': '🎃',
  papaya: '🥭', squash: '🥦', 'butternut squash': '🥦', 'kidney bean': '🫘',
  kumquat: '🍊', fig: '🫐', 'sweet pea': '🌱', 'apple seed': '🌱',
  'sesame seed': '🌱', 'poppy seed': '🌱', lentil: '🌱', 'poppyseed cluster': '🌱',
  cauliflower: '🥦', 'romaine lettuce': '🥬', 'winter melon': '🍈',
  'honeydew melon': '🍈', 'bell pepper': '🫑', 'heirloom tomato': '🍅',
  'ear of corn': '🌽', 'scallion bunch': '🌿', rutabaga: '🥔',
};

function Section({ title, emoji, content }: { title: string; emoji: string; content: string }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={sectionStyles.container}>
      <TouchableOpacity
        style={sectionStyles.header}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(e => !e); }}
        activeOpacity={0.7}
      >
        <Text style={sectionStyles.title}>{emoji}  {title}</Text>
        <Text style={sectionStyles.chevron}>{expanded ? '▲' : '▽'}</Text>
      </TouchableOpacity>
      {expanded && <Text style={sectionStyles.body}>{content}</Text>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text },
  chevron: { fontSize: 12, color: colors.textMuted },
  body: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text, lineHeight: 24 },
});

export default function WeekDetailModal() {
  const { currentWeek, household } = useHousehold();
  const [selectedWeek, setSelectedWeek] = useState(currentWeek > 0 ? currentWeek : 15);
  const weekListRef = useRef<FlatList>(null);

  const dev     = babyDevelopment.find(w => w.week === selectedWeek) ?? babyDevelopment[14];
  const content = weekContent.find(w => w.week === selectedWeek) ?? weekContent[14];
  const emoji   = FRUIT_EMOJIS[dev.size_fruit.toLowerCase()] ?? '🌿';

  const trimesterOf = (w: number) => w <= 13 ? 1 : w <= 26 ? 2 : 3;
  const trimesterColors  = ['#F5EDFF', '#EDF5FF', '#EDFFED'];
  const trimesterBorders = [colors.accent, '#93C5FD', '#86EFAC'];
  const tri = trimesterOf(selectedWeek) - 1;

  const subtitle = household?.baby_name ? `${household.baby_name}'s journey` : "Your baby's journey";

  return (
    <ModalSheet
      title="Week by Week"
      subtitle={subtitle}
      onClose={() => router.back()}
      scroll={false}
    >
      {/* Week selector */}
      <View style={styles.selectorWrapper}>
        <FlatList
          ref={weekListRef}
          data={WEEKS}
          horizontal
          keyExtractor={w => String(w)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorList}
          initialScrollIndex={Math.max(0, selectedWeek - 3)}
          getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
          renderItem={({ item: w }) => {
            const isSelected = w === selectedWeek;
            const isCurrent  = w === currentWeek;
            return (
              <TouchableOpacity
                style={[styles.weekPill, isSelected && styles.weekPillSelected]}
                onPress={() => setSelectedWeek(w)}
                activeOpacity={0.7}
              >
                <Text style={[styles.weekPillNum, isSelected && styles.weekPillNumSelected]}>{w}</Text>
                {isCurrent && <View style={styles.currentDot} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: trimesterColors[tri], borderColor: trimesterBorders[tri] }]}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroWeekLabel}>WEEK</Text>
            <Text style={styles.heroWeekNum}>{selectedWeek}</Text>
            {selectedWeek === currentWeek && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroEmoji}>{emoji}</Text>
            <Text style={styles.heroFruit}>{dev.size_fruit}</Text>
            <Text style={styles.heroStats}>{dev.size_cm} cm</Text>
            {dev.weight_g > 0 && <Text style={styles.heroStats}>{dev.weight_g}g</Text>}
          </View>
        </View>

        <Text style={styles.trimesterLabel}>
          {trimesterOf(selectedWeek) === 1 ? 'First' : trimesterOf(selectedWeek) === 2 ? 'Second' : 'Third'} Trimester
        </Text>

        <Card style={styles.card}>
          <Section title="Baby development" emoji="👶" content={content.babyDevelopment} />
        </Card>

        <Card style={styles.card}>
          <Section title="Mind & body" emoji="🌿" content={content.mindAndBody} />
        </Card>

        <Card style={[styles.card, styles.partnerCard]}>
          <Text style={styles.partnerLabel}>💙  For the partner</Text>
          <Text style={styles.partnerText}>{content.partnerFocus}</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.devNote}>{dev.headline}</Text>
        </Card>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  selectorWrapper: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  selectorList: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  weekPill:     { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  weekPillSelected: { backgroundColor: colors.primary },
  weekPillNum:  { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.textMuted },
  weekPillNumSelected: { color: '#FFFFFF' },
  currentDot:   { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  heroCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1.5 },
  heroLeft: { gap: 2 },
  heroWeekLabel: { fontFamily: fonts.body.semibold, fontSize: 10, color: colors.textMuted, letterSpacing: 2 },
  heroWeekNum:   { fontFamily: fonts.heading.bold, fontSize: 56, color: colors.primary, lineHeight: 60 },
  currentBadge:  { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  currentBadgeText: { fontFamily: fonts.body.semibold, fontSize: 10, color: '#FFFFFF' },
  heroRight: { alignItems: 'flex-end', gap: 4 },
  heroEmoji: { fontSize: 44 },
  heroFruit: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.text, textAlign: 'right', textTransform: 'capitalize' },
  heroStats: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },

  trimesterLabel: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: -4 },
  card:          { marginBottom: 0 },
  partnerCard:   { backgroundColor: '#EDF5FF', shadowOpacity: 0.04 },
  partnerLabel:  { fontFamily: fonts.body.semibold, fontSize: 13, color: '#2563EB', marginBottom: spacing.sm },
  partnerText:   { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text, lineHeight: 24 },
  devNote:       { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, lineHeight: 22, fontStyle: 'italic' },
});
