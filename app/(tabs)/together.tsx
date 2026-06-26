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

import { BabyStatsBar } from '../../components/postpartum/BabyStatsBar';
import { NightShiftCard } from '../../components/postpartum/NightShiftCard';
import { Card } from '../../components/ui/Card';
import { getPostpartumConversationPrompt, getPostpartumSupportActions, getPostpartumWeekContent } from '../../constants/postpartumContent';
import { babyDevelopment } from '../../constants/babyDevelopment';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { weekContent } from '../../constants/weekContent';
import { useHousehold } from '../../hooks/useHousehold';
import { usePostpartumSync } from '../../hooks/usePostpartumSync';
import { getPostpartumWeek } from '../../lib/postpartumWeeks';
import type { BabyLog } from '../../types';

const TRIMESTER_ACTIONS: Record<1 | 2 | 3, string[]> = {
  1: [
    'Take over all cooking because smells can be a major nausea trigger right now.',
    'Do the grocery run before you are asked.',
    'Let her sleep in whenever possible.',
    'Research the first OB appointment together.',
    'Put your phone away when you are together in the evenings.',
    'Ask how she is feeling emotionally, not only physically.',
  ],
  2: [
    'Feel for baby kicks together and wait patiently at the bump.',
    'Book and attend the anatomy scan.',
    'Start researching prenatal classes.',
    'Take a bump photo this week.',
    'Ask about birth preferences and listen without problem-solving.',
    'Look up pediatricians in your area.',
  ],
  3: [
    'Pack the hospital bag together this week.',
    'Keep your phone charged and nearby at all times.',
    'Take over all physical household tasks without commentary.',
    'Ask what she wants from you in the delivery room.',
    'Install the car seat and have it checked.',
    'Prepare a few freezer meals for after the birth.',
  ],
};

const CONNECTION_PROMPTS = [
  'What are you most excited about?',
  'What are you most nervous about?',
  'What do you imagine they will be like?',
  'What kind of parents do you want to be?',
  'What is something you want them to always know?',
  'What do you want our family to feel like?',
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
          setOpen((value) => !value);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.accordionTitle}>{emoji}  {title}</Text>
        <Text style={styles.accordionChevron}>{open ? '▲' : '▽'}</Text>
      </TouchableOpacity>
      {open ? <View style={styles.accordionBody}>{children}</View> : null}
    </Card>
  );
}

function formatRecentActivity(log: BabyLog): string {
  const details = log.details ?? {};
  if (log.log_type === 'feeding') {
    const pieces = [
      typeof details.method === 'string' ? details.method : null,
      typeof details.amountMl === 'number' ? `${details.amountMl} ml` : null,
      typeof details.durationMins === 'number' ? `${details.durationMins}m` : null,
    ];
    return pieces.filter(Boolean).join(' · ');
  }

  if (log.log_type === 'sleep') {
    const pieces = [
      typeof details.sleepType === 'string' ? details.sleepType : null,
      typeof details.durationMins === 'number' ? `${details.durationMins}m` : null,
    ];
    return pieces.filter(Boolean).join(' · ');
  }

  if (log.log_type === 'diaper') {
    const pieces = [
      typeof details.diaperType === 'string' ? details.diaperType : null,
      typeof details.count === 'number' ? `${details.count}x` : null,
    ];
    return pieces.filter(Boolean).join(' · ');
  }

  return 'Logged';
}

