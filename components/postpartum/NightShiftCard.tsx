import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, radii, spacing } from '../../constants/theme';
import { getNightShiftStatusLabel } from '../../hooks/usePostpartumSync';
import { supabase } from '../../lib/supabase';
import type { HouseholdEvent, NightShiftStatus } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

interface NightShiftCardProps {
  householdId: string | null;
  currentUserId: string | null;
  currentUserLabel: string;
  partnerLabel: string;
  latestEvent: HouseholdEvent | null;
}

const STATUS_OPTIONS: { value: NightShiftStatus; label: string }[] = [
  { value: 'starting', label: 'I\'ve got this' },
  { value: 'ending', label: 'Your turn soon' },
  { value: 'need-help', label: 'Need backup' },
];

function getPayloadValue(payload: Record<string, unknown> | null, key: string): string | null {
  const value = payload?.[key];
  return typeof value === 'string' ? value : null;
}

export function NightShiftCard({
  householdId,
  currentUserId,
  currentUserLabel,
  partnerLabel,
  latestEvent,
}: NightShiftCardProps) {
  const [status, setStatus] = useState<NightShiftStatus>('starting');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const payload = latestEvent?.payload ?? null;
    const actorLabel = getPayloadValue(payload, 'actorLabel') ?? partnerLabel;
    const nextOwner = getPayloadValue(payload, 'nextOwnerLabel') ?? currentUserLabel;
    const currentStatus = getPayloadValue(payload, 'status');
    const shiftNote = getPayloadValue(payload, 'note');

    return {
      actorLabel,
      nextOwner,
      currentStatus,
      shiftNote,
    };
  }, [currentUserLabel, latestEvent, partnerLabel]);

  async function handleSave() {
    if (!householdId || !currentUserId) return;

    setSaving(true);
    try {
      const payload = {
        status,
        note: note.trim() || null,
        actorLabel: currentUserLabel,
        nextOwnerLabel: status === 'ending' ? partnerLabel : currentUserLabel,
      };

      const { error } = await supabase.from('household_events').insert({
        household_id: householdId,
        actor_id: currentUserId,
        event_type: 'night_shift_swap',
        payload,
      });

      if (error) throw error;
      setNote('');
    } catch {
      Alert.alert('Could not update handoff', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Night-shift handoff</Text>
          <Text style={styles.subtitle}>Keep the active shift visible to both parents.</Text>
        </View>
        {summary.currentStatus ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{getNightShiftStatusLabel(summary.currentStatus as NightShiftStatus)}</Text>
          </View>
        ) : null}
      </View>

      {latestEvent ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{summary.actorLabel} updated the shift</Text>
          <Text style={styles.summaryBody}>
            {summary.currentStatus ? getNightShiftStatusLabel(summary.currentStatus as NightShiftStatus) : 'Shift update logged'}
            {summary.currentStatus === 'ending' ? ` · ${summary.nextOwner} is up next` : ''}
          </Text>
          {summary.shiftNote ? <Text style={styles.summaryNote}>{summary.shiftNote}</Text> : null}
        </View>
      ) : (
        <Text style={styles.emptyText}>No handoff logged yet today.</Text>
      )}

      <View style={styles.optionRow}>
        {STATUS_OPTIONS.map((option) => {
          const selected = option.value === status;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setStatus(option.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        label="Shift note"
        value={note}
        onChangeText={setNote}
        placeholder="What does the next person need to know?"
        multiline
        numberOfLines={3}
      />

      <Button
        label={saving ? 'Saving...' : 'Share handoff'}
        disabled={!householdId || !currentUserId}
        loading={saving}
        onPress={handleSave}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.heading.semibold,
    fontSize: 17,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    marginTop: 2,
  },
  pill: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pillText: {
    color: colors.primary,
    fontFamily: fonts.body.semibold,
    fontSize: 11,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    gap: 4,
    padding: spacing.md,
  },
  summaryTitle: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 14,
  },
  summaryBody: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 12,
  },
  summaryNote: {
    color: colors.text,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 13,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionLabel: {
    color: colors.text,
    fontFamily: fonts.body.medium,
    fontSize: 12,
  },
  optionLabelSelected: {
    color: colors.surface,
    fontFamily: fonts.body.semibold,
  },
});
