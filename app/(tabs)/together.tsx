import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    LayoutAnimation,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { babyDevelopment } from '../../constants/babyDevelopment';
import { getPostpartumWeekContent } from '../../constants/postpartumContent';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { weekContent } from '../../constants/weekContent';
import { useHousehold } from '../../hooks/useHousehold';
import { getPostpartumWeek } from '../../lib/postpartumWeeks';

// Week-specific partner action ideas, keyed by trimester
const TRIMESTER_ACTIONS: Record<1 | 2 | 3, string[]> = {
  1: [
    'Take over all cooking, smells are a major nausea trigger right now',
    'Do the grocery run without being asked',
    'Let her sleep in whenever possible',
    'Research your first OB appointment together',
    'Put your phone away when you are together in the evenings',
    'Ask how she is feeling emotionally, not just physically',
  ],
  2: [
    'Feel for baby kicks together, wait patiently at the bump',
    'Book and attend the anatomy scan',
    'Start researching prenatal classes',
    'Take a photo of the bump this week',
    'Ask about her birth preferences, listen without problem-solving',
    'Look up pediatricians in your area',
  ],
  3: [
    'Pack the hospital bag together this week',
    'Keep your phone charged and nearby at all times',
    'Take over all physical household tasks without commentary',
    'Ask what she wants from you in the delivery room',
    'Install the car seat and have it checked',
    'Prepare a few freezer meals for after the birth',
  ],
};

const POSTPARTUM_ACTIONS: string[] = [
  'Take one full solo baby-care shift this week so your partner can fully reset',
  'Own one predictable household block from start to finish without reminders',
  'Do one nightly check-in: ask what is hardest right now, then act on it',
  'Prep quick meals and hydration within arm\'s reach for feed windows',
  'Track one signal together: sleep blocks, feeding patterns, or mood trends',
  'Protect one no-interruption rest window this weekend',
];

const CONNECTION_PROMPTS = [
  'What are you most excited about?',
  'What are you most nervous about?',
  'What do you imagine they will be like?',
  'What kind of parents do you want to be?',
  'What is something you want them to always know?',
  'What do you want our family to feel like?',
];

const POSTPARTUM_CONNECTION_PROMPTS = [
  'What felt hardest for you this week, and what would make next week lighter?',
  'Where did we work well as a team this week?',
  'What support did you need that I might have missed?',
  'Which routine is helping, and which one is draining us?',
  'What is one thing we can simplify before next week starts?',
  'What would help you feel more rested this week?',
];

const FOCUS_LABEL = 'THIS WEEK FOCUS';
const CONVERSATION_LABEL = 'THIS WEEK CONVERSATION';