export default function PartnerScreen() {
  const { currentWeek, trimester, isPartnerRole, isPostpartum, household, currentUser, partnerUser } = useHousehold();
  const { stats, recentLogs, latestNightShiftEvent } = usePostpartumSync(household?.id ?? null);

  const week = currentWeek > 0 ? currentWeek : 15;
  const tri = trimester ?? 2;
  const content = weekContent.find((item) => item.week === week) ?? weekContent[14];
  const dev = babyDevelopment.find((item) => item.week === week) ?? babyDevelopment[14];
  const actions = TRIMESTER_ACTIONS[tri];
  const prompt = CONNECTION_PROMPTS[week % CONNECTION_PROMPTS.length];

  const postpartumWeek = getPostpartumWeek(household?.baby_dob ?? null);
  const postpartumContent = getPostpartumWeekContent(postpartumWeek);
  const postpartumActions = getPostpartumSupportActions(postpartumWeek);
  const postpartumPrompt = getPostpartumConversationPrompt(postpartumWeek);
  const currentUserLabel = currentUser?.display_name ?? (isPartnerRole ? 'Partner' : 'Mom');
  const partnerLabel = partnerUser?.display_name ?? (isPartnerRole ? 'Mom' : 'Partner');

  if (isPostpartum) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isPartnerRole ? 'Your guide' : 'Together'}</Text>
          <Text style={styles.headerSub}>Week {postpartumWeek} postpartum</Text>
        </View>

        <Card style={styles.focusCard}>
          <Text style={styles.focusLabel}>{FOCUS_LABEL}</Text>
          <Text style={styles.focusText}>{postpartumContent.partnerFocus}</Text>
        </Card>

        <BabyStatsBar stats={stats} />

        <AccordionCard title="How to help this week" emoji="💙" defaultOpen>
          <View style={styles.actionList}>
            {postpartumActions.map((action) => (
              <View key={action} style={styles.actionRow}>
                <View style={styles.actionDot} />
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        </AccordionCard>

        <NightShiftCard
          householdId={household?.id ?? null}
          currentUserId={currentUser?.id ?? null}
          currentUserLabel={currentUserLabel}
          partnerLabel={partnerLabel}
          latestEvent={latestNightShiftEvent}
        />

        <Card>
          <Text style={styles.sectionTitle}>Recent baby activity</Text>
          {recentLogs.length === 0 ? (
            <Text style={styles.bodyText}>Once feeds, sleep, or diapers are logged, the shared rhythm will show up here.</Text>
          ) : (
            <View style={styles.activityList}>
              {recentLogs.slice(0, 3).map((log, index) => (
                <View key={log.id} style={[styles.activityRow, index < Math.min(recentLogs.length, 3) - 1 && styles.activityRowBorder]}>
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>{log.log_type.charAt(0).toUpperCase() + log.log_type.slice(1)}</Text>
                    <Text style={styles.activitySub}>{formatRecentActivity(log)}</Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.promptCard}>
          <Text style={styles.promptLabel}>{CONVERSATION_LABEL}</Text>
          <Text style={styles.promptQuestion}>{postpartumPrompt}</Text>
          <Text style={styles.promptHint}>Keep the answer practical. The goal is a lighter next 24 hours.</Text>
        </Card>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(modals)/baby-tracker?tracker=feeding' as never)}
            activeOpacity={0.75}
          >
            <Text style={styles.quickBtnEmoji}>🍼</Text>
            <Text style={styles.quickBtnLabel}>Log feeding</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(modals)/add-todo' as never)}
            activeOpacity={0.75}
          >
            <Text style={styles.quickBtnEmoji}>✅</Text>
            <Text style={styles.quickBtnLabel}>Add task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/(tabs)/baby' as never)}
            activeOpacity={0.75}
          >
            <Text style={styles.quickBtnEmoji}>📋</Text>
            <Text style={styles.quickBtnLabel}>Baby hub</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isPartnerRole ? 'Your guide' : 'Partner view'}
        </Text>
        <Text style={styles.headerSub}>Week {week} · {tri === 1 ? 'First' : tri === 2 ? 'Second' : 'Third'} Trimester</Text>
      </View>

      <Card style={styles.focusCard}>
        <Text style={styles.focusLabel}>{FOCUS_LABEL}</Text>
        <Text style={styles.focusText}>{content.partnerFocus}</Text>
      </Card>

      <AccordionCard title="What they are experiencing" emoji="🌿" defaultOpen>
        <Text style={styles.bodyText}>{content.mindAndBody}</Text>
      </AccordionCard>

      <AccordionCard title="Baby this week" emoji="👶" defaultOpen={false}>
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
      </AccordionCard>

      <AccordionCard title="How to help this week" emoji="💙" defaultOpen={false}>
        <View style={styles.actionList}>
          {actions.map((action) => (
            <View key={action} style={styles.actionRow}>
              <View style={styles.actionDot} />
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      </AccordionCard>

      <Card style={styles.promptCard}>
        <Text style={styles.promptLabel}>{CONVERSATION_LABEL}</Text>
        <Text style={styles.promptQuestion}>{prompt}</Text>
        <Text style={styles.promptHint}>Ask them tonight. Listen without immediately responding.</Text>
      </Card>

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
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { marginBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },
  headerSub: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  focusCard: { backgroundColor: colors.primary, shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  focusLabel: { fontFamily: fonts.body.semibold, fontSize: 10, color: colors.surface, letterSpacing: 2, marginBottom: spacing.sm },
  focusText: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.surface, lineHeight: 26 },
  sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text, marginBottom: spacing.md },
  accordionCard: { marginBottom: 0 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text },
  accordionChevron: { fontSize: 12, color: colors.textMuted },
  accordionBody: { marginTop: spacing.md },
  bodyText: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text, lineHeight: 24 },
  babyStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  babyStat: { flex: 1, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.sm, alignItems: 'center', gap: 2 },
  babyStatVal: { fontFamily: fonts.heading.semibold, fontSize: 15, color: colors.primary, textTransform: 'capitalize' },
  babyStatLabel: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  actionList: { gap: spacing.md },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  actionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginTop: 8, flexShrink: 0 },
  actionText: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text, lineHeight: 22, flex: 1 },
  promptCard: { backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.accent },
  promptLabel: { fontFamily: fonts.body.semibold, fontSize: 10, color: colors.primary, letterSpacing: 2, marginBottom: spacing.sm },
  promptQuestion: { fontFamily: fonts.heading.semibold, fontSize: 19, color: colors.text, lineHeight: 28, marginBottom: spacing.sm },
  promptHint: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs, shadowColor: colors.primary, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  quickBtnEmoji: { fontSize: 22 },
  quickBtnLabel: { fontFamily: fonts.body.medium, fontSize: 11, color: colors.text, textAlign: 'center' },
  activityList: { gap: 0 },
  activityRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  activityRowBorder: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  activityText: { flex: 1, gap: 2 },
  activityTitle: { color: colors.text, fontFamily: fonts.body.semibold, fontSize: 14 },
  activitySub: { color: colors.textMuted, fontFamily: fonts.body.regular, fontSize: 12 },
  activityTime: { color: colors.textMuted, fontFamily: fonts.body.regular, fontSize: 11 },
});
