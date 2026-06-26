import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { DateField } from '../../components/ui/DateField';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { colors, spacing, typography } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { supabase } from '../../lib/supabase';
import { useHouseholdStore } from '../../store/household';
import type { Household, Stage } from '../../types';

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HouseholdSettingsModal() {
  const { household } = useHousehold();
  const setHousehold = useHouseholdStore((s) => s.setHousehold);

  const [stage, setStage] = useState<Stage>(household?.stage ?? 'pregnant');
  const [dueDate, setDueDate] = useState<Date | null>(parseDate(household?.due_date ?? null));
  const [babyDob, setBabyDob] = useState<Date | null>(parseDate(household?.baby_dob ?? null));
  const [loading, setLoading] = useState(false);

  const helper = useMemo(() => {
    if (stage === 'pregnant') return 'Pregnancy mode uses due date-based week tracking.';
    if (stage === 'postpartum') return 'Postpartum mode uses baby birthday and enables Baby tab trackers.';
    return 'Trying to conceive mode hides pregnancy week-specific guidance.';
  }, [stage]);

  async function handleSave() {
    if (!household) {
      Alert.alert('Not set up', 'Complete household setup first.');
      return;
    }

    if (stage === 'postpartum' && !babyDob) {
      Alert.alert('Baby birthday needed', 'Set a baby birthday to switch to postpartum mode.');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = { stage };
      payload.due_date = stage === 'pregnant' && dueDate ? formatDateIsoLocal(dueDate) : null;
      payload.baby_dob = stage === 'postpartum' && babyDob ? formatDateIsoLocal(babyDob) : null;

      const { data, error } = await supabase
        .from('households')
        .update(payload)
        .eq('id', household.id)
        .select('*')
        .single();

      if (error) throw error;
      if (data) setHousehold(data as unknown as Household);
      router.back();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalSheet title="Household settings" onClose={() => router.back()}>
      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Invite code</Text>
        <Text style={styles.metaValue}>{household?.invite_code ?? '—'}</Text>
      </View>

      <SegmentedControl
        options={[
          { value: 'ttc', label: 'TTC' },
          { value: 'pregnant', label: 'Pregnant' },
          { value: 'postpartum', label: 'Postpartum' },
        ]}
        value={stage}
        onChange={(value) => setStage(value as Stage)}
      />

      <Text style={styles.helper}>{helper}</Text>

      {stage === 'pregnant' && (
        <DateField
          label="Due date"
          value={dueDate}
          onChange={setDueDate}
        />
      )}

      {stage === 'postpartum' && (
        <DateField
          label="Baby birthday"
          value={babyDob}
          onChange={setBabyDob}
        />
      )}

      <Button label="Save settings" onPress={handleSave} loading={loading} />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    ...typography.subheading,
    color: colors.text,
    fontSize: 18,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -spacing.xs,
  },
});