function AccordionCard({
  title,
  emoji,
  children,
  defaultOpen = true,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card style={styles.accordionCard}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((prev) => !prev);
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${open ? 'expanded' : 'collapsed'}`}
      >
        <Text style={styles.accordionTitle}>{emoji}  {title}</Text>
        <Text style={styles.accordionChevron}>{open ? '▲' : '▽'}</Text>
      </TouchableOpacity>
      {open ? <View style={styles.accordionBody}>{children}</View> : null}
    </Card>
  );
}

export default function PartnerScreen() {
  const { household, currentWeek, trimester, isPartnerRole, isPostpartum } = useHousehold();

  const week = currentWeek > 0 ? currentWeek : 15;
  const tri = trimester ?? 2;
  const content = weekContent.find((entry) => entry.week === week) ?? weekContent[14];
  const dev = babyDevelopment.find((entry) => entry.week === week) ?? babyDevelopment[14];

  const postpartumWeek = getPostpartumWeek(household?.baby_dob ?? null);
  const postpartumContent = getPostpartumWeekContent(postpartumWeek);
  const actions = isPostpartum ? POSTPARTUM_ACTIONS : TRIMESTER_ACTIONS[tri];
  const prompt = isPostpartum
    ? POSTPARTUM_CONNECTION_PROMPTS[postpartumWeek % POSTPARTUM_CONNECTION_PROMPTS.length]
    : CONNECTION_PROMPTS[week % CONNECTION_PROMPTS.length];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isPostpartum
            ? (isPartnerRole ? 'Your postpartum guide' : 'Postpartum partner view')
            : (isPartnerRole ? 'Your guide' : 'Partner view')}
        </Text>
        <Text style={styles.headerSub}>
          {isPostpartum
            ? `Postpartum week ${postpartumWeek}${household?.baby_name ? ` · ${household.baby_name}` : ''}`
            : `Week ${week} · ${tri === 1 ? 'First' : tri === 2 ? 'Second' : 'Third'} Trimester`}
        </Text>
      </View>

      <Card style={styles.focusCard}>
        <Text style={styles.focusLabel}>{FOCUS_LABEL}</Text>
        <Text style={styles.focusText}>{isPostpartum ? postpartumContent.partnerFocus : content.partnerFocus}</Text>
      </Card>

      <AccordionCard title="What they are experiencing" emoji="🌿" defaultOpen>
        <Text style={styles.bodyText}>{isPostpartum ? postpartumContent.momRecovery : content.mindAndBody}</Text>
      </AccordionCard>

      <AccordionCard title="Baby this week" emoji="👶" defaultOpen={false}>
        {isPostpartum ? (
          <Text style={styles.bodyText}>{postpartumContent.babyFocus}</Text>
        ) : (
          <>
            <Text style={styles.bodyText}>{dev.headline}</Text>
            <View style={styles.babyStats}>
              <View style={styles.babyStat}>
                <Text style={styles.babyStatVal}>{dev.size_cm} cm</Text>
                <Text style={styles.babyStatLabel}>Length</Text>
              </View>
              {dev.weight_g > 0 ? (
                <View style={styles.babyStat}>
                  <Text style={styles.babyStatVal}>{dev.weight_g}g</Text>
                  <Text style={styles.babyStatLabel}>Weight</Text>
                </View>
              ) : null}
              <View style={styles.babyStat}>
                <Text style={styles.babyStatVal}>{dev.size_fruit}</Text>
                <Text style={styles.babyStatLabel}>Size of a</Text>
              </View>
            </View>
          </>
        )}
      </AccordionCard>

      <AccordionCard
        title={isPostpartum ? 'How to support this week' : 'How to help this week'}
        emoji="💙"
        defaultOpen={false}
      >
        <View style={styles.actionList}>
          {actions.map((action, index) => (
            <View key={index} style={styles.actionRow}>
              <View style={styles.actionDot} />
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      </AccordionCard>

      <Card style={styles.promptCard}>
        <Text style={styles.promptLabel}>{CONVERSATION_LABEL}</Text>
        <Text style={styles.promptQuestion}>{prompt}</Text>
        <Text style={styles.promptHint}>
          {isPostpartum
            ? 'Ask this during a calm moment and agree on one practical next step.'
            : 'Ask them tonight. Listen without immediately responding.'}
        </Text>
      </Card>

      <View style={styles.quickActions}>
        {isPostpartum ? (
          <>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(tabs)/baby')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Open baby hub"
            >
              <Text style={styles.quickBtnEmoji}>🍼</Text>
              <Text style={styles.quickBtnLabel}>Open baby hub</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(modals)/add-todo')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Add support task"
            >
              <Text style={styles.quickBtnEmoji}>✅</Text>
              <Text style={styles.quickBtnLabel}>Add support task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(tabs)/todo')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="View plan"
            >
              <Text style={styles.quickBtnEmoji}>📋</Text>
              <Text style={styles.quickBtnLabel}>View plan</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(modals)/week-detail')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Open week ${week} detail`}
            >
              <Text style={styles.quickBtnEmoji}>🫐</Text>
              <Text style={styles.quickBtnLabel}>Week {week} detail</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(modals)/add-todo')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Add task"
            >
              <Text style={styles.quickBtnEmoji}>✅</Text>
              <Text style={styles.quickBtnLabel}>Add task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(tabs)/todo')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="View plan"
            >
              <Text style={styles.quickBtnEmoji}>📋</Text>
              <Text style={styles.quickBtnLabel}>View plan</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: { marginBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },
  headerSub: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  focusCard: {
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  focusLabel: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  focusText: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.surface, lineHeight: 26 },
  accordionCard: { marginBottom: 0 },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  accordionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text, flexShrink: 1 },
  accordionChevron: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.sm },
  accordionBody: { marginTop: spacing.md },
  bodyText: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text, lineHeight: 24 },
  babyStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  babyStat: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  babyStatVal: {
    fontFamily: fonts.heading.semibold,
    fontSize: 15,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  babyStatLabel: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  actionList: { gap: spacing.md },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  actionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 8,
    flexShrink: 0,
  },
  actionText: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text, lineHeight: 22, flex: 1 },
  promptCard: { backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.accent },
  promptLabel: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  promptQuestion: {
    fontFamily: fonts.heading.semibold,
    fontSize: 19,
    color: colors.text,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  promptHint: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: {
    flex: 1,
    minHeight: 64,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickBtnEmoji: { fontSize: 22 },
  quickBtnLabel: { fontFamily: fonts.body.medium, fontSize: 11, color: colors.text, textAlign: 'center' },
});