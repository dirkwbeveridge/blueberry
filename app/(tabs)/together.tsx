import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    LayoutAnimation,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { babyDevelopment } from '../../constants/babyDevelopment';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { weekContent } from '../../constants/weekContent';
import { useHousehold } from '../../hooks/useHousehold';

// Week-specific partner action ideas, keyed by trimester
const TRIMESTER_ACTIONS: Record<1|2|3, string[]> = {
  1: [
    'Take over all cooking — smells are a major nausea trigger right now',
    'Do the grocery run without being asked',
    'Let her sleep in whenever possible',
    'Research your first OB appointment together',
    'Put your phone away when you\'re together in the evenings',
    'Ask how she\'s feeling emotionally, not just physically',
  ],
  2: [
    'Feel for baby kicks together — wait patiently at the bump',
    'Book and attend the anatomy scan',
    'Start researching prenatal classes',
    'Take a photo of the bump this week',
    'Ask about her birth preferences — listen without problem-solving',
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

const CONNECTION_PROMPTS = [
  "What are you most excited about?",
  "What are you most nervous about?",
  "What do you imagine they'll be like?",
  "What kind of parents do you want to be?",
  "What's something you want them to always know?",
  "What do you want our family to feel like?",
];

const FOCUS_LABEL = 'THIS WEEK FOCUS';
const CONVERSATION_LABEL = '💬  THIS WEEK CONVERSATION';

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
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(o => !o); }}
        activeOpacity={0.7}
      >
        <Text style={styles.accordionTitle}>{emoji}  {title}</Text>
        <Text style={styles.accordionChevron}>{open ? '▲' : '▽'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </Card>
  );
}

export default function PartnerScreen() {
  const { currentWeek, trimester, isPartnerRole } = useHousehold();
  const week    = currentWeek > 0 ? currentWeek : 15;
  const tri     = trimester ?? 2;
  const content = weekContent.find(w => w.week === week) ?? weekContent[14];
  const dev     = babyDevelopment.find(w => w.week === week) ?? babyDevelopment[14];
  const actions = TRIMESTER_ACTIONS[tri];
  const prompt  = CONNECTION_PROMPTS[week % CONNECTION_PROMPTS.length];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isPartnerRole ? 'Your guide' : 'Partner view'}
        </Text>
        <Text style={styles.headerSub}>Week {week} · {tri === 1 ? 'First' : tri === 2 ? 'Second' : 'Third'} Trimester</Text>
      </View>

      {/* This week's focus */}
      <Card style={styles.focusCard}>
        <Text style={styles.focusLabel}>{FOCUS_LABEL}</Text>
        <Text style={styles.focusText}>{content.partnerFocus}</Text>
      </Card>

      {/* What they are experiencing */}
      <AccordionCard title="What they are experiencing" emoji="🌿" defaultOpen>
        <Text style={styles.bodyText}>{content.mindAndBody}</Text>
      </AccordionCard>

      {/* Baby this week */}
      <AccordionCard title="Baby this week" emoji="👶" defaultOpen={false}>
        <Text style={styles.bodyText}>{dev.headline}</Text>
        <View style={styles.babyStats}>
          <View style={styles.babyStat}>
            <Text style={styles.babyStatVal}>{dev.size_cm} cm</Text>
            <Text style={styles.babyStatLabel}>Length</Text>
          </View>
          {dev.weight_g > 0 && (
            <View style={styles.babyStat}>
              <Text style={styles.babyStatVal}>{dev.weight_g}g</Text>
              <Text style={styles.babyStatLabel}>Weight</Text>
            </View>
          )}
          <View style={styles.babyStat}>
            <Text style={styles.babyStatVal}>{dev.size_fruit}</Text>
            <Text style={styles.babyStatLabel}>Size of a</Text>
          </View>
        </View>
      </AccordionCard>

      {/* How to help */}
      <AccordionCard title="How to help this week" emoji="💙" defaultOpen={false}>
        <View style={styles.actionList}>
          {actions.map((action, i) => (
            <View key={i} style={styles.actionRow}>
              <View style={styles.actionDot} />
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      </AccordionCard>

      {/* Connection prompt */}
      <Card style={styles.promptCard}>
        <Text style={styles.promptLabel}>{CONVERSATION_LABEL}</Text>
        <Text style={styles.promptQuestion}>{prompt}</Text>
        <Text style={styles.promptHint}>Ask them tonight. Listen without immediately responding.</Text>
      </Card>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => router.push('/(modals)/week-detail')}
          activeOpacity={0.75}
        >
          <Text style={styles.quickBtnEmoji}>🫐</Text>
          <Text style={styles.quickBtnLabel}>Week {week} detail</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => router.push('/(modals)/add-todo')}
          activeOpacity={0.75}
        >
          <Text style={styles.quickBtnEmoji}>✅</Text>
          <Text style={styles.quickBtnLabel}>Add task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => router.push('/(tabs)/todo')}
          activeOpacity={0.75}
        >
          <Text style={styles.quickBtnEmoji}>📋</Text>
          <Text style={styles.quickBtnLabel}>View plan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header:    { marginBottom: spacing.xs },
  headerTitle:{ fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },
  headerSub: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  focusCard: { backgroundColor: colors.primary, shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width:0, height:6 }, elevation: 6 },
  focusLabel:{ fontFamily: fonts.body.semibold, fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: spacing.sm },
  focusText: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.surface, lineHeight: 26 },
  accordionCard: { marginBottom: 0 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionTitle:  { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text },
  accordionChevron:{ fontSize: 12, color: colors.textMuted },
  accordionBody:   { marginTop: spacing.md },
  bodyText:  { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text, lineHeight: 24 },
  babyStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  babyStat:  { flex: 1, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.sm, alignItems: 'center', gap: 2 },
  babyStatVal:   { fontFamily: fonts.heading.semibold, fontSize: 15, color: colors.primary, textTransform: 'capitalize' },
  babyStatLabel: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  actionList:{ gap: spacing.md },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  actionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginTop: 8, flexShrink: 0 },
  actionText:{ fontFamily: fonts.body.regular, fontSize: 15, color: colors.text, lineHeight: 22, flex: 1 },
  promptCard:{ backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.accent },
  promptLabel:{ fontFamily: fonts.body.semibold, fontSize: 10, color: colors.primary, letterSpacing: 2, marginBottom: spacing.sm },
  promptQuestion: { fontFamily: fonts.heading.semibold, fontSize: 19, color: colors.text, lineHeight: 28, marginBottom: spacing.sm },
  promptHint:{ fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickBtn:  { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs, shadowColor: colors.primary, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  quickBtnEmoji: { fontSize: 22 },
  quickBtnLabel: { fontFamily: fonts.body.medium, fontSize: 11, color: colors.text, textAlign: 'center' },
});
